package com.tokoberkah.owner.scanner

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner

/**
 * Peminta izin kamera + pemanggilan [BarcodeScannerView].
 *
 * Semua resource kamera (ImageAnalysis & BarcodeScanner ML Kit) dilepas
 * lewat [DisposableEffect] supaya tidak bocor memori ketika layar ditutup.
 */
@Composable
fun CameraBarcodeScanner(
    active: Boolean,
    onBarcode: (String) -> Unit,
    modifier: androidx.compose.ui.Modifier = androidx.compose.ui.Modifier,
    torchOn: Boolean = false
) {
    val context = LocalContext.current
    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    val launcher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasPermission = granted }

    LaunchedEffect(Unit) {
        if (!hasPermission) launcher.launch(Manifest.permission.CAMERA)
    }

    if (!hasPermission) {
        MissingCameraPermission(onRetry = { launcher.launch(Manifest.permission.CAMERA) }, modifier = modifier)
        return
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnBarcode by rememberUpdatedState(onBarcode)

    BarcodeScannerView(
        active = active,
        lifecycleOwner = lifecycleOwner,
        torchOn = torchOn,
        modifier = modifier,
        onBarcode = { value -> currentOnBarcode(value) }
    )
}
