package com.tokoberkah.pos.data

import androidx.annotation.DrawableRes

/**
 * A single recorded change of a product's selling price.
 * [history] lists are stored newest-first.
 */
data class PriceChange(
    val date: String,
    val time: String,
    val oldPrice: Int,
    val newPrice: Int,
    val by: String,
    val reason: String
) {
    val delta: Int
        get() = newPrice - oldPrice
}

/** A product sold at Toko Berkah. */
data class Product(
    val ean: String,
    val name: String,
    /** Tag kategori produk, maksimal [Categories.MAX_PER_PRODUCT]. */
    val categories: List<String>,
    /** Total stok satuan jual — boleh berubah saat barang masuk disimpan. */
    var stock: Int,
    val location: String,
    @DrawableRes val imageRes: Int,
    val badge: String,
    var price: Int,
    /** Isi satu dus (konversi Dus -> Buah) pada halaman Barang Masuk. */
    var unitsPerBox: Int = 40,
    /** Kapan terakhir produk ini masuk (teks bebas, kosong = sembunyikan baris). */
    val lastIncoming: String = "",
    val history: MutableList<PriceChange> = mutableListOf(),
    /** ID baris di database (Supabase) — null bila belum tersinkron. */
    var serverId: Int? = null
) {
    /** Tag utama, dipakai chip pada kartu Cek Harga. */
    val category: String
        get() = categories.firstOrNull().orEmpty()

    /** Perlu restock jika stok menipis (<= 5) atau habis. */
    val needsRestock: Boolean
        get() = stock <= 5
}

/** Groups digits with Indonesian thousands separators: 34000 -> "34.000". */
fun Long.grouped(): String {
    val digits = toString()
    val sb = StringBuilder()
    digits.forEachIndexed { index, c ->
        if (index > 0 && (digits.length - index) % 3 == 0) sb.append('.')
        sb.append(c)
    }
    return sb.toString()
}

fun Int.grouped(): String = toLong().grouped()

/** Formats an amount as rupiah: "Rp 34.000". */
fun Int.rp(): String = "Rp ${grouped()}"
