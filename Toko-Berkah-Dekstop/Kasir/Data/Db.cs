using System.Globalization;
using Microsoft.Data.Sqlite;

namespace Kasir;

public static class Db
{
    public const string NamaToko = "TOKO KELONTONG SAYA";
    public const string AlamatToko = "Jl. Contoh No. 1";

    static readonly string DbFile = Path.Combine(AppContext.BaseDirectory, "kasir.db");
    static readonly CultureInfo Id = new("id-ID");

    public static SqliteConnection Open()
    {
        var c = new SqliteConnection($"Data Source={DbFile}");
        c.Open();
        return c;
    }

    public static string Rp(long n) => "Rp" + n.ToString("N0", Id);

    // Terima "17.000", "Rp17.000", "17,000", dll. Kembalikan 0 jika kosong/tidak valid.
    public static long ToInt(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return 0;
        s = s.Replace(".", "").Replace(",", "").Replace("Rp", "").Trim();
        return long.TryParse(s, out var n) ? n : 0;
    }

    public static void Init()
    {
        using var c = Open();
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = @"
CREATE TABLE IF NOT EXISTS produk(
    kode TEXT PRIMARY KEY, nama TEXT NOT NULL,
    harga INTEGER NOT NULL, stok INTEGER NOT NULL DEFAULT 0,
    kategori TEXT NOT NULL DEFAULT 'Lainnya');
CREATE TABLE IF NOT EXISTS transaksi(
    id INTEGER PRIMARY KEY AUTOINCREMENT, waktu TEXT,
    total INTEGER, bayar INTEGER, kembali INTEGER);
CREATE TABLE IF NOT EXISTS detail(
    id INTEGER PRIMARY KEY AUTOINCREMENT, trx_id INTEGER,
    kode TEXT, nama TEXT, harga INTEGER, qty INTEGER);
CREATE TABLE IF NOT EXISTS tutup_kasir(
    id INTEGER PRIMARY KEY AUTOINCREMENT, waktu TEXT, tanggal TEXT, kasir TEXT,
    modal INTEGER, transaksi INTEGER, penjualan INTEGER, uang_hitung INTEGER, selisih INTEGER);
CREATE TABLE IF NOT EXISTS pengguna(
    username TEXT PRIMARY KEY, nama TEXT NOT NULL, sandi TEXT NOT NULL);";
            cmd.ExecuteNonQuery();
        }
        SeedPengguna(c);

