package com.tokoberkah.owner

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.tokoberkah.owner.ui.AppContent
import com.tokoberkah.owner.ui.theme.TokoBerkahTheme
import com.tokoberkah.owner.viewmodel.AuthViewModel

class MainActivity : ComponentActivity() {

    private val cameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ServiceLocator.init(applicationContext)
        // Minta izin kamera lebih awal agar scanner tidak gagal saat dibuka.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            cameraPermission.launch(Manifest.permission.CAMERA)
        }
        setContent {
            TokoBerkahTheme {
                AppRoot()
            }
        }
    }
}

/** Titik masuk UI: memutuskan layar login atau aplikasi utama. */
@Composable
private fun AppRoot() {
    val authVm: AuthViewModel = viewModel()
    AppContent(authVm = authVm)
}

