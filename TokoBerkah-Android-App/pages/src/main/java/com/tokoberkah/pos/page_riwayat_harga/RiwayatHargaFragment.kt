package com.tokoberkah.pos.page_riwayat_harga

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.tokoberkah.pos.R
import com.tokoberkah.pos.core.goBack
import com.tokoberkah.pos.core.openPage
import com.tokoberkah.pos.core.setBreadcrumb
import com.tokoberkah.pos.data.ProductRepository
import com.tokoberkah.pos.data.show
import com.tokoberkah.pos.databinding.FragmentRiwayatHargaBinding
import com.tokoberkah.pos.page_ubah_harga.UbahHargaFragment

/**
 * PAGE 3 — Riwayat Harga: every recorded price change of one product.
 */
class RiwayatHargaFragment : Fragment(R.layout.fragment_riwayat_harga) {

    companion object {
        private const val ARG_EAN = "arg_ean"

        fun newInstance(ean: String) = RiwayatHargaFragment().apply {
            arguments = Bundle().apply { putString(ARG_EAN, ean) }
        }
    }

    private var _binding: FragmentRiwayatHargaBinding? = null
    private val binding get() = _binding!!

    private val ean: String
        get() = requireArguments().getString(ARG_EAN).orEmpty()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        _binding = FragmentRiwayatHargaBinding.bind(view)
        setBreadcrumb("Riwayat Harga")

        binding.btnBack.setOnClickListener { goBack() }
        binding.btnUbahHarga.setOnClickListener {
            openPage(UbahHargaFragment.newInstance(ean))
        }
        binding.rvHistory.layoutManager = LinearLayoutManager(requireContext())
    }

    /** Refreshes the list whenever the page is shown again (e.g. after a price edit). */
    override fun onResume() {
        super.onResume()
        val product = ProductRepository.byEan(ean) ?: run { goBack(); return }
        binding.productCard.show(product)
        binding.tvChangeCount.text = "${product.history.size} perubahan"
        binding.rvHistory.adapter = HistoryAdapter(product.history)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
