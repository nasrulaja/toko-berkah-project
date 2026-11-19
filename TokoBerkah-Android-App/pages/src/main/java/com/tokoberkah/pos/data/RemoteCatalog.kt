package com.tokoberkah.pos.data.api

import org.json.JSONArray
import org.json.JSONObject

/** Satu baris produk dari backend (format GET /api/products). */
data class RemoteProduct(
    val id: Int,
    val ean: String,
    val name: String,
    val price: Int,
    val stock: Int,
    val category: String?
)

/**
 * Penghubung halaman aplikasi ke backend. Semua fungsi memakai thread latar
 * dan mengembalikan null bila server/jaringan tidak tersedia (halaman lalu
 * menampilkan keadaan kosong/gagal, bukan data dummy).
 */
object RemoteCatalog {

    /** GET /api/products — seluruh katalog dari database. */
    fun fetchProducts(): List<RemoteProduct>? {
        val body = ApiClient.get("products") ?: return null
        return try {
            val arr = JSONArray(body)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                RemoteProduct(
                    id = o.optInt("id"),
                    ean = o.optString("barcode"),
                    name = o.optString("nama"),
                    price = o.optInt("harga_jual"),
                    stock = o.optInt("stok"),
                    category = if (o.isNull("kategori")) null else o.optString("kategori")
                )
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * GET /api/products/barcode/:ean — satu produk lewat barcode (pemindaian).
     * null bila tidak ditemukan ATAU server tidak terjangkau (cek
     * [ApiClient.lastError] untuk membedakan: "HTTP 404" = memang tidak ada).
     */
    fun fetchByBarcode(ean: String): RemoteProduct? {
        val body = ApiClient.get("products/barcode/$ean") ?: return null
        return try {
            val o = JSONObject(body)
            RemoteProduct(
                id = o.optInt("id"),
                ean = o.optString("barcode"),
                name = o.optString("nama"),
                price = o.optInt("harga_jual"),
                stock = o.optInt("stok"),
                category = if (o.isNull("kategori")) null else o.optString("kategori")
            )
        } catch (e: Exception) {
            null
        }
    }

    /** POST /api/stock/masuk — stok bertambah & tercatat di database. */
    fun postStockMasuk(produkId: Int, jumlah: Int): Boolean {
        val body = JSONObject()
            .put("produk_id", produkId)
            .put("jumlah", jumlah)
            .put("catatan", "Barang masuk dari aplikasi Android")
        return ApiClient.post("stock/masuk", body) != null
    }

    /** PATCH /api/products/:id/price — ubah harga jual di database. */
    fun patchPrice(produkId: Int, harga: Int): Boolean =
        ApiClient.patch("products/$produkId/price", JSONObject().put("harga_jual", harga)) != null
}
