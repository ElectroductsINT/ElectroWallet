//
//  SettingsView.swift
//  ElectroWallet
//
//  Basic settings
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var walletManager: WalletManager
    @State private var showDeleteAlert = false
    @State private var infoMessage: String?
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Wallet")) {
                    if let wallet = walletManager.currentWallet {
                        Text("Label: \(wallet.label)")
                        Text("Address: \(wallet.address)")
                            .textSelection(.enabled)
                    } else {
                        Text("No wallet loaded")
                    }
                }
                
                if let message = infoMessage {
                    Text(message)
                        .foregroundColor(.secondary)
                }
                
                Section {
                    Button(role: .destructive) {
                        showDeleteAlert = true
                    } label: {
                        Label("Delete Wallet", systemImage: "trash")
                    }
                }
            }
            .navigationTitle("Settings")
            .alert("Delete Wallet?", isPresented: $showDeleteAlert) {
                Button("Delete", role: .destructive) {
                    Task { await deleteWallet() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This removes keys from keychain on this device.")
            }
        }
    }
    
    private func deleteWallet() async {
        do {
            try await walletManager.deleteWallet()
            infoMessage = "Wallet deleted"
        } catch {
            infoMessage = error.localizedDescription
        }
    }
}
