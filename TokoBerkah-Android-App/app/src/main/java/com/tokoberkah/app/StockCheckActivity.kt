package com.tokoberkah.app

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.tokoberkah.app.data.Product
import com.tokoberkah.app.databinding.ActivityStockCheckBinding
import com.tokoberkah.pos.data.Categories
import com.tokoberkah.pos.ui.TagFlow

/**
 * Layar 3: Cek Stok.
 * Menampilkan daftar produk + status stok + tag kategori,
 * tombol Filter (dialog multi-select kategori — revisi guru),
 * tombol Restok / Tambah ke Barang Masuk, dan bottom navigation.
 *
 * Daftar hanya berisi data dari backend; bila server tidak terjangkau
 * layar menampilkan keadaan kosong/gagal, bukan data dummy.
 */
class StockCheckActivity : AppCompatActivity() {

    private lateinit var binding: ActivityStockCheckBinding

    /** Semua produk / hanya hasil scan (saat kembali dari scanner). */
    private var products: List<Product> = emptyList()
    private var visibleProducts: List<Product> = emptyList()
    private var scanFilterActive = false
    private var restockFilterActive = false

    /** True bila unduhan katalog dari server gagal (tampilkan pesan jujur). */
    private var serverFailed = false

    /** Baris katalog terakhir yang dirender — deteksi "data tidak berubah". */
    private var lastRows: List<com.tokoberkah.pos.data.api.RemoteProduct>? = null

    /** Tag kategori terpilih pada tombol Filter (urut sesuai desain). */
    private var selectedTags: List<String> = emptyList()

    /**
     * Nomor generasi render — tiap render baru membatalkan potongan (chunk)
     * render sebelumnya yang masih tertunda, agar tak menumpuk.
     */
    private var renderGen = 0

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

        // Tombol Filter -> dialog tag kategori (multi-select)
        binding.chipFilter.setOnClickListener { showFilterDialog() }

        binding.btnCloseScanResult.setOnClickListener {
            scanFilterActive = false
            visibleProducts = products
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
            // Buka halaman Barang Masuk (modul pages)
            startActivity(
                Intent(this, com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            )
            overridePendingTransition(0, 0)
        }
    }

    override fun onResume() {
        super.onResume()
        // Tanpa render() di sini: aktivitas dipakai ulang (REORDER_TO_FRONT),
        // daftar di layar masih utuh — render ulang justru menunda transisi.
        // Bila data berubah, render() dipanggil dari refreshFromServer.
        refreshFromServer()
    }

    /**
     * Unduh katalog dari database (thread latar). Hanya render ulang bila
     * data BENAR-BENAR berubah (atau saat pulih dari gagal-muat) — data sama
     * = layar dibiarkan, transisi halaman tetap halus tanpa kedip.
     */
    private fun refreshFromServer() {
        Thread {
            val rows = com.tokoberkah.pos.data.api.RemoteCatalog.fetchProducts()
            runOnUiThread {
                if (rows == null) {
                    if (!serverFailed) {
                        serverFailed = true
                        render()
                    }
                } else if (rows != lastRows || serverFailed) {
                    lastRows = rows
                    serverFailed = false
                    val mapped = rows.map { mapFromServer(it) }
                    products = mapped
                    if (!scanFilterActive) visibleProducts = mapped
                    render()
                }
                // data sama → tidak ada render ulang (tanpa kedip/lag)
            }
        }.start()
    }

    /** Petakan baris backend ke model produk halaman Cek Stok. */
    private fun mapFromServer(r: com.tokoberkah.pos.data.api.RemoteProduct): Product {
        val cat = r.category
        return Product(
            ean = r.ean,
            name = r.name,
            price = r.price,
            unit = "Pcs",
            shelfStock = r.stock,
            warehouseStock = 0,
            lastIncoming = "",
            imageRes = imageFor(cat),
            categories = if (cat != null) listOf(cat) else emptyList(),
            unitsPerBox = 40
        )
    }

