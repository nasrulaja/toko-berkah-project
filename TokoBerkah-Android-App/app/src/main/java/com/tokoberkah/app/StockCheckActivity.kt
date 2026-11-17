package com.tokoberkah.app

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.tokoberkah.app.data.DummyData
import com.tokoberkah.app.data.Product
import com.tokoberkah.app.databinding.ActivityStockCheckBinding

/**
 * Layar 3: Cek Stok.
 * Menampilkan daftar produk + status stok, tombol buka Pemindai Barcode,
 * dan bottom navigation (Cek Harga / Masuk = toast "Halaman belum tersedia").
 */
class StockCheckActivity : AppCompatActivity() {

    private lateinit var binding: ActivityStockCheckBinding

    /** Semua produk / hanya hasil scan (saat kembali dari scanner). */
    private var visibleProducts: List<Product> = DummyData.products
    private var scanFilterActive = false
    private var restockFilterActive = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityStockCheckBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Konten tidak boleh ketimpa status bar
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(binding.main) { v, insets ->
            val top = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()).top
            v.setPadding(v.paddingLeft, top, v.paddingRight, v.paddingBottom)
            insets
        }

        binding.btnScanBarcode.setOnClickListener {
            startActivityForResult(
                Intent(this, ScannerActivity::class.java),
                REQUEST_SCAN
            )
        }

        binding.chipRestock.setOnClickListener {
            restockFilterActive = !restockFilterActive
            render()
        }

        binding.btnCloseScanResult.setOnClickListener {
            scanFilterActive = false
            visibleProducts = DummyData.products
            render()
        }

        binding.navCheckPrice.setOnClickListener {
            // Buka halaman Cek Harga (modul pages)
            startActivity(
                Intent(this, com.tokoberkah.pos.MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            )
            overridePendingTransition(0, 0)
        }
        binding.navIncoming.setOnClickListener {
            Toast.makeText(this, R.string.nav_not_available, Toast.LENGTH_SHORT).show()
        }
    }

    override fun onResume() {
        super.onResume()
        render()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_SCAN && resultCode == RESULT_OK) {
            val ean = data?.getStringExtra(EXTRA_SCANNED_EAN)
            val product = ean?.let { DummyData.findByEan(it) }
            if (product != null) {
                scanFilterActive = true
                visibleProducts = listOf(product)
                binding.scanResultBanner.visibility = android.view.View.VISIBLE
                binding.scanResultText.text =
                    getString(R.string.ean_format, product.ean) + " — " + product.name
            }
        }
    }

    private fun render() {
        val base = if (scanFilterActive) visibleProducts else DummyData.products
        val list = if (restockFilterActive) base.filter { it.needsRestock } else base

        // Header count
        val restockCount = base.count { it.needsRestock }
        binding.itemCount.text = getString(R.string.stock_items_format, base.size)
        binding.chipRestockText.text = getString(R.string.stock_restock_format, restockCount)
        binding.chipRestock.alpha = if (restockFilterActive) 1f else 0.75f

        // Isi daftar produk
        binding.productList.removeAllViews()
        val inflater = LayoutInflater.from(this)
        list.forEach { product ->
            val card = inflater.inflate(R.layout.item_product_stock, binding.productList, false)
            bindCard(card, product)
            binding.productList.addView(card)
        }

        binding.emptyState.visibility =
            if (list.isEmpty()) android.view.View.VISIBLE else android.view.View.GONE
    }

    private fun bindCard(card: android.view.View, product: Product) {
        card.findViewById<android.widget.ImageView>(R.id.productImage)
            .setImageResource(product.imageRes)

        card.findViewById<TextView>(R.id.productName).text = product.name
        card.findViewById<TextView>(R.id.productEan).text = product.ean

        // Badge status
        val badge = card.findViewById<LinearLayout>(R.id.badgeStatus)
        val badgeIcon = card.findViewById<android.widget.ImageView>(R.id.badgeIcon)
        val badgeDot = card.findViewById<android.view.View>(R.id.badgeDot)
        val badgeText = card.findViewById<TextView>(R.id.badgeText)
        when {
            product.isOutOfStock -> {
                badge.setBackgroundResource(R.drawable.bg_badge_out)
                badgeIcon.setImageResource(R.drawable.ic_status_out)
                badgeIcon.visibility = android.view.View.VISIBLE
                badgeDot.visibility = android.view.View.GONE
                badgeText.text = getString(R.string.stock_status_out)
                badgeText.setTextColor(getColor(R.color.error_dark))
            }
            product.needsRestock -> {
                badge.setBackgroundResource(R.drawable.bg_badge_low)
                badgeIcon.setImageResource(R.drawable.ic_warn_small)
                badgeIcon.visibility = android.view.View.VISIBLE
                badgeDot.visibility = android.view.View.GONE
                badgeText.text = getString(R.string.stock_status_low)
                badgeText.setTextColor(getColor(R.color.warning_badge_text))
            }
            else -> {
                badge.setBackgroundResource(R.drawable.bg_badge_ok)
                badgeIcon.visibility = android.view.View.GONE
                badgeDot.visibility = android.view.View.VISIBLE
                badgeText.text = getString(R.string.stock_status_safe)
                badgeText.setTextColor(getColor(R.color.on_success))
            }
        }

        // Stok total
        card.findViewById<TextView>(R.id.stockNumber).text = product.totalStock.toString()
        card.findViewById<TextView>(R.id.stockUnit).text = product.unit

        // Lokasi
        card.findViewById<TextView>(R.id.locShelfValue).text =
            "${product.shelfStock} Buah"
        card.findViewById<TextView>(R.id.locWarehouseValue).text =
            "${product.warehouseStock} Buah"

        // Baris terakhir masuk (khusus stok habis / menipis)
        val boxLast = card.findViewById<LinearLayout>(R.id.boxLastIncoming)
        if (product.isOutOfStock || product.needsRestock) {
            boxLast.visibility = android.view.View.VISIBLE
            card.findViewById<TextView>(R.id.lastIncomingText).text =
                getString(R.string.stock_last_incoming_format, product.lastIncoming)
            card.findViewById<TextView>(R.id.urgencyText).visibility =
                if (product.isOutOfStock) android.view.View.VISIBLE else android.view.View.GONE
        } else {
            boxLast.visibility = android.view.View.GONE
        }
    }

    companion object {
        const val REQUEST_SCAN = 1001
        const val EXTRA_SCANNED_EAN = "scanned_ean"
    }
}
