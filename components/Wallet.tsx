
import React, { useEffect, useState } from 'react';
import { User, MarketData, SubscriptionTier } from '../types';
import { db } from '../services/mockDb';
import BankingBridge from './BankingBridge';
import { electroSocket, MempoolTx } from '../services/socket';
import { useNotify } from './Notifications';
import { validateAddress } from '../services/address';

interface WalletProps {
  user: User;
  market: Record<string, MarketData>;
  onTransaction: () => void;
}

const Wallet: React.FC<WalletProps> = ({ user, market, onTransaction }) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [isBridging, setIsBridging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mempool, setMempool] = useState<MempoolTx[]>([]);
  const [recipientInvalid, setRecipientInvalid] = useState(false);
  const notify = useNotify();
  
  const totalValue = user.balance.BTC * market.BTC.price + user.balance.ETH * market.ETH.price + user.balance.SOL * market.SOL.price;

  useEffect(() => {
    electroSocket.connect(user.username);
    electroSocket.onMempoolUpdate((txs) => setMempool(txs));
    electroSocket.onTxConfirmed((tx) => {
      setSuccess(`Confirmed: ${tx.amount} ${tx.currency} from @${tx.senderUsername} to @${tx.receiverUsername}`);
      notify('success', `Transfer confirmed: ${tx.amount} ${tx.currency} → @${tx.receiverUsername}`);
      // Update local ledger and balances
      const sender = db.getUsers().find(u => u.username === tx.senderUsername);
      const receiver = db.getUsers().find(u => u.username === tx.receiverUsername);
      if (receiver) {
        db.updateUser(receiver.id, { balance: { ...receiver.balance, [tx.currency]: receiver.balance[tx.currency as any] + tx.amount } });
      }
      if (sender) {
        db.updateUser(sender.id, { balance: { ...sender.balance, [tx.currency]: sender.balance[tx.currency as any] - tx.amount } });
      }
      db.addTransaction({
        id: tx.id,
        senderId: sender?.id || 'unknown',
        senderUsername: tx.senderUsername,
        receiverUsername: tx.receiverUsername,
        amount: tx.amount,
        currency: tx.currency as any,
        hash: tx.hash,
        timestamp: tx.timestamp,
        status: 'Confirmed'
      });
      onTransaction();
    });
  }, [user.username]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setRecipientInvalid(false);

    const sendAmount = parseFloat(amount);
    if (isNaN(sendAmount) || sendAmount <= 0) {
      setError('Invalid amount.');
      return;
    }

    if (user.balance[currency] < sendAmount) {
      setError(`Insufficient ${currency} balance.`);
      return;
    }

    // Refresh users from storage each send to catch new users from other tabs/browsers
    const recipientTrimmed = recipient.trim();

    // Validate address against selected currency format
    if (!validateAddress(currency, recipientTrimmed)) {
      setError(`Invalid ${currency} address format.`);
      setRecipientInvalid(true);
      return;
    }

    const users = db.getUsers();
    const receiver = users.find(u => (u.walletAddresses?.[currency] || '').toLowerCase() === recipientTrimmed.toLowerCase());
    if (!receiver) {
      setError('Destination address not found on the network.');
      setRecipientInvalid(true);
      return;
    }
    if (receiver.id === user.id) { setError('Cannot transmit to self.'); return; }
    
      // Refresh users from storage each send to catch new users from other tabs/browsers
      const recipientTrimmed = recipient.trim();

      // Validate address against selected currency format
      if (!validateAddress(currency, recipientTrimmed)) {
        setError(`Invalid ${currency} address format.`);
        setRecipientInvalid(true);
        return;
      }

      const users = db.getUsers();
      const receiver = users.find(u => u.walletAddresses?.[currency]?.toLowerCase() === recipientTrimmed.toLowerCase());
      if (!receiver) {
        setError('Destination address not found on the network.');
        setRecipientInvalid(true);
        return;
      }
      if (receiver.id === user.id) { setError('Cannot transmit to self.'); return; }

    // Emit to server mempool
    electroSocket.submitTx({ from: user.username, to: recipientTrimmed, amount: sendAmount, currency });
    setSuccess(`Submitted ${sendAmount} ${currency} to @${recipientTrimmed} (Pending confirmation)`);
    notify('info', `Submitted ${sendAmount} ${currency} to @${recipientTrimmed}`);
    setRecipient('');
    setAmount('');
    onTransaction();
  };

  const totalValueUSD = (user.balance.BTC * market.BTC.price) + 
                       (user.balance.ETH * market.ETH.price) + 
                       (user.balance.SOL * market.SOL.price);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Wallet Details */}
      <div className="space-y-6">
        <div className="glass p-8 rounded-2xl border-l-4 border-electro-primary bg-gradient-to-r from-electro-primary/5 to-transparent">
          <p className="text-white/40 text-xs font-mono uppercase tracking-[0.2em] mb-1">Estimated Net Worth</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-bold font-mono tracking-tighter text-white">
              ${totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </h2>
            <span className="text-electro-accent font-mono text-xs">USD</span>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <BalanceCard symbol="BTC" amount={user.balance.BTC} price={market.BTC.price} />
            <BalanceCard symbol="ETH" amount={user.balance.ETH} price={market.ETH.price} />
            <BalanceCard symbol="SOL" amount={user.balance.SOL} price={market.SOL.price} />
          </div>
        </div>

        <div className="glass p-8 rounded-2xl">
          <h3 className="text-sm font-bold font-mono text-white/50 mb-6 uppercase tracking-[0.2em]">Public Addresses</h3>
          <div className="space-y-3">
            {(['BTC','ETH','SOL'] as const).map((c) => (
              <div key={c} className="p-4 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-white/40 font-mono uppercase mb-1">{c} ADDRESS</p>
                  <code className="text-electro-accent font-mono text-sm break-all">{user.walletAddresses?.[c] || 'N/A'}</code>
                </div>
                <button
                  onClick={() => {
                    const addr = user.walletAddresses?.[c] || '';
                    if (addr && validateAddress(c, addr)) {
                      navigator.clipboard.writeText(addr);
                      notify('success', `${c} address copied`);
                    } else {
                      notify('error', `${c} address unavailable or invalid`);
                    }
                  }}
                  className={`text-[10px] font-bold transition-colors ml-4 ${validateAddress(c, user.walletAddresses?.[c] || '') ? 'text-white/30 hover:text-white' : 'text-white/20 cursor-not-allowed'}`}
                >
                  COPY
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-8 rounded-2xl">
          <h3 className="text-sm font-bold font-mono text-white/50 mb-6 uppercase tracking-[0.2em]">Banking Bridge</h3>
          <p className="text-xs text-white/40 mb-6 leading-relaxed">
            Move capital to verified external bank nodes. Note that bridge delays apply for non-Premium tiers.
          </p>
          <button 
            onClick={() => setIsBridging(true)}
            className="w-full py-3 bg-electro-accent/10 border border-electro-accent/20 text-electro-accent rounded-xl font-bold font-mono text-xs tracking-widest hover:bg-electro-accent/20 transition-all shadow-accent-glow"
          >
            INITIALIZE BRIDGE
          </button>
        </div>
      </div>

      {/* Transaction Control */}
      <div className="glass p-8 rounded-2xl h-fit">
        <h3 className="text-sm font-bold font-mono text-white/50 mb-6 uppercase tracking-[0.2em]">Send Crypto</h3>
        <form onSubmit={handleSend} className="space-y-6">
          {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] rounded-lg font-mono uppercase">{error}</div>}
          {success && <div className="p-3 bg-success/10 border border-success/20 text-success text-[10px] rounded-lg font-mono uppercase">{success}</div>}
          
          <div>
            <label className="block text-[10px] font-mono text-white/30 mb-2 uppercase tracking-widest">Recipient Wallet Address</label>
            <input 
              type="text" 
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className={`w-full bg-black/40 border rounded-xl p-4 text-white font-mono focus:outline-none transition-all ${recipientInvalid ? 'border-danger focus:border-danger' : 'border-white/10 focus:border-electro-secondary'}`}
              placeholder="Paste BTC / ETH / SOL address"
            />
            <p className="text-[10px] text-white/30 font-mono mt-2">Validated against the selected asset format.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono text-white/30 mb-2 uppercase tracking-widest">Amount</label>
              <input 
                type="number" 
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono focus:outline-none focus:border-electro-secondary transition-all"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-white/30 mb-2 uppercase tracking-widest">Currency</label>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono focus:outline-none focus:border-electro-secondary transition-all appearance-none"
              >
                <option value="BTC">BTC</option>
                <option value="ETH">ETH</option>
                <option value="SOL">SOL</option>
              </select>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
            <div className="flex justify-between text-[10px] font-mono text-white/30 mb-1">
              <span>Network Fee</span>
              <span>{user.subscriptionTier === SubscriptionTier.PREMIUM ? '0.0000' : '0.0001'} {currency}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-white/30">
              <span>Status</span>
              <span className="text-success">READY</span>
            </div>
          </div>

          <button className="w-full py-4 bg-gradient-to-r from-electro-primary to-electro-secondary rounded-xl font-bold font-mono tracking-widest hover:opacity-90 transition-all shadow-glow">
            SEND CRYPTO
          </button>
        </form>
      </div>

      {/* Mempool Preview */}
      <div className="glass p-8 rounded-2xl h-fit">
        <h3 className="text-sm font-bold font-mono text-white/50 mb-6 uppercase tracking-[0.2em]">Mempool</h3>
        {mempool.length === 0 ? (
          <p className="text-xs text-white/30 font-mono">No pending transactions.</p>
        ) : (
          <div className="space-y-3">
            {mempool.map((tx) => (
                <div key={tx.hash} className="border-l-2 border-electro-primary/30 pl-3 pb-2">
                <p className="text-xs font-mono">
                  <span className="text-electro-accent">@{tx.senderUsername}</span>
                  <span className="text-white/40"> → </span>
                  <span className="text-electro-secondary">@{tx.receiverUsername}</span>
                </p>
                  <p className="text-xs font-mono mt-1">
                    <span className="text-white font-bold">{tx.amount} {tx.currency}</span>
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {tx.status === 'Pending' && tx.confirmations !== undefined && tx.requiredConfirmations !== undefined ? (
                      <>
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-electro-primary to-electro-secondary transition-all duration-300"
                            style={{ width: `${(tx.confirmations / tx.requiredConfirmations) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-electro-accent">
                          {tx.confirmations}/{tx.requiredConfirmations}
                        </span>
                      </>
                    ) : (
                      <span className={`text-[10px] font-mono uppercase ${tx.status === 'Confirmed' ? 'text-success' : 'text-warning'}`}>
                        {tx.status}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] font-mono text-white/30 mt-1 truncate">
                    {tx.hash}
                  </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {isBridging && <BankingBridge onClose={() => setIsBridging(false)} />}
    </div>
  );
};

const BalanceCard: React.FC<{ symbol: string; amount: number; price: number }> = ({ symbol, amount, price }) => (
  <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex-1 min-w-[120px]">
    <div className="flex justify-between items-center mb-1">
      <span className="text-[10px] font-bold text-white/40">{symbol}</span>
      <span className="text-[9px] text-electro-accent font-mono">${(amount * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
    </div>
    <p className="text-sm font-bold font-mono text-white">{amount.toFixed(4)}</p>
  </div>
);

export default Wallet;
