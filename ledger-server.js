// Simple ledger backend
// Endpoints:
//   GET  /ledger -> returns [{id,from,to,amount,fee,timestamp,confirmed}]
//   POST /tx     -> body {id,from,to,amount,fee,timestamp,confirmed}
// Data is kept in-memory; for persistence swap to a file/DB.

import express from 'express'

const app = express()
app.use(express.json())

// In-memory ledger
let ledger = []

// Get ledger
app.get('/ledger', (_req, res) => {
  res.json(ledger)
})

// Post tx
app.post('/tx', (req, res) => {
  const { id, from, to, amount, fee, timestamp, confirmed } = req.body || {}
  if (!id || !from || !to || typeof amount !== 'number' || typeof fee !== 'number') {
    return res.status(400).json({ error: 'invalid tx payload' })
  }
  ledger.push({ id, from, to, amount, fee, timestamp: timestamp || Date.now() / 1000, confirmed: !!confirmed })
  res.status(200).json({ ok: true })
})

// Optional: clear ledger
app.post('/reset', (_req, res) => {
  ledger = []
  res.json({ ok: true })
})

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`Ledger server listening on :${port}`)
})
