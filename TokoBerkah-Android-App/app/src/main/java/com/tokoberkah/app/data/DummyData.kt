package com.tokoberkah.app.data

import com.tokoberkah.app.R

/**
 * Data dummy produk toko. Sesuai desain Figma:
 * - Kopi: 4 renceng (rak 4, gudang 0)
 * - Beras: 0 (habis)
 * - Indomie: 15 (rak 5, gudang 10)
 * - Bimoli: 48 (rak 5, gudang 43)
 * ditambah 2 produk tambahan agar daftar lebih realistis.
 */
object DummyData {

    val products: List<Product> = listOf(
        Product(
            ean = "8991001100223",
            name = "Kopi Kapal Api Spesial Mix",
            price = 2500,
            unit = "Renceng",
            shelfStock = 4,
            warehouseStock = 0,
            lastIncoming = "3 hari lalu",
            imageRes = R.drawable.product_kopi
        ),
        Product(
            ean = "8992003300891",
            name = "Beras Premium 5 Kg",
            price = 72000,
            unit = "Karung",
            shelfStock = 0,
            warehouseStock = 0,
            lastIncoming = "5 hari lalu",
            imageRes = R.drawable.product_beras
        ),
        Product(
            ean = "0089686170733",
            name = "Indomie Goreng Spesial",
            price = 3500,
            unit = "Bungkus",
            shelfStock = 5,
            warehouseStock = 10,
            lastIncoming = "1 hari lalu",
            imageRes = R.drawable.product_indomie
        ),
        Product(
            ean = "8992388012493",
            name = "Minyak Goreng Bimoli 1 L",
            price = 18500,
            unit = "Pcs",
            shelfStock = 5,
            warehouseStock = 43,
            lastIncoming = "2 hari lalu",
            imageRes = R.drawable.product_bimoli
        ),
        Product(
            ean = "8991102100108",
            name = "Teh Sariwangi Celup 25s",
            price = 6500,
            unit = "Kotak",
            shelfStock = 8,
            warehouseStock = 12,
            lastIncoming = "4 hari lalu",
            imageRes = R.drawable.product_kopi
        ),
        Product(
            ean = "8991002101017",
            name = "Gula Pasir 1 Kg",
            price = 15500,
            unit = "Pack",
            shelfStock = 2,
            warehouseStock = 9,
            lastIncoming = "6 hari lalu",
            imageRes = R.drawable.product_beras
        )
    )

    fun findByEan(ean: String): Product? {
        products.firstOrNull { it.ean == ean }?.let { return it }
        // EAN-13 berawalan 0 sering terbaca sebagai UPC-A (12 digit, tanpa 0 depan)
        if (ean.length == 12) {
            products.firstOrNull { it.ean == "0$ean" }?.let { return it }
        }
        return null
    }
}
