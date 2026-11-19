package com.tokoberkah.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.text.Editable
import android.view.View
import android.view.animation.LinearInterpolator
import android.widget.EditText
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.tokoberkah.app.data.CartManager
import com.tokoberkah.app.data.Product
import com.tokoberkah.app.databinding.ActivityScannerBinding
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Layar 2: Pemindai Barcode (kamera nyata CameraX + ML Kit).
 *
 * - Scan kontekstual: dibuka dari Cek Stok, hasil scan terakhir
 *   dikembalikan lewat setResult saat tombol Kembali ditekan.
 * - Debounce 2.5 detik per kode agar tidak dobel.
 */
class ScannerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScannerBinding

    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: androidx.camera.core.Camera? = null
    private lateinit var analysisExecutor: ExecutorService

    private var torchOn = false
    private var soundOn = true
    private var lastScannedCode: String? = null
    private var lastScanAt = 0L

    /** Urutan hasil scan (terbaru di atas). */
    private val scanResults = linkedMapOf<String, Product>()
    private lateinit var resultAdapter: ScanResultAdapter

    private val beep by lazy { ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80) }

    private val requestPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            if (granted) startCamera() else showPermissionOverlay(true)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScannerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        analysisExecutor = Executors.newSingleThreadExecutor()

        // Kontrol atas tidak boleh ketimpa status bar
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(binding.topBar) { v, insets ->
            val top = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()).top
            v.setPadding(
                v.paddingLeft,
                top + (16 * resources.displayMetrics.density).toInt(),
                v.paddingRight,
                v.paddingBottom
            )
            insets
        }

        setupResultsList()
        setupControls()

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED
        ) {
            startCamera()
        } else {
            showPermissionOverlay(true)
        }

        startScanLineAnimation()
    }

    private fun setupResultsList() {
        resultAdapter = ScanResultAdapter(scanResults.values.toMutableList()) { ean, delta ->
            CartManager.add(ean, delta)
            val product = scanResults[ean] ?: return@ScanResultAdapter
            if (delta > 0 && product.totalStock == 0) {
                showWarning(getString(R.string.scan_out_of_stock, product.totalStock))
            } else {
                resultAdapter.notifyDataSetChanged()
            }
        }
        binding.scanResults.layoutManager = LinearLayoutManager(this)
        binding.scanResults.adapter = resultAdapter
    }

    private fun setupControls() {
        binding.btnCloseScanner.setOnClickListener { finishWithoutResult() }
        binding.btnBack.setOnClickListener { finishWithResult() }
        binding.btnGrantPermission.setOnClickListener { requestCameraPermission() }

        binding.pillSound.setOnClickListener {
            soundOn = !soundOn
            Toast.makeText(
                this,
                getString(if (soundOn) R.string.scan_sound_on else R.string.scan_sound_off),
                Toast.LENGTH_SHORT
            ).show()
        }

        binding.btnFlashlight.setOnClickListener {
            torchOn = !torchOn
            camera?.cameraControl?.enableTorch(torchOn)
            binding.iconFlashlight.alpha = if (torchOn) 1f else 0.6f
        }
    }

    private fun requestCameraPermission() {
        requestPermission.launch(Manifest.permission.CAMERA)
    }

    private fun showPermissionOverlay(show: Boolean) {
        binding.permissionOverlay.visibility = if (show) View.VISIBLE else View.GONE
        binding.topBar.visibility = if (show) View.GONE else View.VISIBLE
        binding.viewfinder.visibility = if (show) View.GONE else View.VISIBLE
        binding.promptBadge.visibility = if (show) View.GONE else View.VISIBLE
    }

    // ===================== CameraX =====================

    private fun startCamera() {
        showPermissionOverlay(false)

        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            cameraProvider = future.get()
            bindCameraUseCases()
        }, ContextCompat.getMainExecutor(this))
    }

    private fun bindCameraUseCases() {
        val provider = cameraProvider ?: return

        val preview = Preview.Builder().build().also {
            it.setSurfaceProvider(binding.previewView.surfaceProvider)
        }

        val analysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()

        analysis.setAnalyzer(analysisExecutor) { imageProxy ->
            @SuppressLint("UnsafeOptInUsageError")
            val mediaImage = imageProxy.image
            if (mediaImage != null) {
                val image = InputImage.fromMediaImage(
                    mediaImage,
                    imageProxy.imageInfo.rotationDegrees
                )
                scanBarcode(image)
                    .addOnCompleteListener { imageProxy.close() }
            } else {
                imageProxy.close()
            }
        }

        provider.unbindAll()
        camera = provider.bindToLifecycle(
            this,
            CameraSelector.DEFAULT_BACK_CAMERA,
            preview,
            analysis
        )
        // Kembalikan state torch setelah bind ulang
        if (torchOn) camera?.cameraControl?.enableTorch(true)
    }

    // ===================== ML Kit =====================

    private val barcodeScanner by lazy {
        BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8,
                    Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E,
                    Barcode.FORMAT_CODE_128, Barcode.FORMAT_CODE_39)
                .build()
        )
    }

    private fun scanBarcode(image: InputImage) =
        barcodeScanner.process(image)
            .addOnSuccessListener { barcodes ->
                val raw = barcodes.firstOrNull()?.rawValue ?: return@addOnSuccessListener
                onBarcodeDetected(raw)
            }
            .addOnFailureListener { /* format tidak didukung, abaikan */ }

    private fun onBarcodeDetected(code: String) {
        val now = System.currentTimeMillis()
        // Debounce: kode sama tidak boleh diproses < 2.5 detik
        if (code == lastScannedCode && now - lastScanAt < DEBOUNCE_MS) return
        lastScannedCode = code
        lastScanAt = now

        // Cari produk di DATABASE (thread latar) — tidak ada data dummy.
        Thread {
            val remote = com.tokoberkah.pos.data.api.RemoteCatalog.fetchByBarcode(code)
            val serverError = remote == null &&
                com.tokoberkah.pos.data.api.ApiClient.lastError != "HTTP 404"
            runOnUiThread {
                when {
                    remote == null && serverError -> showServerError()
                    remote == null -> showNotFound(code)
                    else -> {
                        val product = mapFromServer(remote)
                        if (CartManager.getQty(product.ean) >= product.totalStock) {
                            // Tidak boleh melebihi stok tersedia (termasuk stok 0)
                            showWarning(getString(R.string.scan_out_of_stock, product.totalStock))
                        } else {
                            feedbackSuccess()
                            addResult(product)
                        }
                    }
                }
            }
        }.start()
    }

    /** Petakan baris backend ke model produk pemindai. */
    private fun mapFromServer(r: com.tokoberkah.pos.data.api.RemoteProduct): Product {
        val cat = r.category
        return Product(
            ean = r.ean,
            name = r.name,
            price = r.price,
            unit = "Pcs",
            shelfStock = r.stock,
            warehouseStock = 0,
            lastIncoming = "",
            imageRes = imageFor(cat),
            categories = if (cat != null) listOf(cat) else emptyList(),
            unitsPerBox = 40
        )
    }

    /** Gambar perkiraan berdasarkan kategori produk dari server. */
    private fun imageFor(category: String?): Int = when (category) {
        "Mie Instan" -> R.drawable.product_indomie
        "Sembako", "Bumbu Dapur" -> R.drawable.product_bimoli
        "Susu & Kopi", "Minuman" -> R.drawable.product_kopi
        else -> R.drawable.product_beras
    }

    private fun showServerError() {
        showWarning(getString(R.string.scan_server_error))
    }

    private fun addResult(product: Product) {
        if (scanResults.containsKey(product.ean)) {
            CartManager.add(product.ean, 1)
            // pindahkan ke atas (terbaru di atas)
            val order = LinkedHashMap<String, Product>()
            order[product.ean] = product
            scanResults.forEach { (k, v) -> if (k != product.ean) order[k] = v }
            scanResults.clear()
            scanResults.putAll(order)
        } else {
            scanResults[product.ean] = product
            CartManager.add(product.ean, 1)
        }
        syncAdapter()
        binding.scanResults.visibility = View.VISIBLE
        hideNotifications()
    }

    private fun syncAdapter() {
        resultAdapter.items.clear()
        resultAdapter.items.addAll(scanResults.values)
        resultAdapter.notifyDataSetChanged()
    }

    // ===================== Notifikasi =====================

    private fun hideNotifications() {
        binding.notifContainer.removeAllViews()
    }

    private fun showWarning(text: String) {
        val view = layoutInflater.inflate(
            R.layout.item_notif_warning, binding.notifContainer, false
        )
        view.findViewById<android.widget.TextView>(R.id.notifWarningText).text = text
        binding.notifContainer.removeAllViews()
        binding.notifContainer.addView(view)
        vibrate()
    }

    private fun showNotFound(code: String) {
        val view = layoutInflater.inflate(
            R.layout.item_notif_error, binding.notifContainer, false
        )
        view.findViewById<android.widget.TextView>(R.id.notifErrorText).text =
            getString(R.string.scan_not_found_format, code)
        view.findViewById<android.widget.TextView>(R.id.btnInputManual).apply {
            paintFlags = paintFlags or android.graphics.Paint.UNDERLINE_TEXT_FLAG
            setOnClickListener { showManualInputDialog() }
        }
        binding.notifContainer.removeAllViews()
        binding.notifContainer.addView(view)
        vibrate()
    }

    // ===================== Input manual =====================

    @SuppressLint("InflateParams")
    private fun showManualInputDialog() {
        val dialogView = layoutInflater.inflate(R.layout.dialog_manual_input, null)
        val input = dialogView.findViewById<EditText>(R.id.inputManualBarcode)

        AlertDialog.Builder(this)
            .setView(dialogView)
            .setPositiveButton(R.string.scan_manual_search) { _, _ ->
                val code = input.text.toString().trim()
                if (code.isNotEmpty()) onBarcodeDetected(code)
            }
            .setNegativeButton(R.string.action_cancel, null)
            .show()
    }

    // ===================== Umpan balik =====================

    private fun feedbackSuccess() {
        if (soundOn) {
            try {
                beep.startTone(ToneGenerator.TONE_PROP_BEEP, 120)
            } catch (_: Exception) {
            }
        }
        vibrate()
    }

    @Suppress("DEPRECATION")
    private fun vibrate() {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator
        } else {
            getSystemService(VIBRATOR_SERVICE) as Vibrator
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(60, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            vibrator.vibrate(60)
        }
    }

    private fun startScanLineAnimation() {
        binding.scanLine.animate()
            .translationY(100f)
            .setDuration(1200)
            .setInterpolator(LinearInterpolator())
            .withEndAction {
                binding.scanLine.animate()
                    .translationY(0f)
                    .setDuration(1200)
                    .setInterpolator(LinearInterpolator())
                    .withEndAction { startScanLineAnimation() }
                    .start()
            }
            .start()
    }

    // ===================== Navigasi =====================

    private fun finishWithResult() {
        val intent = Intent().putExtra(
            StockCheckActivity.EXTRA_SCANNED_EAN,
            scanResults.keys.lastOrNull() ?: lastScannedCode
        )
        setResult(RESULT_OK, intent)
        finish()
    }

    private fun finishWithoutResult() {
        setResult(RESULT_CANCELED)
        finish()
    }

    companion object {
        /** Debounce scan per kode: 2.5 detik. */
        private const val DEBOUNCE_MS = 2500L
    }

    override fun onDestroy() {
        super.onDestroy()
        analysisExecutor.shutdown()
        cameraProvider?.unbindAll()
        try {
            beep.release()
        } catch (_: Exception) {
        }
    }
}
