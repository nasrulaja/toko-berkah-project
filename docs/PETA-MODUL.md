# Peta Modul — Versi Web

Dokumen ini memetakan berkas-berkas versi **Web** dan menggantikan audit lama
yang masih merujuk ke `app.js` sebagai satu berkas tunggal.

## Struktur folder

```
index.html              kerangka halaman (kosong, diisi app.js)
js/
├── app.js              pengendali utama + routing
├── pages.js            semua halaman (mengembalikan string HTML)
├── ui.js               helper DOM & format
├── charts.js           grafik dashboard
├── splash.js           layar sambutan
├── glass-rail.js       rail kaca (skrip non-modul)
└── core/
    ├── db.js           sumber data tunggal (state, mutasi, seed)
    └── api.js          penghubung Supabase
css/
├── style.css           gaya dasar
├── glass.css           glassmorphism + rail
├── mobile.css          penataan HP (< 992px)
├── light.css           tema terang
├── loader.css          loader & indikator
├── splash.css          splash screen
└── pages/
    ├── dashboard.css   halaman dashboard
    └── penjualan.css   halaman catat penjualan
```

## Tanggung jawab per berkas

| Berkas | Isi |
|--------|-----|
| `js/core/db.js` | State `db`/`me`, `load()` (dengan validasi), `save()`, `mut()` (satu-satunya jalan mengubah stok), `sell()` (khusus data contoh), `seed()` |
| `js/core/api.js` | Klien Supabase (publishable key), `muatDB()` & `simpanDB()`, penerjemahan nama kolom DB ↔ aplikasi |
| `js/ui.js` | Helper DOM/format (`$`, `esc`, `rp`, `dt`), ikon SVG, `toast()`, `modal()`, `ask()` |
| `js/pages.js` | Halaman: `dashboard`, `produk`, `stokMenipis`, `stok`, `laporan`, `transaksi`, `pengaturan`, form produk/kategori, `login` |
| `js/app.js` | Routing hash (`cur`, `shell`, `route`), satu listener klik `data-act`, tema, sidebar |
| `js/glass-rail.js` | Rail kaca (dibuat/dihapus otomatis lewat polling, sinkron menu aktif, drag spring) |
| `js/splash.js` | Animasi splash screen saat aplikasi pertama dibuka |
| `js/charts.js` | Grafik dashboard (penjualan & stok) |

## Jenis mutasi stok
`masuk` (barang masuk), `keluar` (barang keluar non-penjualan), `penyesuaian` (set stok sebenarnya, wajib alasan), `jual` (dari transaksi penjualan historis/data contoh).

## Catatan data
- `detail` transaksi menyimpan snapshot `harga_beli`, sehingga laba tidak berubah saat produk diubah/dihapus.
- Id kategori, produk, transaksi, dan mutasi berbagi satu counter `db.n`.
