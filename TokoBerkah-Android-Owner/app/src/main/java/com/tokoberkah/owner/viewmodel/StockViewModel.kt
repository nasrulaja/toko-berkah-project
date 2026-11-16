package com.tokoberkah.owner.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tokoberkah.owner.ServiceLocator
import com.tokoberkah.owner.data.repository.Result
import com.tokoberkah.owner.domain.Produk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** State form Barang Masuk. */
data class BarangMasukUi(
    val produk: Produk? = null,
    val jumlah: Int = 1,
    val hargaBeli: String = "",
    val saving: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
) {
    val hargaBeliValue: Double? get() = hargaBeli.filter { it.isDigit() }.toDoubleOrNull()
    val totalNilai: Double get() = (hargaBeliValue ?: 0.0) * jumlah
    val stokSetelah: Int get() = (produk?.stok ?: 0) + jumlah
    val valid: Boolean get() = produk != null && jumlah > 0
}

/** State daftar Cek Stok. */
data class StockListUi(
    val produk: List<Produk> = emptyList(),
    val refreshing: Boolean = false,
    val error: String? = null
) {
    val perluRestok: List<Produk> get() = produk.filter { it.perluRestok }
}

/** Mengelola pencatatan barang masuk dan daftar cek stok. */
class StockViewModel : ViewModel() {

    private val stock = ServiceLocator.stock
    private val products = ServiceLocator.products
    private val sessions = ServiceLocator.sessions

    private val _form = MutableStateFlow(BarangMasukUi())
    val form: StateFlow<BarangMasukUi> = _form.asStateFlow()

    private val _list = MutableStateFlow(StockListUi())
    val list: StateFlow<StockListUi> = _list.asStateFlow()

    init {
        viewModelScope.launch {
            products.observeProduk().collect { list ->
                _list.value = _list.value.copy(produk = list)
            }
        }
    }

    fun refreshList() {
        if (_list.value.refreshing) return
        viewModelScope.launch {
            _list.value = _list.value.copy(refreshing = true, error = null)
            when (val res = products.refresh()) {
                is Result.Success -> _list.value = _list.value.copy(refreshing = false)
                is Result.Error -> _list.value = _list.value.copy(refreshing = false, error = res.message)
            }
            // Kirim antrean offline bila koneksi kembali.
            runCatching { stock.kirimAntrean() }
        }
    }

    /** Pilih produk (setelah scan) untuk dientri barang masuk. */
    fun startFor(produk: Produk?) {
        _form.value = BarangMasukUi(produk = produk, jumlah = if (produk != null) 1 else 1)
    }

    fun setJumlah(n: Int) {
        _form.value = _form.value.copy(jumlah = n.coerceIn(1, 99999), error = null)
    }

    fun addJumlah(delta: Int) {
        setJumlah(_form.value.jumlah + delta)
    }

    fun setHargaBeli(v: String) {
        val clean = v.filter { it.isDigit() }.take(12)
        _form.value = _form.value.copy(hargaBeli = clean, error = null)
    }

    fun clearError() {
        _form.value = _form.value.copy(error = null)
    }

    fun clearSuccess() {
        _form.value = _form.value.copy(successMessage = null)
    }

    /** Simpan transaksi barang masuk. */
    fun simpan(onResult: (Boolean, String) -> Unit) {
        val ui = _form.value
        val produk = ui.produk ?: return
        if (ui.saving) return
        if (ui.jumlah <= 0) {
            _form.value = ui.copy(error = "Jumlah barang masuk harus lebih dari 0.")
            return
        }
        viewModelScope.launch {
            _form.value = ui.copy(saving = true, error = null)
            val userId = sessions.current()?.userId
            val res = stock.simpanBarangMasuk(
                produkId = produk.id,
                jumlah = ui.jumlah,
                hargaBeliPerUnit = ui.hargaBeliValue,
                userId = userId
            )
            when (res) {
                is Result.Success -> {
                    _form.value = _form.value.copy(
                        saving = false,
                        successMessage = "${ui.jumlah} ${produk.nama} berhasil dicatat. Stok kini ${res.data}."
                    )
                    products.byId(produk.id)
                    products.updateCacheStok(produk.id, res.data)
                    onResult(true, "Barang masuk berhasil disimpan.")
                }
                is Result.Error -> {
                    _form.value = _form.value.copy(saving = false, error = res.message)
                    onResult(false, res.message)
                }
            }
        }
    }
}
