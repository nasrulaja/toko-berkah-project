package com.tokoberkah.pos.data.api

import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Klien REST backend Toko Berkah (lihat backend/README.md).
 * Semua pemanggilan memakai thread latar — jangan dipanggil di UI thread.
 *
 * Bila server/jaringan tidak tersedia, fungsi mengembalikan null dan halaman
 * menampilkan keadaan kosong/gagal (bukan data dummy).
 */
object ApiClient {

    /**
     * Basis URL yang dicoba berurutan:
     * 1. IP LAN komputer (deploy — HP & komputer di jaringan sama);
     * 2. localhost lewat `adb reverse tcp:3000 tcp:3000` (pengembangan via USB).
     * Ganti/diurutkan ulang sesuai lingkungan tim.
     */
    private val BASES = listOf(
        "http://172.18.143.37:3000/api/",
        "http://127.0.0.1:3000/api/"
    )

    @Volatile
    private var baseIndex = 0

    private val JSON = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(8, TimeUnit.SECONDS)
        .build()

    @Volatile
    private var token: String? = null

    @Volatile
    var lastError: String? = null
        private set

    /** Hasil percobaan login ke backend. */
    enum class LoginResult { OK, DITOLAK, OFFLINE }

    /**
     * Login nyata (POST /api/auth/login) — token pengguna dipakai untuk semua
     * panggilan berikutnya. DIPANGGIL DI THREAD LATAR.
     * DITOLAK = server menolak sandi; OFFLINE = server tak terjangkau.
     */
    @Synchronized
    fun login(email: String, password: String): LoginResult {
        val payload = JSONObject().put("email", email).put("password", password)
        for (i in BASES.indices) {
            val idx = (baseIndex + i) % BASES.size
            try {
                http.newCall(
                    Request.Builder()
                        .url(BASES[idx] + "auth/login")
                        .method("POST", payload.toString().toRequestBody(JSON))
                        .build()
                ).execute().use { res ->
                    baseIndex = idx
                    if (res.isSuccessful) {
                        val t = try {
                            JSONObject(res.body?.string() ?: "").optString("token")
                        } catch (e: Exception) {
                            ""
                        }
                        if (t.isEmpty()) {
                            lastError = "respons login tidak valid"
                            return LoginResult.OFFLINE
                        }
                        token = t
                        return LoginResult.OK
                    }
                    if (res.code == 401) return LoginResult.DITOLAK
                    lastError = "HTTP ${res.code}"
                    return LoginResult.OFFLINE
                }
            } catch (e: Exception) {
                lastError = e.message ?: "jaringan tidak tersedia"
            }
        }
        return LoginResult.OFFLINE
    }

    /** GET terautentikasi; null bila gagal. */
    fun get(path: String): String? {
        val t = ensureToken() ?: return null
        return call(path) { base ->
            Request.Builder()
                .url(base + path)
                .header("Authorization", "Bearer $t")
                .get()
        }
    }

    /** POST JSON terautentikasi; null bila gagal. */
    fun post(path: String, body: JSONObject): String? = write("POST", path, body)

    /** PATCH JSON terautentikasi; null bila gagal. */
    fun patch(path: String, body: JSONObject): String? = write("PATCH", path, body)

    private fun write(method: String, path: String, body: JSONObject): String? {
        val t = ensureToken() ?: return null
        return call(path) { base ->
            Request.Builder()
                .url(base + path)
                .header("Authorization", "Bearer $t")
                .method(method, body.toString().toRequestBody(JSON))
        }
    }

    /**
     * Coba setiap basis URL sampai ada yang menjawab. Basis yang menjawab
     * (bahkan dengan galat HTTP) diingat agar panggilan berikutnya langsung
     * memakainya; basis hanya diputar bila benar-benar tak terjangkau.
     */
    private fun call(path: String, build: (String) -> Request.Builder): String? {
        var last: String? = null
        for (i in BASES.indices) {
            val idx = (baseIndex + i) % BASES.size
            try {
                http.newCall(build(BASES[idx]).build()).execute().use { res ->
                    baseIndex = idx
                    if (res.isSuccessful) return res.body?.string()
                    lastError = "HTTP ${res.code}"
                    return null
                }
            } catch (e: Exception) {
                last = e.message ?: "jaringan tidak tersedia"
            }
        }
        lastError = last
        return null
    }

    /** Token perangkat (POST /api/auth/device), di-cache selama proses hidup. */
    @Synchronized
    private fun ensureToken(): String? {
        token?.let { return it }
        val body = call("auth/device") { base ->
            Request.Builder()
                .url(base + "auth/device")
                .post("""{"client":"android"}""".toRequestBody(JSON))
        } ?: return null
        return try {
            JSONObject(body).optString("token").ifEmpty { null }.also { token = it }
        } catch (e: Exception) {
            lastError = "respons token tidak valid"
            null
        }
    }
}
