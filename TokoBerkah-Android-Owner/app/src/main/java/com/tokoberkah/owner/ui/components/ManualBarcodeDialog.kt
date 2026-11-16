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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography

/**
 * Dialog input barcode manual (dipakai saat kamera tidak bisa membaca
 * atau label barcode rusak). Tombol "Cari" mengembalikan kode ke pemanggil.
 */
@Composable
fun ManualBarcodeDialog(
    onDismiss: () -> Unit,
    onSearch: (String) -> Unit
) {
    var value by remember { mutableStateOf("") }
    val valid = value.trim().length >= 4

    androidx.compose.ui.window.Dialog(onDismissRequest = onDismiss) {
        Column(
            Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(Color.White)
                .padding(18.dp)
        ) {
            Text(
                "Input Barcode Manual",
                style = AppTypography.titleLarge,
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Ketik angka barcode/EAN yang tertera pada kemasan produk.",
                style = AppTypography.bodySmall,
                color = AppColors.TextSecondary
            )
            Spacer(Modifier.height(12.dp))
            BasicTextField(
                value = value,
                onValueChange = { value = it.filter { c -> c.isLetterOrDigit() }.take(32) },
                singleLine = true,
                textStyle = AppTypography.titleMedium.copy(color = AppColors.TextPrimary),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Search
                ),
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AppColors.PrimarySoftAlt)
                    .padding(horizontal = 12.dp, vertical = 14.dp),
                decorationBox = { inner ->
                    if (value.isEmpty()) {
                        Text("Contoh: 8998866200301", style = AppTypography.bodyMedium, color = AppColors.TextMuted)
                    }
                    inner()
                }
            )
            if (value.isNotEmpty() && !valid) {
                Spacer(Modifier.height(6.dp))
                Text(
                    "Barcode minimal 4 karakter.",
                    style = AppTypography.labelSmall,
                    color = AppColors.Danger
                )
            }
            Spacer(Modifier.height(16.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(
                    Modifier
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
                    Modifier
                        .weight(1f)
                        .height(42.dp)
                        .clip(RoundedCornerShape(50))
                        .background(if (valid) AppColors.Primary else AppColors.Primary.copy(alpha = 0.4f))
                        .clickable(enabled = valid) { onSearch(value.trim()) },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        "Cari Produk",
                        style = AppTypography.titleSmall,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}
