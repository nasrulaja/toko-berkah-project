package com.tokoberkah.pos.page_cekharga_detail

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.tokoberkah.pos.R
import com.tokoberkah.pos.core.goBack
import com.tokoberkah.pos.core.openPage
import com.tokoberkah.pos.core.replaceTop
import com.tokoberkah.pos.core.setBreadcrumb
import com.tokoberkah.pos.data.ProductRepository
import com.tokoberkah.pos.data.show
import com.tokoberkah.pos.databinding.FragmentCekhargaDetailBinding
import com.tokoberkah.pos.page_riwayat_harga.RiwayatHargaFragment
import com.tokoberkah.pos.page_terakhir_dilihat.TerakhirDilihatFragment
import com.tokoberkah.pos.page_ubah_harga.UbahHargaFragment

/**
 * PAGE 2 — Cek Harga detail: current price, actions and "Terakhir Dilihat".
 */
class CekHargaDetailFragment : Fragment(R.layout.fragment_cekharga_detail) {

    companion object {
        private const val ARG_EAN = "arg_ean"

        fun newInstance(ean: String) = CekHargaDetailFragment().apply {
            arguments = Bundle().apply { putString(ARG_EAN, ean) }
        }
    }

    private var _binding: FragmentCekhargaDetailBinding? = null
    private val binding get() = _binding!!

    private val ean: String
        get() = requireArguments().getString(ARG_EAN).orEmpty()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        _binding = FragmentCekhargaDetailBinding.bind(view)
        setBreadcrumb(getString(R.string.nav_cek_harga))

        binding.btnBack.setOnClickListener { goBack() }

        binding.btnRiwayat.setOnClickListener {
            openPage(RiwayatHargaFragment.newInstance(ean))
        }
        binding.btnUbah.setOnClickListener {
            openPage(UbahHargaFragment.newInstance(ean))
        }
        binding.btnLihatSemua.setOnClickListener {
            openPage(TerakhirDilihatFragment())
        }

        binding.rvRecent.layoutManager =
            LinearLayoutManager(requireContext(), RecyclerView.HORIZONTAL, false)
    }

    /** Re-binds on every return so a saved price change shows up immediately. */
    override fun onResume() {
        super.onResume()
        val product = ProductRepository.byEan(ean) ?: run { goBack(); return }
        binding.productCard.show(product)

        val others = ProductRepository.recentProducts().filter { it.ean != product.ean }
        binding.rvRecent.adapter = RecentSmallAdapter(others) { other ->
            ProductRepository.markViewed(other.ean)
            replaceTop(newInstance(other.ean))
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
