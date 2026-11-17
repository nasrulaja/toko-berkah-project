package com.tokoberkah.pos.data

import com.tokoberkah.pos.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * In-memory catalogue + price history shared by all five pages.
 * Every page reads from here so a price change made on the
 * "Ubah Harga" page is instantly visible on the others.
 */
object ProductRepository {

    private val products = mutableListOf<Product>()
    private val recentEans = mutableListOf<String>()

    private val dateFormat = SimpleDateFormat("dd MMM yyyy", Locale("id", "ID"))
    private val timeFormat = SimpleDateFormat("HH.mm", Locale("id", "ID"))

    init {
        val bimoli = Product(
            ean = "8992388012493",
            name = "Minyak Goreng Bimoli 2L",
            category = "Kebutuhan Dapur",
            stock = 48,
            location = "Rak B3",
            imageRes = R.drawable.img_bimoli,
            badge = "2L",
            price = 34_000,
            history = mutableListOf(
                PriceChange("12 Nov 2026", "09.15", 33_000, 34_000, "Pemilik toko", "Harga promo berakhir."),
                PriceChange("05 Nov 2026", "14.30", 32_500, 33_000, "Pemilik toko", "Penyesuaian harga dari pemasok."),
                PriceChange("22 Okt 2026", "10.00", 32_000, 32_500, "Pemilik toko", "Penyesuaian harga dari pemasok."),
                PriceChange("10 Okt 2026", "08.45", 31_500, 32_000, "Pemilik toko", "Penyesuaian harga dari pemasok.")
            )
        )

        val beras = Product(
            ean = "8992003300891",
            name = "Beras Pandan Wangi 5Kg",
            category = "Bahan Pokok",
            stock = 26,
            location = "Rak A1",
            imageRes = R.drawable.img_beras,
            badge = "5kg",
            price = 75_000,
            history = mutableListOf(
                PriceChange("08 Nov 2026", "11.20", 74_000, 75_000, "Pemilik toko", "Harga dari distributor naik."),
                PriceChange("20 Okt 2026", "09.05", 73_500, 74_000, "Pemilik toko", "Penyesuaian harga dari pemasok.")
            )
        )

        val kopi = Product(
            ean = "8991002102493",
            name = "Kopi Kapal Api Spesial Mixx",
            category = "Minuman",
            stock = 64,
            location = "Rak C2",
            imageRes = R.drawable.img_kopi,
            badge = "",
            price = 21_100,
            history = mutableListOf(
                PriceChange("11 Nov 2026", "16.45", 20_500, 21_100, "Pemilik toko", "Penyesuaian harga dari pemasok."),
                PriceChange("01 Okt 2026", "13.10", 20_000, 20_500, "Pemilik toko", "Biaya transportasi bertambah.")
            )
        )

        val indomie = Product(
            ean = "0089686170733",
            name = "Indomie Goreng",
            category = "Makanan Instan",
            stock = 120,
            location = "Rak D5",
            imageRes = R.drawable.img_indomie,
            badge = "",
            price = 3_100,
            history = mutableListOf(
                PriceChange("09 Nov 2026", "08.30", 3_000, 3_100, "Pemilik toko", "Penyesuaian harga dari pemasok."),
                PriceChange("15 Okt 2026", "17.00", 2_950, 3_000, "Pemilik toko", "Penyesuaian harga dari pemasok.")
            )
        )

        val gula = Product(
            ean = "8991002107812",
            name = "Gula Pasir Gulaku 1kg",
            category = "Bahan Pokok",
            stock = 40,
            location = "Rak A2",
            imageRes = R.drawable.img_gula,
            badge = "1kg",
            price = 17_500,
            history = mutableListOf(
                PriceChange("07 Nov 2026", "10.15", 17_000, 17_500, "Pemilik toko", "Harga gulaku dari pemasok naik."),
                PriceChange("18 Okt 2026", "12.40", 16_800, 17_000, "Pemilik toko", "Penyesuaian harga dari pemasok.")
            )
        )

        products.addAll(listOf(bimoli, beras, kopi, indomie, gula))
        recentEans.addAll(listOf(beras.ean, indomie.ean, gula.ean, kopi.ean))
    }

    /** All products, in catalogue order (used by the scan page). */
    fun all(): List<Product> = products

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
}
