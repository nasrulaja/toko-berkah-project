package com.tokoberkah.owner.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.tokoberkah.owner.domain.StockStatus
import com.tokoberkah.owner.domain.formatRupiah
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography

/** Kartu dengan sudut membulat + bayangan sangat halus (khas referensi). */
@Composable
fun SoftCard(
    modifier: Modifier = Modifier,
    corner: Int = 16,
    background: Color = AppColors.Surface,
    content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(corner.dp))
            .background(background)
            .padding(14.dp),
        content = content
    )
}

/** Thumbnail produk: kotak biru muda dengan emoji kategori. */
@Composable
fun ProductThumb(produk: Produk, size: Int = 54) {
    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(AppColors.PrimarySoftAlt),
        contentAlignment = Alignment.Center
    ) {
        Text(text = produk.gambarEmoji, fontSize = (size * 0.42f).sp)
    }
}

/** Chip biru muda (kategori, barcode, kode EAN). */
@Composable
fun InfoChip(
    text: String,
    modifier: Modifier = Modifier,
    background: Color = AppColors.PrimarySoft,
    textColor: Color = AppColors.TextPrimary,
    bold: Boolean = false
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(background)
            .padding(horizontal = 10.dp, vertical = 5.dp)
    ) {
        Text(
            text = text,
            style = AppTypography.labelSmall,
            color = textColor,
            fontWeight = if (bold) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/** Badge status stok berwarna sesuai aturan: hijau / oranye / merah. */
@Composable
fun StockBadge(status: StockStatus, modifier: Modifier = Modifier) {
    val (bg, fg) = when (status) {
        StockStatus.TERSEDIA -> AppColors.SuccessSoft to AppColors.Success
        StockStatus.MENIPIS -> AppColors.WarningSoft to AppColors.Warning
        StockStatus.HABIS -> AppColors.DangerSoft to AppColors.Danger
    }
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        StatusDot(color = fg, size = 6)
        Spacer(Modifier.width(5.dp))
        Text(
            text = status.label,
            style = AppTypography.labelSmall,
            color = fg,
            fontWeight = FontWeight.SemiBold
        )
    }
}

/** Baris daftar produk (nama, EAN, harga) — seperti di menu Cek Harga. */
@Composable
fun ProductListRow(
    produk: Produk,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(AppColors.Surface)
            .clickable(onClick = onClick)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ProductThumb(produk, 46)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
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
                text = "EAN: ${produk.barcode}",
                style = AppTypography.bodySmall,
                color = AppColors.TextSecondary
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = formatRupiah(produk.hargaJual),
                style = AppTypography.titleSmall,
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
        }
        if (produk.perluRestok) {
            StockBadge(produk.status)
            Spacer(Modifier.width(4.dp))
        }
    }
}

/** Kotak kecil dengan label + nilai (dipakai pada detail produk & stok). */
@Composable
fun LabeledBox(
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    valueColor: Color = AppColors.TextPrimary,
    valueBold: Boolean = true,
    leadingIcon: String? = null
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(AppColors.PrimarySoftAlt)
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (leadingIcon != null) {
            Text(text = leadingIcon, fontSize = 11.sp)
            Spacer(Modifier.width(5.dp))
        }
        Text(
            text = label,
            style = AppTypography.bodySmall,
            color = AppColors.TextSecondary,
            modifier = Modifier.weight(1f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        Text(
            text = value,
            style = AppTypography.bodySmall,
            color = valueColor,
            fontWeight = if (valueBold) FontWeight.Bold else FontWeight.Normal,
            maxLines = 1
        )
    }
}

/** Kotak peringatan/informasi dengan border halus. */
@Composable
fun NoteBox(
    text: String,
    modifier: Modifier = Modifier,
    icon: String = "ℹ️",
    background: Color = AppColors.PrimarySoft
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(background)
            .border(1.dp, AppColors.Divider, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text(text = icon, fontSize = 13.sp)
        Spacer(Modifier.width(8.dp))
        Text(
            text = text,
            style = AppTypography.bodySmall,
            color = AppColors.TextSecondary
        )
    }
}

/** Daftar berpasangan label-nilai rapi (dipakai pada ringkasan). */
@Composable
fun KeyValueRow(
    label: String,
    value: String,
    valueColor: Color = AppColors.TextPrimary,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, style = AppTypography.bodySmall, color = AppColors.TextSecondary)
        Text(
            text = value,
            style = AppTypography.bodySmall,
            color = valueColor,
            fontWeight = FontWeight.Bold
        )
    }
}

