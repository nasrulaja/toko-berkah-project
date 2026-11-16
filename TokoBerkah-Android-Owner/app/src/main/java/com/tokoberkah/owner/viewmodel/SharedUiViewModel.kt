package com.tokoberkah.owner.viewmodel

import androidx.lifecycle.ViewModel
import com.tokoberkah.owner.domain.Produk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Jenis notifikasi mengambang (Floating Warning). */
enum class WarningLevel { ERROR, WARNING, SUCCESS }

data class FloatingWarning(
    val id: Long = System.nanoTime(),
    val message: String,
    val level: WarningLevel
)

/** Satu baris di kartu "Recent Scan" (produk + jumlah). */
data class ScanLine(
    val produk: Produk,
    val jumlah: Int
)

/**
 * State yang dibagi antar layar (activity-scoped):
 *  - notifikasi mengambang
 *  - kartu hasil scan terakhir
 *  - kunci pemrosesan barcode agar tidak dobel
 */
class SharedUiViewModel : ViewModel() {

    private val _warnings = MutableStateFlow<List<FloatingWarning>>(emptyList())
    val warnings: StateFlow<List<FloatingWarning>> = _warnings.asStateFlow()

    private val _recentScans = MutableStateFlow<List<ScanLine>>(emptyList())
    val recentScans: StateFlow<List<ScanLine>> = _recentScans.asStateFlow()

    /** Mencegah barcode yang sama diproses dua kali beruntun. */
    private val _scanningLocked = MutableStateFlow(false)
    val scanningLocked: StateFlow<Boolean> = _scanningLocked.asStateFlow()

    fun showWarning(message: String, level: WarningLevel) {
        val item = FloatingWarning(message = message, level = level)
        _warnings.value = (_warnings.value + item).takeLast(3)
    }

    fun dismiss(id: Long) {
        _warnings.value = _warnings.value.filterNot { it.id == id }
    }

    fun clearWarnings() {
        _warnings.value = emptyList()
    }

    /** Tambah produk hasil scan ke kartu recent scan (gabung bila sudah ada). */
    fun addScan(produk: Produk, jumlah: Int = 1) {
        val current = _recentScans.value
        val idx = current.indexOfFirst { it.produk.id == produk.id }
        _recentScans.value = if (idx >= 0) {
            current.toMutableList().also {
                it[idx] = it[idx].copy(jumlah = it[idx].jumlah + jumlah, produk = produk)
            }
        } else {
            current + ScanLine(produk, jumlah)
        }
    }

    /** Ubah jumlah; bila 0 hapus baris. */
    fun changeQty(produkId: Int, delta: Int) {
        _recentScans.value = _recentScans.value.mapNotNull { line ->
            if (line.produk.id != produkId) line
            else {
                val n = line.jumlah + delta
                if (n <= 0) null else line.copy(jumlah = n)
            }
        }
    }

    fun clearScans() {
        _recentScans.value = emptyList()
    }

    fun lockScan() {
        _scanningLocked.value = true
    }

    fun unlockScan() {
        _scanningLocked.value = false
    }
}
