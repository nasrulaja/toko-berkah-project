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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tokoberkah.owner.data.repository.AuthRepository
import com.tokoberkah.owner.ui.components.BoxLogo
import com.tokoberkah.owner.ui.theme.AppColors
import com.tokoberkah.owner.ui.theme.AppTypography
import com.tokoberkah.owner.viewmodel.AuthViewModel

/**
 * Halaman login pemilik toko (referensi: logo bulat biru, judul "Toko Berkah",
 * subjudul "Aplikasi Khusus Pemilik Toko", dua field biru muda, tombol biru).
 */
@Composable
fun LoginScreen(vm: AuthViewModel) {
    val loading by vm.loading.collectAsState()
    val error by vm.error.collectAsState()
    val lastEmail by vm.lastEmail.collectAsState()

    LoginContent(
        loading = loading,
        error = error,
        lastEmail = lastEmail,
        onLogin = { e, p -> vm.login(e, p) },
        onClearError = { vm.clearError() }
    )
}

/** Versi tanpa ViewModel — dipakai untuk pratinjau & tangkapan layar dokumentasi. */
@Composable
fun LoginContent(
    loading: Boolean,
    error: String?,
    lastEmail: String,
    initialEmail: String = AuthRepository.TOKO_DEMO_EMAIL,
    initialPassword: String = AuthRepository.TOKO_DEFAULT_PASSWORD,
    onLogin: (String, String) -> Unit,
    onClearError: () -> Unit
) {
    var email by rememberSaveable { mutableStateOf(initialEmail) }
    var password by rememberSaveable { mutableStateOf(initialPassword) }
    var showPassword by rememberSaveable { mutableStateOf(false) }
    var localError by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(lastEmail) {
        // Email yang terakhir dipakai menang; bila belum ada, tetap tampil akun demo.
        if (lastEmail.isNotBlank()) email = lastEmail
    }

    fun submit() {
        localError = null
        when {
            !AuthRepository.isValidEmail(email.trim()) ->
                localError = "Masukkan email pemilik dengan format yang benar."
            password.length < 6 -> localError = "Kata sandi minimal 6 karakter."
            else -> onLogin(email.trim(), password)
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(AppColors.Background),
        contentAlignment = Alignment.TopCenter
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 22.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(64.dp))
            BoxLogo(size = 62.dp)
            Spacer(Modifier.height(14.dp))
            Text(
                text = "Toko Berkah",
                style = AppTypography.displaySmall,
                color = AppColors.TextPrimary,
                fontWeight = FontWeight.Bold
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "Aplikasi Khusus Pemilik Toko",
                style = AppTypography.bodySmall,
                color = AppColors.TextSecondary,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(30.dp))

            FieldLabel("Email Pemilik")
            Spacer(Modifier.height(6.dp))
            LoginField(
                value = email,
                onValueChange = { email = it; localError = null },
                placeholder = "pemilik@tokoberkah.com",
                leading = Icons.Filled.Email,
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next
            )
            Spacer(Modifier.height(14.dp))
            FieldLabel("Kata Sandi")
            Spacer(Modifier.height(6.dp))
            LoginField(
                value = password,
                onValueChange = { password = it; localError = null },
                placeholder = "••••••••",
                leading = Icons.Filled.Lock,
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done,
                isPassword = true,
                showPassword = showPassword,
                onToggleShow = { showPassword = !showPassword },
                onDone = { submit() }
            )

            val shown = localError ?: error
            if (shown != null) {
                Spacer(Modifier.height(10.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(AppColors.DangerSoft)
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("⚠️", fontSize = 12.sp)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        shown,
                        style = AppTypography.bodySmall,
                        color = AppColors.Danger,
                        modifier = Modifier.weight(1f)
                    )
                    Text(
                        "✕",
                        style = AppTypography.bodySmall,
                        color = AppColors.Danger,
                        modifier = Modifier.clickable { localError = null; onClearError() }
                    )
                }
            }

            Spacer(Modifier.height(22.dp))
            PrimaryLoginButton(loading = loading, onClick = { submit() })
            Spacer(Modifier.height(16.dp))
            Text(
                text = "Gunakan akun pemilik yang terdaftar di Web Admin Toko Berkah.",
                style = AppTypography.bodySmall,
                color = AppColors.TextMuted,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(32.dp))
        }
    }
}


@Composable
private fun FieldLabel(text: String) {
    Text(
        text = text,
        style = AppTypography.labelMedium,
        color = AppColors.TextPrimary,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.fillMaxWidth()
    )
}

/** Field login bergaya biru muda dengan ikon kiri dan (opsional) mata sandi. */
@Composable
private fun LoginField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    leading: androidx.compose.ui.graphics.vector.ImageVector,
    keyboardType: KeyboardType,
    imeAction: ImeAction,
    isPassword: Boolean = false,
    showPassword: Boolean = false,
    onToggleShow: () -> Unit = {},
    onDone: () -> Unit = {}
) {
    TextField(
        value = value,
        onValueChange = onValueChange,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp)),
        placeholder = {
            Text(placeholder, style = AppTypography.bodyMedium, color = AppColors.TextMuted)
        },
        leadingIcon = {
            Icon(leading, contentDescription = null, tint = AppColors.TextSecondary, modifier = Modifier.size(18.dp))
        },
        trailingIcon = if (isPassword) {
            {
                IconButton(onClick = onToggleShow) {
                    Icon(
                        imageVector = if (showPassword) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                        contentDescription = "Tampilkan sandi",
                        tint = AppColors.TextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        } else null,
        visualTransformation = if (isPassword && !showPassword) PasswordVisualTransformation()
        else VisualTransformation.None,
        singleLine = true,
        textStyle = AppTypography.bodyLarge.copy(color = AppColors.TextPrimary),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
        keyboardActions = androidx.compose.foundation.text.KeyboardActions(
            onDone = { onDone() }
        ),
        shape = RoundedCornerShape(12.dp),
        colors = TextFieldDefaults.colors(
            focusedContainerColor = AppColors.Field,
            unfocusedContainerColor = AppColors.Field,
            disabledContainerColor = AppColors.Field,
            focusedIndicatorColor = Color.Transparent,
            unfocusedIndicatorColor = Color.Transparent,
            disabledIndicatorColor = Color.Transparent,
            cursorColor = AppColors.Primary
        )
    )
}

@Composable
private fun PrimaryLoginButton(loading: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(50))
            .background(Brush.horizontalGradient(listOf(AppColors.Primary, AppColors.PrimaryDark)))
            .clickable(enabled = !loading) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        if (loading) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(
                    color = Color.White,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(Modifier.width(10.dp))
                Text("Memeriksa…", color = Color.White, style = AppTypography.titleSmall)
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Masuk ke Toko",
                    style = AppTypography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.Bold
                )
                Spacer(Modifier.width(8.dp))
                Text("→", color = Color.White, style = AppTypography.titleSmall)
            }
        }
    }
}

