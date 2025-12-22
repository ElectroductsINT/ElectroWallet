
import React, { useState, useEffect, useCallback } from 'react';
import { User, AppState, SubscriptionTier, Transaction } from './types';
import { db } from './services/mockDb';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Wallet from './components/Wallet';
import AdminPanel from './components/AdminPanel';
import Settings from './components/Settings';
import Navbar from './components/Navbar';
import { NotificationsProvider } from './components/Notifications';
import AdminAuth from './components/AdminAuth';
import AdminConsole from './components/AdminConsole';
import { electroSocket } from './services/socket';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const [view, setView] = useState<'dashboard' | 'wallet' | 'admin' | 'settings'>('dashboard');
  const [market, setMarket] = useState(db.getMarket());
  const [transactions, setTransactions] = useState(db.getTransactions());
  const [users, setUsers] = useState(db.getUsers());

  // Load persisted session (if any) and keep it in sync with storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('electrowallet_currentUser');
      if (raw) {
        const parsed = JSON.parse(raw);
        const existing = db.getUsers().find(u => u.id === parsed.id);
        if (existing) setCurrentUser(existing);
      }
    } catch (e) {
      console.warn('Failed to load persisted session:', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('electrowallet_currentUser', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('electrowallet_currentUser');
      }
    } catch (e) {
      console.warn('Failed to persist session:', e);
    }
  }, [currentUser]);

  // Live Market via Socket.io (Server Source of Truth)
  useEffect(() => {
    const socket = electroSocket.connect(currentUser?.username);
    let updateTimeout: NodeJS.Timeout;

    const applySnapshot = (snap: any) => {
      // Debounce market updates to prevent excessive re-renders
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        setMarket(prev => {
          const updated = { ...prev };
          const now = Date.now();
          // Map server snapshot (btc/eth/sol) to our uppercase keys and schema
          const mapEntry = (key: 'BTC'|'ETH'|'SOL', src: { price: number; change: number }) => {
            const coin = updated[key];
            if (!coin) return;
            updated[key] = {
              ...coin,
              price: src.price,
              change24h: src.change,
              history: [...coin.history.slice(-20), { time: now, price: src.price }]
            };
          };
          mapEntry('BTC', snap.btc);
          mapEntry('ETH', snap.eth);
          mapEntry('SOL', snap.sol);
          return updated;
        });
      }, 100); // Update every 100ms instead of every market tick
    };

    electroSocket.onMarketSnapshot(applySnapshot);
    electroSocket.onMarketUpdate(applySnapshot);

    // Listen for transaction confirmations to refresh user balance
    electroSocket.onTxConfirmed(() => {
      refreshData();
    });

    return () => {
      clearTimeout(updateTimeout);
      // Handlers are lightweight; socket.io cleans up on disconnect
    };
  }, [currentUser]);

  // Sync users and transactions
  const refreshData = useCallback(() => {
    setUsers([...db.getUsers()]);
    setTransactions([...db.getTransactions()]);
    if (currentUser) {
      const updatedSelf = db.getUsers().find(u => u.id === currentUser.id);
      if (updatedSelf) setCurrentUser(updatedSelf);
    }
  }, [currentUser]);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'electrowallet_users' || e.key === 'electrowallet_transactions' || e.key === 'electrowallet_tx_submitted') {
        refreshData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshData]);

  if (mode === 'admin') {
    if (!adminUser) {
      return (
        <NotificationsProvider>
          <AdminAuth onLogin={setAdminUser} onBack={() => setMode('user')} />
        </NotificationsProvider>
      );
    }
    return (
      <NotificationsProvider>
        <AdminConsole admin={adminUser} onLogout={() => setAdminUser(null)} />
      </NotificationsProvider>
    );
  }

  if (!currentUser) {
    return (
      <div>
        <Auth onLogin={setCurrentUser} />
        <div className="fixed bottom-4 right-4">
          <button
            onClick={() => setMode('admin')}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-mono hover:bg-white/10"
          >
            ADMIN CONSOLE
          </button>
        </div>
      </div>
    );
  }

  return (
    <NotificationsProvider>
    <div className="min-h-screen flex flex-col bg-electro-bg font-sans text-slate-200">
      <Navbar 
        user={currentUser} 
        onLogout={() => setCurrentUser(null)} 
        setView={setView} 
        currentView={view} 
      />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {view === 'dashboard' && (
          <Dashboard market={market} transactions={transactions} user={currentUser} />
        )}
        {view === 'wallet' && (
          <Wallet 
            user={currentUser} 
            market={market} 
            onTransaction={refreshData}
          />
        )}
        {/* Admin panel now lives in separate Admin Console flow */}
        {view === 'settings' && (
          <Settings 
            user={currentUser}
            onUpdate={refreshData}
          />
        )}
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-white/30 font-mono">
        &copy; 2024 ELECTRO-BLOCKCHAIN CORE v2.5.11 | PRODUCTION MAINNET
      </footer>
    </div>
    </NotificationsProvider>
  );
};

export default App;
