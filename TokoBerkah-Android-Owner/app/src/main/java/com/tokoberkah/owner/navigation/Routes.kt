package com.tokoberkah.owner.navigation

/** Semua rute Navigation Compose dalam satu tempat. */
object Routes {
    const val LOGIN = "login"
    const val CEK_HARGA = "cek_harga"
    const val CEK_HARGA_DETAIL = "cek_harga/detail/{produkId}"
    const val RIWAYAT_HARGA = "riwayat_harga/{produkId}"
    const val UBAH_HARGA = "ubah_harga/{produkId}"
    const val CEK_STOK = "cek_stok"
    const val MASUK = "masuk/{produkId}"

    fun detail(produkId: Int) = "cek_harga/detail/$produkId"
    fun riwayat(produkId: Int) = "riwayat_harga/$produkId"
    fun ubahHarga(produkId: Int) = "ubah_harga/$produkId"
    fun masuk(produkId: Int = -1) = "masuk/$produkId"
}
