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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tokoberkah.owner.domain.Produk
import com.tokoberkah.owner.domain.formatRupiah
import com.tokoberkah.owner.ui.components.InfoChip
import com.tokoberkah.owner.ui.components.NoteBox
import com.tokoberkah.owner.ui.components.ProductThumb
import com.tokoberkah.owner.ui.components.ScanBarcodeButton
import com.tokoberkah.owner.ui.components.SoftCard
import com.tokoberkah.owner.ui.components.StockBadge
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography
import com.tokoberkah.owner.viewmodel.StockViewModel

/**
 * Menu Barang Masuk. Dua keadaan sesuai referensi:
 *  1. Belum ada produk -> tombol pindai + peringatan "Produk Baru Belum Terdaftar".
 *  2. Produk terpilih    -> form jumlah (dengan -/+, +5/+10/+20/+50),
 *                          harga beli per unit, total nilai, estimasi stok.
 */
@Composable
fun BarangMasukScreen(
    vm: StockViewModel,
    onScan: () -> Unit
) {
    val ui by vm.form.collectAsState()
    val produk = ui.produk

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.Background)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 14.dp)
    ) {
        Spacer(Modifier.height(10.dp))
        ScanBarcodeButton(onClick = onScan)

        if (produk == null) {
            Spacer(Modifier.height(60.dp))
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                Text(
                    "Pindai Kode Batang untuk memasukkan barang",
                    style = AppTypography.bodySmall,
                    color = AppColors.TextMuted
                )
            }
            Spacer(Modifier.height(80.dp))
            NewProductWarning()
        } else {
            Spacer(Modifier.height(12.dp))
            MasukForm(vm = vm, ui = ui, produk = produk)
        }
        Spacer(Modifier.height(18.dp))
    }
}


/** Peringatan produk belum terdaftar (referensi kotak abu-abu). */
@Composable
fun NewProductWarning(modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF1F3F7))
            .border(1.dp, AppColors.Divider, RoundedCornerShape(12.dp))
            .padding(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Text("📍", fontSize = 13.sp)
        Spacer(Modifier.width(8.dp))
        Column {
            Text(
                "Produk Baru Belum Terdaftar?",
                style = AppTypography.titleSmall,
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Jika barcode belum dikenali, daftarkan nama produk & harga modal melalui Web Admin Toko Berkah di komputer kasir.",
                style = AppTypography.bodySmall,
                color = AppColors.TextSecondary
            )
        }
    }
}

