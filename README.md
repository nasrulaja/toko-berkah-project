# Toko Berkah - Sistem Stok & Transaksi (Web)

Prototipe web sesuai PRD (bagian Web 4.1). Fitur kasir/POS tidak disertakan karena
tidak ada di PRD; riwayat transaksi tetap ditampilkan sebagai data historis.

## 🌐 Demo Hosting

**https://nasrulaja.github.io/toko-berkah-project/**

*(Perlu internet untuk Google Fonts dan animasi spring physics)*

## 🚀 Cara menjalankan lokal
1. Clone atau download repo ini
2. Jalankan server statis di folder proyek, mis. `python3 -m http.server 8000` (atau `npx serve`)
3. Buka `http://localhost:8000` di browser (Chrome/Firefox/Edge terbaru)
4. Login dengan: `berkah@gmail.com` / `berkah123`

> Jangan membuka `index.html` langsung lewat `file://`: aplikasi memakai ES module (`type="module"`)
> yang diblokir browser untuk file lokal, sehingga halaman tampil kosong.

(Font memakai Google Fonts, perlu internet agar tampil sempurna.)

## 📱 Fitur terkini (v2.0)
- ✅ **Navigasi responsif** - Rail kaca mengambang di kiri laptop/desktop, bar menu liquid glass di bawah HP
- ✅ **Liquid Glass v2** - Full-app clear glassmorphism (`backdrop-filter blur 12-24px`)
- ✅ **Spring Physics** - Drag vertical + lateral rubber banding
- ✅ **Polling Sync** - Indikator aktif kebal re-render `#app`
- ✅ **Mobile Responsive** - Bar menu bawah ramah sentuh dengan safe area dan state aktif
- ✅ **Hasil Tutup Buku** - Web menampilkan laporan hasil proses tutup buku desktop dalam mode hanya-baca; data saat ini masih contoh/dummy.
- ✅ **Notifikasi Aktivitas** - Klik lonceng untuk melihat ringkasan stok menipis, perubahan stok, transaksi, dan hasil tutup buku.

## 🔐 Login demo
- Surel: `berkah@gmail.com`
- Kata sandi: `berkah123`

## 📁 Struktur Kode

> Setiap berkas diawali banner **PETA FILE** dan dibagi dengan penanda
> `BAGIAN n — NAMA`. Cukup cari teks `BAGIAN` di editor untuk melompat
> antar bagian tanpa perlu membaca seluruh berkas.

- **`index.html`**: Kerangka halaman — hanya berisi wadah kosong (`#app`, `#ov`), pemuatan font/CSS, dan pemanggilan skrip; seluruh isi dirender oleh `js/app.js`.
- **`css/style.css`**: Gaya utama aplikasi (variabel warna, sidebar, topbar, kartu, form, tabel, dashboard, modal, login) dalam 9 `BAGIAN`.
- **`js/db.js`**: Modul yang mengelola seluruh interaksi dengan `localStorage`, memuat/menyimpan kondisi basis data, serta menyediakan fungsi seeding data awal dan pencatatan mutasi/transaksi.
- **`js/ui.js`**: Modul pembantu antarmuka (UI) yang mencakup fungsi utilitas DOM, format Rupiah, tanggal, toast, modal, escape HTML, dan generator SVG icon.
- **`js/pages.js`**: Modul yang berisi seluruh fungsi render halaman utama aplikasi (Dashboard, Produk, Stok, Laporan, Hasil Tutup Buku, Notifikasi, Transaksi, Pengaturan, dan Login).
- **`js/app.js`**: Titik masuk (*bootstrap*) aplikasi berbasis modul ES yang menangani routing hash URL, event binding utama.
- **`css/glass.css`**: Berkas gaya terpusat yang menggabungkan efek glassmorphism aplikasi, styling GX Rail desktop, serta mode performa mobile & fallback.
- **`css/mobile.css`** : Penataan khusus HP (< 992px): bar menu liquid glass di bawah, tabel jadi kartu, modal & form ramah sentuh.
- **`js/glass-rail.js`**: Skrip interaktif untuk GX Rail vertikal di desktop dengan fisika *spring* (*rubber banding* dan tetesan air).

## ⚙️ Catatan teknis
- Data disimpan di localStorage browser (belum ada backend/database)
- Untuk reset data: hapus data situs di browser settings
- Kata sandi di-encode Base64 (sederhana); hash yang benar dibuat di backend

## 🔧 Build commands
Tidak ada build process. Langsung buka `index.html` di browser.
