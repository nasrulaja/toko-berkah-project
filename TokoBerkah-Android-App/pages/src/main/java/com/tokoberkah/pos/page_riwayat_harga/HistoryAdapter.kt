package com.tokoberkah.pos.page_riwayat_harga

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.tokoberkah.pos.R
import com.tokoberkah.pos.data.PriceChange
import com.tokoberkah.pos.data.rp
import kotlin.math.abs

/** Timeline rows of price changes; the newest entry is highlighted. */
class HistoryAdapter(
    private val items: List<PriceChange>
) : RecyclerView.Adapter<HistoryAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val date: TextView = view.findViewById(R.id.tvDate)
        val activeBadge: TextView = view.findViewById(R.id.tvActiveBadge)
        val prices: TextView = view.findViewById(R.id.tvPrices)
        val by: TextView = view.findViewById(R.id.tvBy)
        val delta: TextView = view.findViewById(R.id.tvDelta)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_history, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val entry = items[position]
        val context = holder.itemView.context

        holder.date.text = "${entry.date} • ${entry.time}"
        holder.prices.text = "${entry.oldPrice.rp()} → ${entry.newPrice.rp()}"
        holder.by.text = "Oleh ${entry.by}"

        holder.activeBadge.visibility =
            if (position == 0) View.VISIBLE else View.GONE
        holder.itemView.setBackgroundResource(
            if (position == 0) R.drawable.bg_card_highlight else R.drawable.bg_card_white
        )

        val sign = if (entry.delta >= 0) "+" else "-"
        holder.delta.text = "$sign${abs(entry.delta).rp()}"
        holder.delta.setTextColor(
            ContextCompat.getColor(
                context,
                if (entry.delta >= 0) R.color.blue_primary else R.color.red_alert
            )
        )
    }

    override fun getItemCount(): Int = items.size
}
