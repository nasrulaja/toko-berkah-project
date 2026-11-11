# Peta Modul - Toko Berkah

Dokumen ini menggantikan audit lama (yang masih merujuk ke `app.js` satu berkas).

| Berkas | Isi |
|--------|-----|
| `js/db.js` | State `db`/`me`, `load()` (dengan validasi), `save()`, `mut()` (satu-satunya jalan mengubah stok), `sell()` (khusus data contoh), `seed()` |
| `js/ui.js` | Helper DOM/format (`$`, `esc`, `rp`, `dt`), ikon SVG, `toast()`, `modal()`, `ask()` |
| `js/pages.js` | Halaman: `dashboard`, `produk`, `stokMenipis`, `stok`, `laporan`, `transaksi`, `pengaturan`, form produk/kategori, `login` |
| `js/app.js` | Routing hash (`cur`, `shell`, `route`), satu listener klik `data-act`, tema, sidebar |
| `js/glass-rail.js` | Rail kaca (dibuat/dihapus otomatis lewat polling, sinkron menu aktif, drag spring) |
| `css/style.css` | Gaya dasar aplikasi |
| `css/glass.css` | Efek glassmorphism + gaya rail |

## Jenis mutasi stok
`masuk` (barang masuk), `keluar` (barang keluar non-penjualan), `penyesuaian` (set stok sebenarnya, wajib alasan), `jual` (dari transaksi penjualan historis/data contoh).

## Catatan data
- `detail` transaksi menyimpan snapshot `harga_beli`, sehingga laba tidak berubah saat produk diubah/dihapus.
- Id kategori, produk, transaksi, dan mutasi berbagi satu counter `db.n`.
