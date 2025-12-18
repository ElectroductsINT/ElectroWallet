# ElectroWallet - Bitcoin Testnet iOS Wallet

A native iOS cryptocurrency wallet application built for Bitcoin testnet that can be distributed via enterprise or ad-hoc provisioning profiles.

## Features

- Bitcoin testnet support
- Wallet creation and recovery (BIP39 mnemonic)
- Send and receive Bitcoin testnet coins
- Transaction history
- QR code scanning for addresses
- Secure keychain storage
- Balance tracking

## Requirements

- Xcode 14.0+
- iOS 15.0+
- Swift 5.7+
- Apple Developer Account (for distribution)

## Installation

### For Development
1. Open `ElectroWallet.xcodeproj` in Xcode
2. Select your development team in signing settings
3. Build and run on simulator or device

### For Distribution via Profile
1. Archive the app in Xcode
2. Export with Ad-Hoc or Enterprise provisioning profile
3. Upload the `.ipa` file to your distribution server
4. Create a manifest.plist for OTA installation
5. Users can install via Safari visiting the installation URL

## Distribution

The app can be distributed using:
- **Ad-Hoc Distribution**: Up to 100 devices registered in your Apple Developer account
- **Enterprise Distribution**: Unlimited devices for enterprise Apple Developer Program members

## Project Structure

```
ElectroWallet/
├── App/                    # App delegate and main configuration
├── Models/                 # Data models (Wallet, Transaction, etc.)
├── Views/                  # SwiftUI views
├── ViewModels/             # View models for MVVM architecture
├── Services/               # Bitcoin, networking, and storage services
├── Utilities/              # Helper functions and extensions
├── Resources/              # Assets, fonts, and other resources
└── Supporting Files/       # Info.plist, entitlements, etc.
```

## Security

- Private keys are stored in iOS Keychain
- Mnemonic phrases are encrypted
- Testnet only - DO NOT use with real Bitcoin
- App Transport Security enabled
- Code signing required

## Bitcoin Testnet

This wallet connects to Bitcoin testnet. You can get free testnet coins from:
- https://testnet-faucet.mempool.co/
- https://bitcoinfaucet.uo1.net/
- https://testnet.help/en/btcfaucet/testnet

## License

MIT License
