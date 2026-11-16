package com.tokoberkah.owner.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tokoberkah.owner.ServiceLocator
import com.tokoberkah.owner.data.repository.Result
import com.tokoberkah.owner.domain.Produk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/** Ringkasan data untuk daftar produk & pencarian. */
data class ProductListUi(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val produk: List<Produk> = emptyList(),
    val query: String = "",
    val error: String? = null,
    val offline: Boolean = false
) {
    val filtered: List<Produk> get() = if (query.isBlank()) produk else produk.filter {
        it.nama.contains(query, true) || it.barcode.contains(query)
    }
}

/**
 * Menangani daftar produk, pencarian manual, dan pemindaian barcode.
 * Dipakai bersama oleh menu Cek Harga, Cek Stok, dan Barang Masuk.
 */
class ProductsViewModel : ViewModel() {

    private val repo = ServiceLocator.products

    private val _ui = MutableStateFlow(ProductListUi())
    val ui: StateFlow<ProductListUi> = _ui.asStateFlow()

    /** Hasil scan terakhir (null = tidak ada). */
    private val _scanResult = MutableStateFlow<ScanOutcome?>(null)
    val scanResult: StateFlow<ScanOutcome?> = _scanResult.asStateFlow()

    /** Produk yang dipilih untuk detail. */
    private val _selected = MutableStateFlow<Produk?>(null)
    val selected: StateFlow<Produk?> = _selected.asStateFlow()

    init {
        // Tampilkan cache lokal segera, lalu sinkron ke backend.
        viewModelScope.launch {
            repo.observeProduk().collect { list ->
                _ui.value = _ui.value.copy(produk = list)
            }
        }
        refresh()
    }

    fun refresh() {
        if (_ui.value.refreshing) return
        viewModelScope.launch {
            _ui.value = _ui.value.copy(refreshing = true, loading = _ui.value.produk.isEmpty(), error = null)
            when (val res = repo.refresh()) {
                is Result.Success -> _ui.value = _ui.value.copy(
                    refreshing = false, loading = false, error = null, offline = false
                )
                is Result.Error -> _ui.value = _ui.value.copy(
                    refreshing = false,
                    loading = false,
                    error = res.message,
                    offline = res.isNetwork
                )
            }
        }
    }

    fun setQuery(q: String) {
        _ui.value = _ui.value.copy(query = q)
    }

    fun clearScanResult() {
        _scanResult.value = null
    }

    fun select(produk: Produk?) {
        _selected.value = produk
    }

    /** Cari produk berdasarkan barcode (dari kamera atau input manual). */
    fun lookupBarcode(barcode: String) {
        if (_ui.value.loading && _ui.value.produk.isEmpty()) return
        viewModelScope.launch {
            _scanResult.value = ScanOutcome.Looking(barcode)
            when (val res = repo.byBarcode(barcode)) {
                is Result.Success -> {
                    val p = res.data
                    _scanResult.value = if (p == null) ScanOutcome.NotFound(barcode)
                    else {
                        _selected.value = p
                        ScanOutcome.Found(p)
                    }
                }
                is Result.Error -> _scanResult.value = ScanOutcome.Failed(barcode, res.message)
            }
        }
    }
}

/** Hasil pencarian barcode yang ditampilkan sebagai kartu. */
sealed interface ScanOutcome {
    val barcode: String

    data class Looking(override val barcode: String) : ScanOutcome
    data class Found(val produk: Produk) : ScanOutcome {
        override val barcode: String get() = produk.barcode
    }
    data class NotFound(override val barcode: String) : ScanOutcome
    data class Failed(override val barcode: String, val error: String) : ScanOutcome
}
