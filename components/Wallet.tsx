
import React, { useState } from 'react';
import { User, MarketData } from '../types';
import { db } from '../services/mockDb';
import { useNotify } from './Notifications';

interface WalletProps {
  user: User;
  market: Record<string, MarketData>;
  onTransaction: () => void;
}

const Wallet: React.FC<WalletProps> = ({ user, market, onTransaction }) => {
  const [sendAmount, setSendAmount] = useState('');
  const [sendCurrency, setSendCurrency] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [recipient, setRecipient] = useState('');
  const notify = useNotify();

  const handleSend = () => {
    const amount = parseFloat(sendAmount);
    
    if (!amount || amount <= 0) {
      notify('error', 'Invalid amount');
      return;
    }
    
    if (amount > user.balance[sendCurrency]) {
      notify('error', 'Insufficient balance');
      return;
    }
    
    if (!recipient) {
      notify('error', 'Please enter a recipient');
      return;
    }

    // Find recipient user
    const allUsers = db.getUsers();
    const recipientUser = allUsers.find(u => 
      u.username === recipient || 
      u.walletAddresses.BTC === recipient ||
      u.walletAddresses.ETH === recipient ||
      u.walletAddresses.SOL === recipient
    );
    
    if (!recipientUser) {
      notify('error', 'Recipient not found');
      return;
    }

    // Process transaction
    db.addTransaction({
      senderUsername: user.username,
      receiverUsername: recipientUser.username,
      amount,
      currency: sendCurrency,
    });

    notify('success', `Sent ${amount} ${sendCurrency} to ${recipientUser.username}`);
    setSendAmount('');
    setRecipient('');
    onTransaction();
  };

  const formatBalance = (currency: 'BTC' | 'ETH' | 'SOL', balance: number): string => {
    if (currency === 'BTC') {
      return balance.toFixed(8);
    } else if (currency === 'ETH') {
      return balance.toFixed(6);
    } else {
      return balance.toFixed(4);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white mb-8">Wallet</h1>
      
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['BTC', 'ETH', 'SOL'] as const).map((currency) => {
          const balance = user.balance[currency];
          const price = market[currency]?.price || 0;
          const usdValue = balance * price;
          
          return (
            <div key={currency} className="glass p-6 rounded-2xl">
              <h3 className="text-white/50 text-xs font-mono uppercase mb-2">{currency}</h3>
              <p className="text-2xl font-bold text-white font-mono mb-1">
                {formatBalance(currency, balance)}
              </p>
              <p className="text-sm text-white/60">
                ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </p>
            </div>
          );
        })}
      </div>

      {/* Send Form */}
      <div className="glass p-8 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Send Cryptocurrency</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-white/50 mb-2 uppercase">Amount</label>
            <div className="flex gap-2">
              <input
                type="number"
                step={sendCurrency === 'BTC' ? '0.00000001' : sendCurrency === 'ETH' ? '0.000001' : '0.0001'}
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-electro-accent"
              />
              <select
                value={sendCurrency}
                onChange={(e) => setSendCurrency(e.target.value as any)}
                className="bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono focus:outline-none focus:border-electro-accent"
              >
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-white/50 mb-2 uppercase">Recipient (username or address)</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter username or wallet address"
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-electro-accent"
            />
          </div>

          <button
            onClick={handleSend}
            className="w-full py-4 bg-gradient-to-r from-electro-primary to-electro-accent text-white font-bold rounded-xl hover:opacity-90 transition-all font-mono uppercase"
          >
            Send {sendCurrency}
          </button>
        </div>
      </div>

      {/* Wallet Addresses */}
      <div className="glass p-8 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Your Addresses</h2>
        <div className="space-y-4">
          {(['BTC', 'ETH', 'SOL'] as const).map((currency) => (
            <div key={currency} className="p-4 bg-black/20 rounded-xl">
              <p className="text-xs text-white/50 font-mono mb-2">{currency}</p>
              <p className="text-sm text-electro-accent font-mono break-all">
                {user.walletAddresses[currency]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wallet;
