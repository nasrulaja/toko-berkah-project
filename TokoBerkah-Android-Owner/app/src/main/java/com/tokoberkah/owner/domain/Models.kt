package com.tokoberkah.owner.domain

import com.tokoberkah.owner.data.models.ProdukDto
import java.util.Locale

/** Status stok sesuai aturan bisnis Toko Berkah. */
enum class StockStatus(val label: String) {
    TERSEDIA("Stok Tersedia"),
    MENIPIS("Stok Menipis"),
    HABIS("Stok Habis");

    companion object {
        fun from(stok: Int, minimum: Int): StockStatus = when {
            stok <= 0 -> HABIS
            stok <= minimum.coerceAtLeast(1) -> MENIPIS
            else -> TERSEDIA
        }
    }
}

/**
 * Produk siap tampil di UI.
 * Dipisah dari DTO karena menghitung status, rak, dan rincian stok.
 */
data class Produk(
    val id: Int,
    val nama: String,
    val barcode: String,
    val hargaJual: Double,
    val stok: Int,
    val stokMinimum: Int,
    val kategoriId: Int?,
    val kategoriNama: String,
    val rak: String,
    val updatedAt: String?,
    /** Waktu mutasi masuk terakhir (ISO) untuk label "Terakhir Masuk". */
    val terakhirMasuk: String? = null,
    val stokRakDepan: Int = stok,
    val stokGudang: Int = 0
) {
    val status: StockStatus get() = StockStatus.from(stok, stokMinimum)

    /** Satuan tampilan yang wajar untuk produk ini (Bungkus/Botol/Karung/Pcs). */
    val satuan: String
        get() = when {
            nama.contains("beras", true) -> "Karung"
            nama.contains("indomie", true) || nama.contains("mie", true) -> "Bungkus"
            nama.contains("kopi", true) && nama.contains("sachet", true) -> "Sachet"
            nama.contains("renceng", true) -> "Renceng"
            kategoriNama.contains("minum", true) -> "Botol"
            else -> "Pcs"
        }

    /** true bila produk wajib direstok sekarang. */
    val perluRestok: Boolean get() = status != StockStatus.TERSEDIA

    /** Emoji/gambar mini sebagai placeholder yang konsisten. */
    val gambarEmoji: String
        get() = when {
            kategoriNama.contains("minum", true) -> "🥤"
            kategoriNama.contains("rumah", true) -> "🧴"
            nama.contains("mie", true) || nama.contains("indomie", true) -> "🍜"
            nama.contains("beras", true) -> "🍚"
            nama.contains("minyak", true) -> "🛢️"
            nama.contains("kopi", true) -> "☕"
            nama.contains("gula", true) -> "🍬"
            nama.contains("sabun", true) -> "🧼"
            nama.contains("roti", true) -> "🍞"
            nama.contains("baterai", true) -> "🔋"
            nama.contains("tisu", true) -> "🧻"
            else -> "🛒"
        }
}

/** Format rupiah gaya Indonesia: Rp 34.000 (tanpa desimal bila utuh). */
fun formatRupiah(value: Double): String {
    val isWhole = value % 1.0 == 0.0
    val fmt = java.text.NumberFormat.getNumberInstance(Locale("id", "ID")).apply {
        maximumFractionDigits = if (isWhole) 0 else 2
        minimumFractionDigits = 0
    }
    return "Rp " + fmt.format(value)
}

/**
 * Mengubah DTO menjadi model domain.
 *
 * Catatan stok rak depan/gudang: tabel `produk` hanya menyimpan satu kolom
 * `stok` total. Aplikasi memisahkan tampilan menjadi "Rak Depan" dan
 * "Gudang Belakang" secara deterministik, sehingga total tetap SAMA dengan
 * `stok` dari backend (tidak ada data yang tertukar atau digandakan).
 */
fun ProdukDto.toDomain(kategoriNama: String, terakhirMasuk: String?): Produk {
    val total = stok.coerceAtLeast(0)
    // Pembagian papan display: maksimal 40% di rak depan, minimal 1 bila ada stok.
    val depan = when {
        total == 0 -> 0
        total <= 5 -> total
        else -> ((total * 0.4).toInt()).coerceAtLeast(1).coerceAtMost(total)
    }
    return Produk(
        id = id,
        nama = nama,
        barcode = barcode?.trim().orEmpty(),
        hargaJual = hargaJual,
        stok = total,
        stokMinimum = stokMinimum,
        kategoriId = kategoriId,
        kategoriNama = kategoriNama,
        rak = generateRak(id, kategoriNama),
        updatedAt = updatedAt,
        terakhirMasuk = terakhirMasuk,
        stokRakDepan = depan,
        stokGudang = total - depan
    )
}

/** Lokasi rak stabil per produk (dipakai sebagai label, bukan data transaksi). */
private fun generateRak(id: Int, kategori: String): String {
    val prefix = when {
        kategori.contains("minum", true) -> "B2"
        kategori.contains("rumah", true) -> "C1"
        kategori.contains("makan", true) -> "A1"
        else -> "B3"
    }
    val nomor = 1 + (id % 9)
    return "Rak $prefix-$nomor"
}
