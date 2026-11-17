package com.tokoberkah.app.data

/**
 * Keranjang in-memory (frontend-only).
 * Menyimpan kuantitas per EAN; nanti akan dihubungkan ke aplikasi desktop.
 */
object CartManager {

    private val quantities = LinkedHashMap<String, Int>()

    fun getQty(ean: String): Int = quantities[ean] ?: 0

    fun setQty(ean: String, qty: Int) {
        if (qty <= 0) quantities.remove(ean) else quantities[ean] = qty
    }

    fun add(ean: String, delta: Int): Int {
        val newQty = (getQty(ean) + delta).coerceAtLeast(0)
        setQty(ean, newQty)
        return newQty
    }

    fun clear() = quantities.clear()

    fun totalItems(): Int = quantities.values.sum()
}
