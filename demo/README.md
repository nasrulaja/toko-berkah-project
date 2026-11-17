# 📦 Demo Toko Berkah — Semua Platform

Satu tempat untuk mengunduh semua versi aplikasi yang siap dipakai.
Tidak perlu build apa pun.

> Login seragam di semua platform: **`kasir@gmail.com`** / **`kasir123`**

---

## 🖥️ Desktop (Windows)

| Item | Ukuran | Keterangan |
|---|---|---|
| [`desktop/Kasir-Demo.zip`](desktop/Kasir-Demo.zip) | 3,7 MB | **Disarankan** — unduh lalu ekstrak |
| [`desktop/Kasir/`](desktop/Kasir/) | ± 12 MB | Isi yang sama, tanpa zip (dilihat per file) |

1. Unduh `Kasir-Demo.zip` → **ekstrak** → jalankan `Kasir.exe`
2. Syarat: Windows 64-bit + [.NET 8 Runtime (Desktop)](https://dotnet.microsoft.com/download/dotnet/8.0)

> ⚠️ Jangan jalankan `Kasir.exe` langsung dari dalam ZIP — file `.dll` pendampingnya
> tidak akan ditemukan dan aplikasi langsung error.

---

## 📱 Android (Aplikasi Pemilik)

| Arsitektur | File | Ukuran |
|---|---|---|
| **arm64-v8a** (HP modern, disarankan) | [`android/TokoBerkah-Owner-arm64-v8a-release-unsigned.apk`](android/TokoBerkah-Owner-arm64-v8a-release-unsigned.apk) | 8,1 MB |
| armeabi-v7a (HP lama 32-bit) | [`android/TokoBerkah-Owner-armeabi-v7a-release-unsigned.apk`](android/TokoBerkah-Owner-armeabi-v7a-release-unsigned.apk) | 6,5 MB |
| arm64-v8a — **debug** | [`android/TokoBerkah-Owner-arm64-v8a-debug.apk`](android/TokoBerkah-Owner-arm64-v8a-debug.apk) | 27 MB |
| armeabi-v7a — **debug** | [`android/TokoBerkah-Owner-armeabi-v7a-debug.apk`](android/TokoBerkah-Owner-armeabi-v7a-debug.apk) | 25 MB |

**Pilih yang mana?**

- **Mau langsung pasang** → pakai versi **debug** (sudah bertanda tangan, bisa
  langsung diinstal dengan mengizinkan "sumber tidak dikenal").
- **Mau ukuran kecil** → versi **release** (R8 aktif, 8,1 MB) tapi masih
  *unsigned*, harus ditandatangani dulu sebelum bisa dipasang.

Cara pasang: salin APK ke HP → buka → izinkan "instal dari sumber tidak dikenal".

---

## 🌐 Web

Tidak perlu unduh — buka langsung:
**https://nasrulaja.github.io/toko-berkah-project/**

Login web demo: `berkah@gmail.com` / `berkah123`

Kode sumbernya ada di root repo (`index.html`, `js/`, `css/`).

---

## Catatan

- Folder ini hanya berisi **hasil build**. Kode sumber ada di
  [`Toko-Berkah-Dekstop/`](../Toko-Berkah-Dekstop/),
  [`TokoBerkah-Android-Owner/`](../TokoBerkah-Android-Owner/), dan root repo.
- Setelah mengubah kode, build ulang lalu ganti file di sini (lihat README proyek masing-masing).
- APK release belum ditandatangani — jangan dipakai untuk distribusi publik.
