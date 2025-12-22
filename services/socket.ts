import { io, Socket } from 'socket.io-client';
import { INITIAL_MARKET } from '../constants';
import { marketDataGenerator, RealtimePriceTicker } from './marketData';

export type MarketSnapshot = {
  btc: { price: number; change: number };
  eth: { price: number; change: number };
  sol: { price: number; change: number };
  timestamp: number;
};

export type MempoolTx = {
  id: string;
  hash: string;
  senderUsername: string;
  receiverUsername: string;
  receiverAddress?: string;
  amount: number;
  currency: string;
  timestamp: number;
  status: 'Pending' | 'Confirmed' | 'Failed';
  confirmations?: number;
  requiredConfirmations?: number;
};

class ElectroSocket {
  private socket: Socket | null = null;
  private mockMode: boolean = true;
  private listeners: Map<string, Set<Function>> = new Map();
  private market = JSON.parse(JSON.stringify(INITIAL_MARKET));
  private marketTimer: any = null;
  private priceTicker: RealtimePriceTicker | null = null;
  private initialPrices = {
    BTC: 98240.5,
    ETH: 5123.44,
    SOL: 228.73
  };

  connect(username?: string) {
    if (this.socket) return this.socket;
    
    // Check if we're on localhost (development) or production (GitHub Pages)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isGitHubPages = window.location.hostname.includes('github.io');
    
    // Default to mock mode for production/GitHub Pages
    if (!isLocalhost || isGitHubPages) {
      this.mockMode = true;
      this.startMockMarketLoop();
      return null; // No real socket connection needed
    }
    
    // Try to connect to real server in development, but fallback to mock mode
    this.socket = io('http://localhost:4000', {
      transports: ['websocket'],
      query: username ? { username } : undefined,
      timeout: 1000,
    });

    // Detect if server is not available and enable mock mode
    this.socket.on('connect_error', () => {
      this.mockMode = true;
      this.startMockMarketLoop();
    });

    this.socket.on('connect', () => {
      this.mockMode = false;
    });

    // Always listen for localStorage changes for cross-tab sync
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    if (this.mockMode) {
      this.startMockMarketLoop();
    }

    return this.socket;
  }

  private startMockMarketLoop() {
    if (this.marketTimer) return;

    // Initialize realistic market data generator
    this.priceTicker = new RealtimePriceTicker(
      ['BTC', 'ETH', 'SOL'],
      this.initialPrices
    );

    // Start real-time price updates every 2 seconds
    this.priceTicker.start((symbol, price, change24h) => {
      this.market[symbol] = {
        ...this.market[symbol],
        price,
        change24h,
        history: [
          ...(this.market[symbol].history || []).slice(-100),
          { time: Math.floor(Date.now() / 1000), price }
        ]
      };
    }, 2000);

    // Emit initial snapshot immediately
    this.emit('LAST_SNAPSHOT', this.buildSnapshot());

    // Emit market updates at regular intervals (matches price ticker)
    this.marketTimer = setInterval(() => {
      this.emit('MARKET_UPDATE', this.buildSnapshot());
    }, 3500);
  }

  private buildSnapshot() {
    return {
      btc: { price: this.market.BTC.price, change: this.market.BTC.change24h },
      eth: { price: this.market.ETH.price, change: this.market.ETH.change24h },
      sol: { price: this.market.SOL.price, change: this.market.SOL.change24h },
      timestamp: Date.now(),
    };
  }

  private handleStorageChange(e: StorageEvent) {
    if (e.key === 'electrowallet_sync_event') {
      try {
        const event = JSON.parse(e.newValue || '{}');
        if (event.type && event.payload !== undefined) {
          const handlers = this.listeners.get(event.type);
          if (handlers) {
            handlers.forEach(cb => cb(event.payload));
          }
        }
      } catch (err) {
        console.error('Failed to parse storage event:', err);
      }
    }
  }

  private emit(eventType: string, payload: any) {
    if (this.mockMode) {
      // Broadcast to other tabs via localStorage with unique key to trigger change detection
      const eventId = `${eventType}_${Date.now()}_${Math.random()}`;
      localStorage.setItem('electrowallet_sync_event', JSON.stringify({
        id: eventId,
        type: eventType,
        payload,
        timestamp: Date.now()
      }));
      // Also trigger locally immediately
      const handlers = this.listeners.get(eventType);
      if (handlers) {
        handlers.forEach(cb => cb(payload));
      }
    } else {
      this.socket?.emit(eventType, payload);
    }
  }

  private on(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)?.add(callback);
    
