# Toko Berkah — Sistem Stok & Transaksi

Repositori ini berisi **dua versi aplikasi Toko Berkah** dalam satu tempat:
versi **Web** (prototipe stok & transaksi) dan versi **Desktop** (aplikasi kasir
native Windows).

Untuk versi **Mobile/Android**, **kode sumbernya sudah tidak ada di repositori ini**.
Yang tersisa hanyalah **APK siap pasang** di [`demo/android/`](demo/android/) — lihat
[bagian Mobile](#-versi-mobile-android-apk).

## 📦 Daftar Platform

| Platform | Status | Teknologi | Lokasi |
|---|---|---|---|
| **Web** | ✅ Tersedia | HTML + CSS + JS (ES Module, `localStorage`) | root repo (`index.html`, `js/`, `css/`) |
| **Desktop** | ✅ Tersedia | C# WinForms (.NET 8) + SQLite | folder `Toko-Berkah-Dekstop/` |
| **Mobile (Android)** | ⚠️ APK saja — kode sumber dihapus | Kotlin + Jetpack Compose + Supabase *(kode tidak lagi di repo)* | APK di `demo/android/` |

**Semua paket siap pakai ada di satu tempat: [`demo/`](demo/) — APK Android, aplikasi Desktop (zip & folder), lengkap dengan petunjuk pasang.**

---

## 🖥️ Versi Desktop (Windows)

Aplikasi kasir native. **Full bahasa Indonesia** (Surel / Kata Sandi). Detail
lengkap ada di [`Toko-Berkah-Dekstop/README.md`](Toko-Berkah-Dekstop/README.md).

- **Teknologi:** C# WinForms (.NET 8) + SQLite (`Microsoft.Data.Sqlite`), ekspor laporan via ClosedXML
- **Fitur:** input barcode, keranjang, kembalian otomatis, struk, stok berkurang otomatis, kelola produk (hanya-baca untuk kasir), tutup kasir, laporan harian/bulanan + ekspor Excel

### Cara tercepat mencoba (tanpa build)

| Untuk | Ambil ini | Cara pakai |
|---|---|---|
| **Paling mudah** | [`Kasir-Demo.zip`](https://github.com/nasrulaja/toko-berkah-project/raw/main/demo/desktop/Kasir-Demo.zip) | Unduh, ekstrak, jalankan `Kasir.exe` |
| **Tanpa zip** | folder [`demo/desktop/Kasir/`](demo/desktop/Kasir/) | Unduh seluruh isi folder, lalu jalankan `Kasir.exe` |

> Wajib **diekstrak dulu**. Jangan jalankan `Kasir.exe` dari dalam ZIP: aplikasi tidak akan menemukan file pendampingnya dan langsung error.

Syarat: Windows 64-bit + [.NET 8 Runtime (Desktop)](https://dotnet.microsoft.com/download/dotnet/8.0).

Yang bisa dicoba: login kasir, cari barang lewat barcode, keranjang, bayar + kembalian, struk, laporan harian/bulanan (ekspor Excel), tutup kasir, dan **sinkron otomatis ke database web** (bilah status hijau di bawah jendela). Bila internet mati, transaksi tetap tersimpan dan terkirim sendiri saat online kembali.

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
- **`css/light.css`** — Penyempurnaan tema terang (latar aurora + kaca), dimuat paling akhir; tema gelap tidak disentuh.
- **`css/loader.css`** — Overlay kaca saat pindah halaman (ring + progress halus), diatur `loader()` di `js/app.js`.
- **`css/splash.css`** — Layar sambutan (typewriter "TOKO BERKAH") + hiasan halaman login.
- **`css/pages/dashboard.css`** — Gaya khusus halaman Dashboard.
- **`css/pages/penjualan.css`** — Gaya khusus halaman Penjualan/Transaksi.
- **`js/core/db.js`** — Interaksi `localStorage`, simpan/muat basis data, seeding data awal, pencatatan mutasi/transaksi.
- **`js/core/api.js`** — Penghubung ke database Supabase (REST/PostgREST); menyimpan alamat & kunci project, memuat seluruh data tabel lalu menyusunnya. Dipakai oleh `core/db.js`.
- **`js/ui.js`** — Utilitas DOM, format Rupiah & tanggal, toast, modal, escape HTML, generator ikon SVG.
- **`js/pages.js`** — Render seluruh halaman (Dashboard, Produk, Stok, Laporan, Hasil Tutup Buku, Transaksi, Pengaturan, Login).
- **`js/app.js`** — Titik masuk (*bootstrap*): routing hash URL dan event binding utama.
- **`js/charts.js`** — Pembuatan grafik untuk dashboard/laporan.
- **`js/splash.js`** — Logika layar splash saat aplikasi dimuat.
- **`js/glass-rail.js`** — GX Rail vertikal di desktop dengan fisika *spring* (*rubber banding*, tetesan air).

### Catatan teknis web
- Data disimpan di `localStorage` browser (belum ada backend/database)
- Reset data: hapus data situs lewat pengaturan browser
- Kata sandi di-encode Base64 (sederhana); hash yang benar dibuat di backend
- Tidak ada build process — cukup jalankan server statis

---
## 📱 Versi Mobile (Android) — APK

> ⚠️ **Kode sumber aplikasi Android (`TokoBerkah-Android-Owner/`) sudah dihapus dari
> repositori ini.** Yang tersisa hanya berkas APK jadi di [`demo/android/`](demo/android/),
> sehingga APK tetap bisa dipasang dan dicoba, tetapi **tidak bisa lagi di-build** dari repo ini.

Aplikasi Android **native untuk pemilik toko** — mengelola harga, stok, dan barang masuk
langsung dari HP, terhubung ke **backend Supabase**. Fitur yang tertanam di APK:

- **Login Pemilik** — validasi email & sandi, loading, pesan galat, sesi terenkripsi
- **Cek Harga** — pindai barcode + daftar produk (gambar, EAN, harga, stok, kategori, rak)
- **Detail Produk & Ubah Harga** — harga jual kasir, indikator naik/turun otomatis, alasan wajib, konfirmasi
- **Riwayat Harga** — tanggal • jam, harga sebelum ➜ baru, selisih, pemilik yang mengubah
- **Cek Stok** — status hijau/oranye/merah, sisa stok total, rak depan & gudang, jumlah perlu restok
- **Barang Masuk** — jumlah (-, +, +5/+10/+20/+50), harga beli, total nilai, estimasi stok
- **Barcode Scanner** — CameraX + ML Kit (EAN-13/8, UPC-A/E, Code128, Code39, QR), senter, input manual
- **Floating Warning** — notifikasi merah/oranye/hijau yang bisa ditutup

Teknologi yang dipakai saat APK ini dibuat: Kotlin · Jetpack Compose (Material 3) · MVVM ·
Navigation Compose · Coroutines & Flow · Retrofit + OkHttp · Room · DataStore +
EncryptedSharedPreferences · CameraX + ML Kit · Coil · Gradle Kotlin DSL · minSdk 24 / targetSdk 34.

### Login mobile
- Surel: `kasir@gmail.com`
- Kata sandi: `kasir123`
- Form sudah terisi otomatis; cukup tekan **Masuk ke Toko**.

### APK siap pasang

Semua APK ada di **[`demo/android/`](demo/android/)**.

| Jenis | Arsitektur | APK | Ukuran |
| --- | --- | --- | --- |
| **Disarankan** (langsung bisa dipasang) | arm64-v8a | [`…-arm64-v8a-debug.apk`](demo/android/TokoBerkah-Owner-arm64-v8a-debug.apk) | 27 MB |
| debug | armeabi-v7a | [`…-armeabi-v7a-debug.apk`](demo/android/TokoBerkah-Owner-armeabi-v7a-debug.apk) | 25 MB |
| kecil, perlu ditandatangani | arm64-v8a | [`…-arm64-v8a-release-unsigned.apk`](demo/android/TokoBerkah-Owner-arm64-v8a-release-unsigned.apk) | **8.1 MB** |
| kecil, perlu ditandatangani | armeabi-v7a | [`…-armeabi-v7a-release-unsigned.apk`](demo/android/TokoBerkah-Owner-armeabi-v7a-release-unsigned.apk) | **6.5 MB** |

APK **debug** sudah bertanda tangan jadi bisa langsung dipasang. APK **release**
jauh lebih kecil (R8 aktif) tetapi masih *unsigned* — tanda tangani dulu sebelum dipasang.

### Build
Kode sumber Android sudah tidak ada di repo, jadi `gradlew assembleDebug` **tidak bisa
dijalankan lagi** dari sini. Untuk membangun ulang APK, siapkan project Android terpisah
(Kotlin + Compose) dan gunakan APK di atas sebagai acuan perilaku.

> Tangkapan layar & alur demo Android tetap tersedia di
> [`docs/DEMO-ANDROID.md`](docs/DEMO-ANDROID.md).

---

## 📄 Lisensi & Kontribusi

Prototipe internal Toko Berkah. Silakan buka *Issue* atau *Pull Request* untuk
perbaikan. Untuk perubahan besar, diskusikan dulu lewat Issue.

---

## 📁 Peta Dokumentasi

| Dokumen | Isi |
|---|---|
| [`demo/README.md`](demo/README.md) | Petunjuk pasang paket siap pakai (Desktop & Android APK) |
| [`docs/DEMO-ANDROID.md`](docs/DEMO-ANDROID.md) | Tangkapan layar & alur demo aplikasi Android |
| [`docs/PRD-LENGKAP.md`](docs/PRD-LENGKAP.md) | Product Requirements Document lengkap |
| [`docs/PETA-MODUL.md`](docs/PETA-MODUL.md) | Peta modul & struktur kode web |
| [`Toko-Berkah-Dekstop/README.md`](Toko-Berkah-Dekstop/README.md) | Dokumentasi aplikasi Desktop |

