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

/** Cari kunci periode tutup buku untuk sebuah waktu; null bila belum ditutup. | param: w (waktu ISO) | return: string kunci atau null */
export function cariKunci(w) {
  const k = new Date(w).toLocaleDateString('en-CA');
  for (const x of db.tutup) {
    if (x.dari && x.sampai && k >= x.dari && k <= x.sampai) return x.kunci;
  }
  return null;
}

/** Memproses transaksi penjualan: hitung total, catat detail & mutasi stok. | param: items (array [id,qty]), w (waktu ISO), src (sumber), cash (uang diterima, opsional) | return: objek transaksi, atau null bila tidak ada item yang terjual atau periode sudah ditutup */
export function sell(items, w, src, cash, buyer) {
  const dk = (iso) => new Date(iso).toLocaleDateString('en-CA');
  // tolak penjualan yang masuk ke periode yang sudah ditutup buku
  const kunci = cariKunci(w);
  if (kunci) return null;
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
   BAGIAN 3b — TUTUP BUKU (AKHIR PERIODE)
   Menutup satu periode (harian / bulanan / tahunan): menghitung pendapatan,
   pengeluaran (modal barang terjual), dan laba; lalu MENGUNCI semua transaksi
   di dalam periode itu agar tidak bisa diubah lagi dan tidak ikut terhitung
   di periode berikutnya. Hasilnya disimpan di db.tutup.
   ========================================================================== */

/** Daftar periode yang bisa ditutup beserta rentang tanggalnya. | param: jenis, acuan (Date) | return: { dari, sampai, label, kunci } */
export function rentangPeriode(jenis, acuan = new Date()) {
  const y = acuan.getFullYear(),
    m = acuan.getMonth(),
    d = acuan.getDate(),
    iso = (v) => v.toLocaleDateString('en-CA');
  if (jenis === 'bulanan') {
    const dari = new Date(y, m, 1),
      sampai = new Date(y, m + 1, 0);
    return {
      dari: iso(dari),
      sampai: iso(sampai),
      label: dari.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      kunci: `B${y}-${String(m + 1).padStart(2, '0')}`
    };
  }
  if (jenis === 'tahunan') {
    return {
      dari: iso(new Date(y, 0, 1)),
      sampai: iso(new Date(y, 11, 31)),
      label: 'Tahun ' + y,
      kunci: `T${y}`
    };
  }
  const hari = new Date(y, m, d);
  return {
    dari: iso(hari),
    sampai: iso(hari),
    label: hari.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    kunci: 'H' + iso(hari)
  };
}

/** Hitung ringkasan satu periode TANPA menyimpan apa pun. | param: jenis, acuan | return: objek ringkasan */
export function ringkasPeriode(jenis, acuan = new Date()) {
  const r = rentangPeriode(jenis, acuan);
  const didalam = (w) => {
    const k = new Date(w).toLocaleDateString('en-CA');
    return k >= r.dari && k <= r.sampai;
  };
  const trx = db.transaksi.filter((t) => didalam(t.waktu)),
    idOk = new Set(trx.map((t) => t.id));
  const pendapatan = trx.reduce((a, t) => a + t.total, 0);
  // pengeluaran = modal (harga beli) barang yang terjual pada periode ini
  let pengeluaran = 0;
  db.detail.forEach((d) => {
    if (!idOk.has(d.transaksi_id)) return;
    pengeluaran += (d.harga_beli ?? db.produk.find((p) => p.id === d.produk_id)?.harga_beli ?? 0) * d.jumlah;
  });
  const trxTerkunci = trx.filter((t) => t.terkunci).length;
  return {
    ...r,
    jenis,
    transaksi: trx.length,
    pendapatan,
    pengeluaran,
    laba: pendapatan - pengeluaran,
    sudahDitutup: trxTerkunci > 0,
    trxTerkunci,
    // periode dianggap bisa ditutup bila ada transaksi dan belum ada yang terkunci
    bisaDitutup: trx.length > 0 && trxTerkunci === 0
  };
}

/** Tutup buku: kunci transaksi periode ini dan simpan laporannya. | param: jenis, acuan, uangFisik (opsional), catatan | return: objek laporan, atau null bila tidak bisa ditutup */
export function tutupBuku(jenis, acuan = new Date(), uangFisik = null, catatan = '') {
  const ring = ringkasPeriode(jenis, acuan);
  if (!ring.bisaDitutup) return null;
  // kunci transaksi di dalam rentang
  db.transaksi.forEach((t) => {
    const k = new Date(t.waktu).toLocaleDateString('en-CA');
    if (k >= ring.dari && k <= ring.sampai) t.terkunci = ring.kunci;
  });
  // uang fisik opsional: bila diisi, hitung selisih terhadap pendapatan sistem
  const fisik = Number.isFinite(uangFisik) && uangFisik >= 0 ? uangFisik : ring.pendapatan;
  const laporan = {
    id: ++db.n,
    jenis,
    tanggal: ring.sampai,
    dari: ring.dari,
    sampai: ring.sampai,
    periode: ring.label,
    kunci: ring.kunci,
    transaksi: ring.transaksi,
    total_sistem: ring.pendapatan,
    pendapatan: ring.pendapatan,
    pengeluaran: ring.pengeluaran,
    laba: ring.laba,
    uang_fisik: fisik,
    selisih: fisik - ring.pendapatan,
    catatan: catatan || '',
    waktu: new Date().toISOString(),
    user_id: 1
  };
  db.tutup.push(laporan);
  return laporan;
}

/** Apakah transaksi terkunci (sudah masuk tutup buku). | param: t (transaksi) | return: boolean */
export const terkunci = (t) => !!t.terkunci;


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
    const trxHari = newDB.transaksi.filter((t) => new Date(t.waktu).toLocaleDateString('en-CA') === hari);
    const tot = trxHari.reduce((a, t) => a + t.total, 0);
    if (tot > 0) {
      // selisih contoh: 20% dari total (dibulatkan ke 1000) agar selalu masuk akal,
      // karena total satu hari bisa lebih kecil dari Rp100.000
      const kurangContoh = Math.min(100000, Math.max(1000, Math.round((tot * 0.2) / 1000) * 1000));
      const fisik = Math.max(0, tot - kurangContoh);
      // pengeluaran = modal barang terjual hari itu
      const idHari = new Set(trxHari.map((t) => t.id));
      const modal = newDB.detail.reduce((a, d) => (idHari.has(d.transaksi_id) ? a + (d.harga_beli ?? 0) * d.jumlah : a), 0);
      // kunci transaksi hari itu supaya konsisten dengan status tutup buku
      trxHari.forEach((t) => {
        t.terkunci = 'H' + hari;
      });
      newDB.tutup.push({
        id: ++newDB.n,
        jenis: 'harian',
        tanggal: hari,
        dari: hari,
        sampai: hari,
        periode: new Date(hari + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        kunci: 'H' + hari,
        transaksi: trxHari.length,
        total_sistem: tot,
        pendapatan: tot,
        pengeluaran: modal,
        laba: tot - modal,
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
