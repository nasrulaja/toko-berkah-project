package com.tokoberkah.owner.ui.screens

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography

/**
 * Overlay scanner sesuai referensi:
 * - area gelap transparan dengan "lubang" kotak pemindaian
 * - garis sudut biru di 4 sudut, garis animasi pemindaian
 * - chip status & peran, tombol tutup/flashlight/Kembali
 */
@Composable
fun ScannerOverlay(
    torchOn: Boolean,
    onToggleTorch: () -> Unit,
    onClose: () -> Unit,
    onManualInput: () -> Unit,
    modifier: Modifier = Modifier,
    ownerName: String = "Pemilik & Getar Aktif"
) {
    BoxWithConstraints(modifier = modifier.fillMaxSize()) {
        val boxW = (maxWidth * 0.78f).coerceAtMost(320.dp)
        val boxH = boxW * 1.25f

        Canvas(modifier = Modifier.fillMaxSize()) {
            val holeW = boxW.toPx()
            val holeH = boxH.toPx()
            val left = (size.width - holeW) / 2f
            val top = (size.height - holeH) / 2f - 20.dp.toPx()
            drawRect(color = Color(0xCC0B1F33))
            drawRect(
                color = Color.Transparent,
                topLeft = Offset(left, top),
                size = Size(holeW, holeH),
                blendMode = androidx.compose.ui.graphics.BlendMode.Clear
            )
        }

        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(bottom = 40.dp)
                .width(boxW)
                .height(boxH)
        ) {
            CornerBrackets()
            AnimatedScanLine()
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(Color(0x33FFFFFF))
                    .clickable { onClose() },
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Filled.Close, "Tutup", tint = Color.White, modifier = Modifier.size(18.dp))
            }
            Spacer(Modifier.width(10.dp))
            Row(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(50))
                    .background(Color(0x4DFFFFFF))
                    .padding(horizontal = 12.dp, vertical = 7.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("👤", fontSize = 11.sp)
                Spacer(Modifier.width(6.dp))
                Text(ownerName, style = AppTypography.labelSmall, color = Color.White)
            }
            Spacer(Modifier.width(10.dp))
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(CircleShape)
                    .background(if (torchOn) AppColors.Primary else Color(0x33FFFFFF))
                    .clickable { onToggleTorch() },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = if (torchOn) Icons.Filled.FlashOn else Icons.Filled.FlashOff,
                    contentDescription = "Senter",
                    tint = Color.White,
                    modifier = Modifier.size(18.dp)
                )
            }
        }


        // Chip mode di bawah header
        Row(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .statusBarsPadding()
                .padding(top = 58.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OverlayChip("Masuk Scan Cepat", active = true)
            OverlayChip("Cek Harga Saja", active = false)
        }

        // Instruksi
        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 118.dp)
                .clip(RoundedCornerShape(50))
                .background(Color(0x660B1F33))
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("📷", fontSize = 11.sp)
            Spacer(Modifier.width(6.dp))
            Text(
                "Arahkan kamera ke barcode produk.",
                style = AppTypography.labelSmall,
                color = Color.White
            )
        }

        // Tombol Kembali + input manual
        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.62f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(50))
                    .background(
                        Brush.horizontalGradient(listOf(AppColors.Primary, AppColors.PrimaryDark))
                    )
                    .clickable { onClose() },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "Kembali",
                    style = AppTypography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(Modifier.height(10.dp))
            Row(
                modifier = Modifier.clickable { onManualInput() },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Filled.Keyboard,
                    contentDescription = null,
                    tint = Color(0xFFCFE6F8),
                    modifier = Modifier.size(15.dp)
                )
                Spacer(Modifier.width(5.dp))
                Text(
                    "Input barcode manual",
                    style = AppTypography.labelSmall,
                    color = Color(0xFFCFE6F8)
                )
            }
        }
    }
}

@Composable
private fun OverlayChip(text: String, active: Boolean) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(if (active) AppColors.Primary else Color(0x33FFFFFF))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text,
            style = AppTypography.labelSmall,
            color = Color.White,
            textAlign = TextAlign.Center
        )
    }
}

/** Empat sudut kotak pemindaian berwarna biru. */
@Composable
private fun CornerBrackets() {
    Canvas(modifier = Modifier.fillMaxSize()) {
        val len = 34.dp.toPx()
        val stroke = 3.5.dp.toPx()
        val color = AppColors.Primary
        val w = size.width
        val h = size.height
        // kiri atas
        drawLine(color, Offset(0f, 0f), Offset(len, 0f), stroke, StrokeCap.Round)
        drawLine(color, Offset(0f, 0f), Offset(0f, len), stroke, StrokeCap.Round)
        // kanan atas
        drawLine(color, Offset(w, 0f), Offset(w - len, 0f), stroke, StrokeCap.Round)
        drawLine(color, Offset(w, 0f), Offset(w, len), stroke, StrokeCap.Round)
        // kiri bawah
        drawLine(color, Offset(0f, h), Offset(len, h), stroke, StrokeCap.Round)
        drawLine(color, Offset(0f, h), Offset(0f, h - len), stroke, StrokeCap.Round)
        // kanan bawah
        drawLine(color, Offset(w, h), Offset(w - len, h), stroke, StrokeCap.Round)
        drawLine(color, Offset(w, h), Offset(w, h - len), stroke, StrokeCap.Round)
    }
}

/** Garis pemindaian biru yang bergerak naik-turun. */
@Composable
private fun AnimatedScanLine() {
    val transition = rememberInfiniteTransition(label = "scan")
    val progress by transition.animateFloat(
        initialValue = 0.08f,
        targetValue = 0.92f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = androidx.compose.animation.core.LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scanLine"
    )
    Canvas(modifier = Modifier.fillMaxSize()) {
        val y = size.height * progress
        val brush = Brush.horizontalGradient(
            listOf(
                Color.Transparent,
                AppColors.Primary.copy(alpha = 0.9f),
                AppColors.Primary,
                AppColors.Primary.copy(alpha = 0.9f),
                Color.Transparent
            )
        )
        drawLine(
            brush = brush,
            start = Offset(size.width * 0.06f, y),
            end = Offset(size.width * 0.94f, y),
            strokeWidth = 2.5.dp.toPx(),
            cap = StrokeCap.Round
        )
    }
}


