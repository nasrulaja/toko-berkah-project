package com.tokoberkah.pos.data.api

import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Satu baris produk dari database Supabase (tabel `produk` + nama kategori). */
data class RemoteProduct(
    val id: Int,
    val ean: String,
    val name: String,
    val price: Int,
    val stock: Int,
    val category: String?
)

/**
 * Penghubung halaman aplikasi langsung ke Supabase (PostgREST) — logika yang
 * sama dengan backend/ (gabung kategori, mutasi stok), tetapi tanpa server.
 * Semua fungsi memakai thread latar dan mengembalikan null bila jaringan/RLS
 * tidak tersedia (halaman lalu menampilkan keadaan kosong/gagal, bukan data
 * dummy).
 */
object RemoteCatalog {

    /**
     * Satu permintaan untuk semua produk + nama kategori (embed via relasi
     * FK produk.kategori_id -> kategori.id) — ~4x lebih cepat daripada
     * mengunduh produk lalu kategori terpisah.
     */
    private const val PRODUK_COLS =
        "select=id,nama,barcode,harga_jual,stok,kategori_id,kategori:kategori_id(nama)&order=id"

    /** Waktu ISO-8001 ala backend (untuk kolom updated_at / waktu). */
    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

    /** Nama kategori dari embed `kategori: { nama }`; null bila tak ada. */
    private fun kategoriDari(o: org.json.JSONObject): String? {
        val k = o.optJSONObject("kategori") ?: return null
        return k.optString("nama").ifEmpty { null }
    }

    /** GET produk — seluruh katalog dari database (dengan nama kategorinya). */
    fun fetchProducts(): List<RemoteProduct>? {
        val produkBody = ApiClient.get("produk?$PRODUK_COLS") ?: return null
        return try {
            val arr = JSONArray(produkBody)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                RemoteProduct(
                    id = o.optInt("id"),
                    ean = o.optString("barcode"),
                    name = o.optString("nama"),
                    price = o.optInt("harga_jual"),
                    stock = o.optInt("stok"),
                    category = kategoriDari(o)
                )
            }
        } catch (e: Exception) {
            ApiClient.lastError = "respons data tidak valid"
            null
        }
    }

    /**
     * Satu produk lewat barcode (pemindaian) — satu permintaan. null bila
     * tidak ditemukan ATAU jaringan tidak tersedia (cek [ApiClient.lastError]
     * untuk membedakan: "HTTP 404" = memang tidak ada).
     */
    fun fetchByBarcode(ean: String): RemoteProduct? {
        val safe = java.net.URLEncoder.encode(ean, "UTF-8")
        val body = ApiClient.get("produk?$PRODUK_COLS&barcode=eq.$safe") ?: return null
        val arr = try {
            JSONArray(body)
        } catch (e: Exception) {
            ApiClient.lastError = "respons data tidak valid"
            return null
        }
        if (arr.length() == 0) {
            ApiClient.lastError = "HTTP 404"
            return null
        }
        val o = arr.getJSONObject(0)
        return RemoteProduct(
            id = o.optInt("id"),
            ean = o.optString("barcode"),
            name = o.optString("nama"),
            price = o.optInt("harga_jual"),
            stock = o.optInt("stok"),
            category = kategoriDari(o)
        )
    }

    /**
     * Barang masuk: stok bertambah & tercatat di `stok_mutasi`
     * (satu PATCH produk + satu baris mutasi — sama seperti backend).
     */
    fun postStockMasuk(produkId: Int, jumlah: Int): Boolean {
        if (jumlah <= 0) return false
        // 1. baca stok sekarang
        val now = ApiClient.get("produk?select=stok&id=eq.$produkId") ?: return false
        val arr = try {
            JSONArray(now)
        } catch (e: Exception) {
            return false
        }
        if (arr.length() == 0) {
            ApiClient.lastError = "HTTP 404"
            return false
        }
        val sebelum = arr.getJSONObject(0).optInt("stok")
        val sesudah = Math.max(0, sebelum + jumlah)
        val iso = isoNow()

        // 2. tambah stok di produk
        val patch = JSONObject()
            .put("stok", sesudah)
            .put("updated_at", iso)
        ApiClient.patch("produk?id=eq.$produkId", patch) ?: return false

        // 3. catat mutasi (riwayat barang masuk)
        val mutasi = JSONArray().put(
            JSONObject()
                .put("produk_id", produkId)
                .put("jenis", "masuk")
                .put("jumlah", jumlah)
                .put("stok_sebelum", sebelum)
                .put("stok_sesudah", sesudah)
                .put("catatan", "Barang masuk dari aplikasi Android")
                .put("waktu", iso)
                .put("user_id", 1)
        )
        return ApiClient.post("stok_mutasi", mutasi) != null
    }

    /** Ubah harga jual di database (tabel `produk`). */
    fun patchPrice(produkId: Int, harga: Int): Boolean {
        val body = JSONObject()
            .put("harga_jual", harga)
            .put("updated_at", isoNow())
        return ApiClient.patch("produk?id=eq.$produkId", body) != null
    }
}
