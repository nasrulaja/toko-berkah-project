package com.tokoberkah.owner.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tokoberkah.owner.domain.Produk
import com.tokoberkah.owner.domain.formatRupiah
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography

/**
 * Kartu hasil pindai (Recent Scan Card):
 * thumbnail, EAN, nama produk, harga, lalu tombol minus / jumlah / plus.
 */
@Composable
fun RecentScanCard(
    produk: Produk,
    jumlah: Int,
    onMinus: () -> Unit,
    onPlus: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(AppColors.Surface)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ProductThumb(produk, 44)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = "EAN: ${produk.barcode}",
                style = AppTypography.labelSmall,
                color = AppColors.TextMuted,
                maxLines = 1
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = produk.nama,
                style = AppTypography.titleSmall,
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = "${formatRupiah(produk.hargaJual)} / ${produk.satuan}",
                style = AppTypography.bodySmall,
                color = AppColors.TextSecondary
            )
        }
        Row(verticalAlignment = Alignment.CenterVertically) {
            RoundQtyButton(icon = Icons.Filled.Remove, enabled = jumlah > 1, onClick = onMinus)
            Box(
                modifier = Modifier.width(26.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "$jumlah",
                    style = AppTypography.titleSmall,
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold
                )
            }
            RoundQtyButton(icon = Icons.Filled.Add, enabled = true, onClick = onPlus, filled = true)
        }
    }
}

@Composable
private fun RoundQtyButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean,
    onClick: () -> Unit,
    filled: Boolean = false
) {
    Box(
        modifier = Modifier
            .size(26.dp)
            .clip(CircleShape)
            .background(
                when {
                    filled -> AppColors.Primary
                    !enabled -> AppColors.Divider
                    else -> AppColors.PrimarySoft
                }
            )
            .clickable(enabled = enabled) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = when {
                filled -> Color.White
                !enabled -> AppColors.TextMuted
                else -> AppColors.PrimaryDark
            },
            modifier = Modifier.size(15.dp)
        )
    }
}


