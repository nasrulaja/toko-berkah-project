/* Stok: barang masuk, penyesuaian, dan riwayat mutasi (tabel stok_mutasi).
   Satu barang masuk = 1 PATCH stok di produk + 1 baris stok_mutasi,
   sehingga angka stok selalu satu sumber kebenaran (database). */
const express = require('express');
const { get, write } = require('../supabase');

const router = express.Router();

/** Ambil baris produk atau 404. */
async function mustProduk(id) {
  const rows = await get('produk', `select=id,nama,stok,harga_beli&id=eq.${id}`);
  if (!rows.length) {
    const err = new Error('Produk tidak ditemukan');
    err.status = 404;
    throw err;
  }
  return rows[0];
}

/**
 * Terapkan mutasi stok: baca stok sebelum, PATCH stok sesudah,
 * lalu catat ke stok_mutasi (jenis: masuk | keluar | penyesuaian).
 */
async function mutasi({ produkId, jenis, jumlah, hargaKulak, catatan, userId, transaksiId }) {
  const p = await mustProduk(produkId);
  const sebelum = p.stok ?? 0;
  const delta = jenis === 'keluar' ? -jumlah : jumlah;
  const sesudah = Math.max(0, sebelum + delta);

  const [row] = await write(
    'PATCH',
    `produk?id=eq.${p.id}`,
    { stok: sesudah, updated_at: new Date().toISOString() },
    true
  );

  const [m] = await write(
    'POST',
    'stok_mutasi',
    [{
      produk_id: p.id,
      jenis,
      jumlah,
      stok_sebelum: sebelum,
      stok_sesudah: sesudah,
      harga_kulak: hargaKulak ?? null,
      transaksi_id: transaksiId ?? null,
      catatan: catatan || null,
      waktu: new Date().toISOString(),
      user_id: userId || 1
    }],
    true
  );

  return { produk: row, mutasi: m };
}

/** GET /api/stock/mutations?produk_id= — riwayat mutasi stok */
router.get('/mutations', async (req, res, next) => {
  try {
    const q = req.query.produk_id
      ? `select=*&produk_id=eq.${req.query.produk_id}&order=id.desc`
      : 'select=*&order=id.desc&limit=200';
    res.json(await get('stok_mutasi', q));
  } catch (e) { next(e); }
});

/**
 * POST /api/stock/masuk — barang masuk dari halaman Barang Masuk
 * Body: { produk_id, jumlah, harga_kulak?, catatan?, user_id? }
 */
router.post('/masuk', async (req, res, next) => {
  try {
    const { produk_id, jumlah, harga_kulak, catatan, user_id } = req.body || {};
    const n = Number(jumlah);
    if (!produk_id || !(n > 0)) return res.status(400).json({ error: 'produk_id dan jumlah (>0) wajib diisi' });
    const hasil = await mutasi({
      produkId: produk_id,
      jenis: 'masuk',
      jumlah: n,
      hargaKulak: harga_kulak != null ? Number(harga_kulak) : null,
      catatan,
      userId: user_id
    });

    // Harga beli terakhir ikut disimpan (bila kolomnya ada di tabel produk)
    if (harga_kulak != null && Number(harga_kulak) > 0) {
      try {
        await write('PATCH', `produk?id=eq.${produk_id}`, { harga_beli: Number(harga_kulak) });
      } catch { /* kolom harga_beli belum ada — abaikan, riwayat tetap ada di stok_mutasi */ }
    }

    res.status(201).json({
      produk_id: hasil.produk.id,
      stok_sebelum: hasil.mutasi.stok_sebelum,
      stok_sesudah: hasil.mutasi.stok_sesudah,
      mutasi: hasil.mutasi
    });
  } catch (e) { next(e); }
});

/**
 * POST /api/stock/adjust — penyesuaian stok (stock opname)
 * Body: { produk_id, stok_baru, catatan?, user_id? }
 */
router.post('/adjust', async (req, res, next) => {
  try {
    const { produk_id, stok_baru, catatan, user_id } = req.body || {};
    const baru = Number(stok_baru);
    if (!produk_id || !(baru >= 0)) return res.status(400).json({ error: 'produk_id dan stok_baru (>=0) wajib diisi' });
    const p = await mustProduk(produk_id);
    const sebelum = p.stok ?? 0;

    const [row] = await write(
      'PATCH',
      `produk?id=eq.${p.id}`,
      { stok: baru, updated_at: new Date().toISOString() },
      true
    );
    const [m] = await write(
      'POST',
      'stok_mutasi',
      [{
        produk_id: p.id,
        jenis: 'penyesuaian',
        jumlah: Math.abs(baru - sebelum),
        stok_sebelum: sebelum,
        stok_sesudah: baru,
        catatan: catatan || 'Penyesuaian stok',
        waktu: new Date().toISOString(),
        user_id: user_id || 1
      }],
      true
    );

    res.json({
      produk_id: p.id,
      stok_sebelum: sebelum,
      stok_sesudah: row.stok,
      mutasi: m
    });
  } catch (e) { next(e); }
});

module.exports = { router, mutasi };
