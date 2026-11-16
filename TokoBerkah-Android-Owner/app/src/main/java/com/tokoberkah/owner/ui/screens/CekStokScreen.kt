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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tokoberkah.owner.domain.Produk
import com.tokoberkah.owner.domain.StockStatus
import com.tokoberkah.owner.ui.components.BackHeader
import com.tokoberkah.owner.ui.components.LabeledBox
import com.tokoberkah.owner.ui.components.NoteBox
import com.tokoberkah.owner.ui.components.ProductThumb
import com.tokoberkah.owner.ui.components.ScanBarcodeButton
import com.tokoberkah.owner.ui.components.SoftCard
import com.tokoberkah.owner.ui.components.StockBadge
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography
import com.tokoberkah.owner.viewmodel.ProductsViewModel
import com.tokoberkah.owner.viewmodel.StockViewModel

/**
 * Menu Cek Stok (referensi "3. Cek Stok"):
 * tombol pindai, ringkasan "N Barang Terdaftar" + "M Perlu Restok",
 * lalu kartu per produk: status, sisa stok total besar, rak depan/gudang,
 * dan "Terakhir Masuk".
 */
@Composable
fun CekStokScreen(
    vm: StockViewModel,
    onScan: () -> Unit,
    onProductClick: (Produk) -> Unit
) {
    val ui by vm.list.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Spacer(Modifier.height(8.dp))
            ScanBarcodeButton(onClick = onScan)
            Spacer(Modifier.height(6.dp))
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Hasil Pengecekan",
                    style = AppTypography.titleSmall,
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "${ui.produk.size} Barang Terdaftar",
                        style = AppTypography.labelSmall,
                        color = AppColors.TextMuted
                    )
                    Spacer(Modifier.width(6.dp))
                    Box(
                        Modifier
                            .clip(RoundedCornerShape(50))
                            .background(AppColors.WarningSoft)
                            .padding(horizontal = 7.dp, vertical = 3.dp)
                    ) {
                        Text(
                            "⚠ ${ui.perluRestok.size} Perlu Restok",
                            style = AppTypography.labelSmall,
                            color = AppColors.Warning,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }
        }

        items(ui.produk, key = { it.id }) { p ->
            StockProductCard(produk = p, onClick = { onProductClick(p) })
        }

        item { Spacer(Modifier.height(14.dp)) }
    }
}


/** Kartu stok per produk sesuai referensi Cek Stok. */
@Composable
private fun StockProductCard(produk: Produk, onClick: () -> Unit) {
    SoftCard(corner = 14) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .clickable { onClick() },
            verticalAlignment = Alignment.CenterVertically
        ) {
            ProductThumb(produk, 48)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    produk.nama,
                    style = AppTypography.titleSmall,
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    "▮ ${produk.barcode}",
                    style = AppTypography.labelSmall,
                    color = AppColors.TextMuted
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        StockBadge(produk.status)

        Spacer(Modifier.height(10.dp))
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(AppColors.PrimarySoftAlt)
                .padding(horizontal = 10.dp, vertical = 8.dp)
        ) {
            Text(
                "SISA STOK TOTAL",
                style = AppTypography.labelSmall.copy(fontSize = 9.sp),
                color = AppColors.TextSecondary,
                fontWeight = FontWeight.SemiBold
            )
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    "${produk.stok}",
                    style = AppTypography.headlineMedium,
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    produk.satuan,
                    style = AppTypography.bodySmall,
                    color = AppColors.TextSecondary,
                    modifier = Modifier.padding(bottom = 3.dp)
                )
            }
        }

        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            LabeledBox(
                label = "Rak Depan",
                value = "${produk.stokRakDepan} ${produk.satuan}",
                leadingIcon = "🏪",
                modifier = Modifier.weight(1f)
            )
            LabeledBox(
                label = "Gudang Belakang",
                value = "${produk.stokGudang} ${produk.satuan}",
                leadingIcon = "📦",
                modifier = Modifier.weight(1f)
            )
        }

        if (produk.perluRestok) {
            Spacer(Modifier.height(8.dp))
            NoteBox(
                text = when (produk.status) {
                    StockStatus.HABIS -> "Stok habis di rak maupun gudang."
                    else -> "Stok menipis, segera tambah barang masuk."
                },
                icon = if (produk.status == StockStatus.HABIS) "⛔" else "⚠️",
                background = if (produk.status == StockStatus.HABIS) AppColors.DangerSoft else AppColors.WarningSoft
            )
        }
    }
}

