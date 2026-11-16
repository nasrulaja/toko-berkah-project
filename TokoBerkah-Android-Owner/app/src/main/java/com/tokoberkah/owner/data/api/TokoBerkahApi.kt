package com.tokoberkah.owner.data.api

import com.tokoberkah.owner.data.models.KategoriDto
import com.tokoberkah.owner.data.models.ProdukDto
import com.tokoberkah.owner.data.models.RoleDto
import com.tokoberkah.owner.data.models.StokMutasiDto
import com.tokoberkah.owner.data.models.UserDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.HeaderMap
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Query

/**
 * Retrofit + PostgREST (Supabase) yang SAMA dengan aplikasi Web Admin & Kasir Desktop.
 * Tidak membaca tabel rahasia apa pun, hanya tabel yang dipakai sistem Toko Berkah.
 */
interface TokoBerkahApi {

    @GET("produk")
    suspend fun getProduk(
        @Query("select") select: String = "*",
        @Query("order") order: String = "id"
    ): List<ProdukDto>

    @GET("produk")
    suspend fun getProdukByBarcode(
        @Query("barcode") barcodeFilter: String,
        @Query("select") select: String = "*"
    ): List<ProdukDto>

    @GET("produk")
    suspend fun getProdukById(
        @Query("id") idFilter: String,
        @Query("select") select: String = "*"
    ): List<ProdukDto>

    @PATCH("produk")
    suspend fun updateProduk(
        @Query("id") idFilter: String,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): List<ProdukDto>

    @GET("kategori")
    suspend fun getKategori(@Query("select") select: String = "*"): List<KategoriDto>

    @GET("users")
    suspend fun getUsers(@Query("select") select: String = "id,nama,email,role_id"): List<UserDto>

    @GET("roles")
    suspend fun getRoles(@Query("select") select: String = "*"): List<RoleDto>

    /** Riwayat mutasi (barang masuk) sebuah produk, terbaru dulu. */
    @GET("stok_mutasi")
    suspend fun getMutasiProduk(
        @Query("produk_id") produkFilter: String,
        @Query("order") order: String = "waktu.desc"
    ): List<StokMutasiDto>

    /** Mutasi masuk terakhir untuk semua produk (dipakai untuk "Terakhir Masuk"). */
    @GET("stok_mutasi")
    suspend fun getMutasiMasuk(
        @Query("jenis") jenis: String = "eq.masuk",
        @Query("order") order: String = "waktu.desc",
        @Query("limit") limit: Int = 300
    ): List<StokMutasiDto>

    @POST("stok_mutasi")
    suspend fun insertMutasi(@Body body: List<StokMutasiDto>): List<StokMutasiDto>

    /** Uji koneksi (HEAD-like): ambil 1 baris produk. */
    @GET("produk")
    suspend fun ping(@Query("select") select: String = "id",
                     @Query("limit") limit: Int = 1): List<ProdukDto>
}

/** Header otorisasi Supabase. */
fun supabaseHeaders(anonKey: String): Map<String, String> = mapOf(
    "apikey" to anonKey,
    "Authorization" to "Bearer $anonKey",
    "Content-Type" to "application/json",
    "Accept" to "application/json"
)
