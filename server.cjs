// ElectroWallet Real-Time Market Synchronizer & Multiplayer Hub
// Server of Truth: broadcasts live market data and handles multiplayer events

const http = require('http');
const express = require('express');
const axios = require('axios');
const { Server } = require('socket.io');
const { createClient } = require('redis');

const PORT = process.env.PORT || 4000;
const FETCH_INTERVAL = Number(process.env.FETCH_INTERVAL || 10000); // 10s default
const NEWS_INTERVAL = Number(process.env.NEWS_INTERVAL || 30000); // 30s default

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Redis client (optional; falls back to memory if unavailable)
const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
let redisReady = false;
redis.on('error', (err) => console.warn('[Redis] Error:', err?.message));
redis.on('ready', () => { redisReady = true; console.log('[Redis] Connected'); });
redis.connect().catch(() => {});

// In-memory fallbacks
let lastMarket = {
  btc: { price: 0, change: 0 },
  eth: { price: 0, change: 0 },
  sol: { price: 0, change: 0 },
  timestamp: Date.now()
};
let marketFrozen = false;
const mempool = new Map(); // txHash -> tx
const onlineUsers = new Map(); // socket.id -> { username }

// Helper to persist state
async function saveLastMarket(data) {
  lastMarket = data;
  if (redisReady) {
    await redis.set('electro:lastMarket', JSON.stringify(data));
  }
}

async function loadLastMarket() {
  if (redisReady) {
    const raw = await redis.get('electro:lastMarket');
    if (raw) lastMarket = JSON.parse(raw);
  }
}

// PRICE SYNC (CoinGecko)
async function syncMarketData() {
  if (marketFrozen) return; // skip when frozen by admin
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin,ethereum,solana',
        vs_currencies: 'usd',
        include_24hr_change: 'true'
      },
      timeout: 8000
    });

    const marketData = {
      btc: { price: response.data.bitcoin.usd, change: response.data.bitcoin.usd_24h_change },
      eth: { price: response.data.ethereum.usd, change: response.data.ethereum.usd_24h_change },
      sol: { price: response.data.solana.usd, change: response.data.solana.usd_24h_change },
      timestamp: Date.now()
    };

    await saveLastMarket(marketData);
    io.emit('MARKET_UPDATE', marketData);
  } catch (error) {
    console.error('[Market Sync Error]:', error?.message);
  }
}

// NEWS TICKER (basic demo using crypto headlines)
async function broadcastNews() {
  try {
    // Example using CoinDesk RSS via rss2json.com (public converter)
    // Note: Replace with your own key/service in production.
    const res = await axios.get('https://api.rss2json.com/v1/api.json', {
      params: {
        rss_url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      },
      timeout: 8000
    });
    const headlines = (res.data?.items || []).slice(0, 5).map(i => i.title);
    io.emit('NEWS_UPDATE', { headlines, timestamp: Date.now() });
  } catch (e) {
    // Fallback: game-specific alerts
    io.emit('NEWS_UPDATE', {
      headlines: [
        'System Notice: Maintenance window scheduled at 02:00 UTC',
        'Simulation Event: Market volatility increased for BTC',
        'Tip: Enable Price Alerts in Settings to never miss a move'
      ],
      timestamp: Date.now()
    });
  }
}

// MEMPOOL & P2P TRANSFERS
function generateHash() {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function scheduleConfirmation(tx) {
  setTimeout(() => {
    tx.status = 'Confirmed';
    io.emit('TX_CONFIRMED', tx);
    mempool.delete(tx.hash);
  }, Number(process.env.CONFIRM_DELAY || 60000)); // default 60s
}

io.on('connection', async (socket) => {
  // Identify user (optional: attach username via query)
  const { username } = socket.handshake.query;
  onlineUsers.set(socket.id, { username: username || `user_${socket.id.slice(0,5)}` });

  // Send last snapshot immediately
  await loadLastMarket();
  socket.emit('LAST_SNAPSHOT', lastMarket);

  // Broadcast online count
  io.emit('ONLINE_COUNT', onlineUsers.size);

  // Handle new P2P mempool submission
  socket.on('SUBMIT_TX', (payload) => {
    const { from, to, amount, currency } = payload || {};
    if (!from || !to || !amount || !currency) return;
    const hash = generateHash();
    const tx = {
      id: hash,
      hash,
      senderUsername: from,
      receiverUsername: to,
      amount: Number(amount),
      currency,
      timestamp: Date.now(),
      status: 'Pending'
    };
    mempool.set(hash, tx);
    io.emit('MEMPOOL_UPDATE', Array.from(mempool.values()));
    scheduleConfirmation(tx);
  });

  // Admin controls
  socket.on('ADMIN_FREEZE', (enabled) => {
    marketFrozen = !!enabled;
    io.emit('MARKET_FROZEN', marketFrozen);
  });

  socket.on('ADMIN_AIRDROP', () => {
    io.emit('AIRDROP', { amountSats: 10000, timestamp: Date.now() });
  });

  socket.on('ADMIN_ALERT', (message) => {
    io.emit('GLOBAL_ALERT', { message, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('ONLINE_COUNT', onlineUsers.size);
  });
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, marketFrozen, onlineUsers: onlineUsers.size });
});

// Start loops
setInterval(syncMarketData, FETCH_INTERVAL);
setInterval(broadcastNews, NEWS_INTERVAL);

server.listen(PORT, () => {
  console.log(`[ElectroWallet Hub] Listening on http://localhost:${PORT}`);
});
