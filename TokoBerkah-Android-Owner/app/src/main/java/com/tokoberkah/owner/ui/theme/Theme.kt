package com.tokoberkah.owner.ui.theme

import android.app.Activity
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowCompat

private val LightScheme = lightColorScheme(
    primary = AppColors.Primary,
    onPrimary = androidx.compose.ui.graphics.Color.White,
    primaryContainer = AppColors.PrimarySoft,
    onPrimaryContainer = AppColors.TextPrimary,
    secondary = AppColors.PrimaryDark,
    onSecondary = androidx.compose.ui.graphics.Color.White,
    background = AppColors.Background,
    onBackground = AppColors.TextPrimary,
    surface = AppColors.Surface,
    onSurface = AppColors.TextPrimary,
    surfaceVariant = AppColors.PrimarySoft,
    onSurfaceVariant = AppColors.TextSecondary,
    error = AppColors.Danger,
    onError = androidx.compose.ui.graphics.Color.White,
    outline = AppColors.Divider,
    outlineVariant = AppColors.Divider
)

val AppShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(12.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(18.dp),
    extraLarge = RoundedCornerShape(24.dp)
)

@Composable
fun TokoBerkahTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }
    MaterialTheme(
        colorScheme = LightScheme,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}
