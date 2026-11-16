package com.tokoberkah.owner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.History
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
import com.tokoberkah.owner.domain.StockStatus
import com.tokoberkah.owner.domain.formatRupiah
import com.tokoberkah.owner.ui.components.BackHeader
import com.tokoberkah.owner.ui.components.InfoChip
import com.tokoberkah.owner.ui.components.NoteBox
import com.tokoberkah.owner.ui.components.ProductThumb
import com.tokoberkah.owner.ui.components.SoftCard
import com.tokoberkah.owner.ui.components.StockBadge
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography

/**
 * Detail produk & cek harga (referensi "3. Cek Harga"):
 * chip barcode + kategori, thumbnail, nama, status stok, lokasi rak,
 * kotak harga jual kasir, lalu dua tombol Riwayat Harga & Ubah Harga.
 */
@Composable
fun ProdukDetailScreen(
    produk: Produk,
    onBack: () -> Unit,
    onRiwayat: () -> Unit,
    onUbahHarga: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp)
    ) {
        Spacer(Modifier.height(6.dp))
        BackHeader(title = "Cek Harga", onBack = onBack)
        Spacer(Modifier.height(12.dp))

        ProductSummaryCard(produk = produk)
        Spacer(Modifier.height(12.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            ActionButton(
                text = "Riwayat Harga",
                icon = { Icon(Icons.Filled.History, null, tint = AppColors.PrimaryDark, modifier = Modifier.size(15.dp)) },
                onClick = onRiwayat,
                modifier = Modifier.weight(1f)
            )
            ActionButton(
                text = "Ubah Harga",
                icon = { Icon(Icons.Filled.Edit, null, tint = AppColors.PrimaryDark, modifier = Modifier.size(15.dp)) },
                onClick = onUbahHarga,
                modifier = Modifier.weight(1f)
            )
        }

        Spacer(Modifier.height(12.dp))
        SoftCard {
            Text(
                "Informasi Produk",
                style = AppTypography.titleSmall,
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(8.dp))
            InfoLine("Kategori", produk.kategoriNama.ifBlank { "Umum" })
            InfoLine("Lokasi rak", produk.rak)
            InfoLine("Barcode", produk.barcode)
            InfoLine("Stok minimum", "${produk.stokMinimum} ${produk.satuan}")
            InfoLine("Status stok", produk.status.label)
        }

        Spacer(Modifier.height(12.dp))
        if (produk.perluRestok) {
            NoteBox(
                text = if (produk.status == StockStatus.HABIS)
                    "Stok habis. Segera catat barang masuk supaya produk bisa dijual kembali."
                else
                    "Stok menipis (sisa ${produk.stok}, minimum ${produk.stokMinimum}). Pertimbangkan barang masuk.",
                icon = "⚠️",
                background = if (produk.status == StockStatus.HABIS)
                    AppColors.DangerSoft else AppColors.WarningSoft
            )
        }
        Spacer(Modifier.height(18.dp))
    }
}



/** Kartu ringkas produk yang dipakai ulang di banyak layar. */
@Composable
fun ProductSummaryCard(produk: Produk, showPriceBox: Boolean = true) {
    SoftCard(corner = 14) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            InfoChip(text = "▮▮▮ ${produk.barcode}", modifier = Modifier.weight(1f, fill = false))
            InfoChip(text = produk.kategoriNama.ifBlank { "Umum" })
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            ProductThumb(produk, 58)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                StockBadge(produk.status)
                Spacer(Modifier.height(5.dp))
                Text(
                    text = produk.nama,
                    style = AppTypography.titleLarge,
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Lokasi: ${produk.rak}",
                    style = AppTypography.bodySmall,
                    color = AppColors.TextSecondary
                )
            }
        }
        if (showPriceBox) {
            Spacer(Modifier.height(12.dp))
            PriceBox(produk)
        }
    }
}

/** Kotak harga jual kasir + badge "Resmi Terdaftar". */
@Composable
fun PriceBox(produk: Produk) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AppColors.PrimarySoft)
            .padding(horizontal = 12.dp, vertical = 10.dp)
    ) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "HARGA JUAL KASIR",
                style = AppTypography.labelSmall,
                color = AppColors.TextSecondary,
                fontWeight = FontWeight.SemiBold
            )
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(Color.White)
                    .padding(horizontal = 7.dp, vertical = 3.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("✓", fontSize = 9.sp, color = AppColors.PrimaryDark)
                Spacer(Modifier.width(3.dp))
                Text(
                    "Resmi Terdaftar",
                    style = AppTypography.labelSmall,
                    color = AppColors.PrimaryDark,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
        Spacer(Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                formatRupiah(produk.hargaJual),
                style = AppTypography.displaySmall.copy(fontSize = 26.sp),
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.width(6.dp))
            Text(
                "/ 1 ${produk.satuan}",
                style = AppTypography.bodySmall,
                color = AppColors.TextSecondary,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
    }
}

@Composable
private fun InfoLine(label: String, value: String) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = AppTypography.bodySmall, color = AppColors.TextSecondary)
        Text(
            value,
            style = AppTypography.bodySmall,
            color = AppColors.TextPrimary,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
fun ActionButton(
    text: String,
    icon: @Composable () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .height(40.dp)
            .clip(RoundedCornerShape(50))
            .background(AppColors.PrimarySoft)
            .clickable { onClick() },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        icon()
        Spacer(Modifier.width(6.dp))
        Text(
            text,
            style = AppTypography.titleSmall,
            color = AppColors.PrimaryDark,
            fontWeight = FontWeight.SemiBold
        )
    }
}

