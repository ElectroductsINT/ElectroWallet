
import React, { useState } from 'react';
import { User, SubscriptionTier } from '../types';
import { MNEMONIC_WORDS } from '../constants';
import { db } from '../services/mockDb';
import MnemonicDisplay from './MnemonicDisplay';
import { generateUniqueAddresses } from '../services/address';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [step, setStep] = useState(1); // 1: Creds, 2: Mnemonic
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [error, setError] = useState('');
  const [inlineHint, setInlineHint] = useState('');

  const MIN_PASS = 8;
  const MIN_USER = 3;

  const strength = (pass: string) => {
    let score = 0;
    if (pass.length >= MIN_PASS) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score; // 0-5
  };

  const strengthColor = (score: number) => {
    if (score >= 4) return 'bg-success';
    if (score === 3) return 'bg-electro-primary';
    if (score === 2) return 'bg-yellow-400';
    return 'bg-danger';
  };

  const generateMnemonic = () => {
    const words = [];
    for (let i = 0; i < 12; i++) {
      words.push(MNEMONIC_WORDS[Math.floor(Math.random() * MNEMONIC_WORDS.length)]);
    }
    return words.join(' ');
  };

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setInlineHint('');
    if (!username || !password) { setError('Required fields missing.'); return; }

    const uname = username.trim();
    const pass = password.trim();

    if (isRegistering) {
      // Enforce minimums only when creating a new account
      if (uname.length < MIN_USER) { setError(`Username must be at least ${MIN_USER} chars.`); return; }
      if (pass.length < MIN_PASS) { setError(`Password must be at least ${MIN_PASS} chars.`); return; }

      const existing = db.getUsers().find(u => u.username.toLowerCase() === uname.toLowerCase());
      if (existing) { setError('Username already exists.'); setInlineHint('Try another alias.'); return; }
      const mnemonic = generateMnemonic();
      setGeneratedMnemonic(mnemonic);
      setStep(2);
    } else {
      // Login flow: allow existing credentials even if they don't meet current registration rules
      const usersList = db.getUsers();
      const userByName = usersList.find(u => u.username.toLowerCase() === uname.toLowerCase());
      if (userByName) {
        if (userByName.passwordHash !== pass) {
          setError('Incorrect password.');
          setInlineHint('Forgot password? Register to create a new wallet.');
        } else if (userByName.isBanned) {
          setError('Account has been restricted by administrators.');
        } else {
          onLogin(userByName);
        }
      } else {
        setError('User not found.');
        setInlineHint('Try registering or check your alias spelling.');
      }
    }
  };

  const finishRegistration = () => {
    const uname = username.trim();
    const pass = password.trim();
    const walletAddresses = generateUniqueAddresses(db.getUsers());
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: uname,
      passwordHash: pass,
      subscriptionTier: SubscriptionTier.FREE,
      isBanned: false,
      isAdmin: false,
      mnemonic: generatedMnemonic,
      walletAddresses,
      balance: { BTC: 0, ETH: 0, SOL: 0 },
    };
    db.addUser(newUser);
    onLogin(newUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-electro-bg relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-electro-primary/10 rounded-full blur-[120px] animate-float"></div>
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-electro-secondary/10 rounded-full blur-[120px] animate-float" style={{animationDelay: '1s'}}></div>

      <div className="w-full max-w-md z-10 animate-scale-in">
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-electro-primary to-electro-secondary items-center justify-center shadow-glow mb-4 hover:scale-110 hover:rotate-6 transition-all cursor-pointer">
            <span className="text-3xl font-bold italic">E</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">ElectroWallet</h1>
          <p className="text-white/40 font-mono text-xs uppercase tracking-widest">Global Electro Network</p>
        </div>

        {step === 1 ? (
          <div className="glass p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all">
            <form onSubmit={handleAuth} className="space-y-4">
              {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg animate-slide-in">{error}</div>}
              {inlineHint && <div className="text-[11px] text-white/40 font-mono animate-fade-in">{inlineHint}</div>}
              <div>
                <label className="block text-xs font-mono text-white/50 mb-2 uppercase">Username</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-electro-primary transition-all"
                  placeholder="Enter alias..."
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-white/50 mb-2 uppercase">Password</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-electro-primary transition-all"
                  placeholder="********"
                />
                <div className="mt-2 h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${strengthColor(strength(password))}`} style={{ width: `${(strength(password) / 5) * 100}%` }}></div>
                </div>
                <p className="text-[10px] text-white/30 font-mono mt-1">Use 8+ chars with upper/lower, numbers, and symbols.</p>
              </div>
              <button className="w-full py-4 bg-gradient-to-r from-electro-primary to-electro-secondary rounded-lg font-bold shadow-glow hover:opacity-90 transition-all">
                {isRegistering ? 'CREATE ACCOUNT' : 'ESTABLISH LINK'}
              </button>
            </form>
            <div className="mt-6 text-center">
              <button 
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="text-xs font-mono text-white/30 hover:text-white/60 uppercase tracking-tighter"
              >
                {isRegistering ? 'Already a member? Sign in' : 'New operator? Request entry'}
              </button>
            </div>
          </div>
        ) : (
          <div className="glass p-8 rounded-2xl shadow-xl">
            <MnemonicDisplay words={generatedMnemonic} />
            <button 
              onClick={finishRegistration}
              className="w-full mt-6 py-4 bg-electro-accent/20 border border-electro-accent/30 text-electro-accent rounded-lg font-bold shadow-accent-glow hover:bg-electro-accent/30 transition-all font-mono text-xs tracking-widest"
            >
              I HAVE SECURED MY PHRASE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
