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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoveToInbox
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography

/** Item menu bawah: sesuai referensi (Cek Harga, Cek Stok, Masuk). */
enum class BottomTab(val label: String, val icon: ImageVector) {
    CEK_HARGA("Cek Harga", Icons.Filled.QrCodeScanner),
    CEK_STOK("Cek Stok", Icons.Filled.Storage),
    MASUK("Masuk", Icons.Filled.MoveToInbox)
}

/**
 * Bottom navigation mengikuti referensi:
 * label kecil di kanan, ikon di dalam pill biru saat aktif.
 */
@Composable
fun BottomBar(
    current: BottomTab,
    onSelect: (BottomTab) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.fillMaxWidth().background(Color.White)) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(AppColors.Divider)
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
            verticalAlignment = Alignment.CenterVertically
        ) {
            BottomTab.entries.forEach { tab ->
                val active = tab == current
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .clickable { onSelect(tab) }
                        .padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(width = 44.dp, height = 30.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(if (active) AppColors.Primary else Color.Transparent),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = tab.icon,
                                contentDescription = tab.label,
                                tint = if (active) Color.White else AppColors.TextMuted,
                                modifier = Modifier.size(if (tab == BottomTab.MASUK) 19.dp else 18.dp)
                            )
                        }
                        Spacer(Modifier.height(3.dp))
                        Text(
                            text = tab.label,
                            style = AppTypography.labelSmall,
                            color = if (active) AppColors.TextPrimary else AppColors.TextSecondary,
                            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium
                        )
                    }
                }
            }
        }
    }
}
