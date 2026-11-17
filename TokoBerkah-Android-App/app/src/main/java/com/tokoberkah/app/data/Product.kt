package com.tokoberkah.app.data

/**
 * Model produk (data dummy, frontend-only).
 * Akan disesuaikan dengan data dari aplikasi desktop nanti.
 */
data class Product(
    val ean: String,
    val name: String,
    val price: Int,
    val unit: String,
    val shelfStock: Int,
    val warehouseStock: Int,
    val lastIncoming: String,
    val imageRes: Int
) {
    val totalStock: Int get() = shelfStock + warehouseStock

    /** Perlu restock jika stok menipis (<= 5) atau habis. */
    val needsRestock: Boolean get() = totalStock <= 5

    val isOutOfStock: Boolean get() = totalStock == 0

    fun formattedPrice(): String {
        val grouped = "%,d".format(price).replace(',', '.')
        return "Rp $grouped"
    }
}
