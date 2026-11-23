package com.tokoberkah.pos.ui

import android.content.Context
import android.graphics.Typeface
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Mengisi [container] dengan chip tag yang mengalir (wrap) — baris baru
 * saat lebar maksimum tercapai. Dipakai halaman Cek Stok (modul app)
 * untuk tag kartu produk & dialog filter, serta kartu Barang Masuk.
 */
object TagFlow {

    /** Mengisi chip dan mengembalikan daftar chip agar bisa diberi listener. */
    fun fill(
        container: LinearLayout,
        tags: List<String>,
        maxLineWidthPx: Int,
        chipBgRes: Int,
        chipTextColor: Int,
        textSizeSp: Float = 11f,
        alignEnd: Boolean = false
    ): List<TextView> {
        container.removeAllViews()
        if (tags.isEmpty()) return emptyList()

        val ctx = container.context
        val hPad = dp(ctx, 8)
        val vPad = dp(ctx, 4)
        val gap = dp(ctx, 6)
        val rowGap = dp(ctx, 6)

        val chips = mutableListOf<TextView>()
        var row: LinearLayout? = null
        var used = 0

        tags.forEach { tag ->
            val chip = TextView(ctx).apply {
                text = tag
                setTextSize(TypedValue.COMPLEX_UNIT_SP, textSizeSp)
                setTextColor(chipTextColor)
                setTypeface(Typeface.DEFAULT, Typeface.BOLD)
                setBackgroundResource(chipBgRes)
                setPadding(hPad, vPad, hPad, vPad)
                gravity = Gravity.CENTER
            }
            chip.measure(
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED),
                View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
            )
            val chipWidth = chip.measuredWidth

            val current = row
            if (current == null || (current.childCount > 0 && used + gap + chipWidth > maxLineWidthPx)) {
                val newRow = LinearLayout(ctx).apply {
                    orientation = LinearLayout.HORIZONTAL
                    if (alignEnd) gravity = Gravity.END
                }
                container.addView(
                    newRow,
                    LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { topMargin = if (current == null) 0 else rowGap }
                )
                row = newRow
                used = 0
            }

            val target = row!!
            target.addView(
                chip,
                LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { if (target.childCount > 1) leftMargin = gap }
            )
            used += chipWidth + (if (target.childCount > 1) gap else 0)
            chips += chip
        }
        return chips
    }

    /** Lebar maksimum satu baris chip: lebar layar - padding halaman & kartu. */
    fun maxLineWidth(context: Context): Int =
        context.resources.displayMetrics.widthPixels - dp(context, 64)

    fun dp(context: Context, value: Int): Int =
        (value * context.resources.displayMetrics.density + 0.5f).toInt()
}
