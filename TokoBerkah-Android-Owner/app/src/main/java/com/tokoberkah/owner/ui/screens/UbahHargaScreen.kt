package com.tokoberkah.owner.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tokoberkah.owner.domain.Produk
import com.tokoberkah.owner.domain.formatRupiah
import com.tokoberkah.owner.ui.components.BackHeader
import com.tokoberkah.owner.ui.components.InfoChip
import com.tokoberkah.owner.ui.components.NoteBox
import com.tokoberkah.owner.ui.components.ProductThumb
import com.tokoberkah.owner.ui.components.SoftCard
import com.tokoberkah.owner.ui.components.StockBadge
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography
import com.tokoberkah.owner.viewmodel.PricingViewModel

/**
 * Ubah Harga (referensi "3. Ubah Harga"):
 * info produk, harga saat ini, input harga baru, indikator kenaikan/penurunan,
 * alasan perubahan, info "berlaku setelah disimpan", Simpan + Batal.
 */
@Composable
fun UbahHargaScreen(
    vm: PricingViewModel,
    produk: Produk,
    onBack: () -> Unit,
    onSaved: (String) -> Unit
) {
    val ui by vm.change.collectAsState()
    var showConfirm by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(produk.id) { vm.startChange(produk) }

    LaunchedEffect(ui.success) {
        if (ui.success) {
            onSaved("Harga berhasil diperbarui menjadi ${formatRupiah(ui.hargaBaru ?: produk.hargaJual)}.")
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp)
    ) {
        Spacer(Modifier.height(6.dp))
        BackHeader(title = "Ubah Harga", onBack = onBack)
        Text(
            "Perbarui harga jual untuk kasir.",
            style = AppTypography.bodySmall,
            color = AppColors.TextSecondary,
            modifier = Modifier.padding(start = 40.dp)
        )
        Spacer(Modifier.height(12.dp))

        SoftCard(corner = 14) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                InfoChip(text = "▮▮▮ ${produk.barcode}", modifier = Modifier.weight(1f, fill = false))
                InfoChip(text = produk.kategoriNama.ifBlank { "Umum" })
            }
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                ProductThumb(produk, 54)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    StockBadge(produk.status)
                    Spacer(Modifier.height(5.dp))
                    Text(
                        produk.nama,
                        style = AppTypography.titleMedium,
                        color = AppColors.TextPrimary,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Lokasi: ${produk.rak}",
                        style = AppTypography.bodySmall,
                        color = AppColors.TextSecondary
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            PriceBox(produk)
        }

        Spacer(Modifier.height(14.dp))
        Text(
            "Detail Harga Baru",
            style = AppTypography.titleSmall,
            color = AppColors.TextPrimary,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(10.dp))

        Text("Harga jual baru", style = AppTypography.bodySmall, color = AppColors.TextSecondary)
        Spacer(Modifier.height(6.dp))
        PriceInputField(
            value = ui.inputHarga,
            onValueChange = { vm.setInputHarga(it) }
        )
        Spacer(Modifier.height(6.dp))
        PriceDeltaText(delta = ui.selisih, percent = ui.selisihPersen)

        Spacer(Modifier.height(14.dp))
        Text("Alasan perubahan", style = AppTypography.bodySmall, color = AppColors.TextSecondary)
        Spacer(Modifier.height(6.dp))
        AlasanField(value = ui.alasan, onValueChange = { vm.setAlasan(it) })
        Spacer(Modifier.height(4.dp))
        Text(
            "Alasan akan dicatat dalam riwayat harga.",
            style = AppTypography.labelSmall,
            color = AppColors.TextMuted
        )

        Spacer(Modifier.height(14.dp))
        NoteBox(
            text = "Harga kasir akan diperbarui menjadi ${formatRupiah(ui.hargaBaru ?: produk.hargaJual)} per ${produk.satuan}. Pastikan harga sudah sesuai.",
            icon = "🕓",
            background = AppColors.PrimarySoft
        )

        val shownError = ui.error
        if (shownError != null) {
            Spacer(Modifier.height(10.dp))
            NoteBox(text = shownError, icon = "⚠️", background = AppColors.DangerSoft)
        }

        Spacer(Modifier.height(14.dp))
        PrimaryActionButton(
            text = "Simpan Harga Baru",
            enabled = ui.valid && !ui.saving,
            loading = ui.saving,
            onClick = { showConfirm = true }
        )
        Spacer(Modifier.height(8.dp))
        SecondaryActionButton(text = "Batal", onClick = onBack)
        Spacer(Modifier.height(20.dp))
    }

    if (showConfirm) {
        ConfirmPriceDialog(
            produkNama = produk.nama,
            hargaLama = produk.hargaJual,
            hargaBaru = ui.hargaBaru ?: produk.hargaJual,
            onDismiss = { showConfirm = false },
            onConfirm = {
                showConfirm = false
                vm.save { }
            }
        )
    }
}

