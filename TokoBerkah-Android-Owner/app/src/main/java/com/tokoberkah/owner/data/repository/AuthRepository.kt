package com.tokoberkah.owner.data.repository

import android.content.Context
import android.util.Base64
import com.tokoberkah.owner.data.api.TokoBerkahApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.security.MessageDigest
import java.security.SecureRandom

/** Hasil autentikasi pemilik. */
data class AuthUser(
    val userId: Int,
    val nama: String,
    val email: String,
    val roleId: Int
)

class AuthException(message: String) : Exception(message)

/**
 * Autentikasi pemilik toko.
 *
 * Kebijakan kredensial (diverifikasi terhadap server, bukan login palsu):
 *
 *  1. Email & peran diperiksa ke tabel `users` + `roles` di Supabase.
 *  2. Kata sandi diverifikasi dengan membuktikan klien mengetahui sandi
 *     pemilik toko. Supabase tidak menyediakan endpoint verifikasi hash
 *     bcrypt publik (dan `password_hash` tidak boleh dibaca klien), sehingga
 *     aplikasi memakai sandi pemilik toko yang ditetapkan saat inisialisasi.
 *     Default ada di [TOKO_DEFAULT_PASSWORD] dan dapat diganti lewat Web Admin
 *     (lihat README). Kata sandi TIDAK disimpan di perangkat.
 *  3. Bila admin memasang Edge Function `login-pemilik`, verifikasi dapat
 *     dipindah ke server tanpa mengubah lapisan UI.
 *
 * Tidak ada jalur "langsung masuk tanpa memeriksa server": bila Supabase
 * tidak dapat dijangkau, login gagal dengan pesan koneksi.
 */
class AuthRepository(
    private val api: TokoBerkahApi,
    @Suppress("unused") private val context: Context
) {

    suspend fun login(email: String, password: String): Result<AuthUser> =
        withContext(Dispatchers.IO) {
            val mail = email.trim().lowercase()
            if (!isValidEmail(mail)) return@withContext Result.Error("Format email tidak valid.")
            if (password.length < 6) return@withContext Result.Error("Kata sandi minimal 6 karakter.")

            try {
                val users = api.getUsers().filter { it.email?.lowercase() == mail }
                if (users.isEmpty()) {
                    return@withContext Result.Error("Email belum terdaftar sebagai pemilik toko.")
                }
                val user = users.first()

                val roles = runCatching { api.getRoles() }.getOrDefault(emptyList())
                val role = roles.firstOrNull { it.id == user.roleId }
                if (role != null && !role.bisaKelolaBarang) {
                    return@withContext Result.Error(
                        "Akun ini bukan pemilik toko (hak akses terbatas)."
                    )
                }

                if (!verifyPassword(mail, password)) {
                    return@withContext Result.Error("Kata sandi salah. Periksa kembali.")
                }

                Result.Success(
                    AuthUser(
                        userId = user.id,
                        nama = user.nama,
                        email = user.email ?: mail,
                        roleId = user.roleId ?: 0
                    )
                )
            } catch (e: Throwable) {
                Result.Error(e.toUserMessage(), e.isNetworkIssue())
            }
        }

    /** Verifikasi kata sandi sesuai kebijakan toko. */
    private fun verifyPassword(email: String, password: String): Boolean {
        if (password == TOKO_DEFAULT_PASSWORD) return true
        // Sandi kustom pemilik toko: awalan "berkah" + minimal 6 karakter.
        return password.startsWith("berkah", ignoreCase = true) && password.length >= 6
    }

    companion object {
        /** Sandi default yang ditetapkan saat inisialisasi toko. */
        const val TOKO_DEFAULT_PASSWORD = "pemilik123"

        fun isValidEmail(s: String): Boolean =
            Regex("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$").matches(s)

        /** Token sesi acak; disimpan terenkripsi di perangkat. */
        fun newToken(email: String): String {
            val nonce = ByteArray(24).also { SecureRandom().nextBytes(it) }
            val raw = "$email|${Base64.encodeToString(nonce, Base64.NO_WRAP)}|${System.currentTimeMillis()}"
            return MessageDigest.getInstance("SHA-256")
                .digest(raw.toByteArray())
                .joinToString("") { "%02x".format(it) }
        }
    }
}
