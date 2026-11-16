# Aplikasi Kasir Desktop

Aplikasi kasir desktop sederhana untuk toko kelontong, dibuat dengan **C# WinForms (.NET 8)** dan **SQLite**.

## Cara mencoba aplikasi (paling cepat)

1. Unduh **`Kasir-Demo.zip`** (ada di folder ini, ukuran ± 3,7 MB)
2. Ekstrak ke folder mana pun
3. Jalankan **`Kasir.exe`**
4. Masuk dengan **kasir@gmail.com** / **kasir123**

> PENTING: ZIP harus **diekstrak dulu**. Jangan jalankan `Kasir.exe` langsung dari dalam ZIP, karena aplikasi tidak akan menemukan file pendampingnya. `Kasir.exe` perlu berada satu folder dengan file `.dll` lainnya.

Syarat: Windows 64-bit dan [.NET 8 Runtime (Desktop)](https://dotnet.microsoft.com/download/dotnet/8.0). Bila belum terpasang, Windows akan menampilkan tautan unduhannya saat aplikasi dijalankan.

**File yang ada di repo ini:**

| Lokasi | Isi |
|---|---|
| [`Kasir-Demo.zip`](https://github.com/nasrulaja/toko-berkah-project/raw/main/Kasir-Demo.zip) | Paket siap jalan, di root repo — unduh ini kalau hanya ingin mencoba |
| [`demo-kasir/`](../../demo-kasir/) | Isi paket yang sama tetapi belum dizip (bisa dilihat per file) |
| `Kasir/` | Kode sumber lengkap (untuk diubah/dikembangkan) |

## Fitur

- Input barang lewat kode atau barcode (Enter untuk menambah ke keranjang)
- Cari barang berdasarkan nama atau kode, dengan filter kategori
- Keranjang belanja: ubah jumlah (qty) dan hapus item
- Pembayaran dengan hitung kembalian otomatis dan tombol uang cepat (Uang Pas, 50rb, 100rb)
- Struk pembayaran, stok barang berkurang otomatis setelah transaksi
- Kelola produk: melihat dan mencari daftar produk (hanya baca, kasir tidak bisa menambah, mengedit, atau menghapus produk dan stok)
- Halaman login dengan kolom **Surel** dan **Kata Sandi** (akun awal: kasir@gmail.com / kasir123, sandi disimpan ter-hash PBKDF2-SHA256), opsi tampilkan kata sandi, dan tombol Keluar (semuanya di dalam satu jendela)
- Pembukuan saat logout: kasir menghitung uang di laci, dibandingkan dengan modal awal + penjualan hari ini, selisihnya dicatat
- Laporan penjualan harian dan bulanan (pilih tanggal atau bulan, bisa di-download ke Excel): jumlah transaksi, total penjualan, rata-rata per transaksi, barang terlaris, rincian per hari (bulanan), dan stok menipis
- **Tutup kasir wajib**: aplikasi tidak bisa ditutup selama masih login sebelum pembukuan tutup kasir diisi. Bila tombol X ditekan, muncul konfirmasi lalu formulir Tutup Kasir terbuka. Ketentuan ini tidak berlaku di halaman login (sebelum masuk, jendela bisa ditutup langsung).
- **Tersambung ke database web (Supabase)**: transaksi, rincian transaksi, perubahan stok/harga produk, dan rekap tutup kasir otomatis dikirim ke database yang sama dengan versi web, sehingga dashboard web menampilkan data kasir desktop. Bila internet mati, data tetap aman tersimpan di SQLite dan dikirim otomatis saat online kembali.

## Sinkronisasi dengan versi web (Supabase)

Aplikasi desktop memakai **SQLite sebagai database utama** agar kasir tetap bisa melayani pembeli walau internet mati, lalu hasilnya dikirim ke Supabase.

| Yang dikirim | Tabel Supabase |
|---|---|
| Produk baru / perubahan stok & harga | `produk` |
| Transaksi | `transaksi` |
| Rincian barang transaksi | `detail_transaksi` |
| Rekap tutup kasir | `tutup_buku` |

Kapan pengiriman dilakukan:

1. Otomatis setelah kasir menekan **BAYAR** (di latar belakang, kasir tidak perlu menunggu)
2. Otomatis setelah **Tutup Kasir** disimpan
3. Otomatis sekali setiap kali berhasil login (mengirim sisa data yang tertunda)
4. Manual lewat tombol **Sinkron ke Web Sekarang**

Status sinkron tampil di bilah paling bawah jendela: hijau bila berhasil, oranye bila sedang offline (menampilkan jumlah data yang menunggu).

**Tabel yang tidak diubah dari desktop:** `users`, `roles`, dan `kategori`. Login kasir tetap memakai akun lokal (kata sandi di-hash PBKDF2-SHA256), jadi sistem login versi web tidak terganggu.

**Pengaturan koneksi** ada di `Kasir/Data/Supa.cs` (`Url` dan `Key`). Nilai yang dipakai adalah *publishable/anon key*, yang aman disertakan di aplikasi karena hak aksesnya dibatasi Row Level Security di Supabase. **Jangan pernah** menaruh `service_role` key di aplikasi desktop.

Catatan perilaku: barang yang namanya belum ada di web (misalnya "Beras 5kg" padahal di web hanya ada produk lain) akan dibuat sebagai produk baru di Supabase saat sinkron. Rincian transaksi yang barangnya tidak dikenali akan dilewati disertai pesan pemberitahuan, sedangkan transaksi induknya tetap tercatat.

## Pintasan keyboard

| Tombol | Fungsi |
|---|---|
| Enter (kolom kode) | Tambah barang ke keranjang |
| F2 | Kelola produk |
| F3 | Laporan penjualan |
| F9 | Batalkan transaksi |
| F12 | Bayar |
| Delete | Hapus item terpilih di keranjang |

## Teknologi

- C# dan .NET 8 (Windows Forms)
- ClosedXML (ekspor laporan ke Excel)
- SQLite (paket `Microsoft.Data.Sqlite`)

## Cara menjalankan

Syarat: Windows dan [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0).

**Lewat terminal**

```
dotnet run --project Kasir
```

**Lewat Visual Studio**

Buka `Kasir.sln`, lalu tekan F5.

Database `kasir.db` dibuat otomatis saat aplikasi pertama kali dijalankan, berisi beberapa produk contoh.

## Struktur proyek

```
kasir-winforms/
├── README.md
├── .gitignore
├── Kasir.sln
└── Kasir/
    ├── Kasir.csproj
    ├── Program.cs            Titik masuk aplikasi
    ├── Models/
    │   └── Models.cs         Produk, ItemKeranjang, DataLaporan
    ├── Data/
    │   ├── Db.cs             Akses database SQLite dan query
    │   └── Supa.cs           Koneksi & sinkronisasi ke Supabase (versi web)
    ├── Helpers/
    │   └── Ui.cs             Bantuan tampilan (skala DPI, tinggi baris)
    └── Forms/
        ├── MainForm.cs       Layar utama kasir
        ├── CariForm.cs       Dialog cari barang
        ├── QtyForm.cs        Dialog ubah qty
        ├── StrukForm.cs      Struk pembayaran
        ├── TutupKasirForm.cs Tutup kasir (cek uang di laci)
        ├── LaporanForm.cs    Laporan penjualan harian dan bulanan
        ├── ProdukForm.cs     Kelola produk
        └── LoginPanel.cs     Halaman login (di dalam jendela utama)
```

## Pengaturan toko

Nama dan alamat toko di struk bisa diubah di `Kasir/Data/Db.cs` (`NamaToko` dan `AlamatToko`).

## Tim

- [M.Dzimar Azka / 26]
- [Nama anggota 2]
- [Nama anggota 3]
