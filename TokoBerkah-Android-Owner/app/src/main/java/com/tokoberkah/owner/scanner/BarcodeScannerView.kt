package com.tokoberkah.owner.scanner

import android.annotation.SuppressLint
import android.os.SystemClock
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.tokoberkah.owner.ui.theme.AppTypography
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** Format barcode yang didukung sesuai kebutuhan toko. */
val SUPPORTED_FORMATS = intArrayOf(
    Barcode.FORMAT_EAN_13,
    Barcode.FORMAT_EAN_8,
    Barcode.FORMAT_UPC_A,
    Barcode.FORMAT_UPC_E,
    Barcode.FORMAT_CODE_128,
    Barcode.FORMAT_CODE_39,
    Barcode.FORMAT_QR_CODE
)

/**
 * Pratinjau kamera + analisis barcode. Dipanggil dari [CameraBarcodeScanner]
 * (yang sudah mengurus izin).
 */
@SuppressLint("UnsafeOptInUsageError")
@Composable
fun BarcodeScannerView(
    active: Boolean,
    lifecycleOwner: LifecycleOwner,
    torchOn: Boolean,
    modifier: Modifier = Modifier,
    onBarcode: (String) -> Unit
) {
    val context = LocalContext.current
    val previewView = remember {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }
    // Throttle: mencegah barcode yang sama terkirim berkali-kali.
    val lastValue = remember { mutableStateOf("" to 0L) }
    val busy = remember { AtomicBoolean(false) }
    val executor: ExecutorService = remember { Executors.newSingleThreadExecutor() }
    val scanner: BarcodeScanner = remember {
        BarcodeScanning.getClient(
            BarcodeScannerOptions.Builder()
                .setBarcodeFormats(SUPPORTED_FORMATS[0], *SUPPORTED_FORMATS.drop(1).toIntArray())
                .build()
        )
    }
    var camera by remember { mutableStateOf<androidx.camera.core.Camera?>(null) }
    // Senter ikut berubah walau kamera baru selesai di-bind setelah toggle.
    val torchState by rememberUpdatedState(torchOn)

    DisposableEffect(Unit) {
        val future = ProcessCameraProvider.getInstance(context)
        var provider: ProcessCameraProvider? = null
        future.addListener({
            provider = future.get()
            runCatching {
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }
                val analysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()

                analysis.setAnalyzer(executor) { proxy: ImageProxy ->
                    if (!active || busy.get()) {
                        proxy.close()
                        return@setAnalyzer
                    }
                    val media = proxy.image
                    if (media == null) {
                        proxy.close()
                        return@setAnalyzer
                    }
                    val image = InputImage.fromMediaImage(media, proxy.imageInfo.rotationDegrees)
                    busy.set(true)
                    scanner.process(image)
                        .addOnSuccessListener { barcodes ->
                            val raw = barcodes.firstOrNull { !it.rawValue.isNullOrBlank() }?.rawValue
                            if (raw != null) {
                                val now = SystemClock.elapsedRealtime()
                                val (prev, at) = lastValue.value
                                // abaikan pengulangan < 2.5 detik untuk nilai yang sama
                                if (raw != prev || now - at > 2500) {
                                    lastValue.value = raw to now
                                    onBarcode(raw)
                                }
                            }
                        }
                        .addOnCompleteListener {
                            busy.set(false)
                            proxy.close()
                        }
                }

                provider?.unbindAll()
                camera = provider?.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    analysis
                )
                // terapkan status senter saat ini begitu kamera siap
                runCatching { camera?.cameraControl?.enableTorch(torchState) }
            }
        }, ContextCompat.getMainExecutor(context))

        onDispose {
            runCatching { provider?.unbindAll() }
            runCatching { scanner.close() }
            executor.shutdown()
        }
    }

    LaunchedEffect(torchOn) {
        runCatching { camera?.cameraControl?.enableTorch(torchOn) }
    }

    AndroidView(
        factory = { previewView },
        modifier = modifier.fillMaxSize()
    )
}

/** Tampilan bila izin kamera ditolak. */
@Composable
fun MissingCameraPermission(onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.padding(24.dp)
        ) {
            Text("📷", color = Color.White)
            Text(
                "Akses kamera diperlukan untuk memindai barcode produk.",
                style = AppTypography.bodyMedium,
                color = Color.White
            )
            Button(onClick = onRetry) { Text("Izinkan Kamera") }
        }
    }
}

