//
//  WalletManager.swift
//  ElectroWallet
//
//  Manages wallet operations
//

import Foundation
import Combine

class WalletManager: ObservableObject {
    static let shared = WalletManager()
    
    @Published var currentWallet: Wallet?
    @Published var transactions: [Transaction] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let keychainService = KeychainService.shared
    private let bitcoinService = BitcoinService.shared
    private let cryptoService = CryptoService.shared
    
    private var cancellables = Set<AnyCancellable>()
    
    var hasWallet: Bool {
        return currentWallet != nil
    }
    
    private init() {}
    
    func initialize() {
        loadWallet()
    }
    
    // MARK: - Wallet Creation
    
    func createWallet(mnemonic: String? = nil) async throws -> Wallet {
        isLoading = true
        defer { isLoading = false }
        
        let mnemonicPhrase: String
        if let providedMnemonic = mnemonic {
            mnemonicPhrase = providedMnemonic
        } else {
            mnemonicPhrase = try cryptoService.generateMnemonic()
        }
        
        // Derive keys from mnemonic
        let seed = try cryptoService.mnemonicToSeed(mnemonic: mnemonicPhrase)
        let privateKey = try cryptoService.derivePrivateKey(from: seed, path: "m/84'/1'/0'/0/0") // BIP84 testnet
        let publicKey = try cryptoService.derivePublicKey(from: privateKey)
        let address = try cryptoService.publicKeyToAddress(publicKey: publicKey, testnet: true)
        
        // Store private key in keychain
        try keychainService.savePrivateKey(privateKey, for: address)
        try keychainService.saveMnemonic(mnemonicPhrase, for: address)
        
        // Create wallet
        let wallet = Wallet(address: address, publicKey: publicKey)
        currentWallet = wallet
        
        // Save wallet
        saveWallet(wallet)
        
        return wallet
    }
    
    func restoreWallet(mnemonic: String) async throws -> Wallet {
        return try await createWallet(mnemonic: mnemonic)
    }
    
    // MARK: - Transactions
    
    func sendBitcoin(to recipientAddress: String, amount: Int64) async throws -> String {
        guard let wallet = currentWallet else {
            throw WalletError.noWallet
        }
        
        isLoading = true
        defer { isLoading = false }
        
        // Get private key
        guard let privateKey = try keychainService.getPrivateKey(for: wallet.address) else {
            throw WalletError.privateKeyNotFound
        }
        
        // Create and broadcast transaction
        let txHash = try await bitcoinService.sendTransaction(
            from: wallet.address,
            to: recipientAddress,
            amount: amount,
            privateKey: privateKey
        )

        switch bitcoinService.ledgerMode {
        case .off:
            // Optimistically add a pending transaction only when using real network (not implemented yet).
            let pendingTx = Transaction(
                id: txHash,
                amount: amount,
                fee: 0,
                timestamp: Date(),
                confirmations: 0,
                type: .sent,
                address: recipientAddress,
                status: .pending
            )
            await MainActor.run {
                self.transactions.insert(pendingTx, at: 0)
            }
        case .local, .remote:
            break // ledger already handles visibility
        }
        
        // Refresh balance and transactions
        await refreshWalletData()
        
        return txHash
    }
    
    func refreshWalletData() async {
        guard let wallet = currentWallet else { return }
        
        do {
            // Fetch balance
            let balance = try await bitcoinService.getBalance(for: wallet.address)
            await MainActor.run {
                self.currentWallet?.balance = balance
                self.saveWallet(self.currentWallet!)
            }
            
            // Fetch transactions
            let fetchedTransactions = try await bitcoinService.getTransactions(for: wallet.address)
            await MainActor.run {
                self.transactions = fetchedTransactions
            }
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }

    // MARK: - Credit helper (offline ledger)
    func addFunds(amountSats: Int64) async {
        guard let wallet = currentWallet else { return }
        do {
            _ = try await bitcoinService.creditFunds(to: wallet.address, amount: amountSats)
            await refreshWalletData()
        } catch {
            await MainActor.run {
                self.errorMessage = error.localizedDescription
            }
        }
    }
    
    // MARK: - Storage
    
    private func saveWallet(_ wallet: Wallet) {
        if let data = try? JSONEncoder().encode(wallet) {
            UserDefaults.standard.set(data, forKey: "currentWallet")
        }
    }
    
    private func loadWallet() {
        if let data = UserDefaults.standard.data(forKey: "currentWallet"),
           let wallet = try? JSONDecoder().decode(Wallet.self, from: data) {
            currentWallet = wallet
            Task {
                await refreshWalletData()
            }
        }
    }
    
    func deleteWallet() async throws {
        guard let wallet = currentWallet else { return }
        
        try keychainService.deletePrivateKey(for: wallet.address)
        try keychainService.deleteMnemonic(for: wallet.address)
        
        UserDefaults.standard.removeObject(forKey: "currentWallet")
        
        await MainActor.run {
            self.currentWallet = nil
            self.transactions = []
        }
    }
}

enum WalletError: LocalizedError {
    case noWallet
    case privateKeyNotFound
    case invalidMnemonic
    case insufficientFunds
    
    var errorDescription: String? {
        switch self {
        case .noWallet:
            return "No wallet found"
        case .privateKeyNotFound:
            return "Private key not found in keychain"
        case .invalidMnemonic:
            return "Invalid mnemonic phrase"
        case .insufficientFunds:
            return "Insufficient funds"
        }
    }
}