    /** Gambar perkiraan untuk produk dari server. */
    private fun imageFor(category: String?): Int = when (category) {
        "Mie Instan" -> R.drawable.product_indomie
        "Sembako", "Bumbu Dapur" -> R.drawable.product_bimoli
        "Susu & Kopi", "Minuman" -> R.drawable.product_kopi
        else -> R.drawable.product_beras
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_SCAN && resultCode == RESULT_OK) {
            val ean = data?.getStringExtra(EXTRA_SCANNED_EAN)
            val product = ean?.let { e -> products.find { it.ean == e } }
            if (product != null) {
                scanFilterActive = true
                visibleProducts = listOf(product)
                binding.scanResultBanner.visibility = View.VISIBLE
                binding.scanResultText.text =
                    getString(R.string.ean_format, product.ean) + " — " + product.name
                // render dipanggil di sini (bukan onResume) agar transisi halus
                render()
            }
        }
    }

    // ===== Dialog "Filter produk — kategori" (Figma 193:2) =====

    private fun showFilterDialog() {
        val temp = selectedTags.toMutableList()
        val dialogView = layoutInflater.inflate(R.layout.dialog_filter_kategori, null)
        val container = dialogView.findViewById<LinearLayout>(R.id.tagContainer)
        val maxW = resources.displayMetrics.widthPixels - TagFlow.dp(this, 96)

        fun paint() {
            val chips = TagFlow.fill(
                container = container,
                tags = Categories.ALL,
                maxLineWidthPx = maxW,
                chipBgRes = R.drawable.bg_tag_chip,
                chipTextColor = getColor(R.color.tag_chip_text),
                textSizeSp = 13f
            )
            chips.forEachIndexed { index, chip ->
                val tag = Categories.ALL[index]
                val active = tag in temp
                chip.setBackgroundResource(
                    if (active) R.drawable.bg_tag_chip_selected else R.drawable.bg_tag_chip
                )
                chip.setTextColor(getColor(if (active) R.color.text_primary else R.color.tag_chip_text))
                chip.setOnClickListener {
                    if (!temp.remove(tag)) temp.add(tag)
                    paint()
                }
            }
        }
        paint()

        val dialog = AlertDialog.Builder(this)
            .setView(dialogView)
            .create()
        dialog.show()
        dialog.window?.setLayout(
            android.view.ViewGroup.LayoutParams.MATCH_PARENT,
            android.view.ViewGroup.LayoutParams.WRAP_CONTENT
        )

        dialogView.findViewById<View>(R.id.btnReset).setOnClickListener {
            temp.clear()
            paint()
        }
        dialogView.findViewById<View>(R.id.btnApply).setOnClickListener {
            // Simpan dalam urutan master desain
            selectedTags = Categories.ALL.filter { it in temp }
            dialog.dismiss()
            render()
        }
    }

    // ===== Render daftar =====

    private fun render() {
        val base = if (scanFilterActive) visibleProducts else products
        val restocked = if (restockFilterActive) base.filter { it.needsRestock } else base
        val list = if (selectedTags.isEmpty()) restocked
        else restocked.filter { p -> p.categories.any { it in selectedTags } }

        // Header count
        val restockCount = base.count { it.needsRestock }
        binding.itemCount.text = getString(R.string.stock_items_format, base.size)
        binding.chipRestockText.text = getString(R.string.stock_restock_format, restockCount)
        binding.chipRestock.alpha = if (restockFilterActive) 1f else 0.75f

        // Label tombol Filter: "Filter" -> "Sembako" -> "Sembako +1"
        binding.chipFilterText.text = when (selectedTags.size) {
            0 -> getString(R.string.stock_filter)
            1 -> selectedTags.first()
            else -> getString(R.string.stock_filter_more, selectedTags.first(), selectedTags.size - 1)
        }

        // Isi daftar produk — per potongan kecil agar UI thread tetap
        // responsif (308 kartu sekaligus memblokir >5 detik -> ANR).
        binding.productList.removeAllViews()
        val inflater = LayoutInflater.from(this)
        renderGen++
        val gen = renderGen
        fun addChunk(start: Int) {
            if (gen != renderGen || isFinishing) return
            val end = minOf(start + CHUNK_SIZE, list.size)
            for (i in start until end) {
                val card = inflater.inflate(R.layout.item_product_stock, binding.productList, false)
                bindCard(card, list[i])
                binding.productList.addView(card)
            }
            if (end < list.size) binding.productList.post { addChunk(end) }
        }
        addChunk(0)

        val empty = list.isEmpty()
        binding.emptyState.visibility = if (empty) View.VISIBLE else View.GONE
        if (empty) {
            binding.emptyText.text = getString(
                when {
                    selectedTags.isNotEmpty() -> R.string.stock_filter_empty
                    serverFailed -> R.string.stock_server_error
                    else -> R.string.stock_empty
                }
            )
        }
    }

    private fun bindCard(card: View, product: Product) {
        card.findViewById<TextView>(R.id.productName).text = product.name
        card.findViewById<TextView>(R.id.productEan).text = product.ean

        // Baris status (baris sendiri) + tag kategori (di bawahnya, wrap max 4)
        val tagRows = card.findViewById<LinearLayout>(R.id.tagRows)
        TagFlow.fill(
            container = tagRows,
            tags = product.categories.take(Categories.MAX_PER_PRODUCT),
            maxLineWidthPx = TagFlow.maxLineWidth(this),
            chipBgRes = R.drawable.bg_tag_chip,
            chipTextColor = getColor(R.color.tag_chip_text)
        )
        tagRows.addView(createStatusPill(product), 0)

        // Stok total
        card.findViewById<TextView>(R.id.stockNumber).text = product.totalStock.toString()
        card.findViewById<TextView>(R.id.stockUnit).text = product.unit

        // Tombol aksi: Restok (stok menipis/habis) vs + (stok sehat)
        val bottomRow = card.findViewById<LinearLayout>(R.id.bottomRow)
        val lastIncomingRow = card.findViewById<LinearLayout>(R.id.lastIncomingRow)
        val btnRestok = card.findViewById<TextView>(R.id.btnRestok)
        val btnAdd = card.findViewById<LinearLayout>(R.id.btnAdd)

        if (product.needsRestock) {
            bottomRow.visibility = View.VISIBLE
            btnRestok.visibility = View.VISIBLE
            // Baris terakhir masuk hanya bila ada catatannya
            lastIncomingRow.visibility = if (product.lastIncoming.isEmpty()) View.GONE else View.VISIBLE
            card.findViewById<TextView>(R.id.lastIncomingText).text =
                getString(R.string.stock_last_incoming_format, product.lastIncoming)
            btnRestok.setOnClickListener { openBarangMasuk(product) }
            btnAdd.visibility = View.GONE
        } else {
            bottomRow.visibility = View.GONE
            btnAdd.visibility = View.VISIBLE
            btnAdd.setOnClickListener { openBarangMasuk(product) }
        }
    }

    /** Pill status: baris pertama sebelum tag kategori. */
    private fun createStatusPill(product: Product): TextView {
        val pill = TextView(this)
        pill.text = when {
            product.isOutOfStock -> getString(R.string.stock_status_out)
            product.needsRestock -> getString(R.string.stock_status_low)
            else -> getString(R.string.stock_status_safe)
        }
        pill.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11f)
        pill.typeface = android.graphics.Typeface.DEFAULT_BOLD
        pill.setPadding(
            TagFlow.dp(this, 10), TagFlow.dp(this, 4),
            TagFlow.dp(this, 10), TagFlow.dp(this, 4)
        )
        pill.background = getDrawable(
            when {
                product.isOutOfStock -> R.drawable.bg_badge_out
                product.needsRestock -> R.drawable.bg_badge_low
                else -> R.drawable.bg_badge_ok
            }
        )
        pill.setTextColor(
            getColor(
                when {
                    product.isOutOfStock -> R.color.error_dark
                    product.needsRestock -> R.color.warning_badge_text
                    else -> R.color.on_success
                }
            )
        )
        pill.layoutParams = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply { bottomMargin = TagFlow.dp(this@StockCheckActivity, 8) }
        return pill
    }

    /** Buka halaman Barang Masuk dengan produk ini terisi otomatis. */
    private fun openBarangMasuk(product: Product) {
        startActivity(
            Intent(this, com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity::class.java)
                .putExtra(com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity.EXTRA_SCANNED_EAN, product.ean)
                .putExtra(com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity.EXTRA_NAME, product.name)
                .putExtra(com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity.EXTRA_IMAGE, product.imageRes)
                .putExtra(com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity.EXTRA_STOCK, product.totalStock)
                .putExtra(com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity.EXTRA_UNITS, product.unitsPerBox)
        )
    }

    companion object {
        const val REQUEST_SCAN = 1001

        /** Jumlah kartu dirender per potongan (jaga UI tetap responsif). */
        private const val CHUNK_SIZE = 60
        const val EXTRA_SCANNED_EAN = "scanned_ean"
    }
}