    if (!this.mockMode) {
      this.socket?.on(eventType, callback as any);
    }
  }

  onMarketSnapshot(cb: (snap: MarketSnapshot) => void) {
    this.on('LAST_SNAPSHOT', cb);
  }

  onMarketUpdate(cb: (snap: MarketSnapshot) => void) {
    this.on('MARKET_UPDATE', cb);
  }

  onNewsUpdate(cb: (payload: { headlines: string[]; timestamp: number }) => void) {
    this.on('NEWS_UPDATE', cb);
  }

  onMempoolUpdate(cb: (txs: MempoolTx[]) => void) {
    this.on('MEMPOOL_UPDATE', cb);
  }

  onTxConfirmed(cb: (tx: MempoolTx) => void) {
    this.on('TX_CONFIRMED', cb);
  }

  onOnlineCount(cb: (count: number) => void) {
    this.on('ONLINE_COUNT', cb);
  }

  onMarketFrozen(cb: (frozen: boolean) => void) {
    this.on('MARKET_FROZEN', cb);
  }

  onAirdrop(cb: (payload: { amountSats: number; timestamp: number }) => void) {
    this.on('AIRDROP', cb);
  }

  onGlobalAlert(cb: (payload: { message: string; timestamp: number }) => void) {
    this.on('GLOBAL_ALERT', cb);
  }

  submitTx(payload: { from: string; to: string; amount: number; currency: string }) {
    // Always process in mock mode first (or forward to server)
    if (this.mockMode) {
      this.processMockTransaction(payload);
    } else {
      this.socket?.emit('SUBMIT_TX', payload);
    }
    // Broadcast to other tabs via localStorage
    localStorage.setItem('electrowallet_tx_submitted', JSON.stringify({
      payload,
      timestamp: Date.now()
    }));
  }

  private processMockTransaction(payload: { from: string; to: string; amount: number; currency: string }) {
    // Import db dynamically to avoid circular dependency
    import('../services/mockDb').then(({ db }) => {
      const sender = db.getUsers().find(u => u.username.toLowerCase() === payload.from.toLowerCase());
      const curr = payload.currency as 'BTC' | 'ETH' | 'SOL';
      // Resolve receiver by wallet address for the selected currency
      const receiver = db.getUsers().find(u => (u.walletAddresses?.[curr] || '').toLowerCase() === payload.to.toLowerCase());

      if (!sender || !receiver) {
        console.error('Transaction failed: User not found');
        return;
      }

      if (sender.balance[curr] < payload.amount) {
        console.error('Transaction failed: Insufficient balance');
        return;
      }

        // User-requested: show 3 confirmations for UX demo
        const requiredConfs = 3;
        const confInterval = 800; // ms per confirmation

      // Create transaction
      const tx: MempoolTx = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        senderUsername: sender.username,
        receiverUsername: receiver.username,
        receiverAddress: payload.to,
        amount: payload.amount,
        currency: payload.currency,
        timestamp: Date.now(),
          status: 'Pending',
          confirmations: 0,
          requiredConfirmations: requiredConfs
      };

      // Add to mempool (emit to all tabs)
      this.emit('MEMPOOL_UPDATE', [tx]);

        // Simulate blockchain confirmations (each block adds a confirmation)
        let currentConf = 0;
        const confirmationTimer = setInterval(() => {
          currentConf++;
          tx.confirmations = currentConf;
        
          // Update mempool with new confirmation count
          this.emit('MEMPOOL_UPDATE', [tx]);
        
          // Once we reach required confirmations, finalize the transaction
          if (currentConf >= requiredConfs) {
            clearInterval(confirmationTimer);
          
            // Update balances
            db.updateUser(sender.id, {
              balance: {
                ...sender.balance,
                [curr]: sender.balance[curr] - payload.amount
              }
            });

            db.updateUser(receiver.id, {
              balance: {
                ...receiver.balance,
                [curr]: receiver.balance[curr] + payload.amount
              }
            });

            // Add to transactions
            db.addTransaction({
              id: tx.id,
              senderId: sender.id,
              senderUsername: sender.username,
              receiverUsername: receiver.username,
              amount: payload.amount,
              currency: payload.currency,
              hash: tx.hash,
              timestamp: Date.now(),
              status: 'Confirmed'
            });

            // Emit final confirmation to all tabs
            tx.status = 'Confirmed';
            this.emit('TX_CONFIRMED', tx);
          }
        }, confInterval);
    });
  }

  adminFreeze(enabled: boolean) {
    this.emit('ADMIN_FREEZE', enabled);
    this.emit('MARKET_FROZEN', enabled);
  }

  adminAirdrop() {
    this.emit('ADMIN_AIRDROP', { amountSats: 1000, timestamp: Date.now() });
  }

  adminAlert(message: string) {
    this.emit('ADMIN_ALERT', { message, timestamp: Date.now() });
    this.emit('GLOBAL_ALERT', { message, timestamp: Date.now() });
  }
}

export const electroSocket = new ElectroSocket();
