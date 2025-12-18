//
//  SendView.swift
//  ElectroWallet
//
//  Send BTC
//

import SwiftUI

struct SendView: View {
    @EnvironmentObject var walletManager: WalletManager
    @State private var toAddress: String = ""
    @State private var amountBTC: String = ""
    @State private var statusMessage: String?
    @State private var isSending = false
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Recipient")) {
                    TextField("Testnet address", text: $toAddress)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                }
                
                Section(header: Text("Amount (BTC)")) {
                    TextField("0.00010000", text: $amountBTC)
                        .keyboardType(.decimalPad)
                }
                
                if let status = statusMessage {
                    Text(status)
                        .foregroundColor(.secondary)
                }
                
                Button {
                    Task { await send() }
                } label: {
                    Label("Send", systemImage: "paperplane.fill")
                        .frame(maxWidth: .infinity)
                }
                .disabled(isSending || !isValidInput)
            }
            .navigationTitle("Send")
        }
    }
    
    private var isValidInput: Bool {
        guard !toAddress.isEmpty, let amount = Double(amountBTC), amount > 0 else { return false }
        return true
    }
    
    private func send() async {
        guard let amount = Double(amountBTC) else { return }
        let satoshis = Int64(amount * 100_000_000)
        isSending = true
        statusMessage = "Sending..."
        do {
            let txHash = try await walletManager.sendBitcoin(to: toAddress, amount: satoshis)
            statusMessage = "Sent! Tx: \(txHash)"
            toAddress = ""
            amountBTC = ""
        } catch {
            statusMessage = "Error: \(error.localizedDescription)"
        }
        isSending = false
    }
}
