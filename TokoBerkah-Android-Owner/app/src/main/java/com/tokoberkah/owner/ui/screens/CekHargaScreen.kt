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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
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
import com.tokoberkah.owner.domain.Produk
import com.tokoberkah.owner.domain.formatRupiah
import com.tokoberkah.owner.ui.components.ProductListRow
import com.tokoberkah.owner.ui.components.RecentScanCard
import com.tokoberkah.owner.ui.components.ScanBarcodeButton
import com.tokoberkah.owner.ui.components.SectionHeader
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography
import com.tokoberkah.owner.viewmodel.ProductsViewModel
import com.tokoberkah.owner.viewmodel.SharedUiViewModel

/**
 * Menu Cek Harga — daftar produk + tombol pindai.
 * Baris ditekan membuka detail produk (harga, riwayat, ubah harga).
 */
@Composable
fun CekHargaScreen(
    vm: ProductsViewModel,
    shared: SharedUiViewModel,
    onScan: () -> Unit,
    onManual: () -> Unit,
    onProductClick: (Produk) -> Unit
) {
    val ui by vm.ui.collectAsState()
    val scans by shared.recentScans.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Spacer(Modifier.height(10.dp))
            ScanBarcodeButton(onClick = onScan)
            Spacer(Modifier.height(2.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(
                    "Input barcode manual",
                    style = AppTypography.labelSmall,
                    color = AppColors.PrimaryDark,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(50))
                        .clickable { onManual() }
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                )
            }
        }

        if (ui.offline && ui.error != null) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(AppColors.WarningSoft)
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("📡", modifier = Modifier.padding(end = 8.dp))
                    Text(
                        "${ui.error} Menampilkan data tersimpan.",
                        style = AppTypography.bodySmall,
                        color = AppColors.Warning
                    )
                }
            }
        }

        if (ui.loading) {
            item {
                Box(
                    Modifier.fillMaxWidth().padding(vertical = 40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = AppColors.Primary, strokeWidth = 2.dp)
                }
            }
        }

        if (scans.isNotEmpty()) {
            item {
                SectionHeader(
                    title = "Hasil Pindai",
                    actionText = "Bersihkan",
                    onAction = { shared.clearScans() }
                )
            }
            items(scans, key = { it.produk.id }) { line ->
                RecentScanCard(
                    produk = line.produk,
                    jumlah = line.jumlah,
                    onMinus = { shared.changeQty(line.produk.id, -1) },
                    onPlus = { shared.changeQty(line.produk.id, +1) }
                )
            }
        }

        if (ui.produk.isNotEmpty()) {
            item { SectionHeader(title = "Daftar Produk", actionText = "${ui.produk.size} item") }
            items(ui.filtered, key = { it.id }) { p ->
                ProductListRow(
                    produk = p,
                    onClick = { onProductClick(p) }
                )
            }
        }

        if (!ui.loading && ui.produk.isEmpty()) {
            item { EmptyState() }
        }

        item { Spacer(Modifier.height(12.dp)) }
    }
}

@Composable
private fun EmptyState() {
    Box(
        Modifier.fillMaxWidth().padding(vertical = 50.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("🛒", style = AppTypography.displaySmall)
            Spacer(Modifier.height(8.dp))
            Text(
                "Belum ada produk tersimpan. Tarik untuk menyegarkan atau pindai barcode.",
                style = AppTypography.bodySmall,
                color = AppColors.TextMuted
            )
        }
    }
}
