//
//  Wallet.swift
//  ElectroWallet
//
//  Core wallet model
//

import Foundation

struct Wallet: Codable {
    let id: UUID
    let address: String
    let publicKey: String
    let createdAt: Date
    var balance: Int64 = 0 // Satoshis
    var label: String
    
    init(id: UUID = UUID(), address: String, publicKey: String, label: String = "My Wallet") {
        self.id = id
        self.address = address
        self.publicKey = publicKey
        self.createdAt = Date()
        self.label = label
    }
    
    var balanceInBTC: Double {
        return Double(balance) / 100_000_000.0
    }
}

struct Transaction: Codable, Identifiable {
    let id: String // Transaction hash
    let amount: Int64 // Satoshis
    let fee: Int64
    let timestamp: Date
    let confirmations: Int
    let type: TransactionType
    let address: String // Recipient or sender address
    let status: TransactionStatus
    
    enum TransactionType: String, Codable {
        case sent
        case received
    }
    
    enum TransactionStatus: String, Codable {
        case pending
        case confirmed
        case failed
    }
    
    var amountInBTC: Double {
        return Double(amount) / 100_000_000.0
    }
    
    var feeInBTC: Double {
        return Double(fee) / 100_000_000.0
    }
}

struct UTXO: Codable {
    let txid: String
    let vout: Int
    let amount: Int64
    let scriptPubKey: String
    let address: String
    let confirmations: Int
}
