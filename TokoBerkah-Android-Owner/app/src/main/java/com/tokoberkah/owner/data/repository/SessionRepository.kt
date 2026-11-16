package com.tokoberkah.owner.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.sessionStore by preferencesDataStore(name = "tokoberkah_session")

/** Data sesi login pemilik yang dipersist dengan aman. */
data class Session(
    val userId: Int,
    val nama: String,
    val email: String,
    val roleId: Int,
    val token: String,
    val loginAt: Long
)

/**
 * Menyimpan sesi login. Token disimpan di EncryptedSharedPreferences
 * (Android Keystore), metadata ringan di DataStore.
 */
class SessionRepository(private val context: Context) {

    private val tokenKey = stringPreferencesKey("session_token")
    private val lastEmailKey = stringPreferencesKey("last_email")
    private val userIdKey = longPreferencesKey("user_id")
    private val namaKey = stringPreferencesKey("nama")
    private val emailKey = stringPreferencesKey("email")
    private val roleKey = longPreferencesKey("role_id")
    private val loginAtKey = longPreferencesKey("login_at")

    private val securePrefs by lazy {
        runCatching {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                context,
                "tokoberkah_secure",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        }.getOrNull()
    }

    val session: Flow<Session?> = context.sessionStore.data.map { p ->
        val uid = p[userIdKey]?.toInt() ?: return@map null
        val token = securePrefs?.getString("token", null) ?: p[tokenKey]
        if (token.isNullOrBlank()) return@map null
        Session(
            userId = uid,
            nama = p[namaKey].orEmpty(),
            email = p[emailKey].orEmpty(),
            roleId = (p[roleKey] ?: 0L).toInt(),
            token = token,
            loginAt = p[loginAtKey] ?: 0L
        )
    }

    /** Email terakhir yang dipakai, untuk mengisi otomatis field login. */
    val lastEmail: Flow<String?> = context.sessionStore.data.map { it[lastEmailKey] }

    suspend fun save(session: Session) {
        securePrefs?.edit()?.putString("token", session.token)?.apply()
        context.sessionStore.edit { p ->
            p[userIdKey] = session.userId.toLong()
            p[namaKey] = session.nama
            p[emailKey] = session.email
            p[emailKey] = session.email
            p[roleKey] = session.roleId.toLong()
            p[loginAtKey] = session.loginAt
            p[lastEmailKey] = session.email
            // token dicadangkan di DataStore bila Keystore tidak tersedia,
            // agar sesi tidak hilang di perangkat tanpa hardware keystore.
            if (securePrefs == null) p[tokenKey] = session.token
        }
    }

    suspend fun rememberEmail(email: String) {
        context.sessionStore.edit { it[lastEmailKey] = email }
    }

    suspend fun clear() {
        securePrefs?.edit()?.remove("token")?.apply()
        context.sessionStore.edit { p ->
            p.remove(tokenKey); p.remove(userIdKey); p.remove(namaKey)
            p.remove(emailKey); p.remove(roleKey); p.remove(loginAtKey)
        }
    }

    suspend fun current(): Session? = session.first()
}
