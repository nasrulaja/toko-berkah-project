/* ==========================================================================
   TOKO BERKAH — db.js
   Sumber data tunggal: muat/simpan dari localStorage, catat mutasi stok,
   proses transaksi penjualan, dan buat data contoh saat pertama dipakai.
   --------------------------------------------------------------------------
   PETA FILE — cari teks "BAGIAN n":
     BAGIAN 1  KUNCI & STATE        nama kunci localStorage + user aktif
     BAGIAN 2  MUAT & SIMPAN        load(), save()
     BAGIAN 3  MUTASI & PENJUALAN   mut(), sell()
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
    if (s) return JSON.parse(s);
  } catch (e) {}
  return seed();
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
   sell() : transaksi penjualan; produk yang stoknya kurang dilewati
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

/** Memproses transaksi penjualan: hitung total, catat detail & mutasi stok. | param: items (array [id,qty]), w (waktu ISO), src (sumber) | return: void */
export function sell(items, w, src) {
  const dk = (iso) => new Date(iso).toLocaleDateString('en-CA');
  const t = { id: ++db.n, waktu: w, total: 0, sumber: src, user_id: 1 };
  let n = db.transaksi.length + 1;
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
      jumlah: q,
      subtotal: sub
    });
    mut(p, 'jual', -q, { tid: t.id, w });
  }
  if (!t.total) return;
  t.uang_diterima = Math.ceil(t.total / 5000) * 5000;
  t.kembalian = t.uang_diterima - t.total;
  db.transaksi.push(t);
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
    mutasi: []
  };
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
  const t0 = Date.now() - 8 * 864e5;
  const dk = (iso) => new Date(iso).toLocaleDateString('en-CA');
  P.forEach(([nama, k, barcode, harga, hb, st, mn]) => {
    const p = {
      id: ++newDB.n,
      nama,
      kategori_id: k,
      barcode,
      harga,
      harga_beli: hb,
      stok: 0,
      stok_minimum: mn,
      created_at: iso,
      updated_at: iso
    };
    newDB.produk.push(p);
    const b = p.stok;
    p.stok += st + 40;
    newDB.mutasi.push({
      id: ++newDB.n,
      produk_id: p.id,
      jenis: 'masuk',
      jumlah: st + 40,
      stok_sebelum: b,
      stok_sesudah: p.stok,
      harga_beli: hb,
      transaksi_id: null,
      catatan: 'Stok awal',
      waktu: new Date(t0).toISOString(),
      user_id: 1
    });
  });
  let r = 7;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  for (let d = 7; d >= 0; d--)
    for (let i = 0; i < 2 + Math.floor(rnd() * 3); i++) {
      const w = new Date(Date.now() - d * 864e5);
      w.setHours(8 + Math.floor(rnd() * 11), Math.floor(rnd() * 60));
      const it = [];
      for (let j = 0; j < 1 + Math.floor(rnd() * 4); j++)
        it.push([2 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 4)]);
      const t = { id: ++newDB.n, waktu: w.toISOString(), total: 0, sumber: 'offline', user_id: 1 };
      let n = newDB.transaksi.length + 1;
      t.kode = 'TRX-' + dk(w.toISOString()).replace(/-/g, '') + '-' + String(n).padStart(3, '0');
      for (const [pid, q] of it) {
        const p = newDB.produk.find((x) => x.id === pid);
        if (!p || p.stok < q) continue;
        const sub = p.harga * q;
        t.total += sub;
        newDB.detail.push({
          id: ++newDB.n,
          transaksi_id: t.id,
          produk_id: p.id,
          nama_produk: p.nama,
          harga_satuan: p.harga,
          jumlah: q,
          subtotal: sub
        });
        const b = p.stok;
        p.stok -= q;
        newDB.mutasi.push({
          id: ++newDB.n,
          produk_id: p.id,
          jenis: 'jual',
          jumlah: -q,
          stok_sebelum: b,
          stok_sesudah: p.stok,
          harga_beli: null,
          transaksi_id: t.id,
          catatan: '',
          waktu: w.toISOString(),
          user_id: 1
        });
      }
      if (t.total) {
        t.uang_diterima = Math.ceil(t.total / 5000) * 5000;
        t.kembalian = t.uang_diterima - t.total;
        newDB.transaksi.push(t);
      }
    }
  return newDB;
}
