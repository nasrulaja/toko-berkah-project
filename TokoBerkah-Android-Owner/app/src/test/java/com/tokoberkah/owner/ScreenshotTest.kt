package com.tokoberkah.owner

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import com.tokoberkah.owner.data.repository.PriceChange
import com.tokoberkah.owner.domain.Produk
import com.tokoberkah.owner.ui.screens.BarangMasukContent
import com.tokoberkah.owner.ui.screens.CekHargaContent
import com.tokoberkah.owner.ui.screens.CekStokContent
import com.tokoberkah.owner.ui.screens.LoginContent
import com.tokoberkah.owner.ui.screens.ProdukDetailScreen
import com.tokoberkah.owner.ui.screens.RiwayatHargaContent
import com.tokoberkah.owner.ui.screens.UbahHargaContent
import com.tokoberkah.owner.ui.theme.TokoBerkahTheme
import com.tokoberkah.owner.viewmodel.BarangMasukUi
import com.tokoberkah.owner.viewmodel.ChangePriceUi
import com.tokoberkah.owner.viewmodel.HistoryUi
import com.tokoberkah.owner.viewmodel.ProductListUi
import com.tokoberkah.owner.viewmodel.ScanLine
import com.tokoberkah.owner.viewmodel.StockListUi
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File
import java.io.FileOutputStream

