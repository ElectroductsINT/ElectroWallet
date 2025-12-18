//
//  ContentView.swift
//  ElectroWallet
//
//  Main navigation view
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var walletManager: WalletManager
    @State private var selectedTab = 0
    
    var body: some View {
        if walletManager.hasWallet {
            TabView(selection: $selectedTab) {
                WalletView()
                    .tabItem {
                        Label("Wallet", systemImage: "wallet.pass.fill")
                    }
                    .tag(0)
                
                SendView()
                    .tabItem {
                        Label("Send", systemImage: "arrow.up.circle.fill")
                    }
                    .tag(1)
                
                ReceiveView()
                    .tabItem {
                        Label("Receive", systemImage: "arrow.down.circle.fill")
                    }
                    .tag(2)
                
                TransactionHistoryView()
                    .tabItem {
                        Label("History", systemImage: "clock.fill")
                    }
                    .tag(3)
                
                SettingsView()
                    .tabItem {
                        Label("Settings", systemImage: "gear")
                    }
                    .tag(4)
            }
        } else {
            OnboardingView()
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(WalletManager.shared)
    }
}
