import React, { useState, useEffect } from 'react';
import { User } from '../types';
import AdminPanel from './AdminPanel';
import { db } from '../services/mockDb';
import { electroSocket } from '../services/socket';
import { useNotify } from './Notifications';
import { formatCryptoAmount, formatPrice } from '../utils/formatters';

interface AdminConsoleProps {
  admin: User;
  onLogout: () => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ admin, onLogout }) => {
  const [view, setView] = useState<'overview' | 'users'>('overview');
  const [users, setUsers] = useState(db.getUsers());
  const [transactions, setTransactions] = useState(db.getTransactions());
  const [market, setMarket] = useState(db.getMarket());
  const [marketFrozen, setMarketFrozen] = useState(false);
  const [globalAlert, setGlobalAlert] = useState('');
  const notify = useNotify();

  const refreshData = () => {
    setUsers(db.getUsers());
    setTransactions(db.getTransactions());
    setMarket(db.getMarket());
  };

  useEffect(() => {
    electroSocket.connect('admin');
    electroSocket.onMarketFrozen((f) => setMarketFrozen(f));
    electroSocket.onMarketSnapshot((snap) => {
      setMarket(db.getMarket());
    });
    
    const interval = setInterval(() => {
      refreshData();
    }, 2000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'electrowallet_users' || e.key === 'electrowallet_transactions') {
        refreshData();
      }
    };
    window.addEventListener('storage', handleStorage);

    const handleFocus = () => refreshData();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const totalVolume = transactions.reduce((sum, tx) => {
    const price = market[tx.currency]?.price || 0;
    return sum + (tx.amount * price);
  }, 0);

  const totalTVL = users.reduce((sum, user) => {
    return sum + 
      (user.balance.BTC * market.BTC.price) +
      (user.balance.ETH * market.ETH.price) +
      (user.balance.SOL * market.SOL.price);
  }, 0);

  return (
    <div className="min-h-screen flex flex-col bg-electro-bg">
      <header className="glass sticky top-0 z-50 border-b border-white/5 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electro-secondary to-electro-primary flex items-center justify-center shadow-glow">
              <span className="text-xl font-bold italic tracking-tighter">A</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-none">Admin Console</h1>
              <span className="text-[10px] text-electro-accent font-mono uppercase tracking-[0.2em]">Privileged Operations</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button 
                onClick={() => setView('overview')}
                className={`px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
                  view === 'overview' ? 'bg-electro-primary/20 text-electro-primary border border-electro-primary/30' : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
              >
                Overview
              </button>
              <button 
                onClick={() => setView('users')}
                className={`px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
                  view === 'users' ? 'bg-electro-primary/20 text-electro-primary border border-electro-primary/30' : 'bg-white/5 hover:bg-white/10 border border-white/10'
                }`}
              >
                Users
              </button>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-mono text-white/50">ROOT</p>
              <p className="text-sm font-bold text-electro-secondary">@{admin.username}</p>
            </div>
            <button onClick={onLogout} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold border border-white/10 transition-colors">
              EXIT CONSOLE
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {view === 'overview' ? (
          <div className="space-y-8">
            {/* God Mode Controls */}
            <div className="glass p-8 rounded-2xl border-l-4 border-electro-accent bg-gradient-to-r from-electro-accent/5 to-transparent">
              <h2 className="text-xl font-bold font-mono text-white mb-6 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-electro-accent animate-pulse"></span>
                GOD MODE CONTROLS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-mono text-white/50 uppercase tracking-widest mb-4">Market Operations</h3>
                  <button
                    onClick={() => { 
                      electroSocket.adminFreeze(!marketFrozen); 
                      notify('info', (!marketFrozen ? 'Market frozen' : 'Market unfrozen')); 
                    }}
                    className={`w-full px-4 py-4 rounded-xl font-mono text-sm border transition-all ${
                      marketFrozen 
                        ? 'bg-danger/20 text-danger border-danger/30 hover:bg-danger/30' 
                        : 'bg-success/20 text-success border-success/30 hover:bg-success/30'
                    }`}
                  >
                    {marketFrozen ? '❄️ UNFREEZE MARKET' : '🔥 FREEZE MARKET'}
                  </button>
                  <button
                    onClick={() => { electroSocket.adminAirdrop(); notify('success', 'Airdrop broadcast sent.'); }}
                    className="w-full px-4 py-4 rounded-xl font-mono text-sm border bg-electro-accent/20 text-electro-accent border-electro-accent/30 hover:bg-electro-accent/30 transition-all"
                  >
                    🪂 BROADCAST AIRDROP
                  </button>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-mono text-white/50 uppercase tracking-widest mb-4">Global Alerts</h3>
                  <input
                    type="text"
                    value={globalAlert}
                    onChange={(e) => setGlobalAlert(e.target.value)}
                    placeholder="Type global alert message..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono text-sm focus:outline-none focus:border-electro-accent transition-all"
                  />
                  <button
                    onClick={() => { 
                      if (globalAlert.trim()) { 
                        electroSocket.adminAlert(globalAlert.trim()); 
                        notify('info', 'Global alert sent'); 
                        setGlobalAlert('');
                      } 
                    }}
                    className="w-full px-4 py-4 rounded-xl font-mono text-sm border bg-white/10 text-white border-white/20 hover:bg-white/20 transition-all"
                  >
                    📢 SEND GLOBAL ALERT
                  </button>
                </div>
              </div>
            </div>

            {/* System Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glass p-6 rounded-2xl border-l-4 border-electro-primary">
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-2">Total Users</p>
                <p className="text-3xl font-bold font-mono tracking-tighter">{users.length}</p>
                <p className="text-xs text-white/30 mt-2 font-mono">{users.filter(u => !u.isBanned).length} active</p>
              </div>
              
              <div className="glass p-6 rounded-2xl border-l-4 border-success">
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-2">Total TVL</p>
                <p className="text-3xl font-bold font-mono tracking-tighter">${totalTVL.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-success mt-2 font-mono">Platform value</p>
              </div>
              
              <div className="glass p-6 rounded-2xl border-l-4 border-electro-accent">
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-2">Transactions</p>
                <p className="text-3xl font-bold font-mono tracking-tighter">{transactions.length}</p>
                <p className="text-xs text-white/30 mt-2 font-mono">All time</p>
              </div>
              
              <div className="glass p-6 rounded-2xl border-l-4 border-electro-secondary">
                <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-2">Volume</p>
                <p className="text-3xl font-bold font-mono tracking-tighter">${totalVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-white/30 mt-2 font-mono">USD equivalent</p>
              </div>
            </div>

            {/* Market Status */}
            <div className="glass p-8 rounded-2xl">
              <h2 className="text-lg font-bold font-mono text-white mb-6 uppercase tracking-wider">Market Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.values(market).map((coin) => (
                  <div key={coin.symbol} className="bg-black/40 p-6 rounded-xl border border-white/10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white/50 text-xs font-mono uppercase mb-1">{coin.name}</h3>
                        <p className="text-2xl font-bold font-mono">${formatPrice(coin.price)}</p>
                      </div>
                      <span className={`text-xs font-mono px-3 py-1 rounded-full ${
                        coin.change24h >= 0 ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                      }`}>
                        {coin.change24h >= 0 ? '+' : ''}{Math.abs(coin.change24h).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-white/30 font-mono">
                      History: {coin.history.length} data points
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass p-8 rounded-2xl">
              <h2 className="text-lg font-bold font-mono text-white mb-6 uppercase tracking-wider">Recent Activity</h2>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {transactions.slice(0, 15).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${tx.status === 'Confirmed' ? 'bg-success' : 'bg-yellow-400'}`}></div>
                      <div>
                        <p className="text-sm font-mono">
                          <span className="text-electro-accent">@{tx.senderUsername}</span>
                          <span className="text-white/40"> → </span>
                          <span className="text-electro-secondary">@{tx.receiverUsername}</span>
                        </p>
                        <p className="text-xs text-white/30 font-mono">{new Date(tx.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold font-mono">{formatCryptoAmount(tx.amount)} {tx.currency}</p>
                      <p className="text-xs text-white/40 font-mono">${Math.round(tx.amount * (market[tx.currency]?.price || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <AdminPanel onUpdate={() => { setUsers(db.getUsers()); }} />
        )}
      </main>

      <footer className="border-t border-white/5 py-6 text-center text-xs text-white/30 font-mono">
        &copy; 2025 ELECTRO ADMIN CORE | CONSOLE v4.0.0
      </footer>
    </div>
  );
};

export default AdminConsole;
