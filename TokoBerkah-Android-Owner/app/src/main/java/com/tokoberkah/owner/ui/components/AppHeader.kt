package com.tokoberkah.owner.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography

/**
 * Header aplikasi: logo Toko Berkah, "POS Companion", lalu nama halaman aktif.
 * Mengikuti referensi: logo biru bulat, judul tebal, judul halaman dipisah "•".
 */
@Composable
fun AppHeader(
    sectionTitle: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(AppColors.Surface)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        BoxLogo(size = 36.dp)
        Spacer(Modifier.width(10.dp))
        Column {
            Text(
                text = "Toko Berkah",
                style = AppTypography.titleMedium,
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "POS Companion",
                style = AppTypography.labelSmall,
                color = AppColors.TextMuted
            )
        }
        Spacer(Modifier.width(10.dp))
        Text(
            text = "•",
            style = AppTypography.labelMedium,
            color = AppColors.TextMuted
        )
        Spacer(Modifier.width(10.dp))
        Text(
            text = sectionTitle,
            style = AppTypography.titleSmall,
            color = AppColors.PrimaryDark,
            fontWeight = FontWeight.Bold
        )
    }
}

/** Logo toko: kotak bulat dengan gradien biru dan ikon storefront. */
@Composable
fun BoxLogo(size: androidx.compose.ui.unit.Dp = 36.dp) {
    androidx.compose.foundation.layout.Box(
        modifier = Modifier
            .size(size)
            .clip(RoundedCornerShape(size * 0.3f))
            .background(
                Brush.linearGradient(
                    listOf(AppColors.Primary, AppColors.PrimaryDark)
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Filled.Storefront,
            contentDescription = "Toko Berkah",
            tint = Color.White,
            modifier = Modifier.size(size * 0.62f)
        )
    }
}

