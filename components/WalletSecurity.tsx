import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import { security } from '../services/security';
import { useNotify } from './Notifications';

interface TransactionConfirmDialogProps {
  isOpen: boolean;
  amount: number;
  currency: string;
  recipient: string;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
}

const TransactionConfirmDialog: React.FC<TransactionConfirmDialogProps> = ({
  isOpen,
  amount,
  currency,
  recipient,
  onConfirm,
  onCancel
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const notify = useNotify();

  const handleConfirm = () => {
    if (!pin || pin.length < 4) {
      notify('error', 'PIN must be at least 4 digits');
      return;
    }
    onConfirm(pin);
    setPin('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass rounded-2xl p-8 max-w-md w-full border border-white/20 animate-scale-in">
        <h3 className="text-xl font-bold font-mono text-white mb-6">Confirm Transaction</h3>
        
        <div className="space-y-4 mb-8 p-6 bg-black/40 rounded-xl border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-white/50 text-sm">Amount</span>
            <span className="text-white font-bold font-mono">{amount} {currency}</span>
          </div>
          <div className="border-t border-white/10 pt-4 flex justify-between items-center">
            <span className="text-white/50 text-sm">To Address</span>
            <span className="text-electro-accent text-xs font-mono truncate">{recipient.slice(0, 16)}...</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-mono text-white/30 mb-2 uppercase tracking-widest">
            Enter PIN to Confirm
          </label>
          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••"
              className="w-full bg-black/40 border border-electro-primary/30 rounded-xl p-3 text-white font-mono text-center text-2xl tracking-widest focus:outline-none focus:border-electro-primary"
              maxLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-3 text-white/30 hover:text-white/60 text-xs"
            >
              {showPin ? 'HIDE' : 'SHOW'}
            </button>
          </div>
          <p className="text-[10px] text-white/30 mt-2">Your transaction PIN is stored securely on your device.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl font-mono text-xs font-bold hover:bg-white/10 transition-all"
          >
            CANCEL
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-gradient-to-r from-electro-primary to-electro-secondary rounded-xl font-mono text-xs font-bold hover:opacity-90 transition-all"
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  );
};

interface AddressQRProps {
  address: string;
  currency: string;
}

const AddressQR: React.FC<AddressQRProps> = ({ address, currency }) => {
  const [showQR, setShowQR] = useState(false);
  const notify = useNotify();

  return (
    <div>
      <button
        onClick={() => setShowQR(!showQR)}
        className="text-[10px] font-bold text-electro-accent hover:text-electro-secondary transition-colors"
      >
        {showQR ? 'HIDE QR' : 'SHOW QR'}
      </button>
      
      {showQR && (
        <div className="mt-3 p-4 bg-white rounded-lg flex justify-center">
          <QRCode 
            value={address} 
            size={200} 
            level="H" 
            includeMargin={true}
          />
        </div>
      )}
    </div>
  );
};

interface TransactionDetailsProps {
  isOpen: boolean;
  transaction: any;
  onClose: () => void;
  currentUsername: string;
}

const TransactionDetailsModal: React.FC<TransactionDetailsProps> = ({
  isOpen,
  transaction,
  onClose,
  currentUsername
}) => {
  const notify = useNotify();

  if (!isOpen || !transaction) return null;

  const isSender = transaction.senderUsername === currentUsername;
  const direction = isSender ? 'Sent' : 'Received';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass rounded-2xl p-8 max-w-md w-full border border-white/20 animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold font-mono text-white">Transaction Details</h3>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[10px] text-white/40 font-mono uppercase mb-1">Amount</p>
            <p className="text-2xl font-bold font-mono text-white">{transaction.amount} {transaction.currency}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <p className="text-[10px] text-white/40 font-mono uppercase mb-1">Status</p>
              <p className={`font-mono text-sm font-bold ${transaction.status === 'Confirmed' ? 'text-success' : 'text-warning'}`}>
                {transaction.status}
              </p>
            </div>
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <p className="text-[10px] text-white/40 font-mono uppercase mb-1">Type</p>
              <p className="font-mono text-sm font-bold text-electro-accent">{direction}</p>
            </div>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[10px] text-white/40 font-mono uppercase mb-1">From</p>
            <p className="font-mono text-xs text-white break-all">{transaction.senderUsername}</p>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[10px] text-white/40 font-mono uppercase mb-1">To</p>
            <p className="font-mono text-xs text-white break-all">{transaction.receiverUsername}</p>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[10px] text-white/40 font-mono uppercase mb-1">Hash</p>
            <div className="flex items-center gap-2">
              <code className="font-mono text-xs text-electro-accent break-all flex-1">{transaction.hash.slice(0, 16)}...</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(transaction.hash);
                  // notify('success', 'Hash copied');
                }}
                className="text-[10px] text-white/40 hover:text-white"
              >
                COPY
              </button>
            </div>
          </div>

          <div className="p-3 bg-black/40 rounded-xl border border-white/5">
            <p className="text-[10px] text-white/40 font-mono uppercase mb-1">Timestamp</p>
            <p className="font-mono text-xs text-white">{new Date(transaction.timestamp).toLocaleString()}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gradient-to-r from-electro-primary to-electro-secondary rounded-xl font-mono text-xs font-bold hover:opacity-90 transition-all"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};

export { TransactionConfirmDialog, AddressQR, TransactionDetailsModal };
