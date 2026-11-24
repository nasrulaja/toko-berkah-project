package com.tokoberkah.pos.page_barang_masuk

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.annotation.DrawableRes
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.tokoberkah.pos.R
import com.tokoberkah.pos.data.Product
import com.tokoberkah.pos.data.ProductRepository
import com.tokoberkah.pos.data.grouped
import com.tokoberkah.pos.databinding.ActivityBarangMasukBinding
import com.tokoberkah.pos.ui.TagFlow

/**
 * PAGE 6 — Barang Masuk (restock entry).
 *
 * State sesuai revisi Figma:
 * - Awal: daftar "Produk perlu restock" (kartu 130:340 baru) + tombol pindai.
 * - Kartu entri produk (7:1062) dengan Isi Per Dus & Harga Jual per Buah,
 *   dibuka lewat kartu restock, hasil scan, atau tombol Restok dari Cek Stok.
 */
class BarangMasukActivity : AppCompatActivity() {

    companion object {
        private const val REQUEST_SCAN = 5501

        /** Dipakai scanner & tombol Restok/Tambah dari halaman Cek Stok. */
        const val EXTRA_SCANNED_EAN = "scanned_ean"

        /** Fallback ketika EAN belum ada di katalog pages. */
        const val EXTRA_NAME = "extra_name"
        const val EXTRA_IMAGE = "extra_image_res"
        const val EXTRA_STOCK = "extra_stock"
        const val EXTRA_UNITS = "extra_units_per_box"
    }

    /** Data untuk satu kartu entri (sumber boleh null untuk produk luar katalog). */
    private data class Entry(
        val ean: String,
        val name: String,
        val pack: String,
        val stock: Int,
        @DrawableRes val imageRes: Int,
        var unitsPerBox: Int,
        val source: Product?
    )

    private lateinit var binding: ActivityBarangMasukBinding
    private var entry: Entry? = null
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

        findViewById<TextView>(R.id.tvBreadcrumb).text =
            getString(R.string.nav_masuk_full)

        // Liquid Glass navbar (3 tab, tab Masuk aktif)
        binding.glassNav.setItems(
            listOf(
                getString(com.tokoberkah.pos.R.string.nav_cek_harga),
                getString(com.tokoberkah.pos.R.string.nav_cek_stok),
                getString(com.tokoberkah.pos.R.string.nav_masuk)
            ),
            listOf(
                com.tokoberkah.pos.R.drawable.ic_tag,
                com.tokoberkah.pos.R.drawable.ic_box,
                com.tokoberkah.pos.R.drawable.ic_truck
            )
        )

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

        // Ubah "Isi Per Dus" — bisa diedit & diubah lagi nanti.
        // TODO(supabase): sinkronkan nilai ke tabel produk di Web Admin.
        binding.chipIsiPerDus.setOnClickListener { showIsiPerDusDialog() }

        binding.btnSave.setOnClickListener {
            val e = entry ?: return@setOnClickListener
            saveEntry(e)
        }
        binding.btnCancel.setOnClickListener { reset() }

        // Navigasi tab lain (instant, tanpa animasi)
        binding.glassNav.setOnItemSelectedListener { index ->
            when (index) {
                0 -> {
                    startActivity(
                        Intent(this, com.tokoberkah.pos.MainActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    )
                    overridePendingTransition(0, 0)
                }
                1 -> {
                    startActivity(
                        Intent().setClassName(
                            "com.tokoberkah.app",
                            "com.tokoberkah.app.StockCheckActivity"
                        ).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
                    )
                    overridePendingTransition(0, 0)
                }
                // index 2 = Masuk (halaman ini sendiri)
            }
            true
        }
        binding.glassNav.selectedIndex = 2

        if (savedInstanceState == null) handleIncomingIntent(intent)
        renderRestockList()
    }

