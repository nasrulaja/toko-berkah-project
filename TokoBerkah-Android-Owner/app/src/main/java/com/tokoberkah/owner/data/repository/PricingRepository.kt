package com.tokoberkah.owner.data.repository

import com.tokoberkah.owner.data.api.TokoBerkahApi
import com.tokoberkah.owner.data.database.HargaHistoryEntity
import com.tokoberkah.owner.data.database.OwnerDao
import com.tokoberkah.owner.data.models.StokMutasiDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

/** Satu baris riwayat perubahan harga yang siap ditampilkan. */
data class PriceChange(
    val tanggal: String,
    val jam: String,
    val hargaSebelum: Double,
    val hargaBaru: Double,
    val olehNama: String,
    val alasan: String? = null
) {
    val selisih: Double get() = hargaBaru - hargaSebelum
    val naik: Boolean get() = selisih >= 0
}

/**
 * Repositori harga: menyimpan riwayat perubahan secara lokal (Room) dan
 * memperbarui `produk.harga_jual` di Supabase.
 *
 * Catatan backend: skema Supabase Toko Berkah belum memiliki tabel
 * `riwayat_harga`, sehingga riwayat perubahan harga disimpan di perangkat
 * (Room) dan ditandai `terkirim=false` agar bisa disinkronkan bila tabel
 * ditambahkan di masa depan (lihat README bagian "Backend").
 */
class PricingRepository(
    private val api: TokoBerkahApi,
    private val dao: OwnerDao
) {

    fun observeRiwayat(produkId: Int): Flow<List<PriceChange>> =
        dao.observeRiwayat(produkId).map { list -> list.map { it.toChange() } }

    /** Ubah harga jual produk ke backend, lalu catat riwayatnya. */
    suspend fun ubahHarga(
        produkId: Int,
        hargaLama: Double,
        hargaBaru: Double,
        alasan: String,
        olehNama: String
    ): Result<Unit> = withContext(Dispatchers.IO) {
        if (hargaBaru <= 0) return@withContext Result.Error("Harga harus lebih dari 0.")
        safeCall {
            api.updateProduk("eq.$produkId", mapOf("harga_jual" to hargaBaru))
            dao.updateHargaLokal(produkId, hargaBaru)
            val waktu = java.time.Instant.now().toString()
            val row = HargaHistoryEntity(
                produkId = produkId,
                hargaSebelum = hargaLama,
                hargaBaru = hargaBaru,
                alasan = alasan,
                olehNama = olehNama,
                waktu = waktu,
                terkirim = false
            )
            val id = dao.tambahRiwayat(row)
            // Percobaan kirim ulang riwayat tertunda (best-effort, tidak memblokir).
            runCatching { flushRiwayat() }
            Unit
        }
    }

    /** Sinkronkan riwayat yang belum terkirim bila tabel tersedia. */
    suspend fun flushRiwayat() {
        // Belum ada endpoint riwayat di backend; fungsi disiapkan agar
        // mudah diaktifkan tanpa mengubah lapisan UI.
    }

    /** Riwayat barang masuk (mutasi jenis masuk) dari backend. */
    suspend fun riwayatMasuk(produkId: Int): Result<List<StokMutasiDto>> = safeCall {
        api.getMutasiProduk("eq.$produkId").filter { it.jenis == "masuk" }
    }
}

private fun HargaHistoryEntity.toChange(): PriceChange {
    val jam = runCatching {
        val inst = java.time.Instant.parse(waktu)
        val zoned = inst.atZone(java.time.ZoneId.systemDefault())
        java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy • HH.mm", java.util.Locale("id", "ID"))
            .format(zoned)
    }.getOrDefault(waktu)
    return PriceChange(
        tanggal = jam,
        jam = "",
        hargaSebelum = hargaSebelum,
        hargaBaru = hargaBaru,
        olehNama = olehNama,
        alasan = alasan
    )
}
