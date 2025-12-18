#!/bin/bash

# ElectroWallet Project Validation Script
# Checks for missing components and potential issues

echo "======================================"
echo "ElectroWallet Project Validation"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

missing_count=0
found_count=0

echo "Checking project structure..."
echo ""

# Check for required services
echo "Services:"
if [ -f "ElectroWallet/Services/CryptoService.swift" ]; then
    echo -e "${GREEN}✓${NC} CryptoService.swift"
    ((found_count++))
else
    echo -e "${RED}✗${NC} CryptoService.swift - MISSING"
    ((missing_count++))
fi

if [ -f "ElectroWallet/Services/KeychainService.swift" ]; then
    echo -e "${GREEN}✓${NC} KeychainService.swift"
    ((found_count++))
else
    echo -e "${RED}✗${NC} KeychainService.swift - MISSING"
    ((missing_count++))
fi

if grep -q "BitcoinService" ElectroWallet/ViewModels/WalletManager.swift 2>/dev/null; then
    if [ -f "ElectroWallet/Services/BitcoinService.swift" ]; then
        echo -e "${GREEN}✓${NC} BitcoinService.swift"
        ((found_count++))
    else
        echo -e "${RED}✗${NC} BitcoinService.swift - MISSING (referenced but not implemented)"
        ((missing_count++))
    fi
fi

echo ""
echo "Views:"

# Check for required views
views=("WalletView" "SendView" "ReceiveView" "TransactionHistoryView" "SettingsView" "OnboardingView")
for view in "${views[@]}"; do
    if [ -f "ElectroWallet/Views/${view}.swift" ]; then
        echo -e "${GREEN}✓${NC} ${view}.swift"
        ((found_count++))
    else
        echo -e "${RED}✗${NC} ${view}.swift - MISSING"
        ((missing_count++))
    fi
done

echo ""
echo "Models:"
if [ -f "ElectroWallet/Models/Wallet.swift" ]; then
    echo -e "${GREEN}✓${NC} Wallet.swift"
    ((found_count++))
else
    echo -e "${RED}✗${NC} Wallet.swift - MISSING"
    ((missing_count++))
fi

echo ""
echo "ViewModels:"
if [ -f "ElectroWallet/ViewModels/WalletManager.swift" ]; then
    echo -e "${GREEN}✓${NC} WalletManager.swift"
    ((found_count++))
else
    echo -e "${RED}✗${NC} WalletManager.swift - MISSING"
    ((missing_count++))
fi

echo ""
echo "======================================"
echo "Code Analysis:"
echo "======================================"
echo ""

# Check for BIP39 word list
if grep -R "struct BIP39WordList" ElectroWallet/Services 2>/dev/null | grep -q "BIP39WordList"; then
    if grep -R "static let english" ElectroWallet/Services/BIP39WordList.swift 2>/dev/null >/dev/null; then
        echo -e "${GREEN}✓${NC} BIP39WordList implementation found"
        ((found_count++))
    else
        echo -e "${RED}✗${NC} BIP39WordList referenced but not fully implemented"
        ((missing_count++))
    fi
fi

# Check for error definitions
echo ""
echo "Error Handling:"
if grep -q "enum CryptoError" ElectroWallet/Services/CryptoService.swift 2>/dev/null; then
    echo -e "${GREEN}✓${NC} CryptoError enum defined"
else
    echo -e "${RED}✗${NC} CryptoError enum - MISSING"
    ((missing_count++))
fi

if grep -q "enum KeychainError" ElectroWallet/Services/KeychainService.swift 2>/dev/null; then
    echo -e "${GREEN}✓${NC} KeychainError enum defined"
else
    echo -e "${RED}✗${NC} KeychainError enum - MISSING"
    ((missing_count++))
fi

if grep -q "enum WalletError" ElectroWallet/ViewModels/WalletManager.swift 2>/dev/null; then
    echo -e "${GREEN}✓${NC} WalletError enum defined"
else
    echo -e "${RED}✗${NC} WalletError enum - MISSING"
    ((missing_count++))
fi

echo ""
echo "======================================"
echo "Summary:"
echo "======================================"
echo -e "Components found: ${GREEN}${found_count}${NC}"
echo -e "Components missing: ${RED}${missing_count}${NC}"
echo ""

if [ $missing_count -gt 0 ]; then
    echo -e "${YELLOW}⚠ Project is incomplete and will not build${NC}"
    echo ""
    echo "Missing components need to be implemented:"
    echo "  1. BitcoinService.swift - Bitcoin testnet API integration"
    echo "  2. All View files (6 views)"
    echo "  3. BIP39WordList - Complete word list implementation"
    exit 1
else
    echo -e "${GREEN}✓ All required components present${NC}"
    exit 0
fi
