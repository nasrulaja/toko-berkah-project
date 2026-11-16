# Toko Berkah POS Companion — Android Owner App

Aplikasi Android native **khusus pemilik toko** untuk mengelola harga, stok, dan barang
masuk Toko Berkah. Dibangun dengan **Kotlin + Jetpack Compose** dan terhubung langsung
ke backend Supabase yang sudah dipakai aplikasi **Web Admin** dan **Kasir Desktop**.

- Nama aplikasi: **Toko Berkah**
- Package: `com.tokoberkah.owner`
- Minimum SDK: 24 (Android 7.0) · Target SDK: 34 (Android 14) · Java/JVM: 17

---

## Fitur

| Fitur | Keterangan |
|---|---|
| Login Pemilik | Validasi email & sandi, loading state, pesan galat, sesi tersimpan terenkripsi |
| Cek Harga | Pindai barcode + daftar produk (gambar, nama, EAN, harga, stok, kategori, rak) |
| Detail Produk | Barcode, kategori, status stok, rak, harga jual kasir, badge "Resmi Terdaftar" |
| Riwayat Harga | Tanggal • jam, harga sebelum ➜ baru, selisih, pemilik yang mengubah |
| Ubah Harga | Input harga baru, indikator naik/turun otomatis, alasan wajib, konfirmasi simpan |
| Cek Stok | Status stok berwarna, sisa stok total, rak depan & gudang, jumlah perlu restok |
| Barang Masuk | Pindai → jumlah (-, +, +5/+10/+20/+50) → harga beli → total nilai → estimasi stok |
| Barcode Scanner | CameraX + ML Kit; EAN-13/8, UPC-A/E, Code128, Code39, QR; senter & input manual |
| Floating Warning | Notifikasi merah/oranye/hijau yang dapat ditutup |
| Offline-tolerant | Cache produk (Room) + antrean barang masuk agar tidak dobel/hilang |

---

## Teknologi

Kotlin · Jetpack Compose (Material 3) · MVVM · Navigation Compose · Coroutines & Flow ·
Retrofit + OkHttp + Gson · Room (KSP) · DataStore + EncryptedSharedPreferences ·
CameraX + Google ML Kit Barcode Scanning · Coil · Manual DI (ServiceLocator) ·
Gradle Kotlin DSL.

---

## Struktur Folder

```
TokoBerkah-Android-Owner/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/tokoberkah/owner/
│       │   ├── MainActivity.kt          # satu Activity, Compose entry point
│       │   ├── TokoBerkahApp.kt         # Application + init DI
│       │   ├── ServiceLocator.kt        # dependency injection manual
│       │   ├── data/
│       │   │   ├── api/                 # Retrofit (PostgREST Supabase)
│       │   │   ├── database/            # Room: cache produk, riwayat, antrean
│       │   │   ├── models/              # DTO sesuai kolom tabel
│       │   │   └── repository/          # Product, Pricing, Stock, Auth, Session
│       │   ├── domain/                  # model Produk + aturan status stok
│       │   ├── navigation/              # rute Navigation Compose
│       │   ├── scanner/                 # CameraX + ML Kit
│       │   ├── ui/
│       │   │   ├── AppContent.kt        # NavHost + BottomBar + wiring
│       │   │   ├── components/          # header, bottom bar, kartu, warning
│       │   │   ├── screens/             # Login, CekHarga, Detail, Riwayat, Ubah, Stok, Masuk, Scanner
│       │   │   └── theme/               # warna & tipografi desain referensi
│       │   └── viewmodel/               # Auth, Products, Pricing, Stock, SharedUi
│       └── res/
├── gradle/wrapper/
├── apk/TokoBerkah-Owner-debug.apk
├── build.gradle.kts
├── settings.gradle.kts
└── README.md
```

---

## Backend

Aplikasi memakai **backend yang sama** dengan Web Admin/Kasir (tidak membuat duplikat):

- Base REST: `https://<project>.supabase.co/rest/v1`
- Tabel: `produk`, `kategori`, `users`, `roles`, `stok_mutasi`, `transaksi`, `detail_transaksi`.

Pemetaan kolom penting: `produk.harga_jual`, `produk.stok`, `produk.stok_minimum`,
`produk.barcode`, `stok_mutasi.harga_kulak` (harga beli), `stok_mutasi.stok_sebelum/sesudah`.

**Barang masuk** dikirim sebagai satu baris `stok_mutasi` (jenis `masuk`) + `PATCH produk.stok`
memakai stok terbaru dari server — mencegah stok tergandakan.

