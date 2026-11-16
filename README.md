# Toko Berkah — Sistem Stok & Transaksi

Repositori ini berisi **beberapa versi aplikasi Toko Berkah** dalam satu tempat:
versi **Web** (prototipe stok & transaksi), versi **Desktop** (aplikasi kasir
native Windows), dan versi **Android** yang sedang disiapkan.

## 📦 Daftar Platform

| Platform | Status | Teknologi | Lokasi |
|---|---|---|---|
| **Web** | ✅ Tersedia | HTML + CSS + JS (ES Module, `localStorage`) | root repo (`index.html`, `js/`, `css/`) |
| **Desktop** | ✅ Tersedia | C# WinForms (.NET 8) + SQLite | folder `Toko-Berkah-Dekstop/` |
| **Android** | 🚧 **Coming soon** | — | belum tersedia |

---

## 🌐 Versi Web

Prototipe web sesuai PRD (bagian Web 4.1). Fitur kasir/POS tidak disertakan karena
tidak ada di PRD; riwayat transaksi tetap ditampilkan sebagai data historis.

**Demo hosting:** https://nasrulaja.github.io/toko-berkah-project/
*(Perlu internet untuk Google Fonts dan animasi spring physics)*

### Menjalankan lokal
1. Clone atau download repo ini
2. Jalankan server statis di folder proyek, mis. `python3 -m http.server 8000` (atau `npx serve`)
3. Buka `http://localhost:8000` di browser (Chrome/Firefox/Edge terbaru)
4. Login dengan: `berkah@gmail.com` / `berkah123`

> Jangan membuka `index.html` langsung lewat `file://`: aplikasi memakai ES module (`type="module"`)
> yang diblokir browser untuk file lokal, sehingga halaman tampil kosong.

### Fitur web (v2.0)
- ✅ **Navigasi responsif** — Rail kaca mengambang di kiri laptop/desktop, bar menu liquid glass di bawah HP
- ✅ **Liquid Glass v2** — Full-app clear glassmorphism (`backdrop-filter blur 12-24px`)
- ✅ **Spring Physics** — Drag vertikal + lateral rubber banding
- ✅ **Polling Sync** — Indikator aktif kebal re-render `#app`
- ✅ **Mobile Responsive** — Bar menu bawah ramah sentuh dengan safe area dan state aktif
- ✅ **Hasil Tutup Buku** — Web menampilkan laporan hasil proses tutup buku desktop dalam mode hanya-baca; data saat ini masih contoh/dummy

### Login demo web
- Surel: `berkah@gmail.com`
- Kata sandi: `berkah123`

### Struktur kode web

> Setiap berkas diawali banner **PETA FILE** dan dibagi dengan penanda
> `BAGIAN n — NAMA`. Cukup cari teks `BAGIAN` di editor untuk melompat
> antar bagian tanpa perlu membaca seluruh berkas.

- **`index.html`** — Kerangka halaman; hanya wadah kosong (`#app`, `#ov`), pemuatan font/CSS, dan pemanggilan skrip. Seluruh isi dirender oleh `js/app.js`.
- **`css/style.css`** — Gaya utama (variabel warna, sidebar, topbar, kartu, form, tabel, dashboard, modal, login) dalam 9 `BAGIAN`.
- **`css/glass.css`** — Gaya terpusat efek glassmorphism, GX Rail desktop, mode performa mobile & fallback.
- **`css/mobile.css`** — Penataan khusus HP (< 992px): bar menu bawah, tabel jadi kartu, modal & form ramah sentuh.
- **`js/db.js`** — Interaksi `localStorage`, simpan/muat basis data, seeding data awal, pencatatan mutasi/transaksi.
- **`js/ui.js`** — Utilitas DOM, format Rupiah & tanggal, toast, modal, escape HTML, generator ikon SVG.
- **`js/pages.js`** — Render seluruh halaman (Dashboard, Produk, Stok, Laporan, Hasil Tutup Buku, Transaksi, Pengaturan, Login).
- **`js/app.js`** — Titik masuk (*bootstrap*): routing hash URL dan event binding utama.
- **`js/glass-rail.js`** — GX Rail vertikal di desktop dengan fisika *spring* (*rubber banding*, tetesan air).

### Catatan teknis web
- Data disimpan di `localStorage` browser (belum ada backend/database)
- Reset data: hapus data situs lewat pengaturan browser
- Kata sandi di-encode Base64 (sederhana); hash yang benar dibuat di backend
- Tidak ada build process — cukup jalankan server statis

---

## 🖥️ Versi Desktop (Windows)

Aplikasi kasir native. **Full bahasa Indonesia** (Surel / Kata Sandi). Detail
lengkap ada di [`Toko-Berkah-Dekstop/README.md`](Toko-Berkah-Dekstop/README.md).

- **Teknologi:** C# WinForms (.NET 8) + SQLite (`Microsoft.Data.Sqlite`), ekspor laporan via ClosedXML
- **Fitur:** input barcode, keranjang, kembalian otomatis, struk, stok berkurang otomatis, kelola produk (hanya-baca untuk kasir), tutup kasir, laporan harian/bulanan + ekspor Excel

### Login desktop
- Surel: `kasir@gmail.com`
- Kata sandi: `kasir123`

### Menjalankan (butuh .NET 8 SDK)
```bash
cd Toko-Berkah-Dekstop/Kasir
dotnet run
```

### Membuat .exe mandiri (tanpa perlu install .NET di PC tujuan)
```bash
cd Toko-Berkah-Dekstop/Kasir
dotnet publish -c Release -r win-x64 --self-contained true ^
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

### Catatan penting desktop
- Database `kasir.db` dibuat otomatis **di samping `Kasir.exe`**. Backup file ini kalau data penting.
- Hapus `kasir.db` untuk reset ke data awal.
- Kata sandi disimpan ter-hash (PBKDF2-SHA256), bukan teks polos.

---

## 📱 Versi Android — Coming Soon 🚧

Versi Android **belum tersedia**. Belum ada kode, APK, maupun tanggal rilis.

Kalau Anda ingin menambahkannya, jalur yang paling masuk akal adalah memakai
ulang logika bisnis yang sudah ada, misalnya:

- **Wrapper WebView** — membungkus versi web (paling cepat, tapi data tetap di perangkat)
- **Kotlin / Jetpack Compose** — dengan Room (SQLite) agar setara versi desktop
- **Flutter atau .NET MAUI** — jika ingin menargetkan iOS sekaligus

Silakan buka *Issue* kalau ada kebutuhan spesifik untuk versi Android.

---

## 📄 Lisensi & Kontribusi

Prototipe internal Toko Berkah. Silakan buka *Issue* atau *Pull Request* untuk
perbaikan. Untuk perubahan besar, diskusikan dulu lewat Issue.

