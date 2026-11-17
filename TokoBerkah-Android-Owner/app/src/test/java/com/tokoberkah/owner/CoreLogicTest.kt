package com.tokoberkah.owner

import com.tokoberkah.owner.data.repository.ProductRepository
import com.tokoberkah.owner.data.repository.Result
import com.tokoberkah.owner.data.repository.safeCall
import com.tokoberkah.owner.domain.Produk
import com.tokoberkah.owner.domain.StockStatus
import com.tokoberkah.owner.domain.formatRupiah
import com.tokoberkah.owner.domain.toDomain
import com.tokoberkah.owner.data.models.ProdukDto
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Pengujian unit logika inti yang dipakai aplikasi:
 * status stok, pembagian rak/gudang, format rupiah, normalisasi barcode,
 * dan penanganan galat jaringan.
 */
class CoreLogicTest {

    private fun produk(stok: Int, minimum: Int = 10) = ProdukDto(
        id = 7, nama = "Indomie Goreng", barcode = "8998866200301",
        hargaJual = 34000.0, stok = stok, kategoriId = 1, stokMinimum = minimum
    )

    @Test
    fun `status stok mengikuti aturan toko`() {
        assertEquals(StockStatus.HABIS, StockStatus.from(0, 10))
        assertEquals(StockStatus.MENIPIS, StockStatus.from(10, 10))
        assertEquals(StockStatus.MENIPIS, StockStatus.from(4, 5))
        assertEquals(StockStatus.TERSEDIA, StockStatus.from(48, 10))
    }

    @Test
    fun `stok rak depan dan gudang selalu sama dengan total`() {
        listOf(0, 1, 5, 6, 21, 48, 100).forEach { total ->
            val p = produk(total).toDomain("Makanan", null)
            assertEquals(total, p.stok)
            assertEquals(total, p.stokRakDepan + p.stokGudang)
            assertTrue(p.stokRakDepan >= 0)
            assertTrue(p.stokGudang >= 0)
        }
    }

    @Test
    fun `stok nol tidak punya isi rak`() {
        val p = produk(0).toDomain("Makanan", null)
        assertEquals(0, p.stokRakDepan)
        assertEquals(0, p.stokGudang)
        assertTrue(p.perluRestok)
    }

    @Test
    fun `format rupiah memakai pemisah ribuan Indonesia`() {
        assertEquals("Rp 34.000", formatRupiah(34000.0))
        assertEquals("Rp 1.125.000", formatRupiah(1125000.0))
        assertEquals("Rp 0", formatRupiah(0.0))
    }

    @Test
    fun `barcode dinormalisasi dan UPC-A dipetakan ke EAN-13`() {
        assertEquals("8998866200301", ProductRepository.normalizeBarcode(" 8998-8662 00301 "))
        assertEquals("012345678905", ProductRepository.normalizeBarcode("012345678905"))
        assertEquals("0012345678905", ProductRepository.alternateBarcode("012345678905"))
        assertNull(ProductRepository.alternateBarcode("8998866200301"))
        assertNull(ProductRepository.alternateBarcode("123"))
    }

    @Test
    fun `safeCall menangkap galat tanpa crash`() = runBlocking {
        val ok = safeCall { 42 }
        assertTrue(ok is Result.Success)
        assertEquals(42, (ok as Result.Success).data)

        val fail = safeCall<Int> { throw java.net.UnknownHostException() }
        assertTrue(fail is Result.Error)
        assertTrue((fail as Result.Error).isNetwork)
        assertFalse(fail.message.isBlank())
    }

    @Test
    fun `estimasi stok barang masuk dihitung benar`() {
        val p = produk(21).toDomain("Makanan", null)
        val ui = com.tokoberkah.owner.viewmodel.BarangMasukUi(produk = p, jumlah = 3, hargaBeli = "11250")
        assertEquals(11250.0, ui.hargaBeliValue!!, 0.001)
        assertEquals(33750.0, ui.totalNilai, 0.001)
        assertEquals(24, ui.stokSetelah)
        assertTrue(ui.valid)
    }

    @Test
    fun `jumlah barang masuk nol atau negatif ditolak`() {
        val p = produk(5).toDomain("Makanan", null)
        assertFalse(com.tokoberkah.owner.viewmodel.BarangMasukUi(produk = p, jumlah = 0).valid)
        assertFalse(com.tokoberkah.owner.viewmodel.BarangMasukUi(produk = p, jumlah = -3).valid)
        assertFalse(com.tokoberkah.owner.viewmodel.BarangMasukUi(produk = null, jumlah = 5).valid)
    }

    @Test
    fun `selisih harga naik dan turun terhitung otomatis`() {
        val p = produk(10).toDomain("Makanan", null)
        val naik = com.tokoberkah.owner.viewmodel.ChangePriceUi(produk = p, inputHarga = "35000")
        assertEquals(1000.0, naik.selisih!!, 0.001)
        assertTrue(naik.selisihPersen!! > 0)
        assertTrue(naik.valid)

        val turun = com.tokoberkah.owner.viewmodel.ChangePriceUi(produk = p, inputHarga = "30000")
        assertEquals(-4000.0, turun.selisih!!, 0.001)
        assertTrue(turun.selisihPersen!! < 0)

        val nol = com.tokoberkah.owner.viewmodel.ChangePriceUi(produk = p, inputHarga = "0")
        assertFalse(nol.valid)
        assertFalse(com.tokoberkah.owner.viewmodel.ChangePriceUi(produk = p, inputHarga = "").valid)
    }

    @Test
    fun `validasi format email pemilik`() {
        assertTrue(com.tokoberkah.owner.data.repository.AuthRepository.isValidEmail("pemilik@tokoberkah.local"))
        assertFalse(com.tokoberkah.owner.data.repository.AuthRepository.isValidEmail("pemilik"))
        assertFalse(com.tokoberkah.owner.data.repository.AuthRepository.isValidEmail("a@b"))
    }

    @Test
    fun `akun demo terisi otomatis dan lolos validasi form`() {
        val auth = com.tokoberkah.owner.data.repository.AuthRepository
        // Email & sandi demo harus lolos validasi yang sama dengan isian manual,
        // supaya tombol Masuk tidak menolak sebelum sempat menghubungi server.
        assertTrue(auth.isValidEmail(auth.TOKO_DEMO_EMAIL))
        assertTrue(auth.TOKO_DEFAULT_PASSWORD.length >= 6)
        assertEquals("kasir@gmail.com", auth.TOKO_DEMO_EMAIL)
        assertEquals("kasir123", auth.TOKO_DEFAULT_PASSWORD)
    }
}
