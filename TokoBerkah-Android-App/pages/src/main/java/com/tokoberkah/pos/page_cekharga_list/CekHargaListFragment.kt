package com.tokoberkah.pos.page_cekharga_list

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.recyclerview.widget.LinearLayoutManager
import com.tokoberkah.pos.R
import com.tokoberkah.pos.core.openPage
import com.tokoberkah.pos.core.setBreadcrumb
import com.tokoberkah.pos.data.Product
import com.tokoberkah.pos.data.ProductRepository
import com.tokoberkah.pos.databinding.FragmentCekhargaListBinding
import com.tokoberkah.pos.page_cekharga_detail.CekHargaDetailFragment
import androidx.fragment.app.Fragment

/**
 * PAGE 1 — Cek Harga (catalogue + simulated barcode scan).
 * Tap a product card or the scan button to open the product detail.
 */
class CekHargaListFragment : Fragment(R.layout.fragment_cekharga_list) {

    companion object {
        private const val REQUEST_SCAN = 4401
        private const val EXTRA_SCANNED_EAN = "scanned_ean"
    }

    private var _binding: FragmentCekhargaListBinding? = null
    private val binding get() = _binding!!

    private var listAdapter: ProductListAdapter? = null

    /** Sinkronisasi katalog yang sedang berjalan (agar tidak menumpuk). */
    private var syncJob: Thread? = null

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        _binding = FragmentCekhargaListBinding.bind(view)
        setBreadcrumb(getString(R.string.nav_cek_harga))

        // Pemindai barcode asli (modul app): hasil scan dicocokkan ke katalog harga.
        binding.btnScan.setOnClickListener {
            startActivityForResult(
                android.content.Intent().setClassName(
                    "com.tokoberkah.app",
                    "com.tokoberkah.app.ScannerActivity"
                ),
                REQUEST_SCAN
            )
        }

        binding.rvProducts.layoutManager = LinearLayoutManager(requireContext())
        // Setiap baris produk punya ukuran tetap -> RecyclerView tidak perlu
        // mengukur ulang tiap item (menghilangkan jank saat scroll).
        binding.rvProducts.setHasFixedSize(true)
        listAdapter = ProductListAdapter { openDetail(it) }.also { adapter ->
            binding.rvProducts.adapter = adapter
            adapter.submit(ProductRepository.all())
        }
    }

    override fun onResume() {
        super.onResume()
        // Harga bisa saja berubah dari halaman Ubah Harga / Barang Masuk
        listAdapter?.submit(ProductRepository.all())

        // Sinkronkan katalog dari backend (thread latar, terapkan di UI thread).
        // Dibatasi: cukup sekali per tampil halaman, dan tidak menumpuk kalau
        // pengguna bolak-balik tab dengan cepat.
        if (syncJob != null) return
        syncJob = Thread {
            val rows = com.tokoberkah.pos.data.api.RemoteCatalog.fetchProducts() ?: run {
                syncJob = null
                return@Thread
            }
            activity?.runOnUiThread {
                syncJob = null
                if (_binding == null) return@runOnUiThread
                ProductRepository.applyRemote(rows)
                listAdapter?.submit(ProductRepository.all())
            }
        }.also { it.start() }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_SCAN && resultCode == android.app.Activity.RESULT_OK) {
            val ean = data?.getStringExtra(EXTRA_SCANNED_EAN)
            val product = ean?.let {
                ProductRepository.byEan(it)
                    ?: if (it.length == 12) ProductRepository.byEan("0$it") else null
            }
            if (product != null) {
                openDetail(product)
            } else {
                Toast.makeText(
                    requireContext(),
                    "Produk tidak ditemukan! Barcode: $ean",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
    }

    private fun openDetail(product: Product) {
        ProductRepository.markViewed(product.ean)
        openPage(CekHargaDetailFragment.newInstance(product.ean))
    }

    override fun onDestroyView() {
        super.onDestroyView()
        // Lepas referensi sync: fragment bisa dipakai ulang (view baru) dan
        // syncJob lama tidak boleh memblokir sinkronisasi berikutnya.
        syncJob = null
        binding.rvProducts.adapter = null
        listAdapter = null
        _binding = null
    }
}
