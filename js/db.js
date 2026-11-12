/* ==========================================================================
   TOKO BERKAH — db.js
   Sumber data tunggal: muat/simpan dari localStorage, catat mutasi stok,
   buat transaksi data contoh, dan siapkan data awal saat pertama dipakai.
   --------------------------------------------------------------------------
   PETA FILE — cari teks "BAGIAN n":
     BAGIAN 1  KUNCI & STATE        nama kunci localStorage + user aktif
     BAGIAN 2  MUAT & SIMPAN        load(), save()
     BAGIAN 3  MUTASI & TRANSAKSI   mut(), sell() (sell hanya untuk data contoh)
     BAGIAN 4  DATA CONTOH          seed()
   ========================================================================== */

/* ==========================================================================
   BAGIAN 1 — KUNCI & STATE
   K/KS dipakai di banyak tempat, jadi jangan diganti sembarangan: mengubahnya
   membuat data pengguna lama tidak terbaca.
   ========================================================================== */

export const K = 'berkah_db_v1',
  KS = 'berkah_session';
export let db;
export let me = null;

/** Menetapkan user yang sedang login. | param: val (objek user) | return: void */
export const setMe = (val) => {
  me = val;
};
/** Isi per pack (pcs) untuk produk contoh; produk lain = 1 (tanpa pack). */
const PACK = {
  'Indomie Goreng 85g': 40,
  'Chitato Sapi Panggang 68g': 10,
  'Teh Botol Sosro 450ml': 24,
  'Aqua 600ml': 24,
  'Kopi Kapal Api Sachet': 10,
  'Gula Pasir 1kg': 10,
  'Minyak Goreng Bimoli 1L': 12,
  'Rinso Cair 800ml': 12,
  'Sabun Lifebuoy 75g': 12
};

/** Daftar nama pembeli DUMMY untuk data contoh. */
const PEMBELI = ['Bu Siti', 'Pak Budi', 'Bu Ani', 'Pak Joko', 'Mbak Rina', 'Pak Hendra', 'Bu Wati', 'Mas Dimas'];
/** Nama pembeli contoh yang tetap (deterministik) untuk satu id transaksi. | param: id | return: string */
const namaPembeli = (id) => PEMBELI[(id * 5 + (id >> 2)) % PEMBELI.length];

/** Menetapkan objek database aktif. | param: val (objek DB) | return: void */
export const setDB = (val) => {
  db = val;
};

/* ==========================================================================
   BAGIAN 2 — MUAT & SIMPAN
   Semua akses localStorage dibungkus try/catch: kalau diblokir browser,
   aplikasi tetap jalan dengan data contoh dan tanpa menyimpan.
   ========================================================================== */

/** Memuat database dari localStorage; jika kosong, buat data contoh via seed(). | param: - | return: objek DB */
export function load() {
  try {
    const s = localStorage.getItem(K);
    if (s) {
      const d = JSON.parse(s);
      const ok =
        d &&
        Number.isFinite(d.n) &&
        ['users', 'kategori', 'produk', 'transaksi', 'detail', 'mutasi'].every((k) => Array.isArray(d[k]));
      if (ok) {
        // migrasi data lama: kolom tutup buku & nama pembeli (data contoh)
        if (!Array.isArray(d.tutup)) d.tutup = [];
        d.produk.forEach((p) => {
          if (!(p.isi_pack >= 1)) p.isi_pack = PACK[p.nama] || 1;
        });
        d.transaksi.forEach((t) => {
          if (!t.pembeli) t.pembeli = namaPembeli(t.id);
        });
        return d;
      }
    }
  } catch (e) {}
  // data contoh langsung disimpan agar konsisten setelah halaman dimuat ulang
  const fresh = seed();
  try {
    localStorage.setItem(K, JSON.stringify(fresh));
  } catch (e) {}
  return fresh;
}

/** Menyimpan database aktif ke localStorage. | param: - | return: void */
export function save() {
  try {
    localStorage.setItem(K, JSON.stringify(db));
  } catch (e) {}
}

/* ==========================================================================
   BAGIAN 3 — MUTASI STOK & TRANSAKSI
   mut()  : satu-satunya jalan mengubah stok, sekaligus mencatat riwayatnya
   sell() : membuat transaksi penjualan historis (dipakai seed data contoh)
   ========================================================================== */

/** Mencatat satu mutasi stok (masuk/jual/penyesuaian) dan memperbarui stok produk. | param: p (produk), jenis (string), jml (angka delta), o (opsi) | return: void */
export function mut(p, jenis, jml, o = {}) {
  const b = p.stok;
  p.stok += jml;
  db.mutasi.push({
    id: ++db.n,
    produk_id: p.id,
    jenis,
    jumlah: jml,
    stok_sebelum: b,
    stok_sesudah: p.stok,
    harga_beli: o.hb ?? null,
    transaksi_id: o.tid ?? null,
    catatan: o.cat || '',
    waktu: o.w || new Date().toISOString(),
    user_id: 1
  });
}

