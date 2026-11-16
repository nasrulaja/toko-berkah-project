PRD: Sistem Kasir Berbasis Scan Barcode pada UMKM Toko Berkah
Web, Aplikasi Android, dan Desktop | Jenis: Project TA (UMKM)

1. RINGKASAN
Toko Berkah adalah toko kelontong kecil yang dikelola satu orang pemilik tanpa karyawan. Saat ini pencatatan penjualan dan stok masih manual sehingga lambat dan rawan salah.
Produk ini adalah sistem kasir dan manajemen barang berbasis scan barcode dengan satu backend dan satu database yang dipakai tiga aplikasi: Web, Android, dan Desktop.

2. LATAR BELAKANG
Usaha Mikro, Kecil, dan Menengah (UMKM) adalah bagian penting dari kegiatan ekonomi sehari-hari, dan toko kelontong adalah salah satu bentuknya yang paling umum. Banyak toko kecil masih mengandalkan buku catatan, kalkulator, dan ingatan pemilik untuk mengelola penjualan dan stok barang.

Toko Berkah dikelola satu orang pemilik tanpa karyawan. Pemilik merangkap sebagai kasir, penata barang, pencatat stok, sekaligus pembeli barang dagangan. Saat toko ramai, pemilik harus melayani pembeli sambil mencari harga dan menghitung total secara manual. Di luar jam ramai, pemilik masih harus mencatat penjualan dan mengecek stok satu per satu. Beban kerja ini membuat salah harga, salah hitung, dan selisih antara stok di catatan dengan stok di rak sulit dihindari.

Sebagian besar produk kemasan sudah memiliki barcode. Dengan scan barcode, produk dikenali dan harganya muncul otomatis, sehingga pemilik tidak perlu mencari atau mengingat harga. Teknologinya juga terjangkau: HP Android bisa dipakai untuk memindai barcode.

Kebutuhan pemilik berbeda-beda sesuai situasinya, sehingga sistem dibuat dalam tiga aplikasi. Desktop menjadi kasir utama di meja kasir (scanner, printer struk, dan mode offline). Android dipakai sambil berkeliling di rak atau gudang untuk cek harga, cek stok, dan mencatat barang masuk. Web dipakai untuk mengelola data produk, stok, riwayat, dan laporan tutup buku. Ketiganya memakai satu backend dan satu database agar data selalu konsisten. Mode offline disediakan karena koneksi internet bisa terputus sewaktu-waktu, sedangkan toko tidak boleh berhenti berjualan.

Dokumen ini dibuat sebagai bagian dari Project Tugas Akhir (TA) untuk UMKM. PRD ini menjelaskan masalah, tujuan, ruang lingkup, dan kebutuhan sistem sebagai acuan perancangan dan pengembangan.

KONDISI SAAT INI DAN YANG DIHARAPKAN
Aspek: Mencari harga
Saat ini (manual): Dicari atau diingat pemilik, antrean lambat
Dengan sistem: Scan barcode, harga langsung tampil

Aspek: Total dan kembalian
Saat ini (manual): Dihitung manual, mudah keliru
Dengan sistem: Dihitung otomatis

Aspek: Pencatatan transaksi
Saat ini (manual): Tidak rapi atau tidak ada riwayat
Dengan sistem: Tersimpan otomatis, bisa difilter per tanggal

Aspek: Stok
Saat ini (manual): Tidak real-time, baru sadar saat habis
Dengan sistem: Berkurang otomatis setiap transaksi selesai

Aspek: Barang masuk, rusak, selisih
Saat ini (manual): Tidak dicatat
Dengan sistem: Tercatat di riwayat pergerakan stok beserta alasannya

Aspek: Barang hampir habis
Saat ini (manual): Pemilik tidak tahu
Dengan sistem: Muncul di daftar peringatan stok menipis

Aspek: Saat internet mati
Saat ini (manual): Tidak relevan (semua manual)
Dengan sistem: Desktop tetap bisa transaksi, sinkron saat online

3. MASALAH DAN TUJUAN

MASALAH
- Harga dicari atau diingat manual, sehingga antrean lambat dan harga bisa salah.
- Perhitungan total dan kembalian manual, mudah keliru.
- Stok tidak tercatat real-time, sering baru sadar saat barang habis.
- Tidak ada riwayat transaksi yang rapi.
- Barang masuk, barang rusak, dan selisih stok tidak dicatat, sehingga stok di catatan berbeda dengan stok di rak.
- Pemilik tidak tahu barang mana yang hampir habis dan perlu dibeli ulang.
- Toko tetap harus bisa jualan saat internet mati.

