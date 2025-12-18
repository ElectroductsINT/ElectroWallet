//
//  CryptoService.swift
//  ElectroWallet
//
//  Cryptographic operations for Bitcoin
//

import Foundation
import CryptoKit
import CommonCrypto

class CryptoService {
    static let shared = CryptoService()
    
    private init() {}
    
    // MARK: - Mnemonic Generation (BIP39)
    
    func generateMnemonic(strength: Int = 128) throws -> String {
        // Generate entropy
        let entropyBytes = strength / 8
        var entropy = Data(count: entropyBytes)
        let result = entropy.withUnsafeMutableBytes { bytes in
            SecRandomCopyBytes(kSecRandomDefault, entropyBytes, bytes.baseAddress!)
        }
        
        guard result == errSecSuccess else {
            throw CryptoError.randomGenerationFailed
        }
        
        // Convert to mnemonic
        return try entropyToMnemonic(entropy: entropy)
    }
    
    func validateMnemonic(_ mnemonic: String) -> Bool {
        let words = mnemonic.components(separatedBy: " ")
        return words.count == 12 || words.count == 24
    }
    
    private func entropyToMnemonic(entropy: Data) throws -> String {
        let wordList = BIP39WordList.english
        var bits = entropy.flatMap { byte -> [Bool] in
            (0..<8).reversed().map { (byte >> $0) & 1 == 1 }
        }
        
        // Add checksum
        let hash = SHA256.hash(data: entropy)
        let checksumBits = entropy.count / 4
        let checksumData = Data(hash)
        let checksum = checksumData.flatMap { byte -> [Bool] in
            (0..<8).reversed().map { (byte >> $0) & 1 == 1 }
        }
        bits.append(contentsOf: checksum.prefix(checksumBits))
        
        // Convert to words
        var words: [String] = []
        for i in stride(from: 0, to: bits.count, by: 11) {
            let end = min(i + 11, bits.count)
            let chunk = bits[i..<end]
            var index = 0
            for (j, bit) in chunk.enumerated() {
                if bit {
                    index |= 1 << (chunk.count - 1 - j)
                }
            }
            if index < wordList.count {
                words.append(wordList[index])
            }
        }
        
        return words.joined(separator: " ")
    }
    
    // MARK: - Key Derivation
    
    func mnemonicToSeed(mnemonic: String, passphrase: String = "") throws -> Data {
        let password = mnemonic.data(using: .utf8)!
        let salt = ("mnemonic" + passphrase).data(using: .utf8)!
        
        return try pbkdf2(password: password, salt: salt, iterations: 2048, keyLength: 64)
    }
    
    func derivePrivateKey(from seed: Data, path: String) throws -> Data {
        // Simplified key derivation - in production use a proper BIP32 library
        let pathData = path.data(using: .utf8)!
        let combined = seed + pathData
        let hash = SHA256.hash(data: combined)
        return Data(hash)
    }
    
    func derivePublicKey(from privateKey: Data) throws -> Data {
        // Simplified - in production use secp256k1
        let hash = SHA256.hash(data: privateKey)
        return Data(hash)
    }
    
    // MARK: - Address Generation
    
    func publicKeyToAddress(publicKey: Data, testnet: Bool = true) throws -> String {
        // Simplified address generation
        // In production, implement proper Base58Check encoding with RIPEMD-160
        
        // Hash public key
        let sha256Hash = SHA256.hash(data: publicKey)
        let ripemd160Hash = Data(sha256Hash.prefix(20)) // Simplified
        
        // Add version byte (0x6F for testnet, 0x00 for mainnet)
        var addressData = Data([testnet ? 0x6F : 0x00])
        addressData.append(ripemd160Hash)
        
        // Add checksum
        let checksum = SHA256.hash(data: SHA256.hash(data: addressData))
        addressData.append(Data(checksum.prefix(4)))
        
        // Base58 encode
        return base58Encode(addressData)
    }
    
    // MARK: - Signing
    
    func signTransaction(txData: Data, privateKey: Data) throws -> Data {
        // Simplified signing - use proper secp256k1 in production
        let hash = SHA256.hash(data: txData + privateKey)
        return Data(hash)
    }
    
    // MARK: - Helper Functions
    
    private func pbkdf2(password: Data, salt: Data, iterations: Int, keyLength: Int) throws -> Data {
        var derivedKey = Data(count: keyLength)
        let result = derivedKey.withUnsafeMutableBytes { derivedKeyBytes in
            salt.withUnsafeBytes { saltBytes in
                password.withUnsafeBytes { passwordBytes in
                    CCKeyDerivationPBKDF(
                        CCPBKDFAlgorithm(kCCPBKDF2),
                        passwordBytes.baseAddress?.assumingMemoryBound(to: Int8.self),
                        password.count,
                        saltBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        salt.count,
                        CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA512),
                        UInt32(iterations),
                        derivedKeyBytes.baseAddress?.assumingMemoryBound(to: UInt8.self),
                        keyLength
                    )
                }
            }
        }
        
        guard result == kCCSuccess else {
            throw CryptoError.keyDerivationFailed
        }
        
        return derivedKey
    }
    
    private func base58Encode(_ data: Data) -> String {
        let alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
        var num = data.reduce(0) { $0 << 8 | UInt64($1) }
        var encoded = ""
        
        while num > 0 {
            let remainder = Int(num % 58)
            num /= 58
            encoded = String(alphabet[alphabet.index(alphabet.startIndex, offsetBy: remainder)]) + encoded
        }
        
        // Add leading zeros
        for byte in data {
            if byte == 0 {
                encoded = "1" + encoded
            } else {
                break
            }
        }
        
        return encoded
    }
}

enum CryptoError: LocalizedError {
    case randomGenerationFailed
    case keyDerivationFailed
    case invalidMnemonic
    case signingFailed
    
    var errorDescription: String? {
        switch self {
        case .randomGenerationFailed:
            return "Failed to generate random bytes"
        case .keyDerivationFailed:
            return "Failed to derive key"
        case .invalidMnemonic:
            return "Invalid mnemonic phrase"
        case .signingFailed:
            return "Failed to sign transaction"
        }
    }
}
