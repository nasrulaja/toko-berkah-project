package com.tokoberkah.owner.data.models

import com.google.gson.annotations.SerializedName

/**
 * Model yang dipetakan langsung ke tabel Supabase (PostgREST).
 * Nama field memakai @SerializedName agar tetap cocok dengan kolom asli.
 */

/** Baris tabel `produk`. */
data class ProdukDto(
    val id: Int,
    val nama: String,
    @SerializedName("barcode") val barcode: String? = null,
    @SerializedName("harga_jual") val hargaJual: Double = 0.0,
    @SerializedName("stok") val stok: Int = 0,
    @SerializedName("kategori_id") val kategoriId: Int? = null,
    @SerializedName("stok_minimum") val stokMinimum: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null
)

/** Baris tabel `kategori`. */
data class KategoriDto(
    val id: Int,
    val nama: String
)

/** Baris tabel `users` (hanya kolom publik yang dibaca aplikasi). */
data class UserDto(
    val id: Int,
    val nama: String,
    val email: String? = null,
    @SerializedName("role_id") val roleId: Int? = null
)

/** Baris tabel `roles` — menentukan hak akses pemilik. */
data class RoleDto(
    val id: Int,
    @SerializedName("bisa_kelola_barang") val bisaKelolaBarang: Boolean = false,
    @SerializedName("bisa_transaksi") val bisaTransaksi: Boolean = false
)

/** Baris tabel `stok_mutasi` — juga menjadi sumber histori barang masuk. */
data class StokMutasiDto(
    val id: Long? = null,
    @SerializedName("produk_id") val produkId: Int,
    val jenis: String,
    val jumlah: Int,
    @SerializedName("stok_sebelum") val stokSebelum: Int,
    @SerializedName("stok_sesudah") val stokSesudah: Int,
    @SerializedName("harga_kulak") val hargaKulak: Double? = null,
    @SerializedName("transaksi_id") val transaksiId: Int? = null,
    val catatan: String? = null,
    val waktu: String? = null,
    @SerializedName("user_id") val userId: Int? = null
)
