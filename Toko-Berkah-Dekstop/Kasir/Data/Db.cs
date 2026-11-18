using System.Globalization;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text.Json.Nodes;
using Microsoft.Data.Sqlite;

namespace Kasir;

public static class Db
{
    public const string NamaToko = "TOKO BERKAH";
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
    username TEXT PRIMARY KEY, nama TEXT NOT NULL, sandi TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS antrian(
    id INTEGER PRIMARY KEY AUTOINCREMENT, entitas TEXT, aksi TEXT,
    ref_id TEXT, isi TEXT, dibuat TEXT);";
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

    // ------------------------------------------------------------ sinkron Supabase
    // Kolom supa_id = id baris di tabel `produk` Supabase. NULL berarti produk
    // belum pernah dikirim (masih lokal saja).
    static void SiapkanKolomSinkron(SqliteConnection c)
    {
        bool ada = false;
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "PRAGMA table_info(produk)";
            using var r = cmd.ExecuteReader();
            while (r.Read()) if (r.GetString(1) == "supa_id") ada = true;
        }
        if (ada) return;
        using var ubah = c.CreateCommand();
        ubah.CommandText = "ALTER TABLE produk ADD COLUMN supa_id INTEGER NULL";
        ubah.ExecuteNonQuery();
    }

    // Catat pekerjaan yang belum terkirim ke Supabase (dikirim saat online).
    public static void Antri(string entitas, string refId, JsonObject isi)
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = @"INSERT INTO antrian(entitas,aksi,ref_id,isi,dibuat)
                            VALUES($e,'insert',$r,$i,$w)";
        cmd.Parameters.AddWithValue("$e", entitas);
        cmd.Parameters.AddWithValue("$r", refId);
        cmd.Parameters.AddWithValue("$i", isi.ToJsonString());
        cmd.Parameters.AddWithValue("$w", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
        cmd.ExecuteNonQuery();
    }

    public static long JumlahAntrian()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM antrian";
        return (long)cmd.ExecuteScalar()!;
    }

    // Kirim produk baru (belum punya supa_id) ke Supabase, lalu simpan id-nya.
    static int KirimProdukBaru()
    {
        var baru = new List<(string Kode, string Nama, long Harga, long Stok)>();
        using (var c = Open())
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT kode,nama,harga,stok FROM produk WHERE supa_id IS NULL";
            using var r = cmd.ExecuteReader();
            while (r.Read()) baru.Add((r.GetString(0), r.GetString(1), r.GetInt64(2), r.GetInt64(3)));
        }

        int n = 0;
        foreach (var p in baru)
        {
            var rows = new JsonArray
            {
                new JsonObject
                {
                    ["nama"] = p.Nama,
                    ["barcode"] = p.Kode,
                    ["harga_jual"] = p.Harga,
                    ["stok"] = p.Stok,
                    ["stok_minimum"] = 5
                }
            };
            var hasil = Supa.Post("produk", rows);
            if (hasil.Count == 0) continue;
            using var c = Open();
            using var cmd = c.CreateCommand();
            cmd.CommandText = "UPDATE produk SET supa_id=$s WHERE kode=$k";
            cmd.Parameters.AddWithValue("$s", hasil[0]["id"]!.GetValue<int>());
            cmd.Parameters.AddWithValue("$k", p.Kode);
            cmd.ExecuteNonQuery();
            n++;
        }
        return n;
    }

    // Perbarui stok & harga produk yang sudah ada di Supabase.
    static int KirimPerubahanProduk()
    {
        var lama = new List<(long Harga, long Stok, int SupaId)>();
        using (var c = Open())
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT harga,stok,supa_id FROM produk WHERE supa_id IS NOT NULL";
            using var r = cmd.ExecuteReader();
            while (r.Read()) lama.Add((r.GetInt64(0), r.GetInt64(1), r.GetInt32(2)));
        }
        foreach (var p in lama)
        {
            var body = new JsonObject { ["stok"] = p.Stok, ["harga_jual"] = p.Harga };
            Supa.Patch($"produk?id=eq.{p.SupaId}", body);
        }
        return lama.Count;
    }

    // Kirim isi antrian (transaksi + detail, stok_mutasi, tutup_buku).
    // Mengembalikan jumlah yang berhasil dikirim beserta daftar yang gagal.
    static (int terkirim, List<string> gagal) KirimAntrian(int userId)
    {
        var antrian = new List<(long Id, string Entitas, string RefId, JsonObject Isi)>();
        using (var c = Open())
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT id,entitas,ref_id,isi FROM antrian ORDER BY id";
            using var r = cmd.ExecuteReader();
            while (r.Read())
                antrian.Add((r.GetInt64(0), r.GetString(1), r.GetString(2), JsonNode.Parse(r.GetString(3))!.AsObject()));
        }

        int n = 0;
        var gagal = new List<string>();
        foreach (var a in antrian)
        {
            try
            {
                switch (a.Entitas)
                {
                    case "transaksi":
                        {
                            // transaksi harus masuk dulu supaya dapat id Supabase,
                            // baru detail-nya boleh dikirim.
                            a.Isi["user_id"] = userId;
                            var res = PostTransaksiUnik(a.Isi);
                            if (res.Count > 0)
                                KirimDetailTransaksi(a.RefId, res[0]["id"]!.GetValue<int>());
                            break;
                        }
                    case "tutup_buku":
                        a.Isi["user_id"] = userId;
                        try
                        {
                            Supa.Post("tutup_buku", new JsonArray { a.Isi }, ambilId: false);
                        }
                        catch (Exception e) when (e.Message.Contains("23505"))
                        {
                            // Tutup buku tanggal ini sudah ada di server (mis. dikirim
                            // dari perangkat lain). Perbarui angkanya, jangan gagal terus.
                            var tanggal = a.Isi["tanggal"]?.ToString() ?? "";
                            var isi = (JsonObject)a.Isi.DeepClone();
                            isi.Remove("tanggal");
                            Supa.Patch($"tutup_buku?tanggal=eq.{Uri.EscapeDataString(tanggal)}", isi);
                        }
                        break;
                    case "stok_mutasi":
                        a.Isi["user_id"] = userId;
                        Supa.Post("stok_mutasi", new JsonArray { a.Isi }, ambilId: false);
                        break;
                }
            }
            catch (Exception e)
            {
                // JANGAN hapus baris antrian kalau pengiriman gagal: data penjualan
                // harus tetap tersimpan untuk dikirim nanti. Satu baris gagal juga
                // tidak boleh menggagalkan baris lain (mis. tutup_buku tanggal yang
                // sudah ada di server tidak boleh menahan transaksi berikutnya).
                gagal.Add($"{a.Entitas} ({a.RefId}): {Ringkas(e.Message)}");
                continue;
            }

            using var c = Open();
            using var cmd = c.CreateCommand();
            cmd.CommandText = "DELETE FROM antrian WHERE id=$i";
            cmd.Parameters.AddWithValue("$i", a.Id);
            cmd.ExecuteNonQuery();
            n++;
        }
        return (n, gagal);
    }

    // Ambil inti pesan galat agar bisa ditampilkan singkat ke pengguna.
    static string Ringkas(string pesan)
    {
        var s = pesan.Replace("\r", " ").Replace("\n", " ").Trim();
        return s.Length > 160 ? s[..160] + "..." : s;
    }

    // Supabase mewajibkan kode_transaksi unik. Kalau kode dari desktop sudah
    // dipakai transaksi web di tanggal yang sama, nomor urutnya dinaikkan
    // sampai tidak bentrok. Nomor asli tetap disimpan di kode lokal.
    static List<JsonObject> PostTransaksiUnik(JsonObject isi)
    {
        var kode = isi["kode_transaksi"]?.ToString() ?? "";
        var bagian = kode.Split('-');
        string awalan = bagian.Length == 3 ? $"{bagian[0]}-{bagian[1]}-" : "TRX-";
        if (bagian.Length == 3 && long.TryParse(bagian[2], out var nomor))
        {
            for (int coba = 0; coba < 30; coba++)
            {
                isi["kode_transaksi"] = awalan + nomor.ToString("D3");
                try
                {
                    return Supa.Post("transaksi", new JsonArray { (JsonObject)isi.DeepClone() });
                }
                catch (Exception e) when (e.Message.Contains("23505"))
                {
                    // Kode ini SUDAH ADA di server. Bisa dua sebab:
                    //  (a) memang dipakai transaksi lain -> pakai nomor berikutnya;
                    //  (b) ini transaksi KITA yang sebenarnya sudah terkirim, lalu
                    //      responsnya timeout sehingga Supa.Post mengulang kirim.
                    //      Kalau dibiarkan, satu struk tercatat dua kali di web.
                    // Kasus (b) dikenali dari waktu + total yang sama persis,
                    // dan itu berarti tidak perlu dikirim lagi.
                    var sudahAda = CariTransaksiSama(isi);
                    if (sudahAda.Count > 0) return sudahAda;

                    nomor++; // kasus (a): coba nomor urut berikutnya
                }
            }
            throw new Exception("Gagal membuat kode transaksi unik.");
        }
        return Supa.Post("transaksi", new JsonArray { isi });
    }

    // Cari transaksi di Supabase yang waktu & totalnya sama dengan isi antrian.
    // Dipakai untuk mencegah satu struk tercatat dua kali saat kiriman diulang.
    static List<JsonObject> CariTransaksiSama(JsonObject isi)
    {
        var waktu = isi["waktu"]?.ToString();
        var total = isi["total"]?.ToString();
        if (string.IsNullOrEmpty(waktu) || string.IsNullOrEmpty(total)) return new();

        var baris = Supa.Get($"transaksi?select=id,kode_transaksi,waktu,total" +
                             $"&waktu=eq.{Uri.EscapeDataString(waktu)}&total=eq.{total}");
        // Hanya percaya kalau benar-benar ada satu baris yang identik.
        return baris.Count == 1 ? baris : new();
    }

    // Barcode/nama lokal -> id produk Supabase. Dipakai agar detail transaksi
    // punya produk_id yang benar (kolom itu wajib diisi).
    static Dictionary<string, int> PetaProdukSupa()
    {
        var peta = new Dictionary<string, int>();
        try
        {
            foreach (var p in Supa.Get("produk?select=id,barcode,nama"))
            {
                var id = p["id"]!.GetValue<int>();
                var bc = p["barcode"]?.ToString();
                var nm = p["nama"]?.ToString();
                if (!string.IsNullOrEmpty(bc)) peta["bc:" + bc] = id;
                if (!string.IsNullOrEmpty(nm))
                {
                    var kunci = "nm:" + NormalNama(nm);
                    // id terkecil = baris terlama (data asli, bukan duplikat)
                    if (!peta.TryGetValue(kunci, out var lama) || id < lama) peta[kunci] = id;
                }
            }
        }
        catch { /* offline */ }
        return peta;
    }

    // Ambil detail lokal milik satu transaksi. `waktu` berformat
    // "yyyy-MM-dd HH:mm:ss" (kolom waktu di tabel transaksi lokal).
    static void KirimDetailTransaksi(string waktu, int supaTrxId)
    {
        if (string.IsNullOrEmpty(waktu)) return;
        var peta = PetaProdukSupa();
        var rows = new JsonArray();
        var dilewati = new List<string>();
        using (var c = Open())
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = @"SELECT d.kode,d.nama,d.harga,d.qty FROM detail d
                                JOIN transaksi t ON t.id=d.trx_id
                                WHERE t.waktu=$w";
            cmd.Parameters.AddWithValue("$w", waktu);
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                var kode = r.GetString(0);
                var nama = r.GetString(1);
                // cocokkan lewat barcode dulu, lalu nama (mis. "Aqua 600ml" vs "Aqua 600 ml")
                if (!peta.TryGetValue("bc:" + kode, out var produkId) &&
                    !peta.TryGetValue("nm:" + NormalNama(nama), out produkId))
                { dilewati.Add(nama); continue; }
                rows.Add(new JsonObject
                {
                    ["transaksi_id"] = supaTrxId,
                    ["produk_id"] = produkId,
                    ["nama_produk"] = nama,
                    ["harga_jual"] = r.GetInt64(2),
                    ["jumlah"] = r.GetInt64(3),
                    ["subtotal"] = r.GetInt64(2) * r.GetInt64(3)
                });
            }
        }
        if (rows.Count > 0) Supa.Post("detail_transaksi", rows, ambilId: false);

        // Barang yang belum terdaftar di web tetap tercatat di transaksi lokal,
        // hanya detailnya yang tidak bisa dikirim (produk_id wajib di Supabase).
        if (dilewati.Count > 0)
            throw new Exception(
                "Transaksi tersimpan & terkirim. Detail berikut belum ada di web sehingga dilewati: " +
                string.Join(", ", dilewati) + ". Tambahkan barangnya lewat menu Kelola Produk.");
    }

    // Produk bawaan aplikasi sebenarnya sudah ada di Supabase dengan nama yang
    // sama tetapi barcode berbeda. Cocokkan lewat barcode ATAU nama (tanpa
    // memperhatikan huruf besar/kecil) supaya tidak dibuat duplikat.
    static void SambungkanProdukLama()
    {
        List<JsonObject> supa;
        try { supa = Supa.Get("produk?select=id,barcode,nama"); }
        catch { return; }   // offline: coba lagi nanti

        var petaBarcode = new Dictionary<string, int>();
        var petaNama = new Dictionary<string, int>();
        foreach (var p in supa)
        {
            var bc = p["barcode"]?.ToString();
            var nm = p["nama"]?.ToString();
            var id = p["id"]!.GetValue<int>();
            if (!string.IsNullOrEmpty(bc)) petaBarcode[bc] = id;
            // Nama bisa sama pada data duplikat: pertahankan id terkecil
            // (baris terlama = data asli, bukan hasil sinkron yang dobel).
            if (!string.IsNullOrEmpty(nm))
            {
                var kunci = NormalNama(nm);
                if (!petaNama.TryGetValue(kunci, out var lama) || id < lama) petaNama[kunci] = id;
            }
        }

        using var c = Open();
        var cocok = new List<(string Kode, int Id)>();
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT kode,nama FROM produk WHERE supa_id IS NULL";
            using var r = cmd.ExecuteReader();
            while (r.Read())
            {
                var kode = r.GetString(0);
                var nama = r.GetString(1);
                int id;
                if (petaBarcode.TryGetValue(kode, out id)) cocok.Add((kode, id));
                else if (petaNama.TryGetValue(NormalNama(nama), out id)) cocok.Add((kode, id));
            }
        }
        foreach (var (kode, id) in cocok)
        {
            using var cmd = c.CreateCommand();
            cmd.CommandText = "UPDATE produk SET supa_id=$s WHERE kode=$k";
            cmd.Parameters.AddWithValue("$s", id);
            cmd.Parameters.AddWithValue("$k", kode);
            cmd.ExecuteNonQuery();
        }
    }

    // Bentuk nama yang bisa dibandingkan: huruf kecil, tanpa spasi/ukuran.
    static string NormalNama(string s)
    {
        if (string.IsNullOrEmpty(s)) return "";
        var b = new System.Text.StringBuilder();
        foreach (var ch in s.ToLowerInvariant())
            if (char.IsLetterOrDigit(ch)) b.Append(ch);
        return b.ToString();
    }

    // ------------------------------------------------------------ unduh dari Supabase
    // Arah sebaliknya dari SinkronKeluar: tarik master produk & kategori dari
    // Supabase ke SQLite lokal, supaya kategori dan hasil pencarian di desktop
    // sama dengan yang tampil di web. Tanpa ini desktop hanya punya 8 produk
    // contoh bawaan dan pencarian tidak menemukan barang dari web.
    // Produk lokal yang belum ada di Supabase (dibuat offline) TIDAK dihapus.
    public static (bool ok, string pesan) SinkronMasuk()
    {
        List<JsonObject> supa;
        try { supa = Supa.Get("produk?select=id,barcode,nama,harga_jual,stok,kategori_id"); }
        catch (Exception e) { return (false, "Gagal menghubungi Supabase: " + e.Message); }

        // id kategori -> nama, supaya kolom kategori lokal berisi nama (bukan angka)
        var petaKategori = new Dictionary<int, string>();
        try
        {
            foreach (var k in Supa.Get("kategori?select=id,nama"))
                petaKategori[k["id"]!.GetValue<int>()] = k["nama"]?.ToString() ?? "Lainnya";
        }
        catch { /* kategori opsional: kalau gagal, pakai 'Lainnya' */ }

        int baru = 0, ubah = 0;
        using var c = Open();

        // Nama kategori resmi dari web, dipakai untuk menyelaraskan ejaan lama
        // (mis. 'Lainnya' bawaan aplikasi -> 'Lain-lain' seperti di web).
        var namaResmi = new HashSet<string>(petaKategori.Values, StringComparer.OrdinalIgnoreCase);

        // Barcode yang benar-benar dipakai web, untuk membedakan kode karangan
        // produk contoh dari barcode asli.
        var kodeWeb = new HashSet<string>(
            supa.Select(p => p["barcode"]?.ToString())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x!), StringComparer.Ordinal);

        using (var tx = c.BeginTransaction())
        {
            foreach (var p in supa)
            {
                var nama = p["nama"]?.ToString();
                if (string.IsNullOrWhiteSpace(nama)) continue;

                var barcode = p["barcode"]?.ToString();
                var kode = string.IsNullOrWhiteSpace(barcode) ? "S" + p["id"] : barcode!;
                var harga = Angka(p["harga_jual"]);
                var stok = Angka(p["stok"]);

                var kid = p["kategori_id"];
                var kategori = kid != null && petaKategori.TryGetValue(kid.GetValue<int>(), out var nm)
                    ? nm : "Lain-lain";

                // Sudah ada di lokal? Barcode dulu, lalu nama yang dinormalkan.
                // Nama perlu karena produk contoh memakai barcode karangan.
                string? kodeLokal = null;
                using (var cek = c.CreateCommand())
                {
                    cek.Transaction = tx;
                    cek.CommandText = "SELECT kode FROM produk WHERE kode=$k";
                    cek.Parameters.AddWithValue("$k", kode);
                    if (cek.ExecuteScalar() is string kdl) kodeLokal = kdl;
                }
                if (kodeLokal == null)
                {
                    // Cari baris lokal yang namanya sama tetapi kodenya masih kode
                    // karangan (belum dipakai web).
                    using var cek2 = c.CreateCommand();
                    cek2.Transaction = tx;
                    cek2.CommandText = "SELECT kode,nama FROM produk";
                    var sama = new List<string>();
                    using (var rr = cek2.ExecuteReader())
                        while (rr.Read())
                        {
                            var kk = rr.GetString(0);
                            if (kk.Equals(kode, StringComparison.Ordinal)) continue;
                            if (NormalNama(rr.GetString(1)) == NormalNama(nama)) sama.Add(kk);
                        }
                    // Prioritaskan baris yang kodenya bukan barcode web (sisa contoh)
                    kodeLokal = sama.FirstOrDefault(x => !kodeWeb.Contains(x)) ?? sama.FirstOrDefault();
                }

                using var cmd = c.CreateCommand();
                cmd.Transaction = tx;
                if (kodeLokal != null)
                {
                    // Nama, kategori, dan stok dari web dianggap sumber kebenaran.
                    // Harga lokal dibiarkan bila sudah pernah diubah kasir.
                    // Kode disamakan ke barcode web supaya tidak dobel.
                    var bedaKode = !kodeLokal.Equals(kode, StringComparison.Ordinal);
                    if (bedaKode)
                    {
                        cmd.CommandText = @"UPDATE produk SET kode=$k, nama=$n, kategori=$g,
                                            stok=$s, harga=CASE WHEN $h > 0 THEN $h ELSE harga END
                                            WHERE kode=$lama";
                    }
                    else
                    {
                        cmd.CommandText = @"UPDATE produk SET nama=$n, kategori=$g,
                                            stok=$s, harga=CASE WHEN $h > 0 THEN $h ELSE harga END
                                            WHERE kode=$lama";
                    }
                    cmd.Parameters.AddWithValue("$lama", kodeLokal);
                    ubah++;
                }
                else
                {
                    cmd.CommandText = @"INSERT INTO produk(kode,nama,harga,stok,kategori)
                                        VALUES($k,$n,$h,$s,$g)";
                    baru++;
                }
                cmd.Parameters.AddWithValue("$k", kode);
                cmd.Parameters.AddWithValue("$n", nama);
                cmd.Parameters.AddWithValue("$h", harga);
                cmd.Parameters.AddWithValue("$s", stok);
                cmd.Parameters.AddWithValue("$g", kategori);
                cmd.ExecuteNonQuery();
            }
            tx.Commit();
        }

        // Rapikan ejaan kategori lama agar daftar tidak berisi 'Lainnya' dan
        // 'Lain-lain' sekaligus. Hanya menyamakan nama, tidak menghapus produk.
        if (namaResmi.Count > 0)
        {
            using var cmd = c.CreateCommand();
            cmd.CommandText = "SELECT DISTINCT kategori FROM produk";
            var lama = new List<string>();
            using (var r = cmd.ExecuteReader())
                while (r.Read())
                {
                    var g = r.IsDBNull(0) ? "" : r.GetString(0);
                    if (g.Length > 0 && !namaResmi.Contains(g)) lama.Add(g);
                }
            foreach (var g in lama)
            {
                // 'Lainnya' -> 'Lain-lain' bila web punya ejaan itu
                var ganti = namaResmi.FirstOrDefault(x =>
                    string.Equals(x, g, StringComparison.OrdinalIgnoreCase))
                    ?? (g.Equals("Lainnya", StringComparison.OrdinalIgnoreCase) && namaResmi.Contains("Lain-lain")
                        ? "Lain-lain" : null);
                if (ganti == null) continue;
                using var u = c.CreateCommand();
                u.CommandText = "UPDATE produk SET kategori=$b WHERE kategori=$a";
                u.Parameters.AddWithValue("$b", ganti);
                u.Parameters.AddWithValue("$a", g);
                u.ExecuteNonQuery();
            }
        }

        return (true, $"Produk dari web: {baru} baru, {ubah} diperbarui, {petaKategori.Count} kategori.");
    }

    // Angka JSON -> long, aman untuk null / desimal.
    static long Angka(JsonNode? n)
    {
        if (n == null) return 0;
        try { return (long)Math.Round(n.GetValue<decimal>()); }
        catch { return long.TryParse(n.ToString(), out var v) ? v : 0; }
    }

    // Titik masuk sinkronisasi: dipanggil setelah bayar, setelah tutup kasir,

    // dan saat aplikasi dibuka. Aman dipanggil saat offline.
    public static (bool ok, string pesan) SinkronKeluar(string emailKasir)
    {
        try
        {
            using (var c = Open()) SiapkanKolomSinkron(c);
            SambungkanProdukLama();

            int userId = Supa.UserIdUntuk(emailKasir);
            int nProduk = KirimProdukBaru();
            int nUbah = KirimPerubahanProduk();
            var (nAntri, gagal) = KirimAntrian(userId);

            int total = nProduk + nUbah + nAntri;

            // Kalau ada antrian yang gagal, jangan bilang "semua tersinkron":
            // sisa antrian masih tersimpan lokal dan akan dicoba lagi nanti.
            if (gagal.Count > 0)
                return (false,
                    $"{total} data terkirim, tetapi {gagal.Count} data belum bisa dikirim " +
                    $"dan masih tersimpan di komputer ini:\n\n- " +
                    string.Join("\n- ", gagal));

            return (true, total == 0 ? "Semua data sudah tersinkron." : $"{total} data tersinkron ke Supabase.");
        }
        catch (Exception e)
        {
            // Bedakan gangguan jaringan dari kesalahan lain (mis. tabel lokal belum siap).
            // Sebelumnya semua kegagalan dilabeli "Offline" sehingga menyesatkan.
            bool jaringan = e is HttpRequestException || e is TaskCanceledException
                            || e is IOException || e.InnerException is SocketException;
            return (false, jaringan
                ? "Tidak dapat menghubungi Supabase (jaringan): " + e.Message
                : "Sinkronisasi gagal: " + e.Message);
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
        // Salin sekali: `items` dipakai dua kali (simpan detail & buat antrian
        // Supabase). Kalau berupa iterator lazy, pemakaian kedua bisa kosong.
        var daftar = items.ToList();
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

        foreach (var i in daftar)
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

        // Catat ke antrian Supabase. Kalau sedang offline, baris ini menunggu
        // dan dikirim otomatis saat aplikasi online lagi.
        // Nomor urut transaksi hari ini dipakai di kode transaksi. Supabase
        // mewajibkan kode_transaksi unik, jadi angkanya diambil dari jumlah
        // transaksi lokal hari itu (bukan id global yang bisa bentrok).
        long urutHariIni;
        using (var cmd = c.CreateCommand())
        {
            cmd.CommandText = "SELECT COUNT(*) FROM transaksi WHERE waktu LIKE $h";
            cmd.Parameters.AddWithValue("$h", waktu[..10] + "%");
            urutHariIni = (long)cmd.ExecuteScalar()!;
        }

        var waktuSekarang = waktu;
        var jTrx = new JsonObject
        {
            ["kode_transaksi"] = $"TRX-{DateTime.Now:yyyyMMdd}-{urutHariIni:D3}",
            ["waktu"] = waktu.Replace(' ', 'T'),
            ["total"] = total,
            ["uang_diterima"] = bayar,
            ["kembalian"] = kembali,
            ["rekap_id"] = null
        };
        // ref_id = waktu transaksi; dipakai untuk mengambil detail lokal saat
        // transaksi ini berhasil masuk ke Supabase (detail butuh transaksi_id).
        Antri("transaksi", waktuSekarang, jTrx);

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
        // Surel dipakai sebagai nama pengguna (bukan sekadar username biasa).
        var awal = new[] { ("kasir@gmail.com", "Kasir", "kasir123") };
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
        if (username.Length < 3 || username.Contains(' ')) return "Surel minimal 3 karakter, tanpa spasi.";
        if (sandi.Length < 6) return "Kata sandi minimal 6 karakter.";

        using var c = Open();
        using (var cek = c.CreateCommand())
        {
            cek.CommandText = "SELECT COUNT(*) FROM pengguna WHERE username=$u COLLATE NOCASE";
            cek.Parameters.AddWithValue("$u", username);
            if ((long)cek.ExecuteScalar()! > 0) return "Surel sudah dipakai.";
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
    // True kalau hari ini (tanggal sistem) sudah pernah disimpan pembukuan tutup kasir.
    // Dipakai untuk mencegah jendela ditutup sebelum pembukuan diisi.
    public static bool SudahTutupHariIni()
    {
        using var c = Open();
        using var cmd = c.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM tutup_kasir WHERE tanggal=$t";
        cmd.Parameters.AddWithValue("$t", DateTime.Now.ToString("yyyy-MM-dd"));
        return (long)cmd.ExecuteScalar()! > 0;
    }

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

        // Kirim rekap harian ke tabel tutup_buku Supabase (dipakai dashboard web).
        var j = new JsonObject
        {
            ["tanggal"] = sekarang.ToString("yyyy-MM-dd"),
            ["total_penjualan"] = penjualan,
            ["uang_di_laci"] = uangHitung,
            ["selisih"] = selisih,
            ["status"] = selisih == 0 ? "sesuai" : selisih < 0 ? "kurang" : "lebih",
            ["catatan"] = null,
            ["ditutup_pada"] = sekarang.ToString("yyyy-MM-ddTHH:mm:ss")
        };
        Antri("tutup_buku", sekarang.ToString("yyyy-MM-dd"), j);

        return selisih;
    }
}
