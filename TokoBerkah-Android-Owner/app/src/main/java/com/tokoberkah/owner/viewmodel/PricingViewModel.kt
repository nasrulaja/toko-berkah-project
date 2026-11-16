package com.tokoberkah.owner.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tokoberkah.owner.ServiceLocator
import com.tokoberkah.owner.data.repository.PriceChange
import com.tokoberkah.owner.data.repository.Result
import com.tokoberkah.owner.domain.Produk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** State halaman Riwayat Harga. */
data class HistoryUi(
    val loading: Boolean = true,
    val produk: Produk? = null,
    val changes: List<PriceChange> = emptyList(),
    val error: String? = null
)

/** State halaman Ubah Harga. */
data class ChangePriceUi(
    val produk: Produk? = null,
    val inputHarga: String = "",
    val alasan: String = "",
    val saving: Boolean = false,
    val error: String? = null,
    val success: Boolean = false
) {
    val hargaBaru: Double? get() = inputHarga.filter { it.isDigit() }.toDoubleOrNull()

    /** Selisih terhadap harga saat ini; null bila input belum valid. */
    val selisih: Double?
        get() {
            val now = produk?.hargaJual ?: return null
            val baru = hargaBaru ?: return null
            return baru - now
        }

    val selisihPersen: Double?
        get() {
            val now = produk?.hargaJual ?: return null
            val s = selisih ?: return null
            return if (now == 0.0) null else (s / now) * 100.0
        }

    val valid: Boolean
        get() {
            val baru = hargaBaru ?: return false
            return baru > 0 && produk != null
        }
}

/** Menangani riwayat harga dan proses ubah harga. */
class PricingViewModel : ViewModel() {

    private val pricing = ServiceLocator.pricing
    private val products = ServiceLocator.products
    private val sessions = ServiceLocator.sessions

    private val _history = MutableStateFlow(HistoryUi())
    val history: StateFlow<HistoryUi> = _history.asStateFlow()

    private val _change = MutableStateFlow(ChangePriceUi())
    val change: StateFlow<ChangePriceUi> = _change.asStateFlow()

    private var historyJob: kotlinx.coroutines.Job? = null

    /** Muat riwayat harga untuk produk tertentu. */
    fun loadHistory(produk: Produk) {
        _history.value = HistoryUi(loading = true, produk = produk)
        historyJob?.cancel()
        historyJob = viewModelScope.launch {
            pricing.observeRiwayat(produk.id).collect { list ->
                _history.value = _history.value.copy(loading = false, changes = list, error = null)
            }
        }
    }

    /** Muat ulang detail produk dari backend (setelah perubahan). */
    fun refreshProduk(produkId: Int) {
        viewModelScope.launch {
            when (val res = products.byId(produkId)) {
                is Result.Success -> res.data?.let { p ->
                    _history.value = _history.value.copy(produk = p)
                    _change.value = _change.value.copy(produk = p)
                    products.updateCacheHarga(p.id, p.hargaJual)
                }
                is Result.Error -> _history.value = _history.value.copy(error = res.message)
            }
        }
    }

    fun startChange(produk: Produk) {
        _change.value = ChangePriceUi(
            produk = produk,
            inputHarga = produk.hargaJual.toLong().toString()
        )
    }

    fun setInputHarga(v: String) {
        // hanya angka
        val clean = v.filter { it.isDigit() }.take(12)
        _change.value = _change.value.copy(inputHarga = clean, error = null)
    }

    fun setAlasan(v: String) {
        _change.value = _change.value.copy(alasan = v.take(200))
    }

    fun clearError() {
        _change.value = _change.value.copy(error = null)
    }

    /** Simpan harga baru ke backend + catat riwayat. */
    fun save(onDone: () -> Unit) {
        val ui = _change.value
        val produk = ui.produk ?: return
        if (ui.saving) return
        val baru = ui.hargaBaru
        if (baru == null || baru <= 0) {
            _change.value = ui.copy(error = "Masukkan harga yang valid (lebih dari 0).")
            return
        }
        if (ui.alasan.isBlank()) {
            _change.value = ui.copy(error = "Alasan perubahan wajib diisi.")
            return
        }
        viewModelScope.launch {
            _change.value = ui.copy(saving = true, error = null)
            val nama = sessions.current()?.nama ?: "Pemilik Toko"
            val res = pricing.ubahHarga(produk.id, produk.hargaJual, baru, ui.alasan.trim(), nama)
            when (res) {
                is Result.Success -> {
                    _change.value = _change.value.copy(saving = false, success = true)
                    products.updateCacheHarga(produk.id, baru)
                    refreshProduk(produk.id)
                    onDone()
                }
                is Result.Error -> _change.value = _change.value.copy(saving = false, error = res.message)
            }
        }
    }
}
