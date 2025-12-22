
import React, { useEffect, useState } from 'react';
import { MarketData, Transaction, User } from '../types';
import MarketChart from './MarketChart';
import NewsTicker from './NewsTicker';
import { electroSocket, MempoolTx } from '../services/socket';

interface DashboardProps {
  market: Record<string, MarketData>;
  transactions: Transaction[];
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ market, transactions, user }) => {
  const [mempool, setMempool] = useState<MempoolTx[]>([]);
  const [selectedChart, setSelectedChart] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');

  useEffect(() => {
    electroSocket.connect(user.username);
    electroSocket.onMempoolUpdate((txs) => setMempool(txs));
  }, [user.username]);

  const btcPrice = market.BTC?.price || 0;
  const ethPrice = market.ETH?.price || 0;
  const solPrice = market.SOL?.price || 0;
  
  const totalValue = (user.balance.BTC * btcPrice) + (user.balance.ETH * ethPrice) + (user.balance.SOL * solPrice);
  const userTxs = transactions.filter(tx => tx.senderUsername === user.username || tx.receiverUsername === user.username);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* Left Column: Market Ticker & Stats */}
      <div className="lg:col-span-2 space-y-6 lg:space-y-8">
        {/* Portfolio Stats with 3D effect */}
        <div className="group glass p-6 lg:p-8 rounded-2xl shadow-3d hover:shadow-3d-lg hover:-translate-y-1 transition-all duration-500 border-l-4 border-blue-400/60 bg-gradient-to-r from-blue-500/8 via-slate-900/50 to-transparent">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
            <div className="group/stat cursor-pointer p-4 rounded-xl hover:bg-white/5 transition-all">
              <p className="text-white/50 text-[9px] lg:text-[10px] font-mono uppercase tracking-widest mb-2 group-hover/stat:text-cyan-400 transition-colors">Portfolio Value</p>
              <p className="text-xl lg:text-2xl font-bold font-mono tracking-tighter text-white group-hover/stat:text-cyan-300 group-hover/stat:scale-105 transition-all drop-shadow-[0_0_15px_rgba(94,231,223,0.3)]">${totalValue === 0 ? '0' : totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="group/stat cursor-pointer p-4 rounded-xl hover:bg-white/5 transition-all">
              <p className="text-white/50 text-[9px] lg:text-[10px] font-mono uppercase tracking-widest mb-2 group-hover/stat:text-emerald-400 transition-colors">Transactions</p>
              <p className="text-xl lg:text-2xl font-bold font-mono tracking-tighter text-white group-hover/stat:text-emerald-300 group-hover/stat:scale-105 transition-all drop-shadow-[0_0_15px_rgba(110,231,183,0.3)]">{userTxs.length}</p>
            </div>
            <div className="group/stat cursor-pointer p-4 rounded-xl hover:bg-white/5 transition-all">
              <p className="text-white/50 text-[9px] lg:text-[10px] font-mono uppercase tracking-widest mb-2 group-hover/stat:text-amber-400 transition-colors">Account Status</p>
              <p className="text-xl lg:text-2xl font-bold font-mono tracking-tighter text-amber-300 group-hover/stat:scale-105 transition-all drop-shadow-[0_0_15px_rgba(217,119,6,0.3)]">{user.subscriptionTier}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
          {Object.values(market).map((coin: MarketData) => (
            <div key={coin.symbol} className="group glass p-4 lg:p-6 rounded-2xl hover:border-cyan-400/50 shadow-lg hover:shadow-3d hover:-translate-y-1 transition-all duration-500 cursor-pointer">
              <div className="flex justify-between items-start mb-4 lg:mb-5">
                <div className="flex-1">
                  <h3 className="text-white/50 text-[9px] lg:text-xs font-mono uppercase tracking-wider group-hover:text-cyan-400 transition-colors">{coin.name}</h3>
                  <p className="text-lg lg:text-2xl font-bold font-mono tracking-tighter text-white group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_10px_rgba(94,231,223,0.2)]">${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <span className={`text-[9px] lg:text-xs font-mono px-3 lg:px-4 py-1.5 rounded-full transition-all transform group-hover:scale-110 whitespace-nowrap font-semibold ${coin.change24h >= 0 ? 'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25 group-hover:shadow-lg group-hover:shadow-emerald-500/20' : 'bg-rose-500/15 text-rose-400 group-hover:bg-rose-500/25 group-hover:shadow-lg group-hover:shadow-rose-500/20'}`}>
                  {coin.change24h >= 0 ? '↑ +' : '↓ '}{coin.change24h.toFixed(2)}%
                </span>
              </div>
              <div className="h-10 lg:h-12 w-full rounded-lg bg-white/3 overflow-hidden">
                <div className="flex items-end gap-0.5 h-full opacity-40 group-hover:opacity-70 transition-opacity duration-300">
                  {coin.history.slice(-15).map((h, i) => (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-sm transition-all ${coin.change24h >= 0 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' : 'bg-gradient-to-t from-rose-500 to-rose-400'}`}
                      style={{ height: `${20 + (Math.random() * 80)}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Live Market Chart with 3D container */}
        <div className="glass p-4 lg:p-8 rounded-2xl shadow-3d">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 lg:mb-8">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-lg shadow-cyan-400/50"></span>
              <h2 className="text-sm lg:text-lg font-bold text-white tracking-wider">LIVE MARKET</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {['BTC', 'ETH', 'SOL'].map(sym => (
                <button 
                  key={sym}
                  onClick={() => setSelectedChart(sym as any)}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-mono font-semibold transition-all transform duration-300 ${
                    selectedChart === sym 
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 shadow-lg shadow-cyan-400/20 scale-105' 
                      : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80'
                  }`}
                >
                  {sym}
                </button>
              ))}
              <div className="w-px bg-white/10"></div>
              {['line', 'candle'].map(type => (
                <button
                  key={type}
                  onClick={() => setChartType(type as any)}
                  className={`px-3 lg:px-4 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-mono font-semibold transition-all transform duration-300 ${
                    chartType === type 
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/60 shadow-lg shadow-emerald-400/20 scale-105' 
                      : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80'
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <MarketChart 
            data={market[selectedChart]?.history || []} 
            symbol={selectedChart}
            chartType={chartType}
          />
        </div>
      </div>

      {/* Right Column: Transaction Stream & News */}
      <div className="space-y-6 lg:space-y-8">
        <div className="glass p-4 lg:p-6 rounded-2xl shadow-3d">
          <h2 className="text-xs lg:text-sm font-bold font-mono text-white/60 mb-4 lg:mb-5 uppercase tracking-widest">⧗ Pending Mempool</h2>
          {mempool.length === 0 ? (
            <p className="text-[9px] lg:text-xs text-white/40 font-mono text-center py-4">No pending transactions.</p>
          ) : (
            <div className="space-y-2 lg:space-y-3 overflow-y-auto max-h-[160px] lg:max-h-[200px] pr-2">
              {mempool.slice(0, 20).map((tx) => (
                <div key={tx.hash} className="border-l-2 border-amber-500/40 pl-3 py-2 rounded-r-lg bg-amber-500/5 hover:bg-amber-500/10 transition-all">
                  <p className="text-[9px] lg:text-xs font-mono text-white/80">
                    <span className="text-cyan-400 font-semibold">@{tx.senderUsername}</span>
                    <span className="text-white/40"> → </span>
                    <span className="text-white">{tx.amount} {tx.currency}</span>
                  </p>
                  <p className="text-[8px] lg:text-[9px] text-amber-400 font-mono font-bold uppercase mt-1">⧗ Pending</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-4 lg:p-6 rounded-2xl shadow-3d flex flex-col h-96 lg:h-[500px]">
          <h2 className="text-xs lg:text-sm font-bold font-mono text-white/60 mb-4 lg:mb-5 uppercase tracking-widest">⊙ Global Feed</h2>
          <div className="flex-1 overflow-y-auto space-y-2 lg:space-y-3 pr-2">
            {transactions.slice(0, 15).map((tx) => (
              <div key={tx.id} className="border-l-2 border-emerald-500/40 pl-3 py-2 rounded-r-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition-all">
                <p className="text-[9px] lg:text-xs font-mono text-white/80 line-clamp-2">
                  <span className="text-cyan-400 font-semibold">@{tx.senderUsername}</span> 
                  <span className="text-white/40"> → </span>
                  <span className="text-purple-400 font-semibold">@{tx.receiverUsername}</span>
                </p>
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-white/50 font-mono">{tx.amount} {tx.currency}</span>
                  <span className="text-[8px] text-emerald-400 font-mono uppercase font-semibold">✓ Confirmed</span>
                </div>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-[9px] text-center text-white/30 mt-10 font-mono">Synchronizing ledger...</p>
            )}
          </div>
        </div>

        <NewsTicker />
      </div>
    </div>
  );
};

export default Dashboard;
