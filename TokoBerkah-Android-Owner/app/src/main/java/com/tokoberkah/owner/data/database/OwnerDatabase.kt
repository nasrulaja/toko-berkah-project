package com.tokoberkah.owner.data.database

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

/** Cache produk agar aplikasi tetap bisa dibuka saat sinyal hilang. */
@Entity(tableName = "produk_cache")
data class ProdukCacheEntity(
    @PrimaryKey val id: Int,
    val nama: String,
    val barcode: String,
    val hargaJual: Double,
    val stok: Int,
    val stokMinimum: Int,
    val kategoriId: Int?,
    val kategoriNama: String,
    val rak: String,
    val terakhirMasuk: String?,
    val stokRakDepan: Int,
    val stokGudang: Int,
    val updatedAt: String?
)

/** Wiwayat harga lokal (backend menyediakan lewat tabel stok_mutasi/eta). */
@Entity(tableName = "harga_history")
data class HargaHistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val produkId: Int,
    val hargaSebelum: Double,
    val hargaBaru: Double,
    val alasan: String,
    val olehNama: String,
    /** ISO 8601 waktu perubahan (UTC). */
    val waktu: String,
    /** true bila sudah terkirim ke backend. */
    val terkirim: Boolean = false
)

/**
 * Antrean transaksi barang masuk yang sudah diterapkan ke stok lokal
 * tapi belum sukses dikirim ke backend. Dipakai untuk mencegah kehilangan
 * data (atau penulisan ganda) saat koneksi terputus.
 */
@Entity(tableName = "barang_masuk_pending")
data class BarangMasukPendingEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val produkId: Int,
    val jumlah: Int,
    val hargaBeli: Double?,
    val catatan: String?,
    val userId: Int?,
    val waktu: String
)

@Dao
interface OwnerDao {
    // ----------------------------- produk cache -----------------------------
    @Query("SELECT * FROM produk_cache ORDER BY nama ASC")
    fun observeProduk(): Flow<List<ProdukCacheEntity>>

    @Query("SELECT * FROM produk_cache WHERE barcode = :barcode LIMIT 1")
    suspend fun produkByBarcode(barcode: String): ProdukCacheEntity?

    @Query("SELECT * FROM produk_cache")
    suspend fun semuaProduk(): List<ProdukCacheEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun simpanProduk(rows: List<ProdukCacheEntity>)

    @Query("DELETE FROM produk_cache")
    suspend fun hapusSemuaProduk()

    @Query("UPDATE produk_cache SET stok = :stok, stokRakDepan = :depan, stokGudang = :gudang WHERE id = :id")
    suspend fun updateStokLokal(id: Int, stok: Int, depan: Int, gudang: Int)

    @Query("UPDATE produk_cache SET hargaJual = :harga WHERE id = :id")
    suspend fun updateHargaLokal(id: Int, harga: Double)

    // ----------------------------- riwayat harga -----------------------------
    @Query("SELECT * FROM harga_history WHERE produkId = :produkId ORDER BY waktu DESC")
    fun observeRiwayat(produkId: Int): Flow<List<HargaHistoryEntity>>

    @Query("SELECT * FROM harga_history WHERE produkId = :produkId ORDER BY waktu DESC")
    suspend fun riwayat(produkId: Int): List<HargaHistoryEntity>

    @Insert
    suspend fun tambahRiwayat(row: HargaHistoryEntity): Long

    @Query("SELECT * FROM harga_history WHERE terkirim = 0")
    suspend fun riwayatBelumTerkirim(): List<HargaHistoryEntity>

    @Query("UPDATE harga_history SET terkirim = 1 WHERE id = :id")
    suspend fun tandaiRiwayatTerkirim(id: Long)

    // ----------------------------- antrean barang masuk -----------------------------
    @Insert
    suspend fun antreBarangMasuk(row: BarangMasukPendingEntity): Long

    @Query("SELECT * FROM barang_masuk_pending ORDER BY waktu ASC")
    suspend fun antreanBarangMasuk(): List<BarangMasukPendingEntity>

    @Query("DELETE FROM barang_masuk_pending WHERE id = :id")
    suspend fun hapusAntrean(id: Long)

    @Query("SELECT COUNT(*) FROM barang_masuk_pending")
    fun observeJumlahAntrean(): Flow<Int>
}

@Database(
    entities = [ProdukCacheEntity::class, HargaHistoryEntity::class, BarangMasukPendingEntity::class],
    version = 1,
    exportSchema = false
)
abstract class OwnerDatabase : RoomDatabase() {
    abstract fun dao(): OwnerDao

    companion object {
        @Volatile private var instance: OwnerDatabase? = null

        fun get(context: android.content.Context): OwnerDatabase =
            instance ?: synchronized(this) {
                instance ?: androidx.room.Room.databaseBuilder(
                    context.applicationContext,
                    OwnerDatabase::class.java,
                    "tokoberkah_owner.db"
                ).fallbackToDestructiveMigration().build().also { instance = it }
            }
    }
}
