
import { User, Transaction, MarketData, SubscriptionTier } from '../types';
import { MOCK_ADMIN, MOCK_TEST_USER, INITIAL_MARKET } from '../constants';
import { generateUniqueAddresses } from './address';

const BOT_NAMES = [
  'CryptoWhale', 'DiamondHands', 'MoonLambo', 'HODLgang', 'SatoshiFan', 
  'EthMaxi', 'SolanaSpeed', 'DeFiKing', 'NFTCollector', 'BlockchainBob',
  'SatoshiNakamoto', 'VitalikButerin', 'WhaleAlert', 'FlashTrader', 'HODLKnight',
  'MoonShot', 'DeFiLord', 'CryptoNinja', 'TokenSwapper', 'YieldFarmer',
  'LiquidityPro', 'StakingMaster', 'ChainExplorer', 'GasOptimizer', 'SmartContract'
];

const createBotUsers = (): User[] => {
  const bots: User[] = [];
  const tiers = [SubscriptionTier.FREE, SubscriptionTier.STANDARD, SubscriptionTier.PREMIUM];
  
  for (let i = 0; i < BOT_NAMES.length; i++) {
    const existingUsers = [MOCK_ADMIN, ...bots];
    const walletAddresses = generateUniqueAddresses(existingUsers);
    bots.push({
      id: `bot-${i + 1}`,
      username: BOT_NAMES[i],
      passwordHash: 'bot123',
      subscriptionTier: tiers[Math.floor(Math.random() * tiers.length)],
      isBanned: false,
      isAdmin: false,
      mnemonic: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
      walletAddresses,
      balance: {
        BTC: Math.random() * 5,
        ETH: Math.random() * 50,
        SOL: Math.random() * 500
      }
    });
  }
  return bots;
};

const createBotTransactions = (users: User[]): Transaction[] => {
  const txs: Transaction[] = [];
  const currencies: ('BTC' | 'ETH' | 'SOL')[] = ['BTC', 'ETH', 'SOL'];
  
  for (let i = 0; i < 50; i++) {
    const sender = users[Math.floor(Math.random() * users.length)];
    const receiver = users[Math.floor(Math.random() * users.length)];
    if (sender.id === receiver.id) continue;
    
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    const amount = Math.random() * 5;
    
    txs.push({
      id: `tx-bot-${i + 1}`,
      senderId: sender.id,
      senderUsername: sender.username,
      receiverUsername: receiver.username,
      amount,
      currency,
      hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: Date.now() - Math.random() * 7200000,
      status: 'Confirmed'
    });
  }
  return txs.sort((a, b) => b.timestamp - a.timestamp);
};

class MockDB {
  private users: User[];
  private transactions: Transaction[];
  private market: Record<string, MarketData> = INITIAL_MARKET;
  private readonly USERS_KEY = 'electrowallet_users';
  private readonly TRANSACTIONS_KEY = 'electrowallet_transactions';
  private botActivityTimer: any = null;
  
  constructor() {
    // Load from localStorage or initialize
    const savedUsers = this.loadFromStorage(this.USERS_KEY);
    const savedTransactions = this.loadFromStorage(this.TRANSACTIONS_KEY);
    
    if (savedUsers && savedUsers.length > 0) {
      this.users = savedUsers;
    } else {
      const bots = createBotUsers();
      // Include a demo test user so 'testuser' / 'test123' works out of the box
      this.users = [MOCK_ADMIN, MOCK_TEST_USER, ...bots];
      this.saveToStorage(this.USERS_KEY, this.users);
    }
    
    if (savedTransactions && savedTransactions.length > 0) {
      this.transactions = savedTransactions;
    } else {
      this.transactions = createBotTransactions(this.users);
      this.saveToStorage(this.TRANSACTIONS_KEY, this.transactions);
    }

    // Start background bot activity
    this.startBotActivity();
  }

  private startBotActivity() {
    if (this.botActivityTimer) return;
    this.botActivityTimer = setInterval(() => {
      if (Math.random() < 0.7) { // 70% chance every 8s
        this.generateBotTransaction();
      }
    }, 8000);
  }

  private generateBotTransaction() {
    const bots = this.users.filter(u => !u.isAdmin && u.username !== 'admin');
    if (bots.length < 2) return;

    const sender = bots[Math.floor(Math.random() * bots.length)];
    const receiver = bots[Math.floor(Math.random() * bots.length)];
    if (sender.id === receiver.id) return;

    const currencies: ('BTC' | 'ETH' | 'SOL')[] = ['BTC', 'ETH', 'SOL'];
    const currency = currencies[Math.floor(Math.random() * currencies.length)];
    const amount = Math.random() * 3;

    if (sender.balance[currency] < amount) return;

    // Update balances
    this.updateUser(sender.id, {
      balance: { ...sender.balance, [currency]: sender.balance[currency] - amount }
    });
    this.updateUser(receiver.id, {
      balance: { ...receiver.balance, [currency]: receiver.balance[currency] + amount }
    });

    // Add transaction
    const tx: Transaction = {
      id: `tx-bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: sender.id,
      senderUsername: sender.username,
      receiverUsername: receiver.username,
      amount,
      currency,
      hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: Date.now(),
      status: 'Confirmed'
    };
    this.addTransaction(tx);
  }

  private loadFromStorage(key: string): any {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
      return null;
    }
  }

  private saveToStorage(key: string, data: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }

  getUsers() { 
    // Always reload from storage to ensure we have the latest users
    const savedUsers = this.loadFromStorage(this.USERS_KEY);
    if (savedUsers && savedUsers.length > 0) {
      this.users = savedUsers;
    }
    return this.users; 
  }
  
  getTransactions() { return this.transactions; }
  getMarket() { return this.market; }

  addUser(user: User) {
    this.users.push(user);
    this.saveToStorage(this.USERS_KEY, this.users);
  }

  updateUser(id: string, updates: Partial<User>) {
    this.users = this.users.map(u => u.id === id ? { ...u, ...updates } : u);
    this.saveToStorage(this.USERS_KEY, this.users);
  }

  addTransaction(tx: Transaction) {
    this.transactions = [tx, ...this.transactions];
    this.saveToStorage(this.TRANSACTIONS_KEY, this.transactions);
  }

  updateMarket(symbol: string, newPrice: number) {
    const coin = this.market[symbol];
    if (coin) {
      const change = ((newPrice - coin.price) / coin.price) * 100;
      this.market[symbol] = {
        ...coin,
        price: newPrice,
        change24h: change,
        history: [...coin.history.slice(-20), { time: Date.now(), price: newPrice }]
      };
    }
  }

  // Reset database to initial state
  reset() {
    localStorage.removeItem(this.USERS_KEY);
    localStorage.removeItem(this.TRANSACTIONS_KEY);
    const bots = createBotUsers();
    this.users = [MOCK_ADMIN, ...bots];
    this.transactions = createBotTransactions(this.users);
    this.saveToStorage(this.USERS_KEY, this.users);
    this.saveToStorage(this.TRANSACTIONS_KEY, this.transactions);
  }
}

export const db = new MockDB();
