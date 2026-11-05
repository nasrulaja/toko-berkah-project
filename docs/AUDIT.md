# Audit Report - Toko Berkah

## a. Daftar Fungsi di `js/app.js`

| Nama Fungsi | Baris | Keterangan |
|-------------|-------|------------|
| `$` | 1 | Shortcut untuk `document.querySelector`. |
| `$$` | 1 | Shortcut untuk `document.querySelectorAll` (mengembalikan array). |
| `esc` | 2 | Helper untuk melakukan escape karakter HTML berbahaya. |
| `rp` | 3 | Memformat angka menjadi format mata uang Rupiah (IDR). |
| `dk` | 4 | Mengubah Date ISO string menjadi format tanggal YYYY-MM-DD. |
| `dt` | 5 | Memformat Date ISO string menjadi format tanggal dan waktu lokal Indonesia. |
| `ico` | 9 | Menghasilkan string HTML SVG berdasarkan nama icon di objek `IC`. |
| `load` | 11 | Memuat basis data dari `localStorage` atau menjalankan `seed()` jika kosong. |
| `save` | 12 | Menyimpan kondisi basis data saat ini ke `localStorage`. |
| `mut` | 13 | Mencatat mutasi stok produk (masuk/keluar/jual). |
| `sell` | 14 | Memproses transaksi penjualan, menghitung total, dan mencatat mutasi stok. |
| `seed` | 17 | Menginisialisasi basis data dengan data kategori dan produk contoh. |
| `bind` | 27 | Mengikat event click pada elemen dengan atribut `data-act`. |
| `md` | 30 | Menampilkan modal overlay dengan konten HTML kustom. |
| `close` | 31 | Menutup modal yang sedang terbuka. |
| `toast` | 32 | Menampilkan pesan notifikasi singkat (toast) di pojok layar. |
| `el` | 35 | Helper untuk membuat elemen DOM dengan atribut tertentu. |
| `shell` | 36 | Merender kerangka utama aplikasi (sidebar, header, dan main content). |
| `pg.dashboard` | 38 | Merender halaman ringkasan (dashboard) dengan statistik penjualan. |
| `pg.kasir` | 44 | Merender halaman kasir untuk melakukan transaksi penjualan. |
| `pg.produk` | 55 | Merender halaman manajemen produk (tambah, edit, hapus). |
| `pg.stok` | 67 | Merender halaman manajemen stok dan riwayat mutasi. |
| `pg.laporan` | 76 | Merender halaman laporan ringkasan harian dan performa produk. |
| `pg.transaksi` | 89 | Merender halaman riwayat transaksi lengkap. |
| `pg.pengaturan` | 98 | Merender halaman pengaturan profil user dan hapus data. |
| `themeIcon` | 115 | Mengembalikan HTML icon (sun/moon) berdasarkan tema yang aktif. |
| `auth` | 116 | Merender halaman login dan menangani logika autentikasi. |
| `route` | 127 | Mengatur navigasi antar halaman berdasarkan hash URL. |
| `sb` | 128 | Menangani status collapse/expand sidebar samping. |
| `theme` | 130 | Mengatur tema aplikasi (light/dark mode). |
| `initParticles` | 136 | Menginisialisasi animasi partikel latar belakang (Liquid Glass). |

## b. Class CSS di `css/style.css` yang Tidak Terpakai

Class berikut ada di `style.css` tetapi tidak ditemukan penggunaannya di `index.html` atau `js/app.js`:

- `.auth` (Line 42)
- `.al` (Line 42-43)
- `.ar` (Line 43)
- `.box` (Line 43)
- `.stats .st:nth-child(1..4)` (Line 100-103) - *Catatan: CSS ini mencoba mewarnai `.st`, tetapi di dashboard saat ini warna diatur inline atau via class lain.*

## c. Kode Duplikat / Event Handler Ganda

- **Pemanggilan `route()` Ganda**: Di baris 133, `route()` dipanggil di dalam listener `hashchange` sekaligus dipanggil langsung di akhir file. Ini menyebabkan eksekusi ganda saat load pertama.
- **Inisialisasi Tema & Sidebar**: Pemanggilan `theme()` dan `sb()` dilakukan di luar blok inisialisasi utama, tersebar di baris 129 dan 131.
- **Seleksi Navigasi**: Logika untuk mencari menu aktif di `shell()` dan `js/glass-rail.js` (activeIndex) bersifat independen dan duplikat secara konseptual.