/** Dialog konfirmasi sebelum harga disimpan. */
@Composable
private fun ConfirmPriceDialog(
    produkNama: String,
    hargaLama: Double,
    hargaBaru: Double,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Color.White)
                .padding(18.dp)
        ) {
            Text(
                "Simpan harga baru?",
                style = AppTypography.titleLarge,
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(8.dp))
            Text(
                produkNama,
                style = AppTypography.bodyMedium,
                color = AppColors.TextSecondary
            )
            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    formatRupiah(hargaLama),
                    style = AppTypography.titleMedium,
                    color = AppColors.TextMuted
                )
                Text("  ➜  ", color = AppColors.TextMuted)
                Text(
                    formatRupiah(hargaBaru),
                    style = AppTypography.titleMedium,
                    color = AppColors.PrimaryDark,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(Modifier.height(18.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(42.dp)
                        .clip(RoundedCornerShape(50))
                        .background(AppColors.PrimarySoft)
                        .clickable { onDismiss() },
                    contentAlignment = Alignment.Center
                ) {
                    Text("Batal", style = AppTypography.titleSmall, color = AppColors.PrimaryDark)
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(42.dp)
                        .clip(RoundedCornerShape(50))
                        .background(AppColors.Primary)
                        .clickable { onConfirm() },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Simpan",
                        style = AppTypography.titleSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun AlasanField(value: String, onValueChange: (String) -> Unit) {
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        textStyle = AppTypography.bodyMedium.copy(color = AppColors.TextPrimary),
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(AppColors.Background)
            .border(1.dp, AppColors.Divider, RoundedCornerShape(10.dp))
            .padding(12.dp),
        decorationBox = { inner ->
            if (value.isEmpty()) {
                Text(
                    "Contoh: penyesuaian harga dari pemasok",
                    style = AppTypography.bodyMedium,
                    color = AppColors.TextMuted
                )
            }
            inner()
        }
    )
}

@Composable
private fun PrimaryActionButton(
    text: String,
    enabled: Boolean,
    loading: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(46.dp)
            .clip(RoundedCornerShape(50))
            .background(if (enabled) AppColors.Primary else AppColors.Primary.copy(alpha = 0.45f))
            .clickable(enabled = enabled) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        if (loading) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(8.dp))
                Text("Menyimpan…", color = Color.White, style = AppTypography.titleSmall)
            }
        } else {
            Text(text, style = AppTypography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun SecondaryActionButton(text: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(44.dp)
            .clip(RoundedCornerShape(50))
            .background(AppColors.PrimarySoft)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        Text(text, style = AppTypography.titleSmall, color = AppColors.PrimaryDark, fontWeight = FontWeight.SemiBold)
    }
}



/** Input harga bergaya referensi: latar biru muda, border biru saat diisi. */
@Composable
private fun PriceInputField(value: String, onValueChange: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AppColors.PrimarySoftAlt)
            .border(1.5.dp, AppColors.Primary, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            "Rp",
            style = AppTypography.bodyLarge,
            color = AppColors.TextSecondary,
            fontWeight = FontWeight.SemiBold
        )
        Spacer(Modifier.width(8.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = AppTypography.headlineSmall.copy(color = AppColors.TextPrimary),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Number,
                imeAction = ImeAction.Done
            ),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                if (value.isEmpty()) {
                    Text("0", style = AppTypography.headlineSmall, color = AppColors.TextMuted)
                }
                inner()
            }
        )
    }
}

/** Teks otomatis "Naik Rp1.000 (+2,9%) dari harga saat ini". */
@Composable
private fun PriceDeltaText(delta: Double?, percent: Double?) {
    if (delta == null || delta == 0.0) {
        Text(
            "Harga belum berubah",
            style = AppTypography.labelSmall,
            color = AppColors.TextMuted
        )
        return
    }
    val naik = delta > 0
    val nominal = formatRupiah(kotlin.math.abs(delta))
    val persenTxt = percent?.let { " (${"%.1f".format(kotlin.math.abs(it))}%)" } ?: ""
    Text(
        text = if (naik) "Naik $nominal$persenTxt dari harga saat ini"
        else "Turun $nominal$persenTxt dari harga saat ini",
        style = AppTypography.labelSmall,
        color = if (naik) AppColors.Success else AppColors.Danger,
        fontWeight = FontWeight.SemiBold
    )
}

