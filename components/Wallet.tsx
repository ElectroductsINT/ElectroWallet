import React, { useState } from 'react';
import { User, MarketData, Transaction } from '../types';
import { db } from '../services/mockDb';
import { TransactionConfirmDialog, AddressQR } from './WalletSecurity';
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
  const [showConfirm, setShowConfirm] = useState(false);
  const notify = useNotify();

  const formatBalance = (amount: number, currency: string): string => {
    if (amount === 0) return '0';
    if (amount < 0.000001) return amount.toFixed(8);
    if (amount < 0.01) return amount.toFixed(6);
    if (amount < 1) return amount.toFixed(4);
    return amount.toFixed(2);
  };

  const formatUSD = (amount: number): string => {
    if (amount === 0) return '$0';
    if (amount < 0.01) return `$${amount.toFixed(4)}`;
    if (amount < 1) return `$${amount.toFixed(2)}`;
    return `$${Math.round(amount).toLocaleString()}`;
  };

  const handleSend = () => {
    const amount = parseFloat(sendAmount);
    
    if (!amount || amount <= 0) {
      notify('error', 'Please enter a valid amount');
      return;
    }

    if (!recipient) {
      notify('error', 'Please enter a recipient username');
      return;
    }

    if (user.balance[sendCurrency] < amount) {
      notify('error', 'Insufficient balance');
      return;
    }

    const recipientUser = db.getUsers().find(u => u.username.toLowerCase() === recipient.toLowerCase());
    if (!recipientUser) {
      notify('error', 'Recipient not found');
      return;
    }

    if (recipientUser.id === user.id) {
      notify('error', 'Cannot send to yourself');
      return;
    }

    setShowConfirm(true);
  };

  const confirmTransaction = (pin: string) => {
    const amount = parseFloat(sendAmount);
    const recipientUser = db.getUsers().find(u => u.username.toLowerCase() === recipient.toLowerCase());
    
    if (!recipientUser) {
      notify('error', 'Recipient not found');
      setShowConfirm(false);
      return;
    }

    // Update balances
    db.updateUser(user.id, {
      balance: {
        ...user.balance,
        [sendCurrency]: user.balance[sendCurrency] - amount
      }
    });

    db.updateUser(recipientUser.id, {
      balance: {
        ...recipientUser.balance,
        [sendCurrency]: recipientUser.balance[sendCurrency] + amount
      }
    });

    // Create transaction
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      senderId: user.id,
      senderUsername: user.username,
      receiverUsername: recipientUser.username,
      amount,
      currency: sendCurrency,
      hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      timestamp: Date.now(),
      status: 'Confirmed'
    };

    db.addTransaction(tx);

    notify('success', `Successfully sent ${amount} ${sendCurrency} to ${recipientUser.username}`);
    
    setSendAmount('');
    setRecipient('');
    setShowConfirm(false);
    onTransaction();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-mono text-white mb-6">Wallet</h1>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(market).map(([symbol, coin]) => {
          const balance = user.balance[symbol as 'BTC' | 'ETH' | 'SOL'];
          const usdValue = balance * coin.price;

          return (
            <div key={symbol} className="glass p-6 rounded-2xl border border-white/10 hover:border-cyan-400/50 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-white/50 text-xs font-mono uppercase">{coin.name}</p>
                  <p className="text-2xl font-bold font-mono text-white mt-1">
                    {formatBalance(balance, symbol)}
                  </p>
                  <p className="text-sm text-white/40 font-mono mt-1">
                    {formatUSD(usdValue)}
                  </p>
                </div>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-400">
                  {symbol}
                </span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] text-white/30 font-mono uppercase mb-2">Receive Address</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[10px] text-electro-accent font-mono truncate flex-1">
                    {user.walletAddresses[symbol as 'BTC' | 'ETH' | 'SOL']}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(user.walletAddresses[symbol as 'BTC' | 'ETH' | 'SOL']);
                      notify('success', 'Address copied');
                    }}
                    className="text-[10px] text-white/40 hover:text-white font-mono"
                  >
                    COPY
                  </button>
                </div>
                <div className="mt-2">
                  <AddressQR address={user.walletAddresses[symbol as 'BTC' | 'ETH' | 'SOL']} currency={symbol} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Send Transaction */}
      <div className="glass p-6 rounded-2xl border border-white/10">
        <h2 className="text-lg font-bold font-mono text-white mb-6">Send Cryptocurrency</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-white/50 mb-2 uppercase">Currency</label>
            <select
              value={sendCurrency}
              onChange={(e) => setSendCurrency(e.target.value as 'BTC' | 'ETH' | 'SOL')}
              className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
              <option value="SOL">Solana (SOL)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-white/50 mb-2 uppercase">Amount</label>
            <input
              type="number"
              step="0.000001"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-cyan-400"
            />
            <p className="text-xs text-white/30 mt-1 font-mono">
              Available: {formatBalance(user.balance[sendCurrency], sendCurrency)} {sendCurrency}
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono text-white/50 mb-2 uppercase">Recipient Username</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-black/40 border border-white/20 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            onClick={handleSend}
            className="w-full py-3 bg-gradient-to-r from-electro-primary to-electro-secondary rounded-xl font-mono text-sm font-bold hover:opacity-90 transition-all"
          >
            SEND {sendCurrency}
          </button>
        </div>
      </div>

      <TransactionConfirmDialog
        isOpen={showConfirm}
        amount={parseFloat(sendAmount) || 0}
        currency={sendCurrency}
        recipient={recipient}
        onConfirm={confirmTransaction}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default Wallet;
