package com.tokoberkah.pos.page_terakhir_dilihat

import android.os.Bundle
import android.view.View
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.tokoberkah.pos.R
import com.tokoberkah.pos.core.goBack
import com.tokoberkah.pos.core.replaceTop
import com.tokoberkah.pos.core.setBreadcrumb
import com.tokoberkah.pos.data.ProductRepository
import com.tokoberkah.pos.databinding.FragmentTerakhirDilihatBinding
import com.tokoberkah.pos.page_cekharga_detail.CekHargaDetailFragment

/**
 * PAGE 5 — Terakhir Dilihat: full list of recently viewed products.
 */
class TerakhirDilihatFragment : Fragment(R.layout.fragment_terakhir_dilihat) {

    private var _binding: FragmentTerakhirDilihatBinding? = null
    private val binding get() = _binding!!

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        _binding = FragmentTerakhirDilihatBinding.bind(view)
        setBreadcrumb(getString(R.string.nav_cek_harga))

        binding.btnBack.setOnClickListener { goBack() }
        binding.rvRecent.layoutManager = LinearLayoutManager(requireContext())
    }

    override fun onResume() {
        super.onResume()
        binding.rvRecent.adapter = RecentRowAdapter(ProductRepository.recentProducts()) { product ->
            ProductRepository.markViewed(product.ean)
            replaceTop(CekHargaDetailFragment.newInstance(product.ean))
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
