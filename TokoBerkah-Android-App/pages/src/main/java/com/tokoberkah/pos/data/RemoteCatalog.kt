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

    private const val PRODUK_COLS = "select=id,nama,barcode,harga_jual,stok,kategori_id&order=id"

    /** Waktu ISO-8001 ala backend (untuk kolom updated_at / waktu). */
    private fun isoNow(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())

    /** GET produk — seluruh katalog dari database (dengan nama kategorinya). */
    fun fetchProducts(): List<RemoteProduct>? {
        val produkBody = ApiClient.get("produk?$PRODUK_COLS") ?: return null
        val katBody = ApiClient.get("kategori?select=id,nama&order=id") ?: return null
        return try {
            val katMap = HashMap<Int, String>()
            val katArr = JSONArray(katBody)
            for (i in 0 until katArr.length()) {
                val k = katArr.getJSONObject(i)
                katMap[k.optInt("id")] = k.optString("nama")
            }
            val arr = JSONArray(produkBody)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                val katId = o.optInt("kategori_id")
                RemoteProduct(
                    id = o.optInt("id"),
                    ean = o.optString("barcode"),
                    name = o.optString("nama"),
                    price = o.optInt("harga_jual"),
                    stock = o.optInt("stok"),
                    category = if (o.isNull("kategori_id")) null else katMap[katId]
                )
            }
        } catch (e: Exception) {
            ApiClient.lastError = "respons data tidak valid"
            null
        }
    }

    /**
     * Satu produk lewat barcode (pemindaian). null bila tidak ditemukan ATAU
     * jaringan tidak tersedia (cek [ApiClient.lastError] untuk membedakan:
     * "HTTP 404" = memang tidak ada).
     */
    fun fetchByBarcode(ean: String): RemoteProduct? {
        val safe = java.net.URLEncoder.encode(ean, "UTF-8")
        val body = ApiClient.get(
            "produk?select=id,nama,barcode,harga_jual,stok,kategori_id&barcode=eq.$safe"
        ) ?: return null
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
        val katId = o.optInt("kategori_id")
        val category = if (o.isNull("kategori_id")) null else {
            val k = JSONArray(ApiClient.get("kategori?select=id,nama&id=eq.$katId") ?: "[]")
            if (k.length() > 0) k.getJSONObject(0).optString("nama") else null
        }
        return RemoteProduct(
            id = o.optInt("id"),
            ean = o.optString("barcode"),
            name = o.optString("nama"),
            price = o.optInt("harga_jual"),
            stock = o.optInt("stok"),
            category = category
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
