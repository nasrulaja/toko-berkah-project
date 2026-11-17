package com.tokoberkah.pos.page_terakhir_dilihat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.tokoberkah.pos.R
import com.tokoberkah.pos.data.Product
import com.tokoberkah.pos.data.rp

/** Full-width rows on the Terakhir Dilihat page. */
class RecentRowAdapter(
    private val items: List<Product>,
    private val onClick: (Product) -> Unit
) : RecyclerView.Adapter<RecentRowAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val ean: TextView = view.findViewById(R.id.tvEan)
        val name: TextView = view.findViewById(R.id.tvName)
        val price: TextView = view.findViewById(R.id.tvPrice)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_recent_row, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val product = items[position]
        holder.ean.text = "EAN ...${product.ean.takeLast(4)}"
        holder.name.text = product.name
        holder.price.text = product.price.rp()
        holder.itemView.setOnClickListener { onClick(product) }
    }

    override fun getItemCount(): Int = items.size
}
