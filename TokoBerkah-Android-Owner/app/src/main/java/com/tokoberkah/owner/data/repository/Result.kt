package com.tokoberkah.owner.data.repository

/** Hasil operasi yang selalu bisa ditampilkan ke UI tanpa melempar exception. */
sealed interface Result<out T> {
    data class Success<T>(val data: T) : Result<T>
    data class Error(val message: String, val isNetwork: Boolean = false) : Result<Nothing>
}

/** Ubah exception jaringan menjadi pesan ramah pengguna. */
fun Throwable.toUserMessage(): String = when (this) {
    is java.net.UnknownHostException -> "Tidak ada koneksi internet. Periksa jaringan Anda."
    is java.net.SocketTimeoutException -> "Koneksi ke server terlalu lama. Coba lagi."
    is java.net.ConnectException -> "Tidak dapat terhubung ke server Toko Berkah."
    is retrofit2.HttpException -> when (code()) {
        401, 403 -> "Akses ditolak oleh server (401/403)."
        404 -> "Data tidak ditemukan di server (404)."
        in 500..599 -> "Server Toko Berkah sedang bermasalah (${code()})."
        else -> "Permintaan gagal (${code()})."
    }
    else -> message ?: "Terjadi kesalahan tak terduga."
}

fun Throwable.isNetworkIssue(): Boolean =
    this is java.net.UnknownHostException ||
        this is java.net.SocketTimeoutException ||
        this is java.net.ConnectException ||
        this is java.io.IOException

/** Bungkus blok suspend menjadi Result tanpa crash. */
suspend fun <T> safeCall(block: suspend () -> T): Result<T> = try {
    Result.Success(block())
} catch (e: kotlinx.coroutines.CancellationException) {
    throw e
} catch (e: Throwable) {
    Result.Error(e.toUserMessage(), e.isNetworkIssue())
}
