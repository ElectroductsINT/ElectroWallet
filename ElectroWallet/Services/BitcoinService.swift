//
//  BitcoinService.swift
//  ElectroWallet
//
//  Bitcoin testnet service with optional ledger for offline UX.
//

import Foundation

class BitcoinService {
    static let shared = BitcoinService()
    private init() {}

    // Ledger mode: .local keeps a ledger on-device, .remote hits a lightweight backend, .off uses Blockstream read-only.
    enum LedgerMode {
        case local
        case remote(URL) // expected endpoints: GET /ledger returns [LedgerTx], POST /tx accepts LedgerTx
        case off
    }

    var ledgerMode: LedgerMode = .local

    // Base URL for Blockstream testnet API (used when ledgerMode == .off)
    private let baseURL = URL(string: "https://blockstream.info/testnet/api")!

    // Local ledger storage key
    private let ledgerKey = "ledger_v1"

    // MARK: - Balance
    func getBalance(for address: String) async throws -> Int64 {
        switch ledgerMode {
        case .local:
            let ledger = loadLedger()
            let incoming = ledger.filter { $0.to == address }.reduce(0) { $0 + $1.amount }
            let outgoing = ledger.filter { $0.from == address }.reduce(0) { $0 + $1.amount + $1.fee }
            return incoming - outgoing
        case .remote(let url):
            let ledger = try await fetchRemoteLedger(baseURL: url)
            let incoming = ledger.filter { $0.to == address }.reduce(0) { $0 + $1.amount }
            let outgoing = ledger.filter { $0.from == address }.reduce(0) { $0 + $1.amount + $1.fee }
            return incoming - outgoing
        case .off:
            let url = baseURL.appendingPathComponent("address/").appendingPathComponent(address)
            let data = try await fetch(url: url)
            let info = try JSONDecoder().decode(AddressInfo.self, from: data)
            return info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum
        }
    }

    // MARK: - Transactions
    func getTransactions(for address: String) async throws -> [Transaction] {
        switch ledgerMode {
        case .local:
            let ledger = loadLedger()
            return mapLedger(ledger, for: address)
        case .remote(let url):
            let ledger = try await fetchRemoteLedger(baseURL: url)
            return mapLedger(ledger, for: address)
        case .off:
            let url = baseURL.appendingPathComponent("address/").appendingPathComponent(address).appendingPathComponent("txs")
            let data = try await fetch(url: url)
            let apiTxs = try JSONDecoder().decode([AddressTransaction].self, from: data)
            return apiTxs.map { apiTx in
                let received = apiTx.vout.filter { $0.scriptpubkey_address == address }.reduce(0) { $0 + ($1.value ?? 0) }
                let sent = apiTx.vin.filter { $0.prevout?.scriptpubkey_address == address }.reduce(0) { $0 + ($1.prevout?.value ?? 0) }
                let net = received - sent
                let type: Transaction.TransactionType = net >= 0 ? .received : .sent
                return Transaction(
                    id: apiTx.txid,
                    amount: Int64(abs(net)),
                    fee: Int64(apiTx.fee ?? 0),
                    timestamp: Date(timeIntervalSince1970: TimeInterval(apiTx.status.block_time ?? apiTx.status.block_time ?? 0)),
                    confirmations: apiTx.status.confirmed ? (apiTx.status.block_height.map { max(1, $0) } ?? 1) : 0,
                    type: type,
                    address: address,
                    status: apiTx.status.confirmed ? .confirmed : .pending
                )
            }
        }
    }

    // MARK: - Send Transaction
    func sendTransaction(from: String, to: String, amount: Int64, privateKey: Data) async throws -> String {
        guard amount > 0 else { throw WalletError.insufficientFunds }

        switch ledgerMode {
        case .local:
            try await Task.sleep(nanoseconds: 200_000_000) // latency
            let txid = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased().padding(toLength: 64, withPad: "0", startingAt: 0)
            var ledger = loadLedger()
            let now = Date().timeIntervalSince1970
            let fee: Int64 = max(100, amount / 1000) // simple fee
            ledger.append(LedgerTx(id: txid, from: from, to: to, amount: amount, fee: fee, timestamp: now, confirmed: false))
            saveLedger(ledger)
            return txid
        case .remote(let url):
            try await Task.sleep(nanoseconds: 200_000_000) // latency
            let txid = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased().padding(toLength: 64, withPad: "0", startingAt: 0)
            let now = Date().timeIntervalSince1970
            let fee: Int64 = max(100, amount / 1000)
            let tx = LedgerTx(id: txid, from: from, to: to, amount: amount, fee: fee, timestamp: now, confirmed: false)
            try await postRemoteTx(baseURL: url, tx: tx)
            return txid
        case .off:
            // Real signing/broadcast not implemented in this build.
            throw WalletError.insufficientFunds
        }
    }

