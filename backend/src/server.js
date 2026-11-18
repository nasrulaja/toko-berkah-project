/* Toko Berkah — backend REST (Express + Supabase).
   Jalankan: npm install && npm start  (salin .env.example -> .env dulu) */

/* DNS lokal mengembalikan IPv6 (NAT64) yang reset koneksi; utamakan IPv4. */
require('dns').setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const { PORT } = require('./config');
const { ApiError } = require('./supabase');
const { requireAuth } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

/* Rute publik: kesehatan server + login */
app.get('/api/health', async (req, res) => {
  try {
    const { ping } = require('./supabase');
    await ping();
    res.json({ ok: true, db: 'terhubung' });
  } catch (e) {
    res.status(503).json({ ok: false, db: 'terputus', error: e.message });
  }
});
app.use('/api/auth', require('./routes/auth'));

/* Rute data: wajib token (kecuali dinyatakan lain) */
app.use('/api', requireAuth);
app.use('/api', require('./routes/master'));         // /api/categories, /api/products
app.use('/api/stock', require('./routes/stock').router);
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/closing', require('./routes/closing'));

/* 404 + penangan galat seragam */
app.use((req, res) => res.status(404).json({ error: `Rute tidak ditemukan: ${req.method} ${req.path}` }));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err instanceof ApiError || err.status ? err.status || 500 : 500;
  if (status >= 500) console.error('[galat]', err);
  res.status(status).json({ error: err.message || 'Kesalahan server' });
});

app.listen(PORT, () => {
  console.log(`Toko Berkah backend jalan di http://localhost:${PORT}`);
  console.log(`Cek koneksi: http://localhost:${PORT}/api/health`);
});
