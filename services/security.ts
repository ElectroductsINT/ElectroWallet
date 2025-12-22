import CryptoJS from 'crypto-js';

// Encryption/decryption for sensitive data in localStorage
const ENCRYPTION_KEY = 'electrowallet_secure_key_v1';

export const security = {
  // Encrypt sensitive data (PIN, private keys, etc)
  encrypt(data: string, password?: string): string {
    try {
      const key = password || ENCRYPTION_KEY;
      return CryptoJS.AES.encrypt(data, key).toString();
    } catch (e) {
      console.error('Encryption failed:', e);
      return '';
    }
  },

  // Decrypt sensitive data
  decrypt(encrypted: string, password?: string): string {
    try {
      const key = password || ENCRYPTION_KEY;
      const bytes = CryptoJS.AES.decrypt(encrypted, key);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error('Decryption failed:', e);
      return '';
    }
  },

  // Generate a secure PIN (4-6 digits)
  generatePIN(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  // Verify PIN
  verifyPIN(stored: string, input: string): boolean {
    return stored === input;
  },

  // Hash data using SHA256 (for verification)
  hash(data: string): string {
    return CryptoJS.SHA256(data).toString();
  },

  // Generate a random token
  generateToken(): string {
    return CryptoJS.lib.WordArray.random(16).toString();
  },

  // Check if data appears to be encrypted
  isEncrypted(data: string): boolean {
    return data.startsWith('U2FsdGVk') || data.includes('Salted');
  }
};

// Session management
export class SessionManager {
  private sessionTimeout: number = 15 * 60 * 1000; // 15 minutes
  private lastActivity: number = Date.now();
  private sessionTimer: any = null;
  private onTimeout: () => void = () => {};

  constructor(onSessionTimeout?: () => void) {
    if (onSessionTimeout) {
      this.onTimeout = onSessionTimeout;
    }
    this.startSession();
  }

  private startSession() {
    this.resetTimer();
    // Track user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, () => this.resetActivity(), true);
    });
  }

  private resetActivity() {
    this.lastActivity = Date.now();
    this.resetTimer();
  }

  private resetTimer() {
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    this.sessionTimer = setTimeout(() => {
      this.onTimeout();
    }, this.sessionTimeout);
  }

  getTimeRemaining(): number {
    const elapsed = Date.now() - this.lastActivity;
    return Math.max(0, this.sessionTimeout - elapsed);
  }

  isSessionActive(): boolean {
    return this.getTimeRemaining() > 0;
  }

  extendSession() {
    this.resetActivity();
  }

  destroy() {
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
  }
}

// Transaction signing/verification (mock implementation)
export const txSigning = {
  // Mock: In real implementation, would use actual crypto signing
  signTransaction(txData: any, privateKey: string): string {
    const txString = JSON.stringify(txData);
    const signature = CryptoJS.HmacSHA256(txString, privateKey).toString();
    return signature;
  },

  verifySignature(txData: any, signature: string, publicKey: string): boolean {
    // Mock verification - in real implementation would use actual crypto
    const txString = JSON.stringify(txData);
    const expectedSig = CryptoJS.HmacSHA256(txString, publicKey).toString();
    return signature === expectedSig;
  }
};
