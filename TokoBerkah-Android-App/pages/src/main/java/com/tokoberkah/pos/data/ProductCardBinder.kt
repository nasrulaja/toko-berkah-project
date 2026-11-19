package com.tokoberkah.pos.data

import com.tokoberkah.pos.databinding.ViewProductCardBinding

/** Binds a product into the shared product card used on detail/history/edit pages. */
fun ViewProductCardBinding.show(product: Product) {
    tvEan.text = product.ean
    tvCategory.text = product.category
    tvStock.text = "Stok Siap: ${product.stock} Buah"
    tvName.text = product.name
    tvLocation.text = "Lokasi: ${product.location}"
    tvPrice.text = product.price.rp()
}