/**
 * Menghasilkan tangkapan layar dokumentasi dari **Composable asli aplikasi**
 * (bukan mockup), lalu menyimpannya sebagai PNG di `docs/screenshots/`.
 *
 * Dijalankan di JVM lewat Robolectric sehingga tidak memerlukan emulator:
 *
 *     ./gradlew testDebugUnitTest --tests "*ScreenshotTest*"
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [33], qualifiers = "w412dp-h892dp-xxhdpi")
class ScreenshotTest {

    @get:Rule
    val compose = androidx.compose.ui.test.junit4.createAndroidComposeRule<
        androidx.activity.ComponentActivity>()

    private val outDir: File by lazy {
        // Working directory test = folder modul `app/`, jadi naik dua tingkat
        // untuk mencapai `docs/screenshots` di root repositori.
        File("../../docs/screenshots").canonicalFile.apply { mkdirs() }
    }

    private fun capture(name: String, content: @androidx.compose.runtime.Composable () -> Unit) {
        // Animasi tak berujung (mis. progress indicator) membuat waitForIdle
        // menunggu selamanya, jadi clock dikendalikan manual.
        compose.mainClock.autoAdvance = false
        compose.setContent {
            TokoBerkahTheme {
                Box(Modifier.fillMaxSize()) { content() }
            }
        }
        compose.mainClock.advanceTimeBy(1_000)

        // Bitmap diambil langsung dari window Activity (Robolectric) supaya tidak
        // memicu ComposeTestRule.waitForIdle() yang bisa menunggu animasi tanpa henti.
        val bitmap = captureWindow()
        val file = File(outDir, "$name.png")
        FileOutputStream(file).use { out ->
            bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out)
        }
        check(file.length() > 0) { "Gagal membuat $name" }
    }

    /**
     * Menggambar isi window Activity ke Bitmap. Di Robolectric, `decorView.draw()`
     * langsung menghasilkan piksel tanpa memerlukan emulator atau animasi selesai.
     */
    private fun captureWindow(): android.graphics.Bitmap {
        val decor = compose.activity.window.decorView
        val w = if (decor.width > 0) decor.width else 1080
        val h = if (decor.height > 0) decor.height else 2340
        val bmp = android.graphics.Bitmap.createBitmap(
            w, h, android.graphics.Bitmap.Config.ARGB_8888
        )
        decor.draw(android.graphics.Canvas(bmp))
        return bmp
    }

    private fun produk(
        id: Int,
        nama: String,
        barcode: String,
        harga: Double,
        stok: Int,
        min: Int,
        kategori: String,
        rak: String,
        terakhir: String?
    ): Produk {
        val depan = if (stok == 0) 0 else (stok * 0.4).toInt().coerceAtLeast(1).coerceAtMost(stok)
        return Produk(
            id = id,
            nama = nama,
            barcode = barcode,
            hargaJual = harga,
            stok = stok,
            stokMinimum = min,
            kategoriId = id,
            kategoriNama = kategori,
            rak = rak,
            updatedAt = null,
            terakhirMasuk = terakhir,
            stokRakDepan = depan,
            stokGudang = stok - depan
        )
    }

    private val contohProduk = listOf(
        produk(1, "Indomie Goreng Renceng", "8992388101010", 13_500.0, 48, 10, "Makanan Instan", "Rak A1-2", "12 Nov 2026"),
        produk(2, "Beras Pandan Wangi 5kg", "8991002101234", 68_000.0, 4, 5, "Bahan Pokok", "Rak A1-5", "10 Nov 2026"),
        produk(3, "Aqua Botol 600ml", "8993675000109", 4_000.0, 0, 12, "Minuman", "Rak B2-3", null)
    )

    @Test
    fun login() {
        capture("01-login") {
            LoginContent(
                loading = false,
                error = null,
                lastEmail = "",
                initialEmail = "pemilik@tokoberkah.com",
                initialPassword = "rahasia123",
                onLogin = { _, _ -> },
                onClearError = {}
            )
        }
    }

    @Test
    fun cekHarga() {
        capture("02-cek-harga") {
            CekHargaContent(
                ui = ProductListUi(produk = contohProduk),
                scans = listOf(ScanLine(contohProduk[0], 2), ScanLine(contohProduk[2], 1)),
                onScan = {}, onManual = {}, onClearScans = {},
                onChangeQty = { _, _ -> }, onProductClick = {}
            )
        }
    }

    @Test
    fun detailProduk() {
        capture("03-detail-produk") {
            ProdukDetailScreen(
                produk = contohProduk[0],
                onBack = {}, onRiwayat = {}, onUbahHarga = {}
            )
        }
    }

    @Test
    fun riwayatHarga() {
        capture("04-riwayat-harga") {
            RiwayatHargaContent(
                ui = HistoryUi(
                    loading = false,
                    produk = contohProduk[0],
                    changes = listOf(
                        PriceChange(
                            tanggal = "12 Nov 2026",
                            jam = "09:14",
                            hargaSebelum = 12_000.0,
                            hargaBaru = 13_500.0,
                            olehNama = "Bu Sri",
                            alasan = "Penyesuaian harga dari distributor"
                        ),
                        PriceChange(
                            tanggal = "02 Okt 2026",
                            jam = "16:40",
                            hargaSebelum = 11_500.0,
                            hargaBaru = 12_000.0,
                            olehNama = "Bu Sri",
                            alasan = "Kenaikan biaya kulakan"
                        )
                    )
                ),
                produk = contohProduk[0],
                onBack = {}, onUbahHarga = {}
            )
        }
    }

    @Test
    fun ubahHarga() {
        capture("05-ubah-harga") {
            UbahHargaContent(
                ui = ChangePriceUi(
                    produk = contohProduk[0],
                    inputHarga = "14000",
                    alasan = "Harga kulakan naik"
                ),
                produk = contohProduk[0],
                onBack = {}, onInputHarga = {}, onAlasan = {}, onSave = {}
            )
        }
    }

    @Test
    fun cekStok() {
        capture("06-cek-stok") {
            CekStokContent(
                ui = StockListUi(produk = contohProduk),
                onScan = {}, onProductClick = {}
            )
        }
    }

    @Test
    fun barangMasuk() {
        capture("07-barang-masuk") {
            BarangMasukContent(
                ui = BarangMasukUi(
                    produk = contohProduk[1],
                    jumlah = 20,
                    hargaBeli = "58000"
                ),
                onScan = {}, onSetJumlah = {}, onAddJumlah = {},
                onHargaBeli = {}, onSimpan = {}, onBatal = {}
            )
        }
    }
}
