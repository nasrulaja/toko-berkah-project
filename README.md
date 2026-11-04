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
- ✅ **Mobile Responsive** - Rail hilang < 992px, sidebar asli tetap jalan

## 🔐 Login demo
- Surel: `berkah@gmail.com`
- Kata sandi: `berkah123`

## 📁 Struktur
```
index.html          halaman utama
css/
  style.css         semua gaya (tema terang dan gelap)
  glass.css         Liquid Glass v2 glassmorphism
  glass-rail.css    Glass Rail v3 styling
js/
  app.js            logika aplikasi, data contoh, penyimpanan
  glass-rail.js     Floating glass rail v3 (spring physics)
```

## ⚙️ Catatan teknis
- Data disimpan di localStorage browser (belum ada backend/database)
- Untuk reset data: hapus data situs di browser settings
- Kata sandi di-encode Base64 (sederhana); hash yang benar dibuat di backend

## 🔧 Build commands
Tidak ada build process. Langsung buka `index.html` di browser.
