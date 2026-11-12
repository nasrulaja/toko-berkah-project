# Aplikasi Kasir Desktop

Aplikasi kasir desktop sederhana untuk toko kelontong, dibuat dengan **C# WinForms (.NET 8)** dan **SQLite**.

## Fitur

- Input barang lewat kode atau barcode (Enter untuk menambah ke keranjang)
- Cari barang berdasarkan nama atau kode, dengan filter kategori
- Keranjang belanja: ubah jumlah (qty) dan hapus item
- Pembayaran dengan hitung kembalian otomatis dan tombol uang cepat (Uang Pas, 50rb, 100rb)
- Struk pembayaran, stok barang berkurang otomatis setelah transaksi
- Kelola produk: tambah, ubah, dan hapus produk, dilengkapi filter cari
- Laporan hari ini dalam bentuk struk: jumlah transaksi, total penjualan, barang terlaris, dan stok menipis

## Pintasan keyboard

| Tombol | Fungsi |
|---|---|
| Enter (kolom kode) | Tambah barang ke keranjang |
| F2 | Kelola produk |
| F3 | Laporan hari ini |
| F9 | Batalkan transaksi |
| F12 | Bayar |
| Delete | Hapus item terpilih di keranjang |

## Teknologi

- C# dan .NET 8 (Windows Forms)
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
        ├── LaporanForm.cs    Struk laporan harian
        └── ProdukForm.cs     Kelola produk
```

## Pengaturan toko

Nama dan alamat toko di struk bisa diubah di `Kasir/Data/Db.cs` (`NamaToko` dan `AlamatToko`).

## Tim

- [Nama anggota 1]
- [Nama anggota 2]
- [Nama anggota 3]
