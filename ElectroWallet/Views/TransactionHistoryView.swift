//
//  TransactionHistoryView.swift
//  ElectroWallet
//
//  Shows recent transactions
//

import SwiftUI

struct TransactionHistoryView: View {
    @EnvironmentObject var walletManager: WalletManager
    
    var body: some View {
        List {
            if walletManager.transactions.isEmpty {
                Text("No transactions yet")
                    .foregroundColor(.secondary)
            } else {
                ForEach(walletManager.transactions) { tx in
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(tx.type == .sent ? "Sent" : "Received")
                                .font(.headline)
                                .foregroundColor(tx.type == .sent ? .red : .green)
                            Spacer()
                            Text("\(tx.amountInBTC, specifier: "%.8f") BTC")
                                .font(.body)
                        }
                        Text(tx.id)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(tx.status.rawValue.capitalized)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("History")
        .task {
            await walletManager.refreshWalletData()
        }
    }
}
