# demo-kasir — Aplikasi Desktop Siap Pakai

Folder ini berisi **hasil build** aplikasi kasir Windows (`Toko-Berkah-Dekstop/`),
supaya bisa dicoba tanpa perlu install .NET 8 SDK.

- Isinya **identik** dengan [`Kasir-Demo.zip`](../Kasir-Demo.zip) di root repo.
- Jalankan `Kasir.exe` — **jangan** lewat `file://` atau dari dalam ZIP.
- Wajib Windows 64-bit + [.NET 8 Runtime (Desktop)](https://dotnet.microsoft.com/download/dotnet/8.0).
- Login: `kasir@gmail.com` / `kasir123`.
- `kasir.db` dibuat otomatis di folder ini saat pertama dijalankan; hapus untuk reset data.

> Folder ini **tidak perlu diedit**. Untuk mengubah kode, edit
> [`Toko-Berkah-Dekstop/`](../Toko-Berkah-Dekstop/) lalu build ulang:

```bash
cd Toko-Berkah-Dekstop/Kasir
dotnet publish -c Release -r win-x64 --self-contained true ^
  -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true
```

Setelah build, salin isi `bin/Release/net8.0-windows/win-x64/publish/` ke folder ini
dan buat ulang `Kasir-Demo.zip`.
