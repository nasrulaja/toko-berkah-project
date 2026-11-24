package com.tokoberkah.app

import android.graphics.Typeface
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.tokoberkah.app.data.Product
import com.tokoberkah.pos.data.Categories
import com.tokoberkah.pos.ui.TagFlow

/**
 * Adapter daftar Cek Stok (RecyclerView).
 *
 * Item ke-0 = baris header (tombol scan, banner hasil scan, hitungan, chip
 * Restok & Filter) — sisanya kartu produk. Hanya kartu yang terlihat yang
 * dibuat sebagai view, sehingga daftar 308 produk tidak lagi menimbun
 * ~2.500 view di satu layout (penyebab lag transisi halaman).
 */
class StockListAdapter(
    private val onScanClick: () -> Unit,
    private val onCloseBanner: () -> Unit,
    private val onRestockToggle: () -> Unit,
    private val onFilterClick: () -> Unit,
    private val onProductAction: (Product) -> Unit,
    private val onTagClick: (String) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    /** Isi baris header — teks hitungan/label diisi ulang tiap render. */
    data class HeaderState(
        val countText: String,
        val restockText: String,
        val restockAlpha: Float,
        val filterLabel: String,
        val bannerVisible: Boolean,
        val bannerText: String
    )

    private var header = HeaderState("", "", 1f, "", false, "")
    private var products: List<Product> = emptyList()

    fun submit(newHeader: HeaderState, newProducts: List<Product>) {
        header = newHeader
        products = newProducts
        notifyDataSetChanged()
    }

    override fun getItemCount() = products.size + 1

    override fun getItemViewType(position: Int) =
        if (position == 0) VIEW_HEADER else VIEW_PRODUCT

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == VIEW_HEADER) {
            HeaderHolder(inflater.inflate(R.layout.item_stock_header, parent, false))
        } else {
            ProductHolder(inflater.inflate(R.layout.item_product_stock, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        if (holder is HeaderHolder) holder.bind(header)
        else (holder as ProductHolder).bind(products[position - 1])
    }

    // ---------------------------------------------------------------- header
    inner class HeaderHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val count: TextView = view.findViewById(R.id.itemCount)
        private val restockText: TextView = view.findViewById(R.id.chipRestockText)
        private val restockChip: View = view.findViewById(R.id.chipRestock)
        private val filterText: TextView = view.findViewById(R.id.chipFilterText)
        private val banner: View = view.findViewById(R.id.scanResultBanner)
        private val bannerText: TextView = view.findViewById(R.id.scanResultText)

        init {
            view.findViewById<View>(R.id.btnScanBarcode).setOnClickListener { onScanClick() }
            view.findViewById<View>(R.id.btnCloseScanResult).setOnClickListener { onCloseBanner() }
            restockChip.setOnClickListener { onRestockToggle() }
            view.findViewById<View>(R.id.chipFilter).setOnClickListener { onFilterClick() }
        }

        fun bind(s: HeaderState) {
            count.text = s.countText
            restockText.text = s.restockText
            restockChip.alpha = s.restockAlpha
            filterText.text = s.filterLabel
            banner.visibility = if (s.bannerVisible) View.VISIBLE else View.GONE
            bannerText.text = s.bannerText
        }
    }

    // --------------------------------------------------------------- produk
    inner class ProductHolder(view: View) : RecyclerView.ViewHolder(view) {
        private val ctx = view.context
        private val name: TextView = view.findViewById(R.id.productName)
        private val ean: TextView = view.findViewById(R.id.productEan)
        private val tagRows: LinearLayout = view.findViewById(R.id.tagRows)
        private val pillRow: LinearLayout = view.findViewById(R.id.pillRow)
        private val stockNumber: TextView = view.findViewById(R.id.stockNumber)
        private val stockUnit: TextView = view.findViewById(R.id.stockUnit)
        private val bottomRow: LinearLayout = view.findViewById(R.id.bottomRow)
        private val lastIncomingRow: LinearLayout = view.findViewById(R.id.lastIncomingRow)
        private val lastIncomingText: TextView = view.findViewById(R.id.lastIncomingText)
        private val btnRestok: TextView = view.findViewById(R.id.btnRestok)
        private val btnAdd: LinearLayout = view.findViewById(R.id.btnAdd)

        fun bind(p: Product) {
            name.text = p.name
            ean.text = p.ean

            // Baris status (pill pertama) + tag kategori (di bawahnya, wrap max 4)
            val tags = p.categories.take(Categories.MAX_PER_PRODUCT)
            val tagChips = TagFlow.fill(
                container = tagRows,
                tags = tags,
                maxLineWidthPx = TagFlow.maxLineWidth(ctx),
                chipBgRes = R.drawable.bg_tag_chip,
                chipTextColor = ctx.getColor(R.color.tag_chip_text),
                alignEnd = true
            )
            tagChips.forEachIndexed { i, chip ->
                chip.setOnClickListener { onTagClick(tags[i]) }
            }
            pillRow.removeAllViews()
            pillRow.addView(createStatusPill(p))

            // Stok total
            stockNumber.text = p.totalStock.toString()
            stockUnit.text = p.unit

            // Tombol aksi: Restok (stok menipis/habis) vs + (stok sehat)
            if (p.needsRestock) {
                bottomRow.visibility = View.VISIBLE
                btnRestok.visibility = View.VISIBLE
                lastIncomingRow.visibility =
                    if (p.lastIncoming.isEmpty()) View.GONE else View.VISIBLE
                lastIncomingText.text =
                    ctx.getString(R.string.stock_last_incoming_format, p.lastIncoming)
                btnRestok.setOnClickListener { onProductAction(p) }
                btnAdd.visibility = View.GONE
            } else {
                bottomRow.visibility = View.GONE
                btnAdd.visibility = View.VISIBLE
                btnAdd.setOnClickListener { onProductAction(p) }
            }
        }

        /** Pill status: baris pertama sebelum tag kategori. */
        private fun createStatusPill(p: Product): TextView {
            val pill = TextView(ctx)
            pill.text = when {
                p.isOutOfStock -> ctx.getString(R.string.stock_status_out)
                p.needsRestock -> ctx.getString(R.string.stock_status_low)
                else -> ctx.getString(R.string.stock_status_safe)
            }
            pill.setTextSize(android.util.TypedValue.COMPLEX_UNIT_SP, 11f)
            pill.typeface = Typeface.DEFAULT_BOLD
            pill.setPadding(
                TagFlow.dp(ctx, 10), TagFlow.dp(ctx, 4),
                TagFlow.dp(ctx, 10), TagFlow.dp(ctx, 4)
            )
            pill.background = ctx.getDrawable(
                when {
                    p.isOutOfStock -> R.drawable.bg_badge_out
                    p.needsRestock -> R.drawable.bg_badge_low
                    else -> R.drawable.bg_badge_ok
                }
            )
            pill.setTextColor(
                ctx.getColor(
                    when {
                        p.isOutOfStock -> R.color.error_dark
                        p.needsRestock -> R.color.warning_badge_text
                        else -> R.color.on_success
                    }
                )
            )
            pill.layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = TagFlow.dp(ctx, 8) }
            return pill
        }
    }

    companion object {
        private const val VIEW_HEADER = 0
        private const val VIEW_PRODUCT = 1
    }
}
