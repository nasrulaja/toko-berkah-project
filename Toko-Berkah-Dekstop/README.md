# Aplikasi Kasir Desktop

Aplikasi kasir desktop sederhana untuk toko kelontong, dibuat dengan **C# WinForms (.NET 8)** dan **SQLite**.

## Fitur

- Input barang lewat kode atau barcode (Enter untuk menambah ke keranjang)
- Cari barang berdasarkan nama atau kode, dengan filter kategori
- Keranjang belanja: ubah jumlah (qty) dan hapus item
- Pembayaran dengan hitung kembalian otomatis dan tombol uang cepat (Uang Pas, 50rb, 100rb)
- Struk pembayaran, stok barang berkurang otomatis setelah transaksi
- Kelola produk: melihat dan mencari daftar produk (hanya baca, kasir tidak bisa menambah, mengedit, atau menghapus produk dan stok)
- Halaman login (akun awal: admin / admin123 dan kasir / kasir123, sandi disimpan ter-hash), opsi tampilkan password, dan tombol Logout (semuanya di dalam satu jendela)
- Pembukuan saat logout: kasir menghitung uang di laci, dibandingkan dengan modal awal + penjualan hari ini, selisihnya dicatat
- Laporan penjualan harian dan bulanan (pilih tanggal atau bulan, bisa di-download ke Excel): jumlah transaksi, total penjualan, rata-rata per transaksi, barang terlaris, rincian per hari (bulanan), dan stok menipis

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
    │   └── Db.cs             Akses database SQLite dan query
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
