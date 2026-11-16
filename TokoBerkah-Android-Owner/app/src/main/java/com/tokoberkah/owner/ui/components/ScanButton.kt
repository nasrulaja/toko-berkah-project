package com.tokoberkah.owner.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography

/**
 * Tombol besar "Pindai Kode Batang Produk" + teks petunjuk di bawahnya,
 * persis pola yang berulang di semua referensi.
 */
@Composable
fun ScanBarcodeButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    hint: String = "Arahkan kamera ke Kode Batang",
    enabled: Boolean = true,
    icon: ImageVector = Icons.Filled.QrCodeScanner
) {
    androidx.compose.foundation.layout.Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(46.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    Brush.horizontalGradient(listOf(AppColors.Primary, AppColors.PrimaryDark))
                )
                .clickable(enabled = enabled) { onClick() },
            contentAlignment = Alignment.Center
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text(
                    "Pindai Kode Batang Produk",
                    style = AppTypography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
        }
        if (hint.isNotEmpty()) {
            Spacer(Modifier.height(7.dp))
            Text(
                text = hint,
                style = AppTypography.labelSmall,
                color = AppColors.TextMuted,
                textAlign = TextAlign.Center
            )
        }
    }
}

/** Baris judul bagian dengan aksi opsional di kanan (mis. "Lihat Semua"). */
@Composable
fun SectionHeader(
    title: String,
    modifier: Modifier = Modifier,
    actionText: String? = null,
    onAction: (() -> Unit)? = null,
    trailingChip: (@Composable () -> Unit)? = null
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = title,
            style = AppTypography.titleSmall,
            color = AppColors.TextPrimary,
            fontWeight = FontWeight.Bold
        )
        if (trailingChip != null) {
            trailingChip()
        } else if (actionText != null && onAction != null) {
            Text(
                text = actionText,
                style = AppTypography.labelSmall,
                color = AppColors.PrimaryDark,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable { onAction() }
            )
        }
    }
}

/** Baris "kembali" + judul halaman (mis. "< Ubah Harga"). */
@Composable
fun BackHeader(
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(AppColors.PrimarySoft)
                .clickable { onBack() },
            contentAlignment = Alignment.Center
        ) {
            Text("‹", style = AppTypography.headlineSmall, color = AppColors.TextPrimary)
        }
        Spacer(Modifier.width(10.dp))
        Text(
            text = title,
            style = AppTypography.headlineSmall,
            color = AppColors.TextPrimary,
            fontWeight = FontWeight.Bold
        )
    }
}
