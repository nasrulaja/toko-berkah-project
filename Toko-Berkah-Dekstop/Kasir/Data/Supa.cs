using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Kasir;

// ---------------------------------------------------------------------------
// Sinkronisasi desktop <-> Supabase (database yang sama dipakai versi web).
//
// Prinsip penting:
//  - SQLite tetap jadi database utama aplikasi. Kasir bisa jualan walau internet
//    mati; data yang belum terkirim disimpan di tabel `antrian` lalu dikirim
//    otomatis begitu online lagi.
//  - Yang dikirim ke Supabase hanya data yang dibuat desktop: produk (insert
//    baru + ubah stok/harga), transaksi + detail, stok_mutasi, dan tutup_buku.
//  - Tabel master (users, roles, kategori) TIDAK diubah, supaya login web yang
//    sudah jalan tidak terganggu.
//  - Kunci yang dipakai adalah publishable/anon key. Aman ditaruh di aplikasi
//    karena hak tulisnya dibatasi Row Level Security di Supabase. Jangan pernah
//    menaruh service_role key di sini.
// ---------------------------------------------------------------------------
public static class Supa
{
    public const string Url = "https://ejohssqnhhtaveelmter.supabase.co";
    public const string Key = "sb_publishable_PGbNjr7ySv7Mvwh0hGn8Uw_lz7uAGLs";

    // HttpClient dibuat ulang tiap percobaan oleh Coba() di bawah.

    // Ambil id pengguna Supabase untuk sebuah email; 1 kalau tidak ketemu.
    // Desktop memakai email lokal, sedangkan Supabase punya kolom user_id pada
    // transaksi/tutup_buku yang harus mengarah ke tabel users.
    static int userCache = -1;
    public static int UserIdUntuk(string email)
    {
        if (userCache > 0) return userCache;
        try
        {
            var baris = Get($"users?select=id,email&email=eq.{Uri.EscapeDataString(email ?? "")}");
            if (baris.Count > 0) userCache = baris[0]["id"]!.GetValue<int>();
        }
        catch { /* offline: pakai 1 */ }
        return userCache > 0 ? userCache : 1;
    }

    static HttpRequestMessage Req(HttpMethod m, string path)
    {
        var r = new HttpRequestMessage(m, $"{Url}/rest/v1/{path}");
        r.Headers.Add("apikey", Key);
        r.Headers.Add("Authorization", "Bearer " + Key);
        return r;
    }

    // Jalankan aksi HTTP dengan percobaan ulang.
    // Koneksi pertama sering ditutup paksa oleh jaringan/proxy
    // ("An existing connection was forcibly closed by the remote host" /
    // "The SSL connection could not be established"). Di mesin ini pola
    // pengamatannya: 1-2 percobaan pertama gagal, setelah itu lancar.
    // Karena itu dicoba beberapa kali dengan jeda bertahap, dan HttpClient
    // dibuat ulang tiap percobaan supaya TLS handshake benar-benar diulang
    // (bukan memakai koneksi lama yang sudah rusak).
    static T Coba<T>(Func<HttpClient, T> aksi)
    {
        const int maks = 8;
        Exception? terakhir = null;
        for (int i = 1; i <= maks; i++)
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(45) };
            try
            {
                return aksi(http);
            }
            catch (Exception e) when (e is HttpRequestException || e is IOException ||
                                      e is TaskCanceledException || e is OperationCanceledException)
            {
                terakhir = e;
                if (i < maks) Thread.Sleep(250 * i); // 250ms, 500ms, 750ms, ...
            }
        }
        throw terakhir!;
    }

    // GET -> daftar baris JSON.
    public static List<JsonObject> Get(string path) => Coba(h =>
    {
        using var r = Req(HttpMethod.Get, path);
        using var res = h.Send(r);
        var txt = new StreamReader(res.Content.ReadAsStream()).ReadToEnd();
        if (!res.IsSuccessStatusCode) throw new Exception($"{((int)res.StatusCode)} {txt}");
        var arr = JsonNode.Parse(txt) as JsonArray ?? new JsonArray();
        return arr.OfType<JsonObject>().ToList();
    });

    // Kirim satu atau banyak baris. return=representation supaya id barunya terbaca.
    public static List<JsonObject> Post(string tabel, JsonArray rows, bool ambilId = true) => Coba(h =>
    {
        using var r = Req(HttpMethod.Post, tabel);
        r.Headers.Add("Prefer", ambilId ? "return=representation" : "return=minimal");
        r.Content = new StringContent(rows.ToJsonString(), Encoding.UTF8, "application/json");
        using var res = h.Send(r);
        var txt = new StreamReader(res.Content.ReadAsStream()).ReadToEnd();
        if (!res.IsSuccessStatusCode) throw new Exception($"{((int)res.StatusCode)} {txt}");
        if (!ambilId || string.IsNullOrWhiteSpace(txt)) return new();
        var arr = JsonNode.Parse(txt) as JsonArray ?? new JsonArray();
        return arr.OfType<JsonObject>().ToList();
    });

    // PATCH untuk memperbarui baris yang sudah ada (mis. stok & harga produk).
    public static void Patch(string path, JsonObject body) => Coba<object?>(h =>
    {
        using var r = Req(HttpMethod.Patch, path);
        r.Headers.Add("Prefer", "return=minimal");
        r.Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json");
        using var res = h.Send(r);
        var txt = new StreamReader(res.Content.ReadAsStream()).ReadToEnd();
        if (!res.IsSuccessStatusCode) throw new Exception($"{((int)res.StatusCode)} {txt}");
        return null;
    });

    // Uji koneksi untuk halaman Pengaturan / status di pojok jendela.
    public static (bool ok, string pesan) Uji()
    {
        try
        {
            var b = Get("produk?select=id&limit=1");
            return (true, $"Terhubung ke {Url.Replace("https://", "")} ({b.Count} baris contoh)");
        }
        catch (Exception e) { return (false, e.Message); }
    }
}