TUJUAN
- Mempercepat transaksi: 1 transaksi (5 item) selesai di bawah 1 menit.
- Menghilangkan salah hitung: total dan kembalian dihitung otomatis, akurasi 100%.
- Stok selalu akurat: stok berkurang otomatis setiap transaksi selesai.
- Data tersimpan rapi: semua transaksi bisa dilihat di riwayat.
- Tetap jalan tanpa internet: desktop bisa transaksi offline lalu sinkron otomatis.
- Barang terkelola rapi: setiap perubahan stok (terjual, masuk, penyesuaian) tercatat; barang menipis terdeteksi otomatis.

4. PENGGUNA
Pengguna: Kasir (admin)
Pengguna: Manajemen Barang (admin)

5. FITUR PER APLIKASI

4.1 WEB
- Login pemilik.
- Kelola produk dan kategori: tambah, ubah, hapus, cari; data produk berisi nama, kategori, barcode, harga jual, stok, dan stok minimum; produk dikelompokkan berdasarkan kategori.
- Stok: barang masuk (restock) mencatat jumlah, harga kulak, dan tanggal sehingga stok bertambah otomatis; penyesuaian stok (stok opname) mengoreksi selisih, barang rusak, atau hilang dengan alasan; peringatan stok menipis menampilkan barang yang stoknya sama dengan atau di bawah stok minimum.
- Riwayat: riwayat transaksi (daftar, filter tanggal, detail item per transaksi) dan riwayat pergerakan stok (terjual, barang masuk, penyesuaian; filter produk dan tanggal).
- Hasil tutup buku (hanya untuk akun dengan hak kelola barang): menampilkan jumlah hari sudah ditutup, hari ada selisih, dan total uang kurang, serta riwayat hasil tutup buku per hari (total penjualan sistem, uang di laci, selisih). Web hanya menampilkan; proses tutup buku dilakukan di Desktop.
- Rekap penjualan: per periode (harian, mingguan, atau bulanan) berisi jumlah transaksi, total penjualan, dan tren naik, turun, atau tetap dibanding periode sebelumnya.

4.2 APLIKASI ANDROID
- Login dengan akun yang sama
- Scan barcode dengan kamera HP.
- Cek harga dan cek stok: scan barcode, harga dan sisa stok langsung tampil.
- Barang masuk: scan barcode, isi jumlah, stok bertambah.

4.3 DESKTOP (KASIR UTAMA)
- Login pemilik
- Scan barcode dengan scanner barcode (input seperti keyboard).
- Keranjang belanja: tambah, ubah jumlah, hapus item; total dan kembalian dihitung otomatis.
- Transaksi selesai: stok berkurang otomatis dan struk dicetak ke printer thermal.
- Tutup buku di akhir hari: kasir mengisi uang di laci, sistem membandingkannya dengan total penjualan hari itu, lalu menampilkan selisih (uang kurang atau lebih) dan menyimpan hasilnya.
- Mode offline: transaksi disimpan lokal, lalu sinkron otomatis saat internet kembali.

6. ARSITEKTUR SINGKAT DAN TABEL DATABASE

ARSITEKTUR
[Web] [Android] [Desktop]
   \      |      /
    \     |     / (+ database lokal untuk mode offline)
--- REST API (Backend) ---
          |
      [Database]

- Satu backend (REST API) melayani ketiga aplikasi.
- Satu database pusat sebagai sumber data utama.
- Desktop memiliki penyimpanan lokal untuk antrean transaksi offline.
- Teknologi disesuaikan tim (lihat Pertanyaan Terbuka).

TABEL DATABASE
users
roles
kategori
produk
transaksi
detail_transaksi
stok_mutasi
struk
rekap_penjualan
tutup_buku

FUNGSI UTAMA APLIKASI
Web: Mengelola produk, kategori, barang masuk, penyesuaian stok, dan peringatan stok menipis; melihat riwayat transaksi dan riwayat stok; melihat rekap penjualan dan hasil tutup buku.
Android: Scan barcode lewat kamera HP untuk cek harga, cek stok, dan catat barang masuk.
Desktop: Kasir utama di toko: scanner barcode, hitung total dan kembalian, cetak struk, tutup buku harian, mode offline.

ENTITAS USERS (PENGGUNA SISTEM)
id (PK): ID pengguna
nama (Text): Nama pengguna
email (text, unik): Untuk login
password_hash (Text): Password terenkripsi
role_id (FK): Ke roles (hak akses akun)
created_at (Datetime): Waktu daftar

ENTITAS ROLES (HAK AKSES PENGGUNA)
id (PK): ID role
bisa_kelola_barang (Boolean): Boleh mengelola barang (produk, kategori, stok)
bisa_transaksi (Boolean): Boleh melakukan transaksi penjualan

ENTITAS KATEGORI (KELOMPOK BARANG)
id (PK): ID kategori
nama (text, unik): Nama kategori
created_at (Datetime): Waktu dibuat

ENTITAS PRODUK (BARANG DAGANGAN)
id (PK): ID produk
nama (Text): Nama produk
barcode (text, unik): Kode barcode
harga_jual (Integer): Harga jual (Rp)
stok (Integer): Sisa stok
kategori_id (FK): Ke kategori (boleh kosong)
stok_minimum (Integer): Batas peringatan stok menipis
created_at / updated_at (Datetime): Waktu dibuat / diubah

