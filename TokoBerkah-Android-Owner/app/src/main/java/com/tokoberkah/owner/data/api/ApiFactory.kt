package com.tokoberkah.owner.data.api

import com.tokoberkah.owner.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Pembuat instance Retrofit untuk PostgREST Supabase.
 * BASE_URL diambil dari BuildConfig sehingga bisa diubah tanpa menyentuh kode
 * (lihat README bagian "Cara mengatur BASE_URL").
 */
object ApiFactory {

    const val DEFAULT_BASE_URL = BuildConfig.BASE_URL
    const val ANON_KEY = BuildConfig.SUPABASE_ANON_KEY

    /** Header Supabase dipasang otomatis di setiap permintaan. */
    fun buildHeaders(): Map<String, String> = supabaseHeaders(ANON_KEY)

    fun create(baseUrl: String = DEFAULT_BASE_URL): TokoBerkahApi {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
            else HttpLoggingInterceptor.Level.NONE
        }
        val client = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val req = chain.request().newBuilder()
                buildHeaders().forEach { (k, v) -> req.header(k, v) }
                chain.proceed(req.build())
            }
            .addInterceptor(logging)
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()

        return Retrofit.Builder()
            .baseUrl(restBaseUrl(baseUrl))
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(TokoBerkahApi::class.java)
    }

    /**
     * PostgREST berada di /rest/v1 dari root Supabase, jadi base URL Retrofit
     * harus diakhiri /rest/v1/.
     */
    fun restBaseUrl(raw: String): String {
        var trimmed = raw.trim().trimEnd('/')
        // buang sufiks REST bila pengguna menuliskannya sendiri
        trimmed = trimmed.removeSuffix("/rest/v1")
        return "$trimmed/rest/v1/"
    }
}
