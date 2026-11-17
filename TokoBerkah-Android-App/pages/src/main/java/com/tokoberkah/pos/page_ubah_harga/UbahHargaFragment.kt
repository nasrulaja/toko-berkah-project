package com.tokoberkah.pos.page_ubah_harga

import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.tokoberkah.pos.R
import com.tokoberkah.pos.core.goBack
import com.tokoberkah.pos.core.setBreadcrumb
import com.tokoberkah.pos.data.Product
import com.tokoberkah.pos.data.ProductRepository
import com.tokoberkah.pos.data.grouped
import com.tokoberkah.pos.data.rp
import com.tokoberkah.pos.data.show
import com.tokoberkah.pos.databinding.FragmentUbahHargaBinding
import java.util.Locale
import kotlin.math.abs

/**
 * PAGE 4 — Ubah Harga: enter a new selling price + reason, then save.
 * Saving writes through the shared repository so every other page updates.
 */
class UbahHargaFragment : Fragment(R.layout.fragment_ubah_harga) {

    companion object {
        private const val ARG_EAN = "arg_ean"

        fun newInstance(ean: String) = UbahHargaFragment().apply {
            arguments = Bundle().apply { putString(ARG_EAN, ean) }
        }
    }

    private var _binding: FragmentUbahHargaBinding? = null
    private val binding get() = _binding!!

    private var product: Product? = null
    private var suppressFormat = false

    private val ean: String
        get() = requireArguments().getString(ARG_EAN).orEmpty()

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        _binding = FragmentUbahHargaBinding.bind(view)
        setBreadcrumb("Ubah Harga")

        binding.btnBack.setOnClickListener { goBack() }
        binding.btnBatal.setOnClickListener { goBack() }
        binding.btnSimpan.setOnClickListener { save() }

        binding.etPrice.addTextChangedListener(priceFormatter)
        binding.etPrice.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) = updateHints()
        })

        bindProduct()
    }

    private fun bindProduct() {
        val p = ProductRepository.byEan(ean)
        if (p == null) {
            goBack()
            return
        }
        product = p
        binding.productCard.show(p)

        if (binding.etPrice.text.isNullOrBlank()) {
            binding.etPrice.setText((p.price + 1_000).grouped())
        }
        if (binding.etReason.text.isNullOrBlank()) {
            binding.etReason.setText("Penyesuaian harga dari pemasok.")
        }
        updateHints()
    }

    /** Keeps the price field formatted with thousands separators while typing. */
    private val priceFormatter = object : TextWatcher {
        override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
        override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
        override fun afterTextChanged(s: Editable?) {
            if (suppressFormat) return
            suppressFormat = true
            val digits = s?.toString()?.filter { it.isDigit() }.orEmpty()
            val formatted = if (digits.isEmpty()) "" else digits.toLongOrNull()?.grouped() ?: digits
            val field = binding.etPrice
            if (field.text.toString() != formatted) {
                field.setText(formatted)
                field.setSelection(formatted.length)
            }
            suppressFormat = false
        }
    }

    private fun parsePrice(): Int? =
        binding.etPrice.text?.toString()?.filter { it.isDigit() }?.toIntOrNull()

    private fun updateHints() {
        val current = product?.price ?: return
        val newPrice = parsePrice()

        if (newPrice == null || newPrice <= 0) {
            binding.tvPriceHint.text = "Masukkan harga jual yang valid."
            binding.tvEffective.text =
                "Harga kasir akan diperbarui setelah harga baru valid. Pastikan harga sudah sesuai."
            return
        }

        val delta = newPrice - current
        binding.tvPriceHint.text = when {
            delta > 0 -> {
                val percent = abs(delta) * 100.0 / current
                "Naik ${delta.rp()} (+${percent.percent()}%) dari harga saat ini"
            }

            delta < 0 -> {
                val percent = abs(delta) * 100.0 / current
                "Turun ${abs(delta).rp()} (-${percent.percent()}%) dari harga saat ini"
            }

            else -> "Tidak ada perubahan harga dari saat ini."
        }

        binding.tvEffective.text =
            "Harga kasir akan diperbarui menjadi ${newPrice.rp()} per buah. Pastikan harga sudah sesuai."
    }

    private fun Double.percent(): String =
        String.format(Locale("id", "ID"), "%.1f", this).replace('.', ',')

    private fun save() {
        val p = product ?: return
        val newPrice = parsePrice()

        if (newPrice == null || newPrice <= 0) {
            Toast.makeText(requireContext(), "Masukkan harga jual yang valid.", Toast.LENGTH_SHORT).show()
            return
        }
        if (newPrice == p.price) {
            Toast.makeText(requireContext(), "Harga tidak berubah.", Toast.LENGTH_SHORT).show()
            return
        }

        val reason = binding.etReason.text?.toString()?.trim().orEmpty()
        if (reason.isEmpty()) {
            binding.etReason.error = "Alasan perubahan wajib diisi."
            return
        }

        ProductRepository.updatePrice(p, newPrice, reason)
        Toast.makeText(
            requireContext(),
            "Harga berhasil diperbarui menjadi ${newPrice.rp()}.",
            Toast.LENGTH_SHORT
        ).show()
        goBack() // detail page re-binds itself in onResume
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
