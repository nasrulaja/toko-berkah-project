# Toko Berkah - Sistem Kasir & Stok (Web)

Prototipe web sesuai PRD (bagian Web 4.1).

## 🌐 Demo Hosting

**https://nasrulaja.github.io/toko-berkah-project/**

*(Perlu internet untuk Google Fonts dan animasi spring physics)*

## 🚀 Cara menjalankan lokal
1. Clone atau download repo ini
2. Buka `index.html` di browser (Chrome/Firefox/Edge terbaru)
3. Login dengan: `berkah@gmail.com` / `berkah123`

(Font memakai Google Fonts, perlu internet agar tampil sempurna.)

## 📱 Fitur terkini (v2.0)
- ✅ **Glass Rail v3** - Floating glass rail dengan toggle "Sembunyikan/Menu"
- ✅ **Liquid Glass v2** - Full-app clear glassmorphism (`backdrop-filter blur 12-24px`)
- ✅ **Spring Physics** - Drag vertical + lateral rubber banding
- ✅ **Polling Sync** - Indikator aktif kebal re-render `#app`
- ✅ **Mobile Responsive** - Rail tetap tampil di semua ukuran layar (collapsed di < 992px)

## 🔐 Login demo
- Surel: `berkah@gmail.com`
- Kata sandi: `berkah123`

## 📁 Struktur Kode

- **`js/db.js`**: Modul yang mengelola seluruh interaksi dengan `localStorage`, memuat/menyimpan kondisi basis data, serta menyediakan fungsi seeding data awal dan pencatatan mutasi/transaksi.
- **`js/ui.js`**: Modul pembantu antarmuka (UI) yang mencakup fungsi utilitas DOM, format Rupiah, tanggal, toast, modal, escape HTML, dan generator SVG icon.
- **`js/pages.js`**: Modul yang berisi seluruh fungsi render halaman utama aplikasi (Dashboard, Kasir, Produk, Stok, Laporan, Transaksi, Pengaturan, dan Login).
- **`js/app.js`**: Titik masuk (*bootstrap*) aplikasi berbasis modul ES yang menangani routing hash URL, event binding utama, dan animasi partikel latar belakang.
- **`css/glass.css`**: Berkas gaya terpusat yang menggabungkan efek glassmorphism aplikasi, styling GX Rail vertikal, serta mode performa mobile & fallback.
- **`js/glass-rail.js`**: Skrip interaktif untuk GX Rail vertikal dengan fisika *spring* (*rubber banding* dan tetesan air), mendukung semua ukuran layar.

## ⚙️ Catatan teknis
- Data disimpan di localStorage browser (belum ada backend/database)
- Untuk reset data: hapus data situs di browser settings
- Kata sandi di-encode Base64 (sederhana); hash yang benar dibuat di backend

## 🔧 Build commands
Tidak ada build process. Langsung buka `index.html` di browser.
