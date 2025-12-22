
import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { electroSocket } from '../services/socket';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  setView: (v: 'dashboard' | 'wallet' | 'admin' | 'settings') => void;
  currentView: string;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, setView, currentView }) => {
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [frozen, setFrozen] = useState<boolean>(false);

  useEffect(() => {
    electroSocket.connect(user.username);
    electroSocket.onOnlineCount((n) => setOnlineCount(n));
    electroSocket.onMarketFrozen((f) => setFrozen(f));
  }, [user.username]);

  return (
    <nav className="glass sticky top-0 z-50 border-b border-cyan-400/10 px-6 py-4 shadow-3d">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo & Branding */}
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-400/80 via-blue-400/60 to-purple-400/70 flex items-center justify-center shadow-lg shadow-cyan-400/30 hover:shadow-cyan-400/50 hover:scale-110 transition-all duration-300 cursor-pointer group">
            <span className="text-xl font-bold italic tracking-tighter text-white group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]">⚡</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-none drop-shadow-[0_0_10px_rgba(94,231,223,0.3)]">ElectroWallet</h1>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-widest font-semibold">Quantum Secure v2.5</span>
              <span className={`text-[9px] font-mono px-2.5 py-0.5 rounded-full font-semibold transition-all ${frozen ? 'bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/10' : 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10'}`}>
                {frozen ? '◆ FROZEN' : '● LIVE'}
              </span>
              <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 font-semibold">👥 {onlineCount}</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          <NavButton active={currentView === 'dashboard'} onClick={() => setView('dashboard')}>Dashboard</NavButton>
          <NavButton active={currentView === 'wallet'} onClick={() => setView('wallet')}>Wallet</NavButton>
          <NavButton active={currentView === 'settings'} onClick={() => setView('settings')}>Settings</NavButton>
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] text-white/60 font-mono uppercase tracking-wider">{user.subscriptionTier} Tier</p>
            <p className="text-sm font-bold text-white drop-shadow-[0_0_8px_rgba(167,139,250,0.3)]">@{user.username}</p>
          </div>
          <button 
            onClick={onLogout}
            className="px-5 py-2.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 hover:border-rose-400/70 text-xs font-bold font-mono text-rose-400 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/20 hover:-translate-y-0.5 transform"
          >
            DISCONNECT
          </button>
        </div>
      </div>
    </nav>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button 
    onClick={onClick}
    className={`px-5 py-2.5 rounded-lg text-xs font-bold font-mono transition-all duration-300 transform hover:-translate-y-0.5 ${
      active 
        ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/60 shadow-lg shadow-cyan-400/20' 
        : 'text-white/60 hover:text-white/90 hover:bg-white/10 hover:border-white/20 border border-transparent'
    }`}
  >
    {children}
  </button>
);

export default Navbar;
