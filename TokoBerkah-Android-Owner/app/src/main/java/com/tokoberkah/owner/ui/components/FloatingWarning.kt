package com.tokoberkah.owner.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography
import com.tokoberkah.owner.viewmodel.FloatingWarning
import com.tokoberkah.owner.viewmodel.WarningLevel

/**
 * Notifikasi mengambang (Floating Warning).
 * Merah = error, oranye = peringatan, hijau = sukses. Dapat ditutup.
 */
@Composable
fun FloatingWarningBanner(
    warning: FloatingWarning,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    val (bg, fg, icon) = when (warning.level) {
        WarningLevel.ERROR -> Triple(AppColors.DangerSoft, AppColors.Danger, Icons.Filled.ErrorOutline)
        WarningLevel.WARNING -> Triple(AppColors.WarningSoft, AppColors.Warning, Icons.Filled.WarningAmber)
        WarningLevel.SUCCESS -> Triple(AppColors.SuccessSoft, AppColors.Success, Icons.Filled.CheckCircle)
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(bg)
            .padding(start = 12.dp, end = 4.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = fg, modifier = Modifier.size(18.dp))
        Text(
            text = warning.message,
            style = AppTypography.bodySmall,
            color = if (warning.level == WarningLevel.WARNING) Color(0xFF8A5300) else fg,
            fontWeight = FontWeight.Medium,
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 8.dp)
        )
        IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
            Icon(Icons.Filled.Close, contentDescription = "Tutup", tint = fg, modifier = Modifier.size(16.dp))
        }
    }
}

/** Tumpukan notifikasi di atas konten. */
@Composable
fun FloatingWarningsHost(
    warnings: List<FloatingWarning>,
    onDismiss: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        warnings.forEach { w ->
            AnimatedVisibility(
                visible = true,
                enter = slideInVertically { -it },
                exit = slideOutVertically { -it }
            ) {
                FloatingWarningBanner(warning = w, onDismiss = { onDismiss(w.id) })
            }
        }
    }
}

/** Titik status kecil (dipakai pada daftar hasil scan). */
@Composable
fun StatusDot(color: Color, size: Int = 8) {
    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(CircleShape)
            .background(color)
    )
}
