package com.tokoberkah.owner.data.repository

import android.content.Context
import com.tokoberkah.owner.data.api.TokoBerkahApi
import com.tokoberkah.owner.data.database.OwnerDao
import com.tokoberkah.owner.data.database.ProdukCacheEntity
import com.tokoberkah.owner.data.models.ProdukDto
import com.tokoberkah.owner.domain.Produk
import com.tokoberkah.owner.domain.toDomain
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext

/**
 * Satu pintu untuk semua data produk.
 *
 * Strategi: backend (Supabase) adalah sumber kebenaran. Setiap kali data
 * diambil dari backend, hasilnya di-cache ke Room sehingga aplikasi tetap
 * bisa dibuka & mencari produk saat offline.
 */
class ProductRepository(
    private val api: TokoBerkahApi,
    private val dao: OwnerDao,
    @Suppress("unused") private val context: Context
) {

    /** Aliran produk dari cache lokal (selalu tersedia, offline-friendly). */
    fun observeProduk(): Flow<List<Produk>> = dao.observeProduk().map { rows ->
        rows.map { it.toDomain() }
    }

    /** Sinkronisasi produk + kategori dari backend lalu simpan ke cache. */
    suspend fun refresh(): Result<Int> = safeCall {
        val kategori = api.getKategori().associate { it.id to it.nama }
        val mutasiMasuk = runCatching { api.getMutasiMasuk() }.getOrDefault(emptyList())
        val terakhir = mutableMapOf<Int, String>()
        mutasiMasuk.forEach { m ->
            if (m.jenis == "masuk" && !m.waktu.isNullOrBlank()) terakhir[m.produkId] = m.waktu!!
        }
        val produk = api.getProduk()
        val domain = produk.map { dto ->
            dto.toDomain(kategori[dto.kategoriId] ?: "Umum", terakhir[dto.id])
        }
        dao.hapusSemuaProduk()
        dao.simpanProduk(domain.map { it.toEntity() })
        domain.size
    }

    /**
     * Cari produk berdasarkan barcode (EAN/UPC/Code128/39/QR).
     * Mencoba backend dulu; bila jaringan gagal, gunakan cache lokal.
     */
    suspend fun byBarcode(rawBarcode: String): Result<Produk?> = withContext(Dispatchers.IO) {
        val barcode = normalizeBarcode(rawBarcode)
        if (barcode.isBlank()) return@withContext Result.Error("Barcode tidak valid.")
        try {
            val dto = api.getProdukByBarcode("eq.$barcode")
            if (dto.isEmpty()) {
                val alt = alternateBarcode(barcode)
                val altHit = if (alt != null) api.getProdukByBarcode("eq.$alt") else emptyList()
                if (altHit.isEmpty()) return@withContext Result.Success(null)
                return@withContext Result.Success(persist(altHit.first()))
            }
            Result.Success(persist(dto.first()))
        } catch (e: Throwable) {
            if (!e.isNetworkIssue()) return@withContext Result.Error(e.toUserMessage())
            val cached = dao.produkByBarcode(barcode)
                ?: dao.produkByBarcode(alternateBarcode(barcode).orEmpty())
            if (cached != null) Result.Success(cached.toDomain())
            else Result.Error(e.toUserMessage(), isNetwork = true)
        }
    }

    /** Ambil ulang satu produk dari backend (dipakai setelah ubah harga / stok). */
    suspend fun byId(id: Int): Result<Produk?> = withContext(Dispatchers.IO) {
        try {
            val dto = api.getProdukById("eq.$id")
            Result.Success(dto.firstOrNull()?.let { persist(it) })
        } catch (e: Throwable) {
            if (!e.isNetworkIssue()) return@withContext Result.Error(e.toUserMessage())
            val cached = dao.semuaProduk().firstOrNull { it.id == id }
            Result.Success(cached?.toDomain())
        }
    }

    suspend fun allCached(): List<Produk> = withContext(Dispatchers.IO) {
        dao.semuaProduk().map { it.toDomain() }
    }

    fun observeCount(): Flow<Int> = dao.observeProduk().map { it.size }

    /** Simpan perubahan yang sudah dikonfirmasi backend ke cache lokal. */
    suspend fun updateCacheHarga(id: Int, harga: Double) =
        withContext(Dispatchers.IO) { dao.updateHargaLokal(id, harga) }

    suspend fun updateCacheStok(id: Int, total: Int) = withContext(Dispatchers.IO) {
        val depan = when {
            total == 0 -> 0
            total <= 5 -> total
            else -> ((total * 0.4).toInt()).coerceAtLeast(1).coerceAtMost(total)
        }
        dao.updateStokLokal(id, total, depan, total - depan)
    }

    // ------------------------------ helpers ------------------------------

    private suspend fun persist(dto: ProdukDto): Produk {
        val kategori = runCatching { api.getKategori().associate { it.id to it.nama } }
            .getOrDefault(emptyMap())
        val riwayat = runCatching { api.getMutasiProduk("eq.${dto.id}") }
            .getOrDefault(emptyList())
        val terakhir = riwayat.filter { it.jenis == "masuk" }.mapNotNull { it.waktu }.maxOrNull()
        val domain = dto.toDomain(kategori[dto.kategoriId] ?: "", terakhir)
        dao.simpanProduk(listOf(domain.toEntity()))
        return domain
    }

    companion object {
        /** Barcode hanya angka/huruf; buang spasi & karakter aneh. */
        fun normalizeBarcode(raw: String): String =
            raw.trim().filter { it.isLetterOrDigit() }

        /** UPC-A (12 digit) <-> EAN-13 (0 + 12 digit). */
        fun alternateBarcode(barcode: String): String? = when (barcode.length) {
            12 -> "0$barcode"
            13 -> if (barcode.startsWith("0")) barcode.substring(1) else null
            else -> null
        }
    }
}

// ------------------------- pemetaan entity/domain -------------------------

fun ProdukCacheEntity.toDomain(): Produk = Produk(
    id = id, nama = nama, barcode = barcode, hargaJual = hargaJual, stok = stok,
    stokMinimum = stokMinimum, kategoriId = kategoriId, kategoriNama = kategoriNama,
    rak = rak, updatedAt = updatedAt, terakhirMasuk = terakhirMasuk,
    stokRakDepan = stokRakDepan, stokGudang = stokGudang
)

fun Produk.toEntity(): ProdukCacheEntity = ProdukCacheEntity(
    id = id, nama = nama, barcode = barcode, hargaJual = hargaJual, stok = stok,
    stokMinimum = stokMinimum, kategoriId = kategoriId, kategoriNama = kategoriNama,
    rak = rak, terakhirMasuk = terakhirMasuk, stokRakDepan = stokRakDepan,
    stokGudang = stokGudang, updatedAt = updatedAt
)

