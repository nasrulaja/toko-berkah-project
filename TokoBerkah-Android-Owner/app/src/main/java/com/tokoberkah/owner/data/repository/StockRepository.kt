package com.tokoberkah.owner.data.repository

import com.tokoberkah.owner.data.api.TokoBerkahApi
import com.tokoberkah.owner.data.database.BarangMasukPendingEntity
import com.tokoberkah.owner.data.database.OwnerDao
import com.tokoberkah.owner.data.models.StokMutasiDto
import com.tokoberkah.owner.domain.Produk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Ringkasan satu transaksi barang masuk sebelum disimpan. */
data class BarangMasukDraft(
    val produk: Produk,
    val jumlah: Int,
    val hargaBeliPerUnit: Double?
) {
    val totalNilai: Double get() = (hargaBeliPerUnit ?: 0.0) * jumlah
    val stokSetelah: Int get() = produk.stok + jumlah
}

/**
 * Repositori stok & barang masuk.
 *
 * Alur simpan (mencegah stok tergandakan):
 *  1. Baca stok TERBARU langsung dari backend (bukan dari cache).
 *  2. Kirim SATU baris `stok_mutasi` jenis "masuk" berisi stok_sebelum/sesudah.
 *  3. PATCH `produk.stok` = stok_sesudah.
 *  4. Perbarui cache lokal.
 *
 * Bila koneksi terputus di langkah 2/3, transaksi dimasukkan ke antrean
 * lokal (`barang_masuk_pending`) dan ditandai agar tidak dikirim ganda.
 */
class StockRepository(
    private val api: TokoBerkahApi,
    private val dao: OwnerDao,
    private val products: ProductRepository
) {

    /** Simpan barang masuk. Jumlah harus > 0 (divalidasi juga di UI). */
    suspend fun simpanBarangMasuk(
        produkId: Int,
        jumlah: Int,
        hargaBeliPerUnit: Double?,
        userId: Int?,
        catatan: String? = null
    ): Result<Int> = withContext(Dispatchers.IO) {
        if (jumlah <= 0) return@withContext Result.Error("Jumlah barang masuk harus lebih dari 0.")
        if (hargaBeliPerUnit != null && hargaBeliPerUnit < 0)
            return@withContext Result.Error("Harga beli tidak boleh negatif.")

        val fresh = api.getProdukById("eq.$produkId").firstOrNull()
            ?: return@withContext Result.Error("Produk tidak ditemukan di server.")

        val stokSebelum = fresh.stok
        val stokSesudah = stokSebelum + jumlah
        val waktu = java.time.LocalDateTime.now()
            .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"))

        try {
            // 1) Patch stok lebih dulu: ini langkah yang benar-benar mengubah
            //    stok terlihat oleh Kasir/Web Admin, jadi ia menjadi "commit".
            api.updateProduk("eq.$produkId", mapOf("stok" to stokSesudah))

            // 2) Catat mutasi (jejak audit) SESUDAH stok berhasil di-commit.
            runCatching {
                api.insertMutasi(
                    listOf(
                        StokMutasiDto(
                            produkId = produkId,
                            jenis = "masuk",
                            jumlah = jumlah,
                            stokSebelum = stokSebelum,
                            stokSesudah = stokSesudah,
                            hargaKulak = hargaBeliPerUnit,
                            catatan = catatan ?: "Barang masuk via Aplikasi Pemilik",
                            waktu = waktu,
                            userId = userId
                        )
                    )
                )
            }

            products.updateCacheStok(produkId, stokSesudah)
            Result.Success(stokSesudah)
        } catch (e: Throwable) {
            if (!e.isNetworkIssue()) return@withContext Result.Error(e.toUserMessage())
            // Simpan ke antrean; stok TIDAK diubah lokal agar tidak dobel saat sinkron.
            dao.antreBarangMasuk(
                BarangMasukPendingEntity(
                    produkId = produkId,
                    jumlah = jumlah,
                    hargaBeli = hargaBeliPerUnit,
                    catatan = catatan ?: "Barang masuk (offline)",
                    userId = userId,
                    waktu = waktu
                )
            )
            Result.Error(
                "Tidak ada koneksi. Transaksi disimpan di antrean perangkat dan akan dikirim saat online.",
                isNetwork = true
            )
        }
    }

    /** Kirim ulang antrean barang masuk yang tertunda. */
    suspend fun kirimAntrean(): Int = withContext(Dispatchers.IO) {
        var terkirim = 0
        dao.antreanBarangMasuk().forEach { item ->
            val ok = runCatching {
                val fresh = api.getProdukById("eq.${item.produkId}").firstOrNull() ?: return@forEach
                val sesudah = fresh.stok + item.jumlah
                api.insertMutasi(
                    listOf(
                        StokMutasiDto(
                            produkId = item.produkId,
                            jenis = "masuk",
                            jumlah = item.jumlah,
                            stokSebelum = fresh.stok,
                            stokSesudah = sesudah,
                            hargaKulak = item.hargaBeli,
                            catatan = item.catatan,
                            waktu = item.waktu,
                            userId = item.userId
                        )
                    )
                )
                api.updateProduk("eq.${item.produkId}", mapOf("stok" to sesudah))
                products.updateCacheStok(item.produkId, sesudah)
                true
            }.getOrDefault(false)
            if (ok) {
                dao.hapusAntrean(item.id)
                terkirim++
            }
        }
        terkirim
    }

    fun observeAntrean(): kotlinx.coroutines.flow.Flow<Int> = dao.observeJumlahAntrean()
}