/** Formulir barang masuk lengkap. */
@Composable
private fun MasukForm(
    vm: StockViewModel,
    ui: com.tokoberkah.owner.viewmodel.BarangMasukUi,
    produk: Produk
) {
    SoftCard(corner = 14) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            ProductThumb(produk, 52)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "Stok: ${produk.stok} ${produk.satuan}",
                    style = AppTypography.labelSmall,
                    color = AppColors.TextMuted
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    produk.nama,
                    style = AppTypography.titleLarge,
                    color = AppColors.TextPrimary,
                    fontWeight = FontWeight.Bold,
                    maxLines = 2
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    produk.kategoriNama.ifBlank { "Umum" },
                    style = AppTypography.bodySmall,
                    color = AppColors.TextSecondary
                )
            }
        }
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            InfoChip(text = "▮▮ ${produk.barcode}")
            InfoChip(text = produk.kategoriNama.ifBlank { "Umum" })
        }
        Spacer(Modifier.height(12.dp))

        // --- Jumlah masuk ---
        Text(
            "Jumlah Masuk",
            style = AppTypography.titleSmall,
            color = AppColors.TextPrimary,
            fontWeight = FontWeight.Bold
        )
        Text(
            produk.satuan,
            style = AppTypography.labelSmall,
            color = AppColors.TextMuted
        )
        Spacer(Modifier.height(8.dp))
        QtyStepper(
            jumlah = ui.jumlah,
            onMinus = { vm.addJumlah(-1) },
            onPlus = { vm.addJumlah(1) }
        )
        Spacer(Modifier.height(8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf(5, 10, 20, 50).forEach { n ->
                QuickAddChip(text = "+$n", onClick = { vm.addJumlah(n) })
            }
        }

        Spacer(Modifier.height(14.dp))
        Text(
            "Harga Beli per ${produk.satuan}",
            style = AppTypography.titleSmall,
            color = AppColors.TextPrimary,
            fontWeight = FontWeight.Bold
        )
        Spacer(Modifier.height(6.dp))
        HargaBeliField(
            value = ui.hargaBeli,
            onValueChange = { vm.setHargaBeli(it) }
        )
        Text(
            "Opsional. Harga beli tidak mengubah harga jual produk.",
            style = AppTypography.labelSmall,
            color = AppColors.TextMuted
        )

        Spacer(Modifier.height(12.dp))
        Row(
            Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SummaryTile(
                label = "Stok setelah disimpan",
                value = "${ui.stokSetelah} ${produk.satuan} (+${ui.jumlah})",
                modifier = Modifier.weight(1f)
            )
            SummaryTile(
                label = "Total nilai barang masuk",
                value = formatRupiah(ui.totalNilai),
                modifier = Modifier.weight(1f)
            )
        }

        val err = ui.error
        if (err != null) {
            Spacer(Modifier.height(10.dp))
            NoteBox(text = err, icon = "⚠️", background = AppColors.DangerSoft)
        }

        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(50))
                    .background(
                        if (ui.valid && !ui.saving)
                            Brush.horizontalGradient(listOf(AppColors.Primary, AppColors.PrimaryDark))
                        else
                            Brush.horizontalGradient(listOf(AppColors.Primary.copy(alpha = 0.45f), AppColors.Primary.copy(alpha = 0.45f)))
                    )
                    .clickable(enabled = ui.valid && !ui.saving) {
                        vm.simpan { _, _ -> }
                    },
                contentAlignment = Alignment.Center
            ) {
                if (ui.saving) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(15.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Menyimpan…", color = Color.White, style = AppTypography.titleSmall)
                    }
                } else {
                    Text("Simpan", style = AppTypography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(46.dp)
                    .clip(RoundedCornerShape(50))
                    .background(AppColors.Primary)
                    .clickable { vm.startFor(null) },
                contentAlignment = Alignment.Center
            ) {
                Text("Batalkan", style = AppTypography.titleSmall, color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun HargaBeliField(value: String, onValueChange: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(AppColors.PrimarySoftAlt)
            .padding(horizontal = 12.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text("Rp", style = AppTypography.bodyLarge, color = AppColors.TextSecondary, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.width(8.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = true,
            textStyle = AppTypography.titleMedium.copy(color = AppColors.TextPrimary),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
            modifier = Modifier.weight(1f),
            decorationBox = { inner ->
                if (value.isEmpty()) {
                    Text("0", style = AppTypography.titleMedium, color = AppColors.TextMuted)
                }
                inner()
            }
        )
        Icon(Icons.Filled.Edit, contentDescription = null, tint = AppColors.TextMuted, modifier = Modifier.size(15.dp))
    }
}

@Composable
private fun SummaryTile(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(AppColors.PrimarySoftAlt)
            .padding(horizontal = 10.dp, vertical = 8.dp)
    ) {
        Text(label, style = AppTypography.labelSmall.copy(fontSize = 9.sp), color = AppColors.TextSecondary)
        Spacer(Modifier.height(2.dp))
        Text(value, style = AppTypography.titleSmall, color = AppColors.TextPrimary, fontWeight = FontWeight.Bold)
    }
}


@Composable
private fun QuickAddChip(text: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(AppColors.PrimarySoft)
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        Text(
            text,
            style = AppTypography.labelSmall,
            color = AppColors.PrimaryDark,
            fontWeight = FontWeight.SemiBold
        )
    }
}

@Composable
private fun QtyStepper(jumlah: Int, onMinus: () -> Unit, onPlus: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        StepperButton(
            icon = Icons.Filled.Remove,
            enabled = jumlah > 1,
            filled = false,
            onClick = onMinus
        )
        Text(
            "$jumlah",
            style = AppTypography.headlineMedium.copy(fontSize = 24.sp),
            color = AppColors.TextPrimary,
            fontWeight = FontWeight.Bold
        )
        StepperButton(
            icon = Icons.Filled.Add,
            enabled = true,
            filled = true,
            onClick = onPlus
        )
    }
}

@Composable
private fun StepperButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    enabled: Boolean,
    filled: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(34.dp)
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
            icon,
            contentDescription = null,
            tint = when {
                filled -> Color.White
                !enabled -> AppColors.TextMuted
                else -> AppColors.PrimaryDark
            },
            modifier = Modifier.size(17.dp)
        )
    }
}