        // Database lama (sebelum ada kategori) belum punya kolom kategori: tambahkan otomatis.
        bool adaKategori = false;
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "PRAGMA table_info(produk)";
            using var r = cmd.ExecuteReader();
            while (r.Read())
                if (r.GetString(1) == "kategori") adaKategori = true;
        }
        if (!adaKategori)
        {
            using var cmd = c.CreateCommand();
            cmd.CommandText = @"ALTER TABLE produk ADD COLUMN kategori TEXT NOT NULL DEFAULT 'Lainnya';
UPDATE produk SET kategori='Makanan' WHERE kode IN ('8991001','8991008');
UPDATE produk SET kategori='Minuman' WHERE kode IN ('8991002','8991003','8991007');
UPDATE produk SET kategori='Bahan Pokok' WHERE kode IN ('8991004','8991005','8991006');";
            cmd.ExecuteNonQuery();
        }

        long jumlah;
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(*) FROM produk";
            jumlah = (long)cmd.ExecuteScalar()!;
        }
        if (jumlah == 0)
        {
            var contoh = new (string, string, long, long, string)[]
            {
                ("8991001", "Indomie Goreng", 3500, 100, "Makanan"),
                ("8991002", "Aqua 600ml", 4000, 48, "Minuman"),
                ("8991003", "Teh Botol Sosro", 5000, 36, "Minuman"),
                ("8991004", "Gula Pasir 1kg", 17000, 20, "Bahan Pokok"),
                ("8991005", "Minyak Goreng 1L", 18500, 24, "Bahan Pokok"),
                ("8991006", "Beras 5kg", 68000, 10, "Bahan Pokok"),
                ("8991007", "Kopi Kapal Api Sachet", 1500, 200, "Minuman"),
                ("8991008", "Roti Tawar", 16000, 12, "Makanan"),
            };
            using var tx = c.BeginTransaction();
            foreach (var (kode, nama, harga, stok, kategori) in contoh)
            {
                using var cmd = c.CreateCommand();
                cmd.Transaction = tx;
                cmd.CommandText = "INSERT INTO produk(kode,nama,harga,stok,kategori) VALUES($k,$n,$h,$s,$g)";
                cmd.Parameters.AddWithValue("$k", kode);
                cmd.Parameters.AddWithValue("$n", nama);
                cmd.Parameters.AddWithValue("$h", harga);
                cmd.Parameters.AddWithValue("$s", stok);
                cmd.Parameters.AddWithValue("$g", kategori);
                cmd.ExecuteNonQuery();
            }
            tx.Commit();
        }
    }

    static Produk Baca(SqliteDataReader r) => new()
    {
        Kode = r.GetString(0),
        Nama = r.GetString(1),
        Harga = r.GetInt64(2),
        Stok = r.GetInt64(3),
        Kategori = r.GetString(4),
    };

    public static Produk? CariKode(string kode)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT kode,nama,harga,stok,kategori FROM produk WHERE kode=$k";
        cmd.Parameters.AddWithValue("$k", kode);
        using var r = cmd.ExecuteReader();
        return r.Read() ? Baca(r) : null;
    }

    public const string SemuaKategori = "Semua";

    // kategori kosong atau "Semua" = semua kategori.
    public static List<Produk> Cari(string kata, string? kategori = null, int limit = 50)
    {
        var list = new List<Produk>();
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"SELECT kode,nama,harga,stok,kategori FROM produk
                            WHERE (nama LIKE $q OR kode LIKE $q)
                              AND ($g = '' OR kategori = $g)
                            ORDER BY nama LIMIT $l";
        cmd.Parameters.AddWithValue("$q", "%" + kata.Trim() + "%");
        cmd.Parameters.AddWithValue("$g", string.IsNullOrEmpty(kategori) || kategori == SemuaKategori ? "" : kategori);
        cmd.Parameters.AddWithValue("$l", limit);
        using var r = cmd.ExecuteReader();
        while (r.Read()) list.Add(Baca(r));
        return list;
    }

    public static List<Produk> SemuaProduk()
    {
        var list = new List<Produk>();
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT kode,nama,harga,stok,kategori FROM produk ORDER BY nama";
        using var r = cmd.ExecuteReader();
        while (r.Read()) list.Add(Baca(r));
        return list;
    }

    // Daftar kategori yang ada di database, urut abjad.
    public static List<string> DaftarKategori()
    {
        var list = new List<string>();
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT DISTINCT kategori FROM produk WHERE kategori <> '' ORDER BY kategori";
        using var r = cmd.ExecuteReader();
        while (r.Read()) list.Add(r.GetString(0));
        return list;
    }

    public static long StokDari(string kode)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT stok FROM produk WHERE kode=$k";
        cmd.Parameters.AddWithValue("$k", kode);
        var o = cmd.ExecuteScalar();
        return o == null ? 0 : Convert.ToInt64(o);
    }

    public static void SimpanProduk(Produk p)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"INSERT INTO produk(kode,nama,harga,stok,kategori) VALUES($k,$n,$h,$s,$g)
                            ON CONFLICT(kode) DO UPDATE SET
                            nama=excluded.nama, harga=excluded.harga, stok=excluded.stok";
        // Kategori hanya diisi untuk produk baru; saat produk diedit, kategori lamanya dipertahankan.
        cmd.Parameters.AddWithValue("$k", p.Kode);
        cmd.Parameters.AddWithValue("$n", p.Nama);
        cmd.Parameters.AddWithValue("$h", p.Harga);
        cmd.Parameters.AddWithValue("$s", p.Stok);
        cmd.Parameters.AddWithValue("$g", string.IsNullOrWhiteSpace(p.Kategori) ? "Lainnya" : p.Kategori.Trim());
        cmd.ExecuteNonQuery();
    }

    public static void HapusProduk(string kode)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "DELETE FROM produk WHERE kode=$k";
        cmd.Parameters.AddWithValue("$k", kode);
        cmd.ExecuteNonQuery();
    }

    // Simpan transaksi + kurangi stok dalam satu transaksi database.
    public static (long id, string waktu) SimpanTransaksi(
        IEnumerable<ItemKeranjang> items, long total, long bayar, long kembali)
    {
        var waktu = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        using var c = Open();
        using var tx = c.BeginTransaction();

        long trxId;
        using (var cmd = c.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = @"INSERT INTO transaksi(waktu,total,bayar,kembali)
                                VALUES($w,$t,$b,$k); SELECT last_insert_rowid();";
            cmd.Parameters.AddWithValue("$w", waktu);
            cmd.Parameters.AddWithValue("$t", total);
            cmd.Parameters.AddWithValue("$b", bayar);
            cmd.Parameters.AddWithValue("$k", kembali);
            trxId = (long)cmd.ExecuteScalar()!;
        }

        foreach (var i in items)
        {
            using (var cmd = c.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = @"INSERT INTO detail(trx_id,kode,nama,harga,qty)
                                    VALUES($t,$k,$n,$h,$q)";
                cmd.Parameters.AddWithValue("$t", trxId);
                cmd.Parameters.AddWithValue("$k", i.Kode);
                cmd.Parameters.AddWithValue("$n", i.Nama);
                cmd.Parameters.AddWithValue("$h", i.Harga);
                cmd.Parameters.AddWithValue("$q", i.Qty);
                cmd.ExecuteNonQuery();
            }
            using (var cmd = c.CreateCommand())
            {
                cmd.Transaction = tx;
                cmd.CommandText = "UPDATE produk SET stok = stok - $q WHERE kode=$k";
                cmd.Parameters.AddWithValue("$q", i.Qty);
                cmd.Parameters.AddWithValue("$k", i.Kode);
                cmd.ExecuteNonQuery();
            }
        }
        tx.Commit();
        return (trxId, waktu);
    }

    // kunci = "2026-11-13" (harian) atau "2026-11" (bulanan); dicocokkan dengan awal kolom waktu.
    public static DataLaporan LaporanData(string kunci)
    {
        var d = new DataLaporan { Periode = kunci };
        using var c = Open();

        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(*), COALESCE(SUM(total),0) FROM transaksi WHERE waktu LIKE $h";
            cmd.Parameters.AddWithValue("$h", kunci + "%");
            using var r = cmd.ExecuteReader();
            r.Read();
            d.Jumlah = r.GetInt64(0);
            d.Total = r.GetInt64(1);
        }

        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = @"SELECT d.nama, SUM(d.qty) q, SUM(d.qty * d.harga) FROM detail d
                                JOIN transaksi t ON t.id=d.trx_id
                                WHERE t.waktu LIKE $h GROUP BY d.nama
                                ORDER BY q DESC LIMIT 10";
            cmd.Parameters.AddWithValue("$h", kunci + "%");
            using var r = cmd.ExecuteReader();
            while (r.Read()) d.Terlaris.Add((r.GetString(0), r.GetInt64(1), r.GetInt64(2)));
        }

        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = @"SELECT substr(waktu,1,10) tgl, COUNT(*), COALESCE(SUM(total),0)
                                FROM transaksi WHERE waktu LIKE $h GROUP BY tgl ORDER BY tgl";
            cmd.Parameters.AddWithValue("$h", kunci + "%");
            using var r = cmd.ExecuteReader();
            while (r.Read()) d.PerHari.Add((r.GetString(0), r.GetInt64(1), r.GetInt64(2)));
        }

        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT nama, stok FROM produk WHERE stok <= 5 ORDER BY stok";
            using var r = cmd.ExecuteReader();
            while (r.Read()) d.Menipis.Add((r.GetString(0), r.GetInt64(1)));
        }
        return d;
    }

    public static string LaporanHariIni()
    {
        var hari = DateTime.Now.ToString("yyyy-MM-dd");
        using var c = Open();

        long n, tot;
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(*), COALESCE(SUM(total),0) FROM transaksi WHERE waktu LIKE $h";
            cmd.Parameters.AddWithValue("$h", hari + "%");
            using var r = cmd.ExecuteReader();
            r.Read();
            n = r.GetInt64(0);
            tot = r.GetInt64(1);
        }

        var top = new List<string>();
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = @"SELECT d.nama, SUM(d.qty) q FROM detail d
                                JOIN transaksi t ON t.id=d.trx_id
                                WHERE t.waktu LIKE $h GROUP BY d.nama
                                ORDER BY q DESC LIMIT 5";
            cmd.Parameters.AddWithValue("$h", hari + "%");
            using var r = cmd.ExecuteReader();
            while (r.Read()) top.Add($"  - {r.GetString(0)} ({r.GetInt64(1)})");
        }

        var habis = new List<string>();
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT nama, stok FROM produk WHERE stok <= 5 ORDER BY stok";
            using var r = cmd.ExecuteReader();
            while (r.Read()) habis.Add($"  - {r.GetString(0)} ({r.GetInt64(1)})");
        }

        return $"Laporan {hari}\n\nJumlah transaksi : {n}\nTotal penjualan  : {Rp(tot)}\n\n"
             + "Barang terlaris:\n" + (top.Count > 0 ? string.Join("\n", top) : "  -")
             + "\n\nStok menipis (<=5):\n" + (habis.Count > 0 ? string.Join("\n", habis) : "  -");
    }

    // ------------------------------------------------------------ login
    // Akun awal (dibuat sekali saat tabel pengguna masih kosong). Ganti sandinya sebelum dipakai sungguhan.
    static void SeedPengguna(SqliteConnection c)
    {
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(*) FROM pengguna";
            if ((long)cmd.ExecuteScalar()! > 0) return;
        }
        var awal = new[] { ("admin", "Admin", "admin123"), ("kasir", "Kasir", "kasir123") };
        foreach (var (user, nama, sandi) in awal)
        {
            using var cmd = c.CreateCommand();
            cmd.CommandText = "INSERT INTO pengguna(username,nama,sandi) VALUES($u,$n,$s)";
            cmd.Parameters.AddWithValue("$u", user);
            cmd.Parameters.AddWithValue("$n", nama);
            cmd.Parameters.AddWithValue("$s", BuatHash(sandi));
            cmd.ExecuteNonQuery();
        }
    }

    // Sandi tidak disimpan polos: disimpan sebagai "garam:hash" (PBKDF2-SHA256).
    static string BuatHash(string sandi)
    {
        var garam = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(sandi, garam, 100_000, HashAlgorithmName.SHA256, 32);
        return Convert.ToBase64String(garam) + ":" + Convert.ToBase64String(hash);
    }

    // Kembalikan nama pengguna kalau username dan sandi cocok, selain itu null.
    public static string? Login(string username, string sandi)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT nama, sandi FROM pengguna WHERE username=$u COLLATE NOCASE";
        cmd.Parameters.AddWithValue("$u", username.Trim());
        using var r = cmd.ExecuteReader();
        if (!r.Read()) return null;
        var bagian = r.GetString(1).Split(':');
        if (bagian.Length != 2) return null;
        var garam = Convert.FromBase64String(bagian[0]);
        var benar = Convert.FromBase64String(bagian[1]);
        var coba = Rfc2898DeriveBytes.Pbkdf2(sandi, garam, 100_000, HashAlgorithmName.SHA256, 32);
        return CryptographicOperations.FixedTimeEquals(coba, benar) ? r.GetString(0) : null;
    }

    // Buat akun baru. Kembalikan pesan kesalahan, atau null kalau berhasil.
    public static string? Daftar(string username, string nama, string sandi)
    {
        username = username.Trim();
        nama = nama.Trim();
        if (nama.Length == 0) return "Nama lengkap wajib diisi.";
        if (username.Length < 3 || username.Contains(' ')) return "Username minimal 3 karakter, tanpa spasi.";
        if (sandi.Length < 6) return "Password minimal 6 karakter.";

        using var c = Open();
        using (var cek = c.CreateCommand())
        {
            cek.CommandText = "SELECT COUNT(*) FROM pengguna WHERE username=$u COLLATE NOCASE";
            cek.Parameters.AddWithValue("$u", username);
            if ((long)cek.ExecuteScalar()! > 0) return "Username sudah dipakai.";
        }
        using var cmd = c.CreateCommand();
        cmd.CommandText = "INSERT INTO pengguna(username,nama,sandi) VALUES($u,$n,$s)";
        cmd.Parameters.AddWithValue("$u", username);
        cmd.Parameters.AddWithValue("$n", nama);
        cmd.Parameters.AddWithValue("$s", BuatHash(sandi));
        cmd.ExecuteNonQuery();
        return null;
    }

    // ------------------------------------------------------------ tutup kasir
    // Catat hasil tutup kasir: uang yang seharusnya ada = modal awal + penjualan hari itu.
    public static long SimpanTutupKasir(string kasir, long modal, long transaksi, long penjualan, long uangHitung)
    {
        long selisih = uangHitung - (modal + penjualan);
        var sekarang = DateTime.Now;
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"INSERT INTO tutup_kasir(waktu,tanggal,kasir,modal,transaksi,penjualan,uang_hitung,selisih)
                            VALUES($w,$t,$k,$m,$n,$p,$u,$s)";
        cmd.Parameters.AddWithValue("$w", sekarang.ToString("yyyy-MM-dd HH:mm:ss"));
        cmd.Parameters.AddWithValue("$t", sekarang.ToString("yyyy-MM-dd"));
        cmd.Parameters.AddWithValue("$k", kasir);
        cmd.Parameters.AddWithValue("$m", modal);
        cmd.Parameters.AddWithValue("$n", transaksi);
        cmd.Parameters.AddWithValue("$p", penjualan);
        cmd.Parameters.AddWithValue("$u", uangHitung);
        cmd.Parameters.AddWithValue("$s", selisih);
        cmd.ExecuteNonQuery();
        return selisih;
    }
}
