/* Transaksi kasir (tabel transaksi + detail_transaksi) dan tutup buku
   (tabel tutup_buku). Satu POST transaksi = insert induk + detail +
   pengurangan stok produk + catatan stok_mutasi jenis 'keluar',
   mengikuti perilaku aplikasi Desktop (Toko-Berkah-Dekstop). */
const express = require('express');
const { get, write } = require('../supabase');
const { mutasi } = require('./stock');

const router = express.Router();

/** GET /api/transactions?dari=&sampai= — daftar transaksi + detail */
router.get('/', async (req, res, next) => {
  try {
    const trx = await get('transaksi', 'select=*,detail_transaksi(*)&order=id.desc');
    let rows = trx.map((t) => ({
      id: t.id,
      kode_transaksi: t.kode_transaksi,
      waktu: t.waktu,
      total: t.total,
      uang_diterima: t.uang_diterima,
      kembalian: t.kembalian,
      user_id: t.user_id,
      rekap_id: t.rekap_id,
      items: (t.detail_transaksi || []).map((d) => ({
        id: d.id,
        produk_id: d.produk_id,
        nama_produk: d.nama_produk,
        harga_jual: d.harga_jual,
        jumlah: d.jumlah,
        subtotal: d.subtotal
      }))
    }));
    const { dari, sampai, user_id } = req.query;
    if (dari) rows = rows.filter((r) => String(r.waktu).slice(0, 10) >= dari);
    if (sampai) rows = rows.filter((r) => String(r.waktu).slice(0, 10) <= sampai);
    if (user_id) rows = rows.filter((r) => String(r.user_id) === String(user_id));
    res.json(rows);
  } catch (e) { next(e); }
});

/** GET /api/transactions/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await get('transaksi', `select=*,detail_transaksi(*)&id=eq.${req.params.id}`);
    if (!rows.length) return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

/**
 * POST /api/transactions — transaksi kasir baru
 * Body: { uang_diterima, user_id?, kode_transaksi?, items:[{produk_id, jumlah, harga_jual}] }
 * Balas: { transaksi, items, stok: [...] }
 */
router.post('/', async (req, res, next) => {
  try {
    const { uang_diterima, user_id, kode_transaksi, items } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'items wajib diisi minimal 1 produk' });
    }
    for (const it of items) {
      if (!it.produk_id || !(Number(it.jumlah) > 0)) {
        return res.status(400).json({ error: 'setiap item butuh produk_id dan jumlah (>0)' });
      }
    }

    // harga jual diambil dari database (bukan dari klien) agar konsisten
    const ids = items.map((i) => i.produk_id).join(',');
    const produk = await get('produk', `select=id,nama,harga_jual,stok&id=in.(${ids})`);
    const peta = new Map(produk.map((p) => [p.id, p]));
    for (const it of items) {
      if (!peta.has(Number(it.produk_id))) {
        return res.status(404).json({ error: `Produk ${it.produk_id} tidak ditemukan` });
      }
    }

    const detail = items.map((it) => {
      const p = peta.get(Number(it.produk_id));
      const jumlah = Number(it.jumlah);
      const harga = Number(it.harga_jual) > 0 ? Number(it.harga_jual) : p.harga_jual;
      return {
        produk_id: p.id,
        nama_produk: p.nama,
        harga_jual: harga,
        jumlah,
        subtotal: harga * jumlah
      };
    });
    const total = detail.reduce((a, d) => a + d.subtotal, 0);
    const diterima = uang_diterima != null ? Number(uang_diterima) : total;

    const [trx] = await write('POST', 'transaksi', [{
      kode_transaksi: kode_transaksi || `TRX-${Date.now()}`,
      waktu: new Date().toISOString(),
      total,
      uang_diterima: diterima,
      kembalian: Math.max(0, diterima - total),
      user_id: user_id || 1
    }], true);

    const detailRows = detail.map((d) => ({ ...d, transaksi_id: trx.id }));
    await write('POST', 'detail_transaksi', detailRows);

    // stok berkurang + riwayat mutasi per produk
    const stokHasil = [];
    for (const d of detail) {
      const hasil = await mutasi({
        produkId: d.produk_id,
        jenis: 'keluar',
        jumlah: d.jumlah,
        catatan: `Penjualan ${trx.kode_transaksi}`,
        userId: user_id || 1,
        transaksiId: trx.id
      });
      stokHasil.push({
        produk_id: d.produk_id,
        stok_sebelum: hasil.mutasi.stok_sebelum,
        stok_sesudah: hasil.mutasi.stok_sesudah
      });
    }

    res.status(201).json({ transaksi: trx, items: detailRows, stok: stokHasil });
  } catch (e) { next(e); }
});

module.exports = router;
