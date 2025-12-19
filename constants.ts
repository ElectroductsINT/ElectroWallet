
import { SubscriptionTier, User } from './types';

export const MNEMONIC_WORDS = [
  'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident',
  'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act', 'action', 'actor', 'actress', 'actual',
  'adapt', 'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford',
  'afraid', 'again', 'age', 'agent', 'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol',
  'alert', 'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter', 'always'
];

export const MOCK_ADMIN: User = {
  id: 'admin-001',
  username: 'admin',
  passwordHash: 'admin123',
  subscriptionTier: SubscriptionTier.PREMIUM,
  isBanned: false,
  isAdmin: true,
  walletAddresses: {
    BTC: 'bc1qadminx7v678hnd73ndu293ns7sk2k9sh3',
    ETH: '0xAdmin000000000000000000000000000000000001',
    SOL: 'AdminAdminAdminAdminAdminAdminAdminAdminAdminA'
  },
  balance: { BTC: 100, ETH: 500, SOL: 10000 },
};

export const INITIAL_MARKET = {
  // Roughly mimic late-2025 spot prices
  BTC: { symbol: 'BTC', name: 'Bitcoin', price: 98240.5, change24h: 1.2, history: [] },
  ETH: { symbol: 'ETH', name: 'Ethereum', price: 5123.44, change24h: 0.8, history: [] },
  SOL: { symbol: 'SOL', name: 'Solana', price: 228.73, change24h: 3.5, history: [] },
};
