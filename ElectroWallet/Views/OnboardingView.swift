//
//  OnboardingView.swift
//  ElectroWallet
//
//  Wallet creation and restore flow
//

import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var walletManager: WalletManager
    @State private var mnemonic: String = ""
    @State private var isRestoring = false
    @State private var errorMessage: String?
    @State private var isLoading = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Text("ElectroWallet")
                    .font(.largeTitle).bold()
                Text("Bitcoin Testnet Wallet")
                    .foregroundColor(.secondary)
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Restore from mnemonic (optional)")
                        .font(.headline)
                    TextField("Enter 12 or 24 word phrase", text: $mnemonic, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...4)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }
                
                if let error = errorMessage {
                    Text(error)
                        .foregroundColor(.red)
                        .font(.footnote)
                }
                
                VStack(spacing: 12) {
                    Button {
                        Task { await createWallet() }
                    } label: {
                        Label("Create New Wallet", systemImage: "sparkles")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading)
                    
                    Button {
                        Task { await restoreWallet() }
                    } label: {
                        Label("Restore Wallet", systemImage: "arrow.counterclockwise")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(isLoading || mnemonic.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                
                Spacer()
            }
            .padding()
            .overlay {
                if isLoading {
                    ProgressView("Working...")
                        .padding()
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
    
    private func createWallet() async {
        await handle(action: {
            _ = try await walletManager.createWallet()
        })
    }
    
    private func restoreWallet() async {
        let phrase = mnemonic.trimmingCharacters(in: .whitespacesAndNewlines)
        await handle(action: {
            guard CryptoService.shared.validateMnemonic(phrase) else {
                throw WalletError.invalidMnemonic
            }
            _ = try await walletManager.restoreWallet(mnemonic: phrase)
        })
    }
    
    private func handle(action: @escaping () async throws -> Void) async {
        errorMessage = nil
        isLoading = true
        do {
            try await action()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
