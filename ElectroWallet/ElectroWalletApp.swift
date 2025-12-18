//
//  ElectroWalletApp.swift
//  ElectroWallet
//
//  Bitcoin Testnet Wallet for iOS
//

import SwiftUI

@main
struct ElectroWalletApp: App {
    @StateObject private var walletManager = WalletManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(walletManager)
                .onAppear {
                    walletManager.initialize()
                }
        }
    }
}