    // MARK: - Credit (faucet/purchase)
    @discardableResult
    func creditFunds(to: String, amount: Int64) async throws -> String {
        guard amount > 0 else { throw WalletError.insufficientFunds }
        switch ledgerMode {
        case .local:
            let txid = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased().padding(toLength: 64, withPad: "0", startingAt: 0)
            var ledger = loadLedger()
            let now = Date().timeIntervalSince1970
            let fee: Int64 = 0
            ledger.append(LedgerTx(id: txid, from: "faucet", to: to, amount: amount, fee: fee, timestamp: now, confirmed: true))
            saveLedger(ledger)
            return txid
        case .remote(let url):
            let txid = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased().padding(toLength: 64, withPad: "0", startingAt: 0)
            let now = Date().timeIntervalSince1970
            let tx = LedgerTx(id: txid, from: "faucet", to: to, amount: amount, fee: 0, timestamp: now, confirmed: true)
            try await postRemoteTx(baseURL: url, tx: tx)
            return txid
        case .off:
            throw WalletError.insufficientFunds
        }
    }

    // MARK: - Networking helper
    private func fetch(url: URL) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return data
    }

    // Remote ledger helpers (simple expected API)
    private func fetchRemoteLedger(baseURL: URL) async throws -> [LedgerTx] {
        let url = baseURL.appendingPathComponent("ledger")
        let data = try await fetch(url: url)
        return (try? JSONDecoder().decode([LedgerTx].self, from: data)) ?? []
    }

    private func postRemoteTx(baseURL: URL, tx: LedgerTx) async throws {
        let url = baseURL.appendingPathComponent("tx")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(tx)
        let (_, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}

// MARK: - Ledger types/helpers
private struct LedgerTx: Codable {
    let id: String
    let from: String
    let to: String
    let amount: Int64
    let fee: Int64
    let timestamp: TimeInterval
    let confirmed: Bool
}

extension BitcoinService {
    private func loadLedger() -> [LedgerTx] {
        guard let data = UserDefaults.standard.data(forKey: ledgerKey) else { return [] }
        return (try? JSONDecoder().decode([LedgerTx].self, from: data)) ?? []
    }

    private func saveLedger(_ ledger: [LedgerTx]) {
        if let data = try? JSONEncoder().encode(ledger) {
            UserDefaults.standard.set(data, forKey: ledgerKey)
        }
    }

    private func mapLedger(_ ledger: [LedgerTx], for address: String) -> [Transaction] {
        let relevant = ledger.filter { $0.from == address || $0.to == address }
        return relevant.sorted { $0.timestamp > $1.timestamp }.map { entry in
            let isOutgoing = entry.from == address
            let type: Transaction.TransactionType = isOutgoing ? .sent : .received
            let status: Transaction.TransactionStatus = entry.confirmed ? .confirmed : .pending
            return Transaction(
                id: entry.id,
                amount: entry.amount,
                fee: entry.fee,
                timestamp: Date(timeIntervalSince1970: entry.timestamp),
                confirmations: entry.confirmed ? 1 : 0,
                type: type,
                address: isOutgoing ? entry.to : entry.from,
                status: status
            )
        }
    }
}

// MARK: - API Models (used when ledgerMode == .off)
private struct AddressInfo: Decodable {
    let chain_stats: ChainStats
    let mempool_stats: ChainStats
}

private struct ChainStats: Decodable {
    let funded_txo_sum: Int64
    let spent_txo_sum: Int64
}

private struct AddressTransaction: Decodable {
    let txid: String
    let fee: Int64?
    let status: TxStatus
    let vin: [Vin]
    let vout: [Vout]
}

private struct TxStatus: Decodable {
    let confirmed: Bool
    let block_height: Int?
    let block_time: Int?
}

private struct Vin: Decodable {
    let prevout: Prevout?
}

private struct Prevout: Decodable {
    let scriptpubkey_address: String?
    let value: Int64?
}

private struct Vout: Decodable {
    let scriptpubkey_address: String?
    let value: Int64?
}
