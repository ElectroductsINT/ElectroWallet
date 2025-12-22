// Real-world market data generator that mimics crypto market movements
// Uses realistic technical analysis patterns and volatility

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface PricePoint {
  time: number;
  price: number;
}

class MarketDataGenerator {
  private volatility: Map<string, number> = new Map();
  private trend: Map<string, number> = new Map();
  private lastPrice: Map<string, number> = new Map();
  private rsi: Map<string, number> = new Map();
  private macd: Map<string, number> = new Map();

  constructor() {
    // Initialize market volatility (BTC least volatile, SOL most volatile)
    this.volatility.set('BTC', 0.02);  // 2% volatility
    this.volatility.set('ETH', 0.035); // 3.5% volatility
    this.volatility.set('SOL', 0.05);  // 5% volatility
  }

  // Realistic market movement generator using mean reversion + momentum
  generateNextPrice(symbol: string, currentPrice: number): number {
    const volatility = this.volatility.get(symbol) || 0.03;
    const trend = this.trend.get(symbol) || 0;
    
    // Mean reversion: price tends to move back toward average
    const meanReversionForce = -trend * 0.15;
    
    // Random walk with bounds
    const randomWalk = (Math.random() - 0.5) * 2 * volatility;
    
    // Momentum from previous moves (trend following)
    const momentumForce = trend * 0.1;
    
    // Combine forces
    const totalChange = randomWalk + meanReversionForce + momentumForce;
    const newPrice = currentPrice * (1 + totalChange);
    
    // Update trend for next iteration
    this.trend.set(symbol, totalChange * 100);
    
    return Math.max(0.0001, newPrice);
  }

  // Generate candlestick data for a specific timeframe
  generateCandleData(
    symbol: string,
    basePrice: number,
    candleCount: number = 100,
    minutesPerCandle: number = 5
  ): CandleData[] {
    const candles: CandleData[] = [];
    let currentPrice = basePrice;
    const now = Date.now();

    for (let i = candleCount - 1; i >= 0; i--) {
      const time = now - i * minutesPerCandle * 60 * 1000;
      
      // Generate OHLC data
      const open = currentPrice;
      
      // Simulate intracandle movements
      const bodySize = (Math.random() - 0.5) * 2 * (basePrice * (this.volatility.get(symbol) || 0.03));
      const close = open + bodySize;
      
      // Wicks (high/low) extend beyond the body
      const volatilityMultiplier = 1.5;
      const high = Math.max(open, close) + Math.abs(bodySize) * (Math.random() * 0.5) * volatilityMultiplier;
      const low = Math.min(open, close) - Math.abs(bodySize) * (Math.random() * 0.5) * volatilityMultiplier;
      
      // Realistic volume (decreases with volatility)
      const volume = basePrice * 1000 * (1 + Math.random());

      candles.push({
        time: Math.floor(time / 1000),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume
      });

      currentPrice = close;
    }

    this.lastPrice.set(symbol, currentPrice);
    return candles;
  }

  // Generate smooth price history (for line charts)
  generatePriceHistory(
    symbol: string,
    basePrice: number,
    pointCount: number = 60,
    intervalSeconds: number = 60
  ): PricePoint[] {
    const history: PricePoint[] = [];
    let currentPrice = basePrice;
    const now = Date.now();

    for (let i = pointCount - 1; i >= 0; i--) {
      const time = now - i * intervalSeconds * 1000;
      currentPrice = this.generateNextPrice(symbol, currentPrice);
      
      history.push({
        time: Math.floor(time / 1000),
        price: Math.round(currentPrice * 100) / 100
      });
    }

    this.lastPrice.set(symbol, currentPrice);
    return history;
  }

  // Calculate 24h change based on historical data
  calculate24hChange(prices: PricePoint[]): number {
    if (prices.length < 2) return 0;
    const earliest = prices[0].price;
    const latest = prices[prices.length - 1].price;
    return ((latest - earliest) / earliest) * 100;
  }

  // RSI (Relative Strength Index) indicator
  calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period) return 50;

    const deltas = [];
    for (let i = 1; i < prices.length; i++) {
      deltas.push(prices[i] - prices[i - 1]);
    }

    const gains = deltas.filter(d => d > 0).slice(-period);
    const losses = deltas.filter(d => d < 0).map(d => Math.abs(d)).slice(-period);

    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b) / period : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b) / period : 0;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return Math.round(rsi * 100) / 100;
  }

  // MACD (Moving Average Convergence Divergence)
  calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;
    const signal = this.calculateEMA([macd], 9);
    const histogram = macd - signal;

    return {
      macd: Math.round(macd * 10000) / 10000,
      signal: Math.round(signal * 10000) / 10000,
      histogram: Math.round(histogram * 10000) / 10000
    };
  }

  // Exponential Moving Average
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  // Volatility calculation (standard deviation)
  calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const mean = prices.reduce((a, b) => a + b) / prices.length;
    const squareDiffs = prices.map(p => Math.pow(p - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b) / prices.length;
    const volatility = Math.sqrt(avgSquareDiff) / mean;

    return Math.round(volatility * 10000) / 10000;
  }
}

export const marketDataGenerator = new MarketDataGenerator();

// Real-time price ticker simulation
export class RealtimePriceTicker {
  private symbols: string[] = [];
  private prices: Map<string, number> = new Map();
  private histories: Map<string, PricePoint[]> = new Map();
  private onUpdate: ((symbol: string, price: number, change24h: number) => void) | null = null;
  private interval: NodeJS.Timeout | null = null;

  constructor(symbols: string[], initialPrices: Record<string, number>) {
    this.symbols = symbols;
    symbols.forEach(symbol => {
      this.prices.set(symbol, initialPrices[symbol] || 0);
      // Generate initial 24h history
      this.histories.set(symbol, marketDataGenerator.generatePriceHistory(symbol, initialPrices[symbol], 1440, 60));
    });
  }

  start(updateCallback: (symbol: string, price: number, change24h: number) => void, intervalMs: number = 3000) {
    this.onUpdate = updateCallback;
    this.interval = setInterval(() => {
      this.symbols.forEach(symbol => {
        const currentPrice = this.prices.get(symbol) || 0;
        const newPrice = marketDataGenerator.generateNextPrice(symbol, currentPrice);
        this.prices.set(symbol, newPrice);

        // Update history
        const history = this.histories.get(symbol) || [];
        history.push({
          time: Math.floor(Date.now() / 1000),
          price: newPrice
        });
        
        // Keep last 1440 data points (24 hours at 1-min intervals)
        if (history.length > 1440) {
          history.shift();
        }
        this.histories.set(symbol, history);

        // Calculate 24h change
        const change24h = marketDataGenerator.calculate24hChange(history);
        this.onUpdate?.(symbol, newPrice, change24h);
      });
    }, intervalMs);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  getPrice(symbol: string): number {
    return this.prices.get(symbol) || 0;
  }

  getHistory(symbol: string): PricePoint[] {
    return this.histories.get(symbol) || [];
  }
}