ENTITAS TRANSAKSI (DATA UTAMA TRANSAKSI PENJUALAN)
id (PK): ID transaksi
kode_transaksi (text, unik): Kode unik (juga untuk cegah duplikat saat sinkron)
waktu (Datetime): Waktu transaksi
total (Integer): Total belanja
uang_diterima (Integer): Uang dari pembeli
kembalian (Integer): Uang kembali
user_id (FK): Pengguna yang melayani
rekap_id (FK): Ke rekap_penjualan (boleh kosong)

ENTITAS DETAIL_TRANSAKSI (RINCIAN ITEM PER TRANSAKSI)
id (PK): ID detail
transaksi_id (FK): Ke transaksi
struk_id (FK): Ke struk
produk_id (FK): Ke produk
nama_produk (Text): Salinan nama saat transaksi
harga_jual (Integer): Salinan harga saat transaksi
jumlah (Integer): Jumlah beli
subtotal (Integer): harga_jual x jumlah

ENTITAS STOK_MUTASI (RIWAYAT PERGERAKAN STOK)
id (PK): ID mutasi
produk_id (FK): Ke produk
jenis (Text): jual / masuk / penyesuaian
jumlah (Integer): Perubahan stok (+ menambah, - mengurangi)
stok_sebelum (Integer): Stok sebelum perubahan
stok_sesudah (Integer): Stok sesudah perubahan
harga_kulak (Integer): Harga kulak per unit (jenis masuk, boleh kosong)
transaksi_id (FK): Ke transaksi (jenis jual, boleh kosong)
catatan (Text): Alasan atau keterangan (wajib untuk penyesuaian)
waktu (Datetime): Waktu perubahan stok
user_id (FK): Pengguna

ENTITAS STRUK (BUKTI CETAK TRANSAKSI)
id (PK): ID struk
transaksi_id (FK): Ke transaksi
nomor_struk (text, unik): Nomor unik struk
nama_toko (Text): Nama toko yang dicetak di struk
alamat_toko (Text): Alamat toko yang dicetak di struk
pesan_footer (Text): Pesan penutup di bagian bawah struk
status_cetak (Text): Status pencetakan struk
dicetak_pada (Datetime): Waktu struk dicetak

ENTITAS REKAP_PENJUALAN (REKAP PENJUALAN PER PERIODE)
id (PK): ID rekap
jenis_periode (Text): Jenis periode rekap
periode_mulai (Datetime): Awal periode
periode_akhir (Datetime): Akhir periode
jumlah_transaksi (Integer): Jumlah transaksi dalam periode
total_penjualan (Integer): Total penjualan dalam periode (Rp)
total_sebelumnya (Integer): Total penjualan periode sebelumnya (Rp)
tren (Text): Tren dibanding periode sebelumnya

ENTITAS TUTUP BUKU (HASIL TUTUP BUKU HARIAN)
id (PK): ID tutup buku
tanggal (Datetime): Tanggal yang ditutup
total_penjualan (Integer): Total penjualan sistem hari itu (Rp)
uang_di_laci (Integer): Uang di laci yang dihitung kasir (Rp)
selisih (Integer): uang_di_laci dikurangi total_penjualan; negatif = kurang, positif = lebih
status (Text): Sesuai atau ada selisih
catatan (Text): Catatan jika ada selisih (boleh kosong)
user_id (FK): Pengguna yang menutup buku
ditutup_pada (Datetime): Waktu tutup buku dilakukan

CATATAN DIAGRAM
ERD: Relasi antar tabel users, roles, produk, kategori, transaksi, detail_transaksi, struk, stok_mutasi, tutup_buku, rekap_penjualan.
Flowchart Transaksi Kasir: Mulai -> Scan barcode -> Cari produk berdasarkan barcode -> Produk ditemukan? (Tidak: tampilkan pesan, input produk baru, simpan) (Ya: masukkan ke keranjang) -> Tambah barang lagi? (Ya: ulang scan) (Tidak: hitung total otomatis) -> Input uang tunai -> Uang diterima >= total? (Tidak: tampilkan uang kurang) (Ya: hitung kembalian) -> Simpan transaksi dan detail -> Buat struk -> Cetak struk dan catat status -> Kurangi stok otomatis -> Catat mutasi stok -> Selesai.
Flowchart Menu Utama: Percabangan fitur berdasarkan hak akses (kelola barang, transaksi, laporan).
Flowchart Tutup Buku: Mulai -> Hitung total penjualan hari ini -> Input uang di laci -> Uang di laci = total penjualan? (Ya: status sesuai) (Tidak: tampilkan selisih uang kurang/lebih, status ada selisih) -> Simpan hasil tutup buku -> Selesai.