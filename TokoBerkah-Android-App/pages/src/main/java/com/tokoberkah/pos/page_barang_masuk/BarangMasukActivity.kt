package com.tokoberkah.pos.page_barang_masuk

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.tokoberkah.pos.R
import com.tokoberkah.pos.data.Product
import com.tokoberkah.pos.data.ProductRepository
import com.tokoberkah.pos.data.grouped
import com.tokoberkah.pos.databinding.ActivityBarangMasukBinding

/**
 * PAGE 6 — Barang Masuk (restock entry).
 * Dua state sesuai Figma: scan prompt kosong (130:340),
 * lalu kartu entri produk setelah barcode dipindai (7:1062).
 */
class BarangMasukActivity : AppCompatActivity() {

    companion object {
        private const val REQUEST_SCAN = 5501
        private const val EXTRA_SCANNED_EAN = "scanned_ean"
    }

    private lateinit var binding: ActivityBarangMasukBinding
    private var product: Product? = null
    private var qty = 10

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBarangMasukBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Konten tidak boleh ketimpa status bar (edge-to-edge)
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(binding.masukRoot) { v, insets ->
            val top = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()).top
            v.setPadding(v.paddingLeft, top, v.paddingRight, v.paddingBottom)
            insets
        }

        findViewById<android.widget.TextView>(R.id.tvBreadcrumb).text =
            getString(R.string.nav_masuk_full)

        // Tab Masuk aktif di bottom nav
        binding.navIncoming.isSelected = true

        handleScanIntent(intent)

        binding.btnScan.setOnClickListener {
            startActivityForResult(
                Intent().setClassName(
                    "com.tokoberkah.app",
                    "com.tokoberkah.app.ScannerActivity"
                ),
                REQUEST_SCAN
            )
        }

        binding.btnMinus.setOnClickListener {
            if (qty > 1) {
                qty--
                renderQty()
            }
        }
        binding.btnPlus.setOnClickListener {
            qty++
            renderQty()
        }
        binding.chip5.setOnClickListener { qty += 5; renderQty() }
        binding.chip10.setOnClickListener { qty += 10; renderQty() }
        binding.chip20.setOnClickListener { qty += 20; renderQty() }
        binding.chip50.setOnClickListener { qty += 50; renderQty() }

        binding.etBuyPrice.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) = renderSummary()
        })

        binding.btnSave.setOnClickListener {
            val p = product ?: return@setOnClickListener
            Toast.makeText(
                this,
                "${getString(R.string.masuk_saved)}: $qty ${getString(R.string.masuk_unit)} ${p.name}",
                Toast.LENGTH_SHORT
            ).show()
            reset()
        }
        binding.btnCancel.setOnClickListener { reset() }

        // Navigasi tab lain (instant, tanpa animasi)
        binding.navCheckPrice.setOnClickListener {
            startActivity(
                Intent(this, com.tokoberkah.pos.MainActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            )
            overridePendingTransition(0, 0)
        }
        binding.navCheckStock.setOnClickListener {
            startActivity(
                Intent().setClassName(
                    "com.tokoberkah.app",
                    "com.tokoberkah.app.StockCheckActivity"
                ).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            )
            overridePendingTransition(0, 0)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleScanIntent(intent)
    }

    /** Menerima hasil scan langsung dari intent (mis. shortcut ke halaman ini). */
    private fun handleScanIntent(intent: Intent?) {
        val ean = intent?.getStringExtra(EXTRA_SCANNED_EAN) ?: return
        intent.removeExtra(EXTRA_SCANNED_EAN)
        val found = ProductRepository.byEan(ean)
            ?: if (ean.length == 12) ProductRepository.byEan("0$ean") else null
        if (found != null) {
            showEntry(found)
        } else {
            Toast.makeText(
                this,
                "Produk tidak ditemukan! Barcode: $ean",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_SCAN && resultCode == RESULT_OK) {
            val ean = data?.getStringExtra(EXTRA_SCANNED_EAN)
            val found = ean?.let {
                ProductRepository.byEan(it)
                    ?: if (it.length == 12) ProductRepository.byEan("0$it") else null
            }
            if (found != null) {
                showEntry(found)
            } else {
                Toast.makeText(
                    this,
                    "Produk tidak ditemukan! Barcode: $ean",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun showEntry(p: Product) {
        product = p
        qty = 10

        binding.imgProduct.setImageResource(p.imageRes)
        binding.tvProductName.text = p.name
        binding.tvProductPack.text = "Kemasan: ${p.badge}"
        binding.tvStockBadge.text = "Stok: ${p.stock} ${getString(R.string.masuk_unit)}"
        binding.tvEan.text = p.ean
        binding.etBuyPrice.text.clear()

        binding.emptyState.visibility = View.GONE
        binding.entryCard.visibility = View.VISIBLE
        renderQty()
    }

    private fun reset() {
        product = null
        qty = 10
        binding.etBuyPrice.text.clear()
        binding.entryCard.visibility = View.GONE
        binding.emptyState.visibility = View.VISIBLE
    }

    private fun renderQty() {
        binding.tvQty.text = qty.toString()
        renderSummary()
    }

    private fun renderSummary() {
        val p = product ?: return
        val after = p.stock + qty
        binding.tvStockAfter.text = "$after ${getString(R.string.masuk_unit)}"
        binding.tvStockDelta.text = "(+$qty)"
        val buyPrice = binding.etBuyPrice.text.toString().toIntOrNull() ?: 0
        binding.tvTotal.text = "Rp ${(qty * buyPrice).grouped()}"
    }
}
