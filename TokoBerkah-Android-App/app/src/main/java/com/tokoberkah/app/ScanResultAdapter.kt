package com.tokoberkah.app

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.tokoberkah.app.data.CartManager
import com.tokoberkah.app.data.Product

/**
 * Adapter daftar hasil scan di layar Pemindai Barcode.
 * Kartu: thumbnail + badge jumlah, EAN, nama, harga, stepper +/-.
 *
 * @param onQtyChange dipanggil saat stepper ditekan (delta +1 / -1)
 */
class ScanResultAdapter(
    val items: MutableList<Product>,
    private val onQtyChange: (ean: String, delta: Int) -> Unit
) : RecyclerView.Adapter<ScanResultAdapter.Holder>() {

    class Holder(view: View) : RecyclerView.ViewHolder(view) {
        val image: ImageView = view.findViewById(R.id.scanProductImage)
        val qtyBadge: TextView = view.findViewById(R.id.scanQtyBadge)
        val ean: TextView = view.findViewById(R.id.scanEan)
        val name: TextView = view.findViewById(R.id.scanProductName)
        val price: TextView = view.findViewById(R.id.scanPrice)
        val qty: TextView = view.findViewById(R.id.scanQty)
        val btnMinus: LinearLayout = view.findViewById(R.id.btnQtyMinus)
        val btnPlus: LinearLayout = view.findViewById(R.id.btnQtyPlus)
        val root: LinearLayout = view.findViewById(R.id.scanCardRoot)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): Holder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_scan_result, parent, false)
        return Holder(view)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: Holder, position: Int) {
        val product = items[position]
        val context = holder.itemView.context

        holder.image.setImageResource(product.imageRes)
        holder.ean.text = product.ean
        holder.name.text = product.name
        holder.price.text = product.formattedPrice()

        val qty = CartManager.getQty(product.ean)
        holder.qty.text = qty.toString()
        holder.qtyBadge.text = "+$qty"
        holder.qtyBadge.visibility = if (qty > 0) View.VISIBLE else View.GONE

        // Batas atas: stok tersedia
        holder.btnPlus.alpha = if (qty < product.totalStock) 1f else 0.4f
        holder.btnMinus.alpha = if (qty > 0) 1f else 0.4f

        holder.btnPlus.setOnClickListener {
            if (CartManager.getQty(product.ean) < product.totalStock) {
                onQtyChange(product.ean, +1)
            } else {
                android.widget.Toast.makeText(
                    context,
                    context.getString(R.string.scan_out_of_stock, product.totalStock),
                    android.widget.Toast.LENGTH_SHORT
                ).show()
            }
        }

        holder.btnMinus.setOnClickListener {
            if (CartManager.getQty(product.ean) > 0) onQtyChange(product.ean, -1)
        }

        // Tap kartu: kembali ke Cek Stok dengan produk ini
        holder.root.setOnClickListener {
            val activity = context as? ScannerActivity ?: return@setOnClickListener
            val intent = android.content.Intent(activity, StockCheckActivity::class.java)
                .putExtra(StockCheckActivity.EXTRA_SCANNED_EAN, product.ean)
            activity.setResult(android.app.Activity.RESULT_OK, intent)
            activity.finish()
        }
    }
}