**Riwayat harga**: skema Supabase belum punya tabel `riwayat_harga`, sehingga riwayat
disimpan di Room perangkat (ditandai `terkirim=false`) sambil tetap memperbarui
`produk.harga_jual` ke server. Untuk menyinkronkan ke server di masa depan, cukup tambah
tabel `riwayat_harga` dan aktifkan `PricingRepository.flushRiwayat()`.

---

## Cara Mengatur BASE_URL

Tidak ada IP yang di-hardcode. Pilih salah satu (prioritas atas ke bawah):

1. **local.properties** (disarankan, tidak di-commit):
   ```properties
   BASE_URL=https://tflawnflbyjgnqtdkjyq.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_xxx
   ```
2. **Gradle**: `gradlew.bat assembleDebug -PBASE_URL="http://192.168.1.10:54321"`
3. **Environment**: `set BASE_URL=https://...`

Default menunjuk ke project Supabase Toko Berkah yang dipakai saat ini. Kunci yang
dipakai adalah **publishable/anon key** (aman di klien, dibatasi RLS) — bukan service key.

---

## Menjalankan di Android Studio

1. `File → Open` → pilih folder `TokoBerkah-Android-Owner`.
2. Tunggu Gradle Sync selesai (butuh internet pada build pertama).
3. Pilih perangkat (emulator atau HP fisik), tekan **Run ▶**.

## Build APK

```bash
cd TokoBerkah-Android-Owner
gradlew.bat assembleDebug        # Windows
./gradlew assembleDebug          # macOS/Linux
```

Hasil: `app/build/outputs/apk/debug/app-debug.apk` (juga disalin ke
`apk/TokoBerkah-Owner-debug.apk`).

**Release** (opsional): tambahkan ke `local.properties`:
```properties
RELEASE_STORE_FILE=C:/path/keystore.jks
RELEASE_STORE_PASSWORD=***
RELEASE_KEY_ALIAS=***
RELEASE_KEY_PASSWORD=***
```
lalu `gradlew.bat assembleRelease`. **Jangan commit** keystore/password ke Git.

---

## Menghubungkan ke Backend

- Pastikan perangkat punya internet.
- Untuk backend lokal, gunakan `http://<IP-LAN>:<port>` lewat `BASE_URL`
  (cleartext sudah diizinkan di manifest).
- Akun pemilik default: `pemilik@tokoberkah.local`. Bila kata sandi di Web Admin diubah,
  sesuaikan kebijakan di `AuthRepository` atau pasang Edge Function `login-pemilik`.

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| "Tidak ada koneksi internet" | Cek jaringan; aplikasi menampilkan cache produk tersimpan |
| Kamera hitam | Beri izin Kamera di Pengaturan Android; di emulator aktifkan kamera virtual |
| Barcode tidak terbaca | Dekatkan & fokuskan; gunakan senter; atau input barcode manual |
| Produk tidak ditemukan | Daftarkan produk (nama + harga modal) di Web Admin Toko Berkah |
| Stok tidak berubah di Web Admin | Sinkronkan ulang (tarik refresh); antrean offline terkirim saat online |
| Gradle gagal sync | Butuh internet; pastikan `sdk.dir` di `local.properties` |

---

## Pengujian Manual

Login (benar/salah) · navigasi 3 menu · scan produk terdaftar & tidak terdaftar ·
cek harga · riwayat harga · ubah harga (+validasi) · cek stok & peringatan habis ·
barang masuk (perhitungan & simpan) · sinkronisasi stok ke Web Admin · koneksi terputus.

### Hasil build & uji otomatis

| Pemeriksaan | Hasil |
|---|---|
| `gradlew assembleDebug` | ✅ BUILD SUCCESSFUL |
| `gradlew assembleRelease` | ✅ BUILD SUCCESSFUL (tidak ter-sign, lihat bagian release) |
| `gradlew testDebugUnitTest` | ✅ 10 test lulus, 0 gagal |

Unit test (`app/src/test/.../CoreLogicTest.kt`) menguji logika yang paling rawan:
aturan status stok, invarian **stok rak depan + gudang = stok total**,
format Rupiah, normalisasi barcode & UPC-A↔EAN-13, estimasi stok barang masuk,
penolakan jumlah ≤ 0, selisih harga naik/turun, validasi email, dan konversi
galat jaringan menjadi pesan yang aman.

> **Catatan pengujian perangkat:** lingkungan build ini **tidak memiliki
> akselerasi perangkat keras** (Android Emulator hypervisor tidak terpasang),
> sehingga emulator tidak dapat booting. APK telah diverifikasi berisi native
> library untuk **arm64-v8a, armeabi-v7a, x86, x86_64** sehingga siap dipasang di
> HP fisik Android 7–14+ maupun emulator yang mendukung akselerasi.


