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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.tokoberkah.owner.ui.components.BackHeader
import com.tokoberkah.owner.ui.components.NoteBox
import com.tokoberkah.owner.ui.components.SoftCard
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography
import com.tokoberkah.owner.viewmodel.PricingViewModel

/**
 * Riwayat Harga (referensi "3. Riwayat Harga"):
 * kartu produk, jumlah perubahan, daftar perubahan, lalu tombol Ubah Harga.
 */
@Composable
fun RiwayatHargaScreen(
    vm: PricingViewModel,
    produk: Produk,
    onBack: () -> Unit,
    onUbahHarga: () -> Unit
) {
    val ui by vm.history.collectAsState()

    LaunchedEffect(produk.id) { vm.loadHistory(produk) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Spacer(Modifier.height(6.dp))
            BackHeader(title = "Riwayat Harga", onBack = onBack)
            Text(
                "Lihat perubahan harga jual produk.",
                style = AppTypography.bodySmall,
                color = AppColors.TextSecondary,
                modifier = Modifier.padding(start = 40.dp)
            )
        }

        item { ProductSummaryCard(produk = ui.produk ?: produk) }

        item {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Perubahan Harga",
                    style = AppTypography.titleSmall,
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    "${ui.changes.size} perubahan",
                    style = AppTypography.labelSmall,
                    color = AppColors.TextMuted
                )
            }
        }

        if (ui.changes.isEmpty() && !ui.loading) {
            item {
                NoteBox(
                    text = "Belum ada perubahan harga tercatat. Setiap perubahan lewat aplikasi ini akan tercatat otomatis."
                )
            }
        }

        items(ui.changes) { change -> PriceChangeRow(change) }

        item {
            NoteBox(text = "Semua perubahan harga tersimpan otomatis untuk memudahkan pengecekan.")
            Spacer(Modifier.height(4.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
                    .clip(RoundedCornerShape(50))
                    .background(AppColors.Primary)
                    .clickable { onUbahHarga() },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "Ubah Harga",
                    style = AppTypography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(Modifier.height(16.dp))
        }
    }
}


@Composable
private fun PriceChangeRow(change: com.tokoberkah.owner.data.repository.PriceChange) {
    SoftCard(corner = 12) {
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                change.tanggal,
                style = AppTypography.labelSmall,
                color = AppColors.TextMuted
            )
            val naik = change.selisih >= 0
            Text(
                if (naik) "Harga naik" else "Harga turun",
                style = AppTypography.labelSmall,
                color = if (naik) AppColors.Success else AppColors.Danger,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(if (naik) AppColors.SuccessSoft else AppColors.DangerSoft)
                    .padding(horizontal = 7.dp, vertical = 3.dp)
            )
        }
        Spacer(Modifier.height(5.dp))
        Text(
            "${formatRupiah(change.hargaSebelum)} ➜ ${formatRupiah(change.hargaBaru)}",
            style = AppTypography.titleSmall,
            color = AppColors.TextPrimary,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(3.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "Oleh: ${change.olehNama}",
                    style = AppTypography.bodySmall,
                    color = AppColors.TextSecondary
                )
                if (!change.alasan.isNullOrBlank()) {
                    Text(
                        change.alasan,
                        style = AppTypography.labelSmall,
                        color = AppColors.TextMuted
                    )
                }
            }
            val sign = if (change.selisih >= 0) "+" else "-"
            Text(
                "$sign${formatRupiah(kotlin.math.abs(change.selisih))}",
                style = AppTypography.bodySmall,
                color = if (change.selisih >= 0) AppColors.Success else AppColors.Danger,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

