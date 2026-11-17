package com.tokoberkah.pos.page_cekharga_list

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.core.view.isVisible
import androidx.recyclerview.widget.RecyclerView
import com.tokoberkah.pos.R
import com.tokoberkah.pos.data.Product
import com.tokoberkah.pos.data.rp

/** Product cards shown on the Cek Harga list page. */
class ProductListAdapter(
    private val items: List<Product>,
    private val onClick: (Product) -> Unit
) : RecyclerView.Adapter<ProductListAdapter.ViewHolder>() {

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val image: ImageView = view.findViewById(R.id.imgProduct)
        val badge: TextView = view.findViewById(R.id.tvBadge)
        val name: TextView = view.findViewById(R.id.tvName)
        val ean: TextView = view.findViewById(R.id.tvEan)
        val price: TextView = view.findViewById(R.id.tvPrice)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_product, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val product = items[position]
        holder.image.setImageResource(product.imageRes)
        holder.name.text = product.name
        holder.ean.text = "EAN: ${product.ean}"
        holder.price.text = product.price.rp()

        holder.badge.isVisible = product.badge.isNotEmpty()
        holder.badge.text = product.badge

        holder.itemView.setOnClickListener { onClick(product) }
    }

    override fun getItemCount(): Int = items.size
}
