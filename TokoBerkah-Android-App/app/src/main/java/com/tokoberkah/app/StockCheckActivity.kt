package com.tokoberkah.app

import android.content.Intent
import android.os.Bundle
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

    /** Adapter daftar produk (RecyclerView) — header + kartu. */
    private var stockAdapter: StockListAdapter? = null

    /** Teks baris hasil scan (banner pada item header). */
    private var scanResultLine: String = ""

    /** Cegah permintaan sinkronisasi menumpuk saat layar dibuka berulang. */
    private var refreshInFlight = false

    /** Tag kategori terpilih pada tombol Filter (urut sesuai desain). */
    private var selectedTags: List<String> = emptyList()

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
        findViewById<TextView>(com.tokoberkah.pos.R.id.tvBreadcrumb).text =
            getString(R.string.nav_check_stock)

        // Daftar via RecyclerView: hanya kartu yang terlihat yang jadi view,
        // header (scan/hitungan/chip) jadi item ke-0 di dalam daftar.
        binding.rvProducts.layoutManager =
            androidx.recyclerview.widget.LinearLayoutManager(this)
        stockAdapter = StockListAdapter(
            onScanClick = {
                startActivityForResult(
                    Intent(this, ScannerActivity::class.java),
                    REQUEST_SCAN
                )
            },
            onCloseBanner = {
                scanFilterActive = false
                visibleProducts = products
                render()
            },
            onRestockToggle = {
                restockFilterActive = !restockFilterActive
                render()
            },
            // Tombol Filter -> dialog tag kategori (multi-select)
            onFilterClick = { showFilterDialog() },
            onProductAction = { openBarangMasuk(it) }
        )
        binding.rvProducts.adapter = stockAdapter

        binding.glassNav.setItems(
            listOf(
                getString(R.string.nav_check_price),
                getString(R.string.nav_check_stock),
                getString(R.string.nav_incoming)
            ),
            listOf(
                com.tokoberkah.pos.R.drawable.ic_tag,
                com.tokoberkah.pos.R.drawable.ic_box,
                com.tokoberkah.pos.R.drawable.ic_truck
            )
        )
        binding.glassNav.setOnItemSelectedListener { index ->
            when (index) {
                0 -> {
                    // Buka halaman Cek Harga (modul pages)
                    startActivity(
                        Intent(this, com.tokoberkah.pos.MainActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    )
                    overridePendingTransition(0, 0)
                }
                2 -> {
                    // Buka halaman Barang Masuk (modul pages)
                    startActivity(
                        Intent(this, com.tokoberkah.pos.page_barang_masuk.BarangMasukActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    )
                    overridePendingTransition(0, 0)
                }
                // index 1 = Cek Stok (halaman ini sendiri)
            }
            true
        }
        binding.glassNav.selectedIndex = 1
    }

    override fun onResume() {
        super.onResume()
        binding.glassNav.selectedIndex = 1
        // Tanpa render() di sini: aktivitas dipakai ulang (REORDER_TO_FRONT),
        // daftar di layar masih utuh — render ulang justru menunda transisi.
        // Bila data berubah, render() dipanggil dari refreshFromServer.
        // Flag direset tiap resume supaya activity yang dibuat ulang tetap bisa sync.
        refreshInFlight = false
        refreshFromServer()
    }

    /**
     * Unduh katalog dari database (thread latar). Hanya render ulang bila
     * data BENAR-BENAR berubah (atau saat pulih dari gagal-muat) — data sama
     * = layar dibiarkan, transisi halaman tetap halus tanpa kedip.
     */
    private fun refreshFromServer() {
        // Jangan tumpuk permintaan: onResume bisa terpanggil berkali-kali
        // (bolak-balik tab) dan tiap panggilan membuat Thread + request baru.
        if (refreshInFlight) return
        refreshInFlight = true
        Thread {
            val rows = com.tokoberkah.pos.data.api.RemoteCatalog.fetchProducts()
            runOnUiThread {
                refreshInFlight = false
                if (isFinishing || isDestroyed) return@runOnUiThread
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
                scanResultLine =
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
        val countText = getString(R.string.stock_items_format, base.size)
        val restockText = getString(R.string.stock_restock_format, restockCount)
        val restockAlpha = if (restockFilterActive) 1f else 0.75f

        // Label tombol Filter: "Filter" -> "Sembako" -> "Sembako +1"
        val filterLabel = when (selectedTags.size) {
            0 -> getString(R.string.stock_filter)
            1 -> selectedTags.first()
            else -> getString(R.string.stock_filter_more, selectedTags.first(), selectedTags.size - 1)
        }

        // Daftar via RecyclerView: cukup submit data — hanya kartu yang
        // terlihat yang di-bind, tanpa timbunan 308 view (transisi halus).
        stockAdapter?.submit(
            StockListAdapter.HeaderState(
                countText = countText,
                restockText = restockText,
                restockAlpha = restockAlpha,
                filterLabel = filterLabel,
                bannerVisible = scanFilterActive,
                bannerText = scanResultLine
            ),
            list
        )

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

        const val EXTRA_SCANNED_EAN = "scanned_ean"
    }
}
