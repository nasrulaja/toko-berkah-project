/* Tutup buku harian (tabel tutup_buku) — dipisah dari rute transaksi. */
const express = require('express');
const { get, write } = require('../supabase');

const router = express.Router();

/** GET /api/closing — riwayat tutup buku */
router.get('/', async (req, res, next) => {
  try {
    res.json(await get('tutup_buku', 'select=*&order=id.desc'));
  } catch (e) { next(e); }
});

/** POST /api/closing — tutup buku harian
 *  Body: { tanggal, total_penjualan, uang_di_laci, selisih?, catatan?, user_id? } */
router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.tanggal) return res.status(400).json({ error: 'tanggal wajib diisi' });
    const selisih = Number(b.selisih || 0);
    const [row] = await write('POST', 'tutup_buku', [{
      tanggal: b.tanggal,
      total_penjualan: Number(b.total_penjualan || 0),
      uang_di_laci: Number(b.uang_di_laci || 0),
      selisih,
      status: selisih === 0 ? 'sesuai' : selisih < 0 ? 'kurang' : 'lebih',
      catatan: b.catatan || null,
      user_id: b.user_id || 1,
      ditutup_pada: new Date().toISOString()
    }], true);
    res.status(201).json(row);
  } catch (e) { next(e); }
});

module.exports = router;
