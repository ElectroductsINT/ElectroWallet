
import React, { useState, useEffect } from 'react';

const steps = [
  { label: 'Securing Tunnel', desc: 'Establishing encrypted link to global bank nodes...' },
  { label: 'Asset Verification', desc: 'Verifying wallet signatures on the ledger...' },
  { label: 'Compliance Check', desc: 'Running AML/KYC protocols for capital exit...' },
  { label: 'Routing to Node', desc: 'Broadcasting withdrawal request to SWIFT network...' },
  { label: 'Completed', desc: 'Transaction finalized. Funds delivered.' }
];

const BankingBridge: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [stage, setStage] = useState<'input' | 'processing'>('input');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'card'>('bank');
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  
  // Bank details
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankName, setBankName] = useState('');
  
  // Card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  
  // Amount
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');

  useEffect(() => {
    if (stage === 'processing' && currentStep < steps.length - 1) {
      const duration = 2500 + Math.random() * 2000;
      const startTime = Date.now();
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min((elapsed / duration) * 100, 100);
        setProgress(p);
        
        if (p === 100) {
          clearInterval(interval);
          setTimeout(() => {
            setCurrentStep(s => s + 1);
            setProgress(0);
          }, 500);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [currentStep, stage]);

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    if (paymentMethod === 'bank') {
      if (!accountName || !accountNumber || !routingNumber || !bankName) return;
    } else {
      if (!cardNumber || !cardHolder || !expiryDate || !cvv) return;
    }
    
    setStage('processing');
  };
  
  const getEstimatedArrival = () => {
    const now = new Date();
    const daysToAdd = paymentMethod === 'bank' ? 2 : 1;
    const eta = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    return eta.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
      <div className="glass w-full max-w-2xl p-10 rounded-3xl shadow-2xl relative border-electro-accent/30 overflow-hidden">
        {/* Progress scan line effect */}
        {stage === 'processing' && (
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_0%,rgba(34,211,238,0.2)_50%,transparent_100%)] bg-[length:100%_4px] animate-[scan_2s_linear_infinite]"></div>
        )}
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-electro-accent/10 border border-electro-accent/30 mb-4">
            <span className="text-3xl animate-pulse">⚡</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2 uppercase font-mono">Quantum Banking Bridge</h2>
          <p className="text-white/40 text-xs font-mono">NODE LINK: SECURE-AES-256</p>
        </div>

        {stage === 'input' ? (
          <div className="space-y-6">
            {/* Amount Input */}
            <div>
              <label className="block text-[10px] font-mono text-white/50 mb-2 uppercase tracking-widest">Withdrawal Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step={currency === 'BTC' ? '0.00000001' : currency === 'ETH' ? '0.000001' : '0.0001'}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono focus:outline-none focus:border-electro-accent transition-all"
                />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as any)}
                  className="bg-black/40 border border-white/10 rounded-xl px-4 text-white font-mono focus:outline-none focus:border-electro-accent transition-all"
                >
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="SOL">SOL</option>
                </select>
              </div>
            </div>

            {/* Payment Method Toggle */}
            <div>
              <label className="block text-[10px] font-mono text-white/50 mb-3 uppercase tracking-widest">Payment Method</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPaymentMethod('bank')}
                  className={`flex-1 py-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all ${
                    paymentMethod === 'bank'
                      ? 'bg-electro-primary/20 text-electro-primary border-2 border-electro-primary'
                      : 'bg-white/5 text-white/50 border-2 border-white/10 hover:bg-white/10'
                  }`}
                >
                  🏦 Bank Account
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex-1 py-3 rounded-xl font-mono text-xs uppercase tracking-wider transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-electro-primary/20 text-electro-primary border-2 border-electro-primary'
                      : 'bg-white/5 text-white/50 border-2 border-white/10 hover:bg-white/10'
                  }`}
                >
                  💳 Debit Card
                </button>
              </div>
            </div>

            {/* Bank Account Details */}
            {paymentMethod === 'bank' && (
              <div className="space-y-4 p-6 bg-black/20 rounded-xl border border-white/5">
                <h3 className="text-xs font-mono text-electro-accent uppercase tracking-widest mb-4">Bank Account Details</h3>
                <div>
                  <label className="block text-[10px] font-mono text-white/40 mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-electro-accent transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-2">Account Number</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="123456789"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-electro-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-2">Routing Number</label>
                    <input
                      type="text"
                      value={routingNumber}
                      onChange={(e) => setRoutingNumber(e.target.value)}
                      placeholder="021000021"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-electro-accent transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-white/40 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Chase Bank"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-electro-accent transition-all"
                  />
                </div>
              </div>
            )}

            {/* Card Details */}
            {paymentMethod === 'card' && (
              <div className="space-y-4 p-6 bg-black/20 rounded-xl border border-white/5">
                <h3 className="text-xs font-mono text-electro-accent uppercase tracking-widest mb-4">Card Details</h3>
                <div>
                  <label className="block text-[10px] font-mono text-white/40 mb-2">Card Number</label>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value).slice(0, 19))}
                    placeholder="1234 5678 9012 3456"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm font-mono focus:outline-none focus:border-electro-accent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-white/40 mb-2">Cardholder Name</label>
                  <input
                    type="text"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="JOHN DOE"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm uppercase focus:outline-none focus:border-electro-accent transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-2">Expiry Date</label>
                    <input
                      type="text"
                      value={expiryDate}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
                        setExpiryDate(val.slice(0, 5));
                      }}
                      placeholder="MM/YY"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm font-mono focus:outline-none focus:border-electro-accent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-white/40 mb-2">CVV</label>
                    <input
                      type="text"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="123"
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm font-mono focus:outline-none focus:border-electro-accent transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Processing Warning */}
            <div className="p-4 bg-yellow-400/10 border border-yellow-400/20 rounded-xl">
              <div className="flex gap-3">
                <span className="text-yellow-400 text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="text-xs font-mono text-yellow-400 font-bold mb-1">PROCESSING TIME WARNING</p>
                  <p className="text-[10px] text-white/60 leading-relaxed">
                    {paymentMethod === 'bank' 
                      ? 'Bank transfers typically process within 2-3 business days. Delays may occur due to bank holidays or verification requirements.'
                      : 'Card deposits typically process within 1-2 business days. International cards may experience additional delays.'}
                  </p>
                  <p className="text-[10px] text-electro-accent mt-2 font-mono">
                    Estimated Arrival: <span className="font-bold">{getEstimatedArrival()}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/60 font-bold rounded-xl tracking-widest font-mono uppercase text-xs border border-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-4 bg-gradient-to-r from-electro-primary to-electro-accent text-white font-bold rounded-xl tracking-widest hover:opacity-90 transition-all shadow-glow font-mono uppercase text-xs"
              >
                Initiate Transfer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-electro-accent font-mono text-[10px] uppercase tracking-widest">{steps[currentStep].label}</span>
                <span className="text-white/50 font-mono text-[10px]">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-electro-primary to-electro-accent transition-all duration-300 shadow-accent-glow"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[10px] font-mono text-white/30 italic">{steps[currentStep].desc}</p>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {steps.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= currentStep ? 'bg-electro-accent' : 'bg-white/10'}`}></div>
              ))}
            </div>

            {currentStep === steps.length - 1 ? (
              <div className="space-y-4">
                <div className="p-4 bg-success/10 border border-success/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-success text-xl">✓</span>
                    <div className="flex-1">
                      <p className="text-sm font-mono text-success font-bold mb-2">WITHDRAWAL INITIATED</p>
                      <p className="text-[10px] text-white/60 mb-3">
                        Your withdrawal of <span className="text-white font-bold">{amount} {currency}</span> has been successfully submitted to the banking network.
                      </p>
                      <div className="space-y-1">
                        <p className="text-[10px] text-white/40 font-mono">
                          Destination: <span className="text-electro-accent">{paymentMethod === 'bank' ? bankName : `Card ending ${cardNumber.slice(-4)}`}</span>
                        </p>
                        <p className="text-[10px] text-white/40 font-mono">
                          Processing Time: <span className="text-yellow-300">{paymentMethod === 'bank' ? '2-3 business days' : '1-2 business days'}</span>
                        </p>
                        <p className="text-[10px] text-white/40 font-mono">
                          Estimated Arrival: <span className="text-electro-primary font-bold">{getEstimatedArrival()}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-electro-accent text-black font-bold rounded-xl tracking-widest hover:bg-white transition-all shadow-accent-glow font-mono uppercase text-xs"
                >
                  CLOSE TERMINAL
                </button>
              </div>
            ) : (
              <button 
                disabled
                className="w-full py-4 bg-white/5 text-white/20 font-bold rounded-xl tracking-widest font-mono uppercase text-xs border border-white/5 cursor-not-allowed"
              >
                TRANSMITTING CAPITAL...
              </button>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes scan {
          from { transform: translateY(-100%); }
          to { transform: translateY(100%); }
        }
      `}</style>
    </div>
  );
};

export default BankingBridge;
