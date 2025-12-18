//
//  ReceiveView.swift
//  ElectroWallet
//
//  Display receive address
//

import SwiftUI

struct ReceiveView: View {
    @EnvironmentObject var walletManager: WalletManager
    
    var body: some View {
        VStack(spacing: 16) {
            Text("Your Testnet Address")
                .font(.headline)
            if let address = walletManager.currentWallet?.address {
                Text(address)
                    .font(.body)
                    .multilineTextAlignment(.center)
                    .textSelection(.enabled)
                    .padding()
                    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
            } else {
                Text("No wallet loaded")
            }
            Spacer()
        }
        .padding()
        .navigationTitle("Receive")
    }
}
