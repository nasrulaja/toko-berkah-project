# Toko Berkah — Backend

Server REST (Node.js + Express) yang menyambungkan aplikasi ke **database Supabase**
yang sudah dipakai web (`js/core/api.js`) dan desktop (`Toko-Berkah-Dekstop`).
Satu database = satu sumber kebenaran, jadi stok/harga tidak lagi beda antar halaman.

## Menjalankan

```bash
cd backend
npm install
copy .env.example .env   # lalu isi JWT_SECRET & SUPABASE_SERVICE_ROLE_KEY
npm start                # http://localhost:3000
```

Cek koneksi: buka `http://localhost:3000/api/health` → `{"ok":true,"db":"terhubung"}`.

### Berkas `.env`

| Kunci | Fungsi |
|---|---|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Alamat & kunci data (publishable — aman, dibatasi RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Wajib untuk login** — membaca `users.password_hash` yang tidak boleh dibaca anon key. Ambil dari Supabase Dashboard → Project Settings → API. Jangan pernah menyimpannya di aplikasi klien. |
| `JWT_SECRET` | Rahasia tanda tangan token — ganti string acak panjang saat produksi |

> Catatan jaringan: DNS mesin ini mengembalikan IPv6 (NAT64) yang reset koneksi,
> karena itu `server.js` memaksa `dns.setDefaultResultOrder('ipv4first')`.

## Endpoint

Semua rute di bawah memakai header `Authorization: Bearer <token>` kecuali
`/api/health` dan `POST /api/auth/login`.

### Autentikasi
| Metode | Rute | Fungsi |
|---|---|---|
| POST | `/api/auth/login` | `{email, password}` → `{token, user}` — sandi diverifikasi PBKDF2-SHA256 (format sama dengan desktop) |
| GET | `/api/auth/me` | Profil dari token yang dipakai |

### Data utama
| Metode | Rute | Fungsi |
|---|---|---|
| GET | `/api/categories` | Daftar kategori (15 tag) |
| POST/PATCH/DELETE | `/api/categories[/:id]` | Kelola kategori |
| GET | `/api/products?search=&kategori_id=` | Daftar produk (+nama kategori) |
| GET | `/api/products/barcode/:ean` | Cari produk lewat barcode (pemindaian) |
| GET/POST/PATCH/DELETE | `/api/products/:id` | Detail / tambah / ubah / hapus produk |
| PATCH | `/api/products/:id/price` | `{harga_jual}` → `{harga_lama, harga_baru}` |

### Stok
| Metode | Rute | Fungsi |
|---|---|---|
| POST | `/api/stock/masuk` | `{produk_id, jumlah, harga_kulak?, catatan?}` — stok bertambah **dan** tercatat di `stok_mutasi` |
| POST | `/api/stock/adjust` | `{produk_id, stok_baru}` — stock opname |
| GET | `/api/stock/mutations?produk_id=` | Riwayat mutasi stok |

### Transaksi & tutup buku
| Metode | Rute | Fungsi |
|---|---|---|
| GET | `/api/transactions?dari=&sampai=` | Daftar transaksi + detail |
| POST | `/api/transactions` | `{items:[{produk_id, jumlah}], uang_diterima}` — harga diambil dari DB, stok otomatis berkurang, mutasi tercatat |
| GET/POST | `/api/closing` | Tutup buku harian (`tutup_buku`) |

## Alur data

```
Aplikasi Android (langkah berikutnya) ──┐
Web (js/) ─────────────────────────────┼──> backend ini ──> Supabase (PostgreSQL)
Desktop kasir (SQLite + sinkron) ──────┘
```

Rencana: aplikasi Android menggantikan data dummy-nya dengan panggilan ke
backend ini (Retrofit), sehingga stok/harga/transaksi tampil sama di semua
perangkat.
