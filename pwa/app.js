const state = {
  wallet: null,
  mode: 'local',
  remoteUrl: '',
  localLedger: [],
};

const els = {
  address: document.getElementById('address'),
  copy: document.getElementById('copyAddress'),
  mode: document.getElementById('mode'),
  remoteRow: document.getElementById('remoteRow'),
  remoteUrl: document.getElementById('remoteUrl'),
  saveRemote: document.getElementById('saveRemote'),
  balance: document.getElementById('balance'),
  txCount: document.getElementById('txCount'),
  addForm: document.getElementById('addForm'),
  sendForm: document.getElementById('sendForm'),
  txList: document.getElementById('txList'),
  refresh: document.getElementById('refresh'),
  status: document.getElementById('status'),
  txTemplate: document.getElementById('txTemplate'),
};

const LS_KEYS = {
  wallet: 'pwa_wallet_v1',
  ledger: 'pwa_ledger_v1',
  remote: 'pwa_remote_v1',
};

function setStatus(msg, isError = false) {
  els.status.textContent = msg || '';
  els.status.style.color = isError ? '#ff9a9a' : '#9ba3b5';
}

function randomHex(len) {
  const bytes = crypto.getRandomValues(new Uint8Array(len / 2));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function loadState() {
  const wallet = JSON.parse(localStorage.getItem(LS_KEYS.wallet) || 'null');
  const ledger = JSON.parse(localStorage.getItem(LS_KEYS.ledger) || '[]');
  const remote = JSON.parse(localStorage.getItem(LS_KEYS.remote) || 'null');
  state.wallet = wallet || { address: `ew-${randomHex(20)}` };
  state.localLedger = ledger;
  if (remote?.url) {
    state.remoteUrl = remote.url;
    state.mode = remote.mode || 'local';
  }
  persistWallet();
}

function persistWallet() {
  localStorage.setItem(LS_KEYS.wallet, JSON.stringify(state.wallet));
}

function persistLedger() {
  localStorage.setItem(LS_KEYS.ledger, JSON.stringify(state.localLedger));
}

function persistRemote() {
  localStorage.setItem(LS_KEYS.remote, JSON.stringify({ url: state.remoteUrl, mode: state.mode }));
}

function computeBalance(ledger, address) {
  const incoming = ledger.filter(t => t.to === address).reduce((s, t) => s + t.amount, 0);
  const outgoing = ledger.filter(t => t.from === address).reduce((s, t) => s + t.amount + t.fee, 0);
  return incoming - outgoing;
}

function mapLedger(ledger, address) {
  return ledger
    .filter(t => t.from === address || t.to === address)
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(t => {
      const outgoing = t.from === address;
      return {
        id: t.id,
        amount: t.amount,
        fee: t.fee,
        timestamp: t.timestamp,
        type: outgoing ? 'Sent' : 'Received',
        counterparty: outgoing ? t.to : t.from,
        confirmed: !!t.confirmed,
      };
    });
}

async function fetchRemoteLedger() {
  const url = new URL('/ledger', state.remoteUrl).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error('Remote ledger error');
  return res.json();
}

async function postRemoteTx(tx) {
  const url = new URL('/tx', state.remoteUrl).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tx),
  });
  if (!res.ok) throw new Error('Remote tx failed');
}

function render() {
  els.address.textContent = state.wallet.address;
  els.mode.value = state.mode;
  els.remoteRow.hidden = state.mode !== 'remote';
  els.remoteUrl.value = state.remoteUrl || '';
}

function renderLedger(ledger) {
  const balance = computeBalance(ledger, state.wallet.address);
  const mapped = mapLedger(ledger, state.wallet.address);
  els.balance.textContent = balance.toLocaleString();
  els.txCount.textContent = mapped.length;
  els.txList.innerHTML = '';
  mapped.forEach(tx => {
    const clone = els.txTemplate.content.cloneNode(true);
    clone.querySelector('.type').textContent = tx.type;
    clone.querySelector('.id').textContent = tx.id;
    clone.querySelector('.amount').textContent = `${tx.type === 'Sent' ? '-' : '+'}${tx.amount} sats`;
    clone.querySelector('.to').textContent = tx.counterparty;
    const date = new Date(tx.timestamp * 1000);
    clone.querySelector('.time').textContent = isNaN(date.getTime()) ? '' : date.toLocaleString();
    els.txList.appendChild(clone);
  });
}

async function refresh() {
  setStatus('Refreshing...');
  try {
    let ledger = [];
    if (state.mode === 'local') {
      ledger = state.localLedger;
    } else {
      if (!state.remoteUrl) throw new Error('Set remote URL');
      ledger = await fetchRemoteLedger();
    }
    renderLedger(ledger);
    setStatus('');
  } catch (e) {
    setStatus(e.message || 'Refresh failed', true);
  }
}

function addLocalTx(tx) {
  state.localLedger.push(tx);
  persistLedger();
}

function buildTx({ from, to, amount, fee = null, confirmed = false }) {
  const id = randomHex(64);
  const now = Math.floor(Date.now() / 1000);
  const calcFee = fee !== null ? fee : Math.max(100, Math.floor(amount / 1000));
  return { id, from, to, amount: Number(amount), fee: calcFee, timestamp: now, confirmed };
}

async function handleSend(to, amount) {
  if (!to || !amount || amount <= 0) throw new Error('Amount and recipient required');
  const tx = buildTx({ from: state.wallet.address, to, amount: Number(amount), confirmed: false });
  if (state.mode === 'local') {
    addLocalTx(tx);
  } else {
    if (!state.remoteUrl) throw new Error('Set remote URL');
    await postRemoteTx(tx);
  }
  await refresh();
}

async function handleCredit(amount) {
  if (!amount || amount <= 0) throw new Error('Amount required');
  const tx = buildTx({ from: 'faucet', to: state.wallet.address, amount: Number(amount), fee: 0, confirmed: true });
  if (state.mode === 'local') {
    addLocalTx(tx);
  } else {
    if (!state.remoteUrl) throw new Error('Set remote URL');
    await postRemoteTx(tx);
  }
  await refresh();
}

function setupEvents() {
  els.copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(state.wallet.address);
      setStatus('Address copied');
    } catch {
      setStatus('Copy failed', true);
    }
  });

  els.mode.addEventListener('change', async (e) => {
    state.mode = e.target.value;
    persistRemote();
    render();
    await refresh();
  });

  els.saveRemote.addEventListener('click', async () => {
    const url = els.remoteUrl.value.trim();
    state.remoteUrl = url;
    state.mode = 'remote';
    persistRemote();
    render();
    await refresh();
  });

  els.addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(new FormData(e.target).get('amount'));
    try {
      await handleCredit(amount);
      setStatus('Credited');
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  els.sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const to = data.get('to').toString().trim();
    const amount = Number(data.get('amount'));
    try {
      await handleSend(to, amount);
      setStatus('Sent');
      e.target.reset();
    } catch (err) {
      setStatus(err.message, true);
    }
  });

  els.refresh.addEventListener('click', refresh);
}

async function main() {
  loadState();
  render();
  setupEvents();
  await refresh();
}

main();
