package com.tokoberkah.owner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.tokoberkah.owner.scanner.CameraBarcodeScanner
import com.tokoberkah.owner.ui.components.FloatingWarningBanner
import com.tokoberkah.owner.viewmodel.FloatingWarning
import com.tokoberkah.owner.viewmodel.WarningLevel

/**
 * Layar pemindai barcode penuh (kamera penuh + overlay).
 * Barcode yang terbaca diteruskan ke [onBarcode] satu kali; overlay
 * memberi umpan balik dan mencegah pemindaian ganda.
 */
@Composable
fun ScannerScreen(
    active: Boolean,
    onBarcode: (String) -> Unit,
    onClose: () -> Unit,
    onManualInput: () -> Unit,
    ownerName: String,
    warning: FloatingWarning?,
    onDismissWarning: () -> Unit
) {
    var torchOn by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize().background(Color(0xFF0B1F33))) {
        CameraBarcodeScanner(
            active = active,
            onBarcode = onBarcode,
            torchOn = torchOn
        )
        ScannerOverlay(
            torchOn = torchOn,
            onToggleTorch = { torchOn = !torchOn },
            onClose = onClose,
            onManualInput = onManualInput,
            ownerName = ownerName
        )
        if (warning != null) {
            FloatingWarningBanner(
                warning = warning,
                onDismiss = onDismissWarning,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 120.dp, start = 16.dp, end = 16.dp)
            )
        }
    }
}

/** Notifikasi produk tidak ditemukan saat memindai. */
fun notFoundWarning(barcode: String) = FloatingWarning(
    message = "Produk tidak ditemukan. Barcode: $barcode",
    level = WarningLevel.ERROR
)
