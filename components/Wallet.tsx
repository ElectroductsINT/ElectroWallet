
import React, { useEffect, useState } from 'react';
import { User, MarketData, SubscriptionTier } from '../types';
import { db } from '../services/mockDb';
import BankingBridge from './BankingBridge';
import { electroSocket, MempoolTx } from '../services/socket';
import { useNotify } from './Notifications';
import { validateAddress } from '../services/address';
import { TransactionConfirmDialog, AddressQR, TransactionDetailsModal } from './WalletSecurity';
import { security } from '../services/security';

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
  const [showTxConfirm, setShowTxConfirm] = useState(false);
  const [pendingTx, setPendingTx] = useState<{ amount: number; currency: string; recipient: string } | null>(null);
  const [userPin, setUserPin] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTxDetails, setShowTxDetails] = useState(false);
  const [transactions, setTransactions] = useState(db.getTransactions());
  const [txFilter, setTxFilter] = useState<'all' | 'sent' | 'received'>('all');
  const notify = useNotify();
  
  const totalValue = user.balance.BTC * market.BTC.price + user.balance.ETH * market.ETH.price + user.balance.SOL * market.SOL.price;

  // Initialize PIN if not set
  useEffect(() => {
    const storedPin = localStorage.getItem('electrowallet_user_pin_' + user.id);
    if (!storedPin) {
      const newPin = security.generatePIN();
      localStorage.setItem('electrowallet_user_pin_' + user.id, newPin);
      setUserPin(newPin);
    } else {
      setUserPin(storedPin);
    }
  }, [user.id]);

  useEffect(() => {
    electroSocket.connect(user.username);
    electroSocket.onMempoolUpdate((txs) => setMempool(txs));
    electroSocket.onTxConfirmed((tx) => {
      setSuccess(`Confirmed: ${tx.amount} ${tx.currency} from @${tx.senderUsername} to @${tx.receiverUsername}`);
      notify('success', `Transfer confirmed: ${tx.amount} ${tx.currency} → @${tx.receiverUsername}`);
      // Update local ledger and balances
      let sender = db.getUsers().find(u => u.username === tx.senderUsername);
      let receiver = db.getUsers().find(u => u.username === tx.receiverUsername);
      // If server broadcasted receiverUsername as address, resolve by wallet address
      if (!receiver) {
        const addr = (tx as any).receiverAddress || tx.receiverUsername;
        const addrLc = (addr || '').toLowerCase();
        receiver = db.getUsers().find(u => {
          const wa = u.walletAddresses;
          return wa && [wa.BTC, wa.ETH, wa.SOL].some(a => (a || '').toLowerCase() === addrLc);
        }) || undefined as any;
      }
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
      setTransactions([...db.getTransactions()]);
      onTransaction();
    });
  }, [user.username]);

  const handleSendClick = (e: React.FormEvent) => {
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

    // Show transaction confirmation dialog
    setPendingTx({ amount: sendAmount, currency, recipient: recipientTrimmed });
    setShowTxConfirm(true);
  };

  const handleTxConfirm = (pin: string) => {
    if (pin !== userPin) {
      notify('error', 'Invalid PIN');
      return;
    }

    if (!pendingTx) return;

    // Process transaction
    electroSocket.submitTx({ 
      from: user.username, 
      to: pendingTx.recipient, 
      amount: pendingTx.amount, 
      currency: pendingTx.currency 
    });
    
    setSuccess(`Submitted ${pendingTx.amount} ${pendingTx.currency} to @${pendingTx.recipient} (Pending confirmation)`);
    notify('info', `Submitted ${pendingTx.amount} ${pendingTx.currency} to @${pendingTx.recipient}`);
    setRecipient('');
    setAmount('');
    setShowTxConfirm(false);
    setPendingTx(null);
    onTransaction();
  };

  const filteredTransactions = transactions.filter(tx => {
    if (txFilter === 'sent') return tx.senderUsername === user.username;
    if (txFilter === 'received') return tx.receiverUsername === user.username;
    return tx.senderUsername === user.username || tx.receiverUsername === user.username;
  });

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
          <div className="space-y-4">
            {(['BTC','ETH','SOL'] as const).map((c) => (
              <div key={c} className="p-4 bg-black/40 border border-white/5 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-white/40 font-mono uppercase mb-1">{c} ADDRESS</p>
                  <AddressQR address={user.walletAddresses?.[c] || ''} currency={c} />
                </div>
                <code className="text-electro-accent font-mono text-sm break-all block mb-3">{user.walletAddresses?.[c] || 'N/A'}</code>
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
                  className={`text-[10px] font-bold transition-colors ${validateAddress(c, user.walletAddresses?.[c] || '') ? 'text-white/30 hover:text-white' : 'text-white/20 cursor-not-allowed'}`}
                >
                  COPY ADDRESS
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
      <div className="space-y-6">
        <div className="glass p-8 rounded-2xl h-fit">
          <h3 className="text-sm font-bold font-mono text-white/50 mb-6 uppercase tracking-[0.2em]">Send Crypto</h3>
          <form onSubmit={handleSendClick} className="space-y-6">
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

            <button type="submit" className="w-full py-4 bg-gradient-to-r from-electro-primary to-electro-secondary rounded-xl font-bold font-mono tracking-widest hover:opacity-90 transition-all shadow-glow">
              SEND CRYPTO
            </button>
          </form>
        </div>

        {/* Pending Transactions / Mempool */}
        {mempool && mempool.length > 0 && (
          <div className="glass p-8 rounded-2xl">
            <h3 className="text-sm font-bold font-mono text-white/50 mb-4 uppercase tracking-[0.2em]">Pending Transactions</h3>
            <div className="space-y-3">
              {mempool.map((tx) => {
                const conf = tx.confirmations || 0;
                const req = tx.requiredConfirmations || 3;
                const pct = Math.min(100, Math.round((conf / req) * 100));
                const toLabel = (tx as any).receiverAddress || tx.receiverUsername;
                return (
                  <div key={tx.id} className="bg-black/40 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-mono text-white/40 uppercase">TXID</p>
                        <p className="font-mono text-xs text-white break-all">{tx.hash}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono text-white/40 uppercase">Amount</p>
                        <p className="font-mono text-sm text-white">{tx.amount === 0 ? '0' : tx.amount.toFixed(tx.amount < 0.0001 ? 8 : tx.amount < 0.01 ? 6 : 4)} {tx.currency}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-[10px] font-mono text-white/40 uppercase">To</p>
                      <p className="font-mono text-xs text-electro-accent break-all">{toLabel}</p>
                    </div>
                    <div className="mt-4">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-electro-primary" style={{ width: `${pct}%` }}></div>
                      </div>
                      <p className="mt-1 text-[10px] font-mono text-white/50">
                        Confirmations: <span className="text-white">{conf}</span> / {req}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mempool Preview */}
        <div className="glass p-8 rounded-2xl">
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
      </div>

      {/* Transaction History */}
      <div className="col-span-1 lg:col-span-2">
        <div className="glass p-8 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold font-mono text-white/50 uppercase tracking-[0.2em]">Transaction History</h3>
            <div className="flex gap-2">
              {['all', 'sent', 'received'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f as any)}
                  className={`text-[10px] font-mono uppercase px-3 py-1 rounded transition-all ${
                    txFilter === f 
                      ? 'bg-electro-primary/30 text-electro-primary border border-electro-primary/50' 
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <p className="text-xs text-white/30 font-mono text-center py-8">No transactions found.</p>
          ) : (
            <div className="space-y-2">
              {filteredTransactions.slice(0, 15).map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => {
                    setSelectedTransaction(tx);
                    setShowTxDetails(true);
                  }}
                  className="w-full p-4 bg-black/40 border border-white/5 rounded-lg hover:border-white/20 hover:bg-black/60 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-mono mb-1">
                        <span className={tx.senderUsername === user.username ? 'text-electro-accent' : 'text-electro-secondary'}>
                          @{tx.senderUsername === user.username ? 'You' : tx.senderUsername}
                        </span>
                        <span className="text-white/40"> → </span>
                        <span className={tx.receiverUsername === user.username ? 'text-electro-secondary' : 'text-white/40'}>
                          @{tx.receiverUsername === user.username ? 'You' : tx.receiverUsername}
                        </span>
                      </p>
                      <p className="text-[10px] text-white/40 font-mono">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold font-mono ${tx.senderUsername === user.username ? 'text-danger' : 'text-success'}`}>
                        {tx.senderUsername === user.username ? '-' : '+'}{tx.amount} {tx.currency}
                      </p>
                      <p className={`text-[10px] font-mono uppercase ${tx.status === 'Confirmed' ? 'text-success' : 'text-warning'}`}>
                        {tx.status}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <TransactionConfirmDialog
        isOpen={showTxConfirm}
        amount={pendingTx?.amount || 0}
        currency={pendingTx?.currency || 'BTC'}
        recipient={pendingTx?.recipient || ''}
        onConfirm={handleTxConfirm}
        onCancel={() => {
          setShowTxConfirm(false);
          setPendingTx(null);
        }}
      />

      <TransactionDetailsModal
        isOpen={showTxDetails}
        transaction={selectedTransaction}
        onClose={() => setShowTxDetails(false)}
        currentUsername={user.username}
      />

      {isBridging && <BankingBridge onClose={() => setIsBridging(false)} />}
    </div>
  );
};

const BalanceCard: React.FC<{ symbol: string; amount: number; price: number }> = ({ symbol, amount, price }) => {
  // For zero balances, show just "0" to avoid excessive zeros
  const displayAmount = amount === 0 ? '0' : amount.toFixed(amount < 0.01 ? 6 : 4);

  return (
    <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex-1 min-w-[120px]">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-bold text-white/40">{symbol}</span>
        <span className="text-[9px] text-electro-accent font-mono">${(amount * price).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>
      <p className="text-sm font-bold font-mono text-white">{displayAmount}</p>
    </div>
  );
};

export default Wallet;
