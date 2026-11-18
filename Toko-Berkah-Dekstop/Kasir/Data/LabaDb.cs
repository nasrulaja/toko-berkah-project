using System.Globalization;
using Microsoft.Data.Sqlite;

namespace Kasir;

// Data untuk halaman Laba Rugi.
public class LabaHari
{
    public string Tanggal = "";
    public long Transaksi, Penjualan, Modal;
    public long Laba => Penjualan - Modal;
}

public class LabaBarang
{
    public string Nama = "";
    public long Terjual, Penjualan, Modal;
    public long Laba => Penjualan - Modal;
}

public class DataLaba
{
    public long Transaksi, Penjualan, Modal;
    public long Laba => Penjualan - Modal;
    public long TanpaModal; // jumlah barang terjual yang belum punya harga beli di database
    public List<LabaHari> PerHari = new();
    public List<LabaBarang> PerBarang = new();
    public List<(string Nama, long Stok)> Menipis = new(); // stok <= 5
}

// Perhitungan laba rugi. Laba = penjualan - modal barang yang terjual.
// Modal = jumlah terjual x harga beli (kolom produk.harga_beli).
// Harga beli hanya DIBACA di sini; desktop kasir tidak bisa mengubahnya.
public static class LabaDb
{
    static bool siap;

    // Kolom harga_beli (default 0) ditambahkan ke tabel produk kalau belum ada.
    // Isinya diisi admin lewat database, bukan lewat aplikasi kasir.
    static void Siapkan(SqliteConnection c)
    {
        if (siap) return;
        bool ada = false;
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "PRAGMA table_info(produk)";
            using var r = cmd.ExecuteReader();
            while (r.Read())
                if (r.GetString(1) == "harga_beli") ada = true;
        }
        if (!ada)
        {
            using var cmd = c.CreateCommand();
            cmd.CommandText = "ALTER TABLE produk ADD COLUMN harga_beli INTEGER NOT NULL DEFAULT 0";
            cmd.ExecuteNonQuery();
        }
        siap = true;
    }

    // Laporan untuk rentang tanggal dari..sampai (keduanya ikut dihitung).
    public static DataLaba Hitung(DateTime dari, DateTime sampai)
    {
        var inv = CultureInfo.InvariantCulture;
        string a = dari.Date.ToString("yyyy-MM-dd", inv);
        string b = sampai.Date.AddDays(1).ToString("yyyy-MM-dd", inv); // batas atas (tidak ikut)
        var d = new DataLaba();

        using var c = Db.Open();
        Siapkan(c);

        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = @"SELECT substr(t.waktu,1,10) tgl, COUNT(DISTINCT t.id),
                                       SUM(d.qty * d.harga), SUM(d.qty * COALESCE(p.harga_beli,0))
                                FROM detail d
                                JOIN transaksi t ON t.id = d.trx_id
                                LEFT JOIN produk p ON p.kode = d.kode
                                WHERE t.waktu >= $a AND t.waktu < $b
                                GROUP BY tgl ORDER BY tgl";
            cmd.Parameters.AddWithValue("$a", a);
            cmd.Parameters.AddWithValue("$b", b);
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                var h = new LabaHari
                {
                    Tanggal = r.GetString(0),
                    Transaksi = r.GetInt64(1),
                    Penjualan = r.GetInt64(2),
                    Modal = r.GetInt64(3),
                };
                d.PerHari.Add(h);
                d.Transaksi += h.Transaksi;
                d.Penjualan += h.Penjualan;
                d.Modal += h.Modal;
            }
        }

        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = @"SELECT d.nama, SUM(d.qty), SUM(d.qty * d.harga),
                                       SUM(d.qty * COALESCE(p.harga_beli,0)) modal
                                FROM detail d
                                JOIN transaksi t ON t.id = d.trx_id
                                LEFT JOIN produk p ON p.kode = d.kode
                                WHERE t.waktu >= $a AND t.waktu < $b
                                GROUP BY d.kode, d.nama
                                ORDER BY (SUM(d.qty * d.harga) - SUM(d.qty * COALESCE(p.harga_beli,0))) DESC";
            cmd.Parameters.AddWithValue("$a", a);
            cmd.Parameters.AddWithValue("$b", b);
            using var r = cmd.ExecuteReader();
            while (r.Read())
                d.PerBarang.Add(new LabaBarang
                {
                    Nama = r.GetString(0),
                    Terjual = r.GetInt64(1),
                    Penjualan = r.GetInt64(2),
                    Modal = r.GetInt64(3),
                });
        }

        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = @"SELECT COUNT(DISTINCT d.kode)
                                FROM detail d
                                JOIN transaksi t ON t.id = d.trx_id
                                LEFT JOIN produk p ON p.kode = d.kode
                                WHERE t.waktu >= $a AND t.waktu < $b
                                  AND (p.harga_beli IS NULL OR p.harga_beli = 0)";
            cmd.Parameters.AddWithValue("$a", a);
            cmd.Parameters.AddWithValue("$b", b);
            d.TanpaModal = (long)cmd.ExecuteScalar()!;
        }

        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT nama, stok FROM produk WHERE stok <= 5 ORDER BY stok, nama";
            using var r = cmd.ExecuteReader();
            while (r.Read()) d.Menipis.Add((r.GetString(0), r.GetInt64(1)));
        }
        return d;
    }
}