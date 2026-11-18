/* Data utama: kategori & produk (termasuk ubah harga jual).
   Peta kolom Supabase (lihat js/core/api.js):
     produk.harga_jual -> harga jual, produk.harga_beli (opsional), produk.stok */
const express = require('express');
const { get, write } = require('../supabase');

const router = express.Router();

/* ------------------------------ KATEGORI ------------------------------ */

/** GET /api/categories */
router.get('/categories', async (req, res, next) => {
  try {
    const rows = await get('kategori', 'select=*&order=id');
    res.json(rows);
  } catch (e) { next(e); }
});

/** POST /api/categories — { nama } */
router.post('/categories', async (req, res, next) => {
  try {
    const { nama } = req.body || {};
    if (!nama) return res.status(400).json({ error: 'nama wajib diisi' });
    const [row] = await write('POST', 'kategori', [{ nama }], true);
    res.status(201).json(row);
  } catch (e) { next(e); }
});

/** PATCH /api/categories/:id — { nama } */
router.patch('/categories/:id', async (req, res, next) => {
  try {
    const [row] = await write('PATCH', `kategori?id=eq.${req.params.id}`, { nama: req.body.nama }, true);
    res.json(row);
  } catch (e) { next(e); }
});

/** DELETE /api/categories/:id */
router.delete('/categories/:id', async (req, res, next) => {
  try {
    await write('DELETE', `kategori?id=eq.${req.params.id}`);
    res.status(204).end();
  } catch (e) { next(e); }
});

/* ------------------------------- PRODUK ------------------------------- */

/** Susun baris produk mentah menjadi bentuk API (termasuk nama kategori). */
async function shapeProduk(rows, kat) {
  const katMap = new Map(kat.map((k) => [k.id, k.nama]));
  return rows.map((p) => ({
    id: p.id,
    nama: p.nama,
    barcode: p.barcode || '',
    harga_jual: p.harga_jual,
    harga_beli: p.harga_beli ?? null,
    stok: p.stok,
    stok_minimum: p.stok_minimum ?? 0,
    kategori_id: p.kategori_id,
    kategori: p.kategori_id ? katMap.get(p.kategori_id) || null : null,
    updated_at: p.updated_at || null
  }));
}

/** GET /api/products?search=&kategori_id= — daftar produk (+ filter) */
router.get('/products', async (req, res, next) => {
  try {
    const [produk, kat] = await Promise.all([
      get('produk', 'select=*&order=id'),
      get('kategori', 'select=*&order=id')
    ]);
    let rows = await shapeProduk(produk, kat);
    const { search, kategori_id } = req.query;
    if (kategori_id) rows = rows.filter((p) => String(p.kategori_id) === String(kategori_id));
    if (search) {
      const q = String(search).toLowerCase();
      rows = rows.filter(
        (p) => p.nama.toLowerCase().includes(q) || String(p.barcode).includes(q)
      );
    }
    res.json(rows);
  } catch (e) { next(e); }
});

/** GET /api/products/barcode/:ean — cari lewat barcode (pemindaian) */
router.get('/products/barcode/:ean', async (req, res, next) => {
  try {
    const rows = await get('produk', `select=*&barcode=eq.${encodeURIComponent(req.params.ean)}`);
    if (!rows.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const kat = await get('kategori', 'select=*');
    const [produk] = await shapeProduk(rows, kat);
    res.json(produk);
  } catch (e) { next(e); }
});

/** GET /api/products/:id */
router.get('/products/:id', async (req, res, next) => {
  try {
    const rows = await get('produk', `select=*&id=eq.${req.params.id}`);
    if (!rows.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const kat = await get('kategori', 'select=*');
    const [produk] = await shapeProduk(rows, kat);
    res.json(produk);
  } catch (e) { next(e); }
});

/** POST /api/products — { nama, barcode?, harga_jual, stok?, kategori_id?, stok_minimum?, harga_beli? } */
router.post('/products', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.nama) return res.status(400).json({ error: 'nama wajib diisi' });
    const badan = {
      nama: b.nama,
      barcode: b.barcode || null,
      harga_jual: b.harga_jual ?? 0,
      stok: b.stok ?? 0,
      kategori_id: b.kategori_id ?? null,
      stok_minimum: b.stok_minimum ?? 0
    };
    if (b.harga_beli != null) badan.harga_beli = b.harga_beli;
    const [row] = await write('POST', 'produk', [badan], true);
    res.status(201).json(row);
  } catch (e) { next(e); }
});

/** PATCH /api/products/:id — ubah sebagian (nama, harga_jual, stok_minimum, kategori_id, ...) */
router.patch('/products/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    const badan = {};
    for (const k of ['nama', 'barcode', 'harga_jual', 'harga_beli', 'stok', 'kategori_id', 'stok_minimum']) {
      if (b[k] !== undefined) badan[k] = b[k];
    }
    if (!Object.keys(badan).length) return res.status(400).json({ error: 'tidak ada kolom yang diubah' });
    badan.updated_at = new Date().toISOString();
    const [row] = await write('PATCH', `produk?id=eq.${req.params.id}`, badan, true);
    res.json(row);
  } catch (e) { next(e); }
});

/** PATCH /api/products/:id/price — { harga_jual } (halaman Ubah Harga) */
router.patch('/products/:id/price', async (req, res, next) => {
  try {
    const harga = Number(req.body?.harga_jual);
    if (!(harga >= 0)) return res.status(400).json({ error: 'harga_jual tidak valid' });
    const lama = await get('produk', `select=id,harga_jual&id=eq.${req.params.id}`);
    if (!lama.length) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const [row] = await write(
      'PATCH',
      `produk?id=eq.${req.params.id}`,
      { harga_jual: harga, updated_at: new Date().toISOString() },
      true
    );
    res.json({ id: row.id, harga_lama: lama[0].harga_jual, harga_baru: row.harga_jual });
  } catch (e) { next(e); }
});

/** DELETE /api/products/:id */
router.delete('/products/:id', async (req, res, next) => {
  try {
    await write('DELETE', `produk?id=eq.${req.params.id}`);
    res.status(204).end();
  } catch (e) { next(e); }
});

module.exports = router;
