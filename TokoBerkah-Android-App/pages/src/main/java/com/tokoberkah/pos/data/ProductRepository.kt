package com.tokoberkah.pos.data

import com.tokoberkah.pos.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * In-memory catalogue + price history shared by all five pages.
 * Every page reads from here so a price change made on the
 * "Ubah Harga" page is instantly visible on the others.
 *
 * Katalog diisi HANYA dari backend (GET /api/products) lewat [applyRemote] —
 * tidak ada data dummy, supaya angka yang tampil selalu sama dengan database.
 * Bila server tidak terjangkau, daftar tetap kosong (halaman menampilkan
 * keadaan kosong/gagal, bukan produk palsu).
 */
object ProductRepository {

    private val products = mutableListOf<Product>()
    private val recentEans = mutableListOf<String>()

    private val dateFormat = SimpleDateFormat("dd MMM yyyy", Locale("id", "ID"))
    private val timeFormat = SimpleDateFormat("HH.mm", Locale("id", "ID"))

    /** All products, in catalogue order (used by the scan page). */
    fun all(): List<Product> = products

    /**
     * Produk yang perlu restock (stok <= 5), terurut dari yang paling
     * banyak stoknya — dipakai sebagai daftar awal halaman Barang Masuk.
     */
    fun restockList(): List<Product> =
        products.filter { it.needsRestock }.sortedByDescending { it.stock }

    fun byEan(ean: String): Product? = products.find { it.ean == ean }

    /** Recently viewed products, newest first. */
    fun recentProducts(): List<Product> = recentEans.mapNotNull { byEan(it) }

    fun markViewed(ean: String) {
        recentEans.remove(ean)
        recentEans.add(0, ean)
    }

    /** Applies a new price and records it in the product's history. */
    fun updatePrice(product: Product, newPrice: Int, reason: String) {
        val old = product.price
        if (old == newPrice) return
        val now = Date()
        product.price = newPrice
        product.history.add(
            0,
            PriceChange(
                date = dateFormat.format(now),
                time = timeFormat.format(now),
                oldPrice = old,
                newPrice = newPrice,
                by = "Pemilik toko",
                reason = reason.trim().ifEmpty { "Penyesuaian harga manual." }
            )
        )
    }

    /**
     * Perbarui katalog dari baris backend (GET /api/products) — dipanggil di
     * UI thread setelah selesai diunduh di thread latar. Mutasi in-place supaya
     * adapter yang sudah memegang daftar ini ikut melihat perubahan.
     *
     * Stok & harga selalu dari server; gambar/lokasi/isi dus/riwayat lama
     * dipakai ulang bila EAN-nya sudah pernah tampil (sinkron sebelumnya).
     */
    @Synchronized
    fun applyRemote(rows: List<com.tokoberkah.pos.data.api.RemoteProduct>) {
        if (rows.isEmpty()) return
        val oldByEan = products.associateBy { it.ean }
        val fresh = rows.map { r ->
            val old = oldByEan[r.ean]
            Product(
                ean = r.ean,
                name = r.name,
                categories = when {
                    r.category != null -> Categories.of(r.category)
                    old != null -> old.categories
                    else -> emptyList()
                },
                stock = r.stock,
                location = old?.location ?: "Rak -",
                imageRes = old?.imageRes ?: imageFor(r.category),
                badge = old?.badge ?: "",
                price = r.price,
                unitsPerBox = old?.unitsPerBox ?: 40,
                lastIncoming = old?.lastIncoming ?: "",
                history = old?.history ?: mutableListOf()
            ).also { it.serverId = r.id }
        }
        products.clear()
        products.addAll(fresh)
        recentEans.retainAll(fresh.map { it.ean }.toSet())
    }

    /** Gambar perkiraan berdasarkan kategori (produk dari server tanpa gambar lama). */
    private fun imageFor(category: String?): Int = when (category) {
        "Mie Instan" -> R.drawable.img_indomie
        "Sembako", "Bumbu Dapur" -> R.drawable.img_bimoli
        "Susu & Kopi", "Minuman" -> R.drawable.img_kopi
        else -> R.drawable.img_gula
    }
}
