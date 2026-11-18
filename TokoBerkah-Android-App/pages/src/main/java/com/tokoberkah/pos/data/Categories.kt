package com.tokoberkah.pos.data

/**
 * Daftar kategori (tag) produk — sesuai master data di Figma:
 * `INSERT INTO kategori (nama) VALUES (...)`.
 *
 * Satu produk boleh punya lebih dari satu tag, maksimal [MAX_PER_PRODUCT].
 * Dipakai bersama oleh halaman Cek Stok (modul app) dan Barang Masuk.
 */
object Categories {

    /** Maksimal jumlah tag yang ditampilkan pada satu kartu produk. */
    const val MAX_PER_PRODUCT = 4

    /** Urutan tag sama dengan urutan di desain. */
    val ALL: List<String> = listOf(
        "Sembako",
        "Mie Instan",
        "Minuman",
        "Snack & Jajanan",
        "Rokok",
        "Kebersihan Diri",
        "Perawatan Rumah",
        "Obat Ringan",
        "Alat Tulis",
        "Gas & Listrik",
        "Bumbu Dapur",
        "Susu & Kopi",
        "Roti & Kue",
        "Frozen Food",
        "Lain-lain"
    )

    /** Tag produk, dipotong maksimal [MAX_PER_PRODUCT]. */
    fun of(vararg tags: String): List<String> =
        tags.filter { it in ALL }.take(MAX_PER_PRODUCT)
}
