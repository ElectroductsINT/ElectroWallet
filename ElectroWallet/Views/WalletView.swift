//
//  WalletView.swift
//  ElectroWallet
//
//  Displays balance and address
//

import SwiftUI

struct WalletView: View {
    @EnvironmentObject var walletManager: WalletManager
    
    var body: some View {
        VStack(spacing: 24) {
            if let wallet = walletManager.currentWallet {
                VStack(spacing: 8) {
                    Text("Balance")
                        .font(.headline)
                    Text("\(wallet.balanceInBTC, specifier: "%.8f") BTC")
                        .font(.title).bold()
                    Text("Address")
                        .font(.headline)
                    Text(wallet.address)
                        .font(.footnote)
                        .multilineTextAlignment(.center)
                        .textSelection(.enabled)
                }
                
                VStack(spacing: 10) {
                    Button {
                        Task { await walletManager.refreshWalletData() }
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)

                    Button {
                        Task { await walletManager.addFunds(amountSats: 100_000) }
                    } label: {
                        Label("Add 0.001 BTC", systemImage: "cart")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
                .padding(.horizontal)
            } else {
                Text("No wallet loaded")
            }
            Spacer()
        }
        .padding()
        .navigationTitle("Wallet")
        .task {
            await walletManager.refreshWalletData()
        }
    }
}