/** Memproses transaksi penjualan: hitung total, catat detail & mutasi stok. | param: items (array [id,qty]), w (waktu ISO), src (sumber), cash (uang diterima, opsional) | return: objek transaksi, atau null bila tidak ada item yang terjual */
export function sell(items, w, src, cash, buyer) {
  const dk = (iso) => new Date(iso).toLocaleDateString('en-CA');
  const t = { id: ++db.n, waktu: w, total: 0, sumber: src, user_id: 1 };
  t.pembeli = buyer || namaPembeli(t.id);
  const n = db.transaksi.length + 1;
  t.kode = 'TRX-' + dk(w).replace(/-/g, '') + '-' + String(n).padStart(3, '0');
  for (const [pid, q] of items) {
    const p = db.produk.find((x) => x.id === pid);
    if (!p || p.stok < q) continue;
    const sub = p.harga * q;
    t.total += sub;
    db.detail.push({
      id: ++db.n,
      transaksi_id: t.id,
      produk_id: p.id,
      nama_produk: p.nama,
      harga_satuan: p.harga,
      harga_beli: p.harga_beli, // snapshot, supaya laba tetap benar walau produk diubah/dihapus
      jumlah: q,
      subtotal: sub
    });
    mut(p, 'jual', -q, { tid: t.id, w });
  }
  if (!t.total) return null;
  // uang diterima; untuk data contoh dibulatkan ke kelipatan 5000
  t.uang_diterima = Number.isFinite(cash) && cash >= t.total ? cash : Math.ceil(t.total / 5000) * 5000;
  t.kembalian = t.uang_diterima - t.total;
  db.transaksi.push(t);
  return t;
}

/* ==========================================================================
   BAGIAN 4 — DATA CONTOH (SEED)
   Dipakai hanya saat localStorage masih kosong: 1 user, 4 kategori, 12 produk,
   dan transaksi 8 hari terakhir. Angka acak dibuat deterministik (rnd) supaya
   data contoh selalu sama setiap kali DB dibuat ulang.
   ========================================================================== */

/** Membuat data awal contoh (user, kategori, produk, transaksi) untuk DB baru. | param: - | return: objek DB baru */
export function seed() {
  const iso = new Date().toISOString();
  const newDB = {
    n: 0,
    users: [{ id: 1, nama: 'Berkah', email: 'berkah@gmail.com', pw: btoa('berkah123'), created_at: iso }],
    kategori: [],
    produk: [],
    transaksi: [],
    detail: [],
    mutasi: [],
    tutup: []
  };
  const prev = db;
  db = newDB; // mut() dan sell() bekerja pada db aktif; kembalikan di akhir
  try {
    ['Makanan', 'Minuman', 'Sembako', 'Kebersihan'].forEach((n) =>
      newDB.kategori.push({ id: ++newDB.n, nama: n, created_at: iso })
    );
    const P = [
      ['Indomie Goreng 85g', 1, '8998866200318', 3500, 2900, 60, 20],
      ['Chitato Sapi Panggang 68g', 1, '8992775001019', 11500, 9800, 18, 10],
      ['Roti Tawar Sari Roti', 1, '8997001230012', 16000, 13500, 9, 10],
      ['Teh Botol Sosro 450ml', 2, '8886001010011', 5500, 4300, 48, 24],
      ['Aqua 600ml', 2, '8886008101053', 4000, 3100, 72, 24],
      ['Kopi Kapal Api Sachet', 2, '8992761111014', 1500, 1150, 100, 30],
      ['Beras Pandan Wangi 5kg', 3, '8993000500050', 72000, 66000, 14, 5],
      ['Gula Pasir 1kg', 3, '8993000100011', 17500, 15500, 6, 8],
      ['Minyak Goreng Bimoli 1L', 3, '8992000001231', 19500, 17200, 22, 10],
      ['Telur Ayam 1kg', 3, '2000000000017', 29000, 26500, 12, 6],
      ['Rinso Cair 800ml', 4, '8999999032111', 23500, 20500, 16, 6],
      ['Sabun Lifebuoy 75g', 4, '8999999051013', 3500, 2700, 30, 12]
    ];
    const t0 = new Date(Date.now() - 8 * 864e5).toISOString();
    P.forEach(([nama, k, barcode, harga, hb, st, mn]) => {
      const p = {
        id: ++newDB.n,
        nama,
        kategori_id: k,
        barcode,
        harga,
        harga_beli: hb,
        stok: 0,
        isi_pack: PACK[nama] || 1,
        stok_minimum: mn,
        created_at: iso,
        updated_at: iso
      };
      newDB.produk.push(p);
      mut(p, 'masuk', st + 40, { hb, cat: 'Stok awal', w: t0 });
    });
    // angka acak deterministik; id produk dipilih dari daftar produk (id kategori & produk berbagi counter)
    let r = 7;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const now = Date.now();
    for (let d = 7; d >= 0; d--) {
      const nt = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < nt; i++) {
        const w = new Date(now - d * 864e5);
        w.setHours(8 + Math.floor(rnd() * 11), Math.floor(rnd() * 60), 0, 0);
        // transaksi tidak boleh bertanggal di masa depan (berlaku untuk hari ini)
        const when = new Date(Math.min(w.getTime(), now - (i + 1) * 60000));
        const nj = 1 + Math.floor(rnd() * 4);
        const it = [];
        for (let j = 0; j < nj; j++)
          it.push([newDB.produk[Math.floor(rnd() * newDB.produk.length)].id, 1 + Math.floor(rnd() * 4)]);
        sell(it, when.toISOString(), 'offline');
      }
    }
    // contoh tutup buku (DUMMY): 2 hari lalu uang fisik kurang Rp100.000 dari catatan sistem
    const hari = new Date(now - 2 * 864e5).toLocaleDateString('en-CA');
    const tot = newDB.transaksi
      .filter((t) => new Date(t.waktu).toLocaleDateString('en-CA') === hari)
      .reduce((a, t) => a + t.total, 0);
    if (tot > 0) {
      const fisik = Math.max(0, tot - 100000);
      newDB.tutup.push({
        id: ++newDB.n,
        tanggal: hari,
        total_sistem: tot,
        uang_fisik: fisik,
        selisih: fisik - tot,
        catatan: 'Contoh: uang kembalian salah hitung',
        waktu: new Date(now - 2 * 864e5 + 21 * 36e5).toISOString(),
        user_id: 1
      });
    }
  } finally {
    db = prev;
  }
  return newDB;
}