    override fun onResume() {
        super.onResume()
        binding.glassNav.selectedIndex = 2
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleIncomingIntent(intent)
        renderRestockList()
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_SCAN && resultCode == RESULT_OK) {
            handleIncomingIntent(data)
        }
    }

    /** Menerima EAN dari scanner atau dari tombol Restok/Tambah di Cek Stok. */
    private fun handleIncomingIntent(intent: Intent?) {
        val ean = intent?.getStringExtra(EXTRA_SCANNED_EAN) ?: return
        intent.removeExtra(EXTRA_SCANNED_EAN)

        val known = ProductRepository.byEan(ean)
            ?: if (ean.length == 12) ProductRepository.byEan("0$ean") else null

        if (known != null) {
            showEntry(Entry(
                ean = known.ean,
                name = known.name,
                pack = known.badge,
                stock = known.stock,
                imageRes = known.imageRes,
                unitsPerBox = known.unitsPerBox,
                source = known
            ))
            return
        }

        // Produk dari halaman Cek Stok — pakai data intent bila belum ada di katalog
        val name = intent.getStringExtra(EXTRA_NAME)
        if (name != null) {
            showEntry(Entry(
                ean = ean,
                name = name,
                pack = "",
                stock = intent.getIntExtra(EXTRA_STOCK, 0),
                imageRes = intent.getIntExtra(EXTRA_IMAGE, 0),
                unitsPerBox = intent.getIntExtra(EXTRA_UNITS, 40),
                source = null
            ))
        } else {
            Toast.makeText(
                this,
                "Produk tidak ditemukan! Barcode: $ean",
                Toast.LENGTH_SHORT
            ).show()
        }
    }

    // ===== State awal: daftar produk perlu restock =====

    private fun renderRestockList() {
        val list = ProductRepository.restockList()
        binding.restockList.removeAllViews()
        val inflater = LayoutInflater.from(this)
        list.forEach { product ->
            val card = inflater.inflate(R.layout.item_restock_card, binding.restockList, false)
            bindRestockCard(card, product)
            card.setOnClickListener { showEntry(fromProduct(product)) }
            binding.restockList.addView(card)
        }

        val none = list.isEmpty()
        applyVisibility(none)
    }

    /**
     * Satu state per layar: daftar restock ATAU kartu entri —
     * keduanya tidak boleh terlihat bersamaan (tab masuk memanggil
     * [renderRestockList] lewat onNewIntent saat kartu entri terbuka).
     */
    private fun applyVisibility(none: Boolean = ProductRepository.restockList().isEmpty()) {
        val open = entry != null
        binding.restockTitle.visibility = if (open || none) View.GONE else View.VISIBLE
        binding.restockList.visibility = if (open || none) View.GONE else View.VISIBLE
        binding.emptyState.visibility = if (!open && none) View.VISIBLE else View.GONE
        binding.entryCard.visibility = if (open) View.VISIBLE else View.GONE
    }

    private fun fromProduct(p: Product) = Entry(
        ean = p.ean,
        name = p.name,
        pack = p.badge,
        stock = p.stock,
        imageRes = p.imageRes,
        unitsPerBox = p.unitsPerBox,
        source = p
    )

    private fun bindRestockCard(card: View, p: Product) {
        card.findViewById<TextView>(R.id.tvName).text = p.name
        card.findViewById<TextView>(R.id.tvEan).text = "EAN: ${p.ean}"
        card.findViewById<TextView>(R.id.tvStockTotal).text = p.stock.toString()

        val pill = card.findViewById<TextView>(R.id.statusPill)
        when {
            p.stock == 0 -> {
                pill.setBackgroundResource(R.drawable.bg_status_out)
                pill.text = getString(R.string.masuk_status_out)
                pill.setTextColor(getColor(R.color.status_out_text))
            }
            p.needsRestock -> {
                pill.setBackgroundResource(R.drawable.bg_status_low)
                pill.text = getString(R.string.masuk_status_low)
                pill.setTextColor(getColor(R.color.status_low_text))
            }
            else -> {
                pill.setBackgroundResource(R.drawable.bg_status_ok)
                pill.text = getString(R.string.masuk_status_ok)
                pill.setTextColor(getColor(R.color.status_ok_text))
            }
        }

        TagFlow.fill(
            container = card.findViewById(R.id.tagFlow),
            tags = p.categories,
            maxLineWidthPx = TagFlow.maxLineWidth(this),
            chipBgRes = R.drawable.bg_tag_chip,
            chipTextColor = getColor(R.color.tag_chip_text),
            alignEnd = true
        )

        val lastRow = card.findViewById<View>(R.id.lastIncomingRow)
        if (p.lastIncoming.isBlank()) {
            lastRow.visibility = View.GONE
        } else {
            lastRow.visibility = View.VISIBLE
            card.findViewById<TextView>(R.id.tvLastIncoming).text =
                getString(R.string.masuk_last_incoming, p.lastIncoming)
        }
    }

    // ===== Kartu entri =====

    private fun showEntry(e: Entry) {
        entry = e
        qty = 10

        binding.tvProductName.text = e.name
        if (e.pack.isBlank()) {
            binding.tvProductPack.visibility = View.GONE
        } else {
            binding.tvProductPack.visibility = View.VISIBLE
            binding.tvProductPack.text = "Kemasan: ${e.pack}"
        }
        renderStockBadge()
        binding.tvEan.text = e.ean
        binding.etBuyPrice.text.clear()
        binding.etSellPrice.setText(e.source?.price?.toString().orEmpty())

        applyVisibility()

        renderIsiPerDus()
        renderQty()
        binding.masukScroll.post { binding.masukScroll.smoothScrollTo(0, 0) }
    }

    private fun reset() {
        entry = null
        qty = 10
        binding.etBuyPrice.text.clear()
        binding.etSellPrice.text.clear()
        renderRestockList()
    }

    /** Badge stok: kebenaran dalam Buah; "dus" hanya turunan tampilan. */
    private fun renderStockBadge() {
        val e = entry ?: return
        binding.tvStockBadge.text = "Stok: ${e.stock} Buah"
    }

    private fun renderIsiPerDus() {
        val e = entry ?: return
        binding.tvIsiPerDus.text =
            getString(R.string.masuk_isi_format, 1, e.unitsPerBox)
    }

    /** Dialog edit "Isi Per Dus" (bisa dibuka ulang kapan saja). */
    private fun showIsiPerDusDialog() {
        val e = entry ?: return
        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER
            setText(e.unitsPerBox.toString())
            setSelection(text.length)
        }
        val pad = TagFlow.dp(this, 20)
        AlertDialog.Builder(this)
            .setTitle(R.string.masuk_isi_per_dus)
            .setMessage(getString(R.string.masuk_isi_format, 1, e.unitsPerBox))
            .setView(input, pad, pad / 2, pad, 0)
            .setPositiveButton(android.R.string.ok) { _, _ ->
                val value = input.text.toString().toIntOrNull()
                if (value != null && value > 0) {
                    e.unitsPerBox = value
                    e.source?.unitsPerBox = value
                    renderIsiPerDus()
                    renderStockBadge()
                    renderSummary()
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    /**
     * Simpan barang masuk secara LOKAL: stok bertambah dan harga jual diperbarui
     * langsung di ProductRepository (memori). Aplikasi bekerja offline; tidak
     * ada pemanggilan jaringan lagi.
     */
    private fun saveEntry(e: Entry) {
        val n = qty
        val sellPrice = binding.etSellPrice.text.toString().toIntOrNull()
        binding.btnSave.isEnabled = false

        // Terapkan ke katalog dalam memori (produk yang dikenal dari ProductRepository).
        val target = e.source
        var tersimpan = false
        if (target != null) {
            target.stock += n * e.unitsPerBox
            if (sellPrice != null && sellPrice > 0 && sellPrice != target.price) {
                ProductRepository.updatePrice(
                    target, sellPrice,
                    "Penyesuaian harga saat simpan barang masuk."
                )
            }
            tersimpan = true
        }

        binding.btnSave.isEnabled = true
        if (tersimpan) {
            Toast.makeText(
                this,
                "${getString(R.string.masuk_saved)}: $n dus (${n * e.unitsPerBox} buah) ${e.name}",
                Toast.LENGTH_SHORT
            ).show()
            reset()
        } else {
            Toast.makeText(this, R.string.masuk_save_failed, Toast.LENGTH_LONG).show()
        }
    }

    private fun renderQty() {
        binding.tvQty.text = qty.toString()
        renderSummary()
    }

    private fun renderSummary() {
        val e = entry ?: return

        // Headline = stok saat ini (baru bertambah SETELAH Simpan); delta di kurung = barang yang akan masuk.
        binding.tvStockAfter.text = "${e.stock} Buah"
        binding.tvStockDelta.text = "(+${qty * e.unitsPerBox})"

        // Baris kedua: setara dus (≈), ikut perubahan Isi Per Dus saja.
        binding.tvStockAfterUnit.text = "≈ ${e.stock / e.unitsPerBox} dus"
        binding.tvStockDeltaUnit.text = "(+${qty} dus)"

        val buyPrice = binding.etBuyPrice.text.toString().toIntOrNull() ?: 0
        binding.tvTotal.text = "Rp ${(qty * buyPrice).grouped()}"
    }
}
