package com.tokoberkah.pos.data.api

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Klien REST langsung ke Supabase (PostgREST) — tanpa server perantara.
 * Kunci publishable dipakai untuk baca/tulis data; aturan baris (RLS) di
 * database menentukan apa yang boleh, sama seperti backend (backend/README.md).
 *
 * Login DUMMY: tidak ada pemeriksaan server (kunci rahasia tidak boleh ada
 * di aplikasi). Cukup isi email & sandi untuk masuk.
 *
 * Semua pemanggilan memakai thread latar — jangan dipanggil di UI thread.
 * Bila jaringan/RLS tidak tersedia, fungsi mengembalikan null dan halaman
 * menampilkan keadaan kosong/gagal (bukan data dummy).
 */
object ApiClient {

    /** Endpoint PostgREST Supabase (database tim, satu-satunya sumber data). */
    private const val BASE = "https://ejohssqnhhtaveelmter.supabase.co/rest/v1/"

    /** Kunci publishable (aman disimpan di aplikasi; dibatasi RLS). */
    private const val KEY = "sb_publishable_PGbNjr7ySv7Mvwh0hGn8Uw_lz7uAGLs"

    private val JSON = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    @Volatile
    var lastError: String? = null

    /** Hasil login. DITOLAK hanya bila email/sandi kosong; OFFLINE tak terpakai. */
    enum class LoginResult { OK, DITOLAK, OFFLINE }

    /**
     * Login dummy — server tidak diperiksa. Kredensial apa pun (yang terisi)
     * diterima; halaman login sudah memvalidasi isian kosong lebih dulu.
     */
    fun login(email: String, password: String): LoginResult {
        if (email.isBlank() || password.isBlank()) return LoginResult.DITOLAK
        return LoginResult.OK
    }

    /** GET (baca tabel); null bila gagal. `path` = "tabel?select=..." */
    fun get(path: String): String? = call("GET", path, null)

    /** POST (tulis baris); null bila gagal. */
    fun post(path: String, body: Any): String? = call("POST", path, body)

    /** PATCH (ubah baris); null bila gagal. */
    fun patch(path: String, body: Any): String? = call("PATCH", path, body)

    private fun call(method: String, path: String, body: Any?): String? {
        try {
            val builder = Request.Builder()
                .url(BASE + path)
                .header("apikey", KEY)
                .header("Authorization", "Bearer $KEY")
            val payload = body?.toString()?.toRequestBody(JSON)
            builder.method(method, payload)
            http.newCall(builder.build()).execute().use { res ->
                val text = res.body?.string() ?: ""
                if (res.isSuccessful) {
                    lastError = null
                    return text
                }
                // 404/406 PostgREST dipakai halaman untuk membedakan "tidak ada"
                lastError = "HTTP ${res.code}"
                return null
            }
        } catch (e: Exception) {
            lastError = e.message ?: "jaringan tidak tersedia"
            return null
        }
    }
}
