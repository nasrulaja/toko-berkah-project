/* ==========================================================================
   TOKO BERKAH — api.js
   Penghubung ke database Supabase (REST/PostgREST).

   Peran file ini:
   - Menyimpan alamat & kunci project Supabase.
   - Mengambil (muat) seluruh data dari tabel Supabase lalu MENYUSUNNYA
     menjadi satu objek DB yang bentuknya sama persis dengan yang dipakai
     aplikasi (lihat db.js), sehingga halaman tidak perlu diubah.
   - Mengirim perubahan (simpan) dari objek DB kembali ke tabel Supabase.

   Catatan penting soal nama kolom:
   Tabel di Supabase memakai nama kolom bahasa Indonesia yang sedikit berbeda
   dengan properti di aplikasi. Semua perbedaan itu diterjemahkan di sini
   (fungsi MAP di bawah), jadi db.js & pages.js tetap memakai nama lamanya.

   PETA NAMA KOLOM (Supabase  ->  aplikasi):
     produk.harga_jual             -> produk.harga
     produk...                     -> produk.harga_beli (tidak ada di DB)
     stok_mutasi.harga_kulak       -> mutasi.harga_beli
     transaksi.kode_transaksi      -> transaksi.kode
     transaksi.rekap_id            -> transaksi.terkunci (penanda periode)
     detail_transaksi.harga_jual   -> detail.harga_satuan
     tutup_buku.*                  -> tutup.*
   ========================================================================== */

/* ==========================================================================
   BAGIAN 1 — ALAMAT & KUNCI PROJECT
   Kunci ini adalah "publishable/anon key", aman dipakai di browser karena
   hak aksesnya dibatasi oleh Row Level Security di Supabase.
   ========================================================================== */

export const SUPA_URL = 'https://tflawnflbyjgnqtdkjyq.supabase.co';
export const SUPA_KEY = 'sb_publishable_OjaTZ3hwwpvVlQDIb-D7qQ_E9lbEhse';

/** Alamat dasar REST API. | param: - | return: string */
const BASE = SUPA_URL + '/rest/v1';

/** Header wajib untuk setiap permintaan. | param: extra (objek header tambahan) | return: objek header */
function head(extra = {}) {
  return {
    apikey: SUPA_KEY,
    Authorization: 'Bearer ' + SUPA_KEY,
    'Content-Type': 'application/json',
    ...extra
  };
}

/** Mengambil satu tabel dari Supabase. | param: tabel (string), q (query string opsional) | return: array baris */
async function get(tabel, q = 'select=*') {
  const res = await fetch(`${BASE}/${tabel}?${q}`, { headers: head() });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${tabel}: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

/** Menghapus isi satu tabel (untuk sinkron ulang). | param: tabel (string) | return: void */
async function clear(tabel) {
  const res = await fetch(`${BASE}/${tabel}?id=gte.0`, {
    method: 'DELETE',
    headers: head({ Prefer: 'return=minimal' })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`hapus ${tabel}: ${res.status} ${t.slice(0, 200)}`);
  }
}

/** Menyisipkan banyak baris sekaligus. | param: tabel (string), rows (array) | return: void */
async function insert(tabel, rows) {
  if (!rows || !rows.length) return;
  // kirim bertahap agar tidak melebihi batas ukuran permintaan
  const SIZE = 200;
  for (let i = 0; i < rows.length; i += SIZE) {
    const potong = rows.slice(i, i + SIZE);
    const res = await fetch(`${BASE}/${tabel}`, {
      method: 'POST',
      headers: head({ Prefer: 'return=minimal' }),
      body: JSON.stringify(potong)
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`simpan ${tabel}: ${res.status} ${t.slice(0, 300)}`);
    }
  }
}
/* ==========================================================================
   BAGIAN 2 — MUAT: Supabase -> objek DB aplikasi
   ========================================================================== */

/** Mengubah waktu dari Supabase menjadi ISO UTC yang benar.
 *  Supabase menyimpan waktu tanpa zona (mis. "2026-11-09T08:58:01"), padahal
 *  itu waktu lokal toko (WIB). Tanpa penanda zona, browser lain bisa
 *  menampilkannya bergeser. Karena itu ditambahkan "+07:00" secara eksplisit.
 *  param: s (string waktu) | return: string ISO */
const iso = (s) => {
  if (!s) return new Date().toISOString();
  let v = String(s).trim().replace(' ', 'T');
  // bila belum ada penanda zona waktu, anggap WIB
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(v)) v += '+07:00';
  const d = new Date(v);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
};

/** Ambil tanggal (YYYY-MM-DD) dari sebuah waktu. | param: w | return: string */
const tgl = (w) => new Date(w).toLocaleDateString('en-CA');

/** Susun objek DB aplikasi dari tabel-tabel Supabase. | param: - | return: objek DB */
export async function muatDB() {
  // semua tabel diambil sekaligus agar cepat
  const [users, roles, kategori, produk, transaksi, detail, mutasi, tutup] = await Promise.all([
    get('users', 'select=id,nama,email,role_id'),
    get('roles', 'select=*'),
    get('kategori', 'select=*&order=id'),
    get('produk', 'select=*&order=id'),
    get('transaksi', 'select=*&order=id'),
    get('detail_transaksi', 'select=*&order=id'),
    get('stok_mutasi', 'select=*&order=id'),
    get('tutup_buku', 'select=*&order=id')
  ]);

  // harga beli tidak disimpan di tabel produk. Ambil nilai terakhir yang
  // diketahui dari riwayat stok masuk (harga_kulak) sebagai perkiraan.
  const beli = new Map();
  mutasi.forEach((m) => {
    if (m.harga_kulak != null && m.harga_kulak > 0) beli.set(m.produk_id, m.harga_kulak);
  });

  return {
    n: Math.max(0, ...[...users, ...kategori, ...produk, ...transaksi, ...detail, ...mutasi, ...tutup].map((r) => r.id || 0)) + 1000,

    users: users.map((u) => {
      const r = roles.find((x) => x.id === u.role_id) || { bisa_kelola_barang: true, bisa_transaksi: true };
      return {
        id: u.id,
        nama: u.nama,
        email: u.email,
        username: String(u.email || '').split('@')[0],
        // DB hanya menyimpan hash; kata sandi asli tidak bisa dibaca.
        pass: null,
        role_id: u.role_id,
        bisa_kelola_barang: !!r.bisa_kelola_barang,
        bisa_transaksi: !!r.bisa_transaksi
      };
    }),

    roles: roles.map((r) => ({ ...r })),

    kategori: kategori.map((k) => ({ id: k.id, nama: k.nama })),

    produk: produk.map((p) => ({
      id: p.id,
      nama: p.nama,
      barcode: p.barcode || '',
      harga: p.harga_jual,
      harga_beli: beli.get(p.id) ?? 0,
      stok: p.stok,
      kategori_id: p.kategori_id,
      stok_minimum: p.stok_minimum ?? 0,
      isi_pack: 1
    })),

    transaksi: transaksi.map((t) => ({
      id: t.id,
      kode: t.kode_transaksi,
      waktu: iso(t.waktu),
      total: t.total,
      uang_diterima: t.uang_diterima ?? t.total,
      kembalian: t.kembalian ?? 0,
      sumber: 'kasir',
      user_id: t.user_id,
      terkunci: t.rekap_id ? 'R' + t.rekap_id : null
    })),

    detail: detail.map((d) => ({
      id: d.id,
      transaksi_id: d.transaksi_id,
      produk_id: d.produk_id,
      nama_produk: d.nama_produk,
      harga_satuan: d.harga_jual,
      harga_beli: beli.get(d.produk_id) ?? null,
      jumlah: d.jumlah,
      subtotal: d.subtotal
    })),

    mutasi: mutasi.map((m) => ({
      id: m.id,
      produk_id: m.produk_id,
      jenis: m.jenis,
      jumlah: m.jumlah,
      stok_sebelum: m.stok_sebelum,
      stok_sesudah: m.stok_sesudah,
      harga_beli: m.harga_kulak,
      transaksi_id: m.transaksi_id,
      catatan: m.catatan || '',
      waktu: iso(m.waktu),
      user_id: m.user_id
    })),

    tutup: tutup.map((x) => ({
      id: x.id,
      jenis: 'harian',
      tanggal: x.tanggal,
      dari: x.tanggal,
      sampai: x.tanggal,
      periode: new Date(x.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }),
      kunci: 'H' + x.tanggal,
      transaksi: transaksi.filter((t) => tgl(iso(t.waktu)) === x.tanggal).length,
      total_sistem: x.total_penjualan,
      pendapatan: x.total_penjualan,
      pengeluaran: 0,
      laba: x.total_penjualan,
      uang_fisik: x.uang_di_laci,
      selisih: x.selisih ?? 0,
      catatan: x.catatan || '',
      waktu: iso(x.ditutup_pada),
      user_id: x.user_id
    }))
  };
}


/* ==========================================================================
   BAGIAN 3 — SIMPAN: objek DB aplikasi -> Supabase
   Strategi: tulis HANYA baris yang berubah, bukan menimpa seluruh tabel.
   - Produk  : dicocokkan lewat id, di-update satu per satu (stok & harga).
   - Transaksi baru, detail, dan mutasi: ditambahkan (insert).
   Tabel master (users, roles, kategori) tidak diubah dari aplikasi.
   ========================================================================== */

/**
 * Menyimpan perubahan dari objek DB ke Supabase.
 * @param {object} data objek DB aplikasi
 * @param {object} opsi { produkSaja:boolean } — bila true, hanya stok/harga produk yang dikirim
 * @return {Promise<{ok:boolean, pesan?:string}>}
 */
export async function simpanDB(data, opsi = {}) {
  try {
    // 1) PRODUK: kirim harga jual & stok terkini
    for (const p of data.produk || []) {
      if (!p.id) continue;
      const res = await fetch(`${BASE}/produk?id=eq.${p.id}`, {
        method: 'PATCH',
        headers: head({ Prefer: 'return=minimal' }),
        body: JSON.stringify({
          nama: p.nama,
          barcode: p.barcode || null,
          harga_jual: p.harga,
          stok: p.stok,
          kategori_id: p.kategori_id,
          stok_minimum: p.stok_minimum ?? 0,
          updated_at: new Date().toISOString()
        })
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`produk ${p.id}: ${res.status} ${t.slice(0, 200)}`);
      }
    }

    if (opsi.produkSaja) return { ok: true };

    // 2) MUTASI STOK: hanya baris yang belum ada di database
    const adaMutasi = new Set((await get('stok_mutasi', 'select=id')).map((r) => r.id));
    const mutBaru = (data.mutasi || [])
      .filter((m) => !adaMutasi.has(m.id))
      .map((m) => ({
        id: m.id,
        produk_id: m.produk_id,
        jenis: m.jenis === 'jual' ? 'keluar' : m.jenis === 'penyesuaian' ? 'penyesuaian' : 'masuk',
        jumlah: m.jumlah,
        stok_sebelum: m.stok_sebelum,
        stok_sesudah: m.stok_sesudah,
        harga_kulak: m.harga_beli ?? null,
        transaksi_id: m.transaksi_id ?? null,
        catatan: m.catatan || null,
        waktu: m.waktu,
        user_id: m.user_id || 1
      }));
    await insert('stok_mutasi', mutBaru);

    // 3) TRANSAKSI: hanya yang belum ada
    const adaTrx = new Set((await get('transaksi', 'select=id')).map((r) => r.id));
    const trxBaru = (data.transaksi || [])
      .filter((t) => !adaTrx.has(t.id))
      .map((t) => ({
        id: t.id,
        kode_transaksi: t.kode,
        waktu: t.waktu,
        total: t.total,
        uang_diterima: t.uang_diterima ?? t.total,
        kembalian: t.kembalian ?? 0,
        user_id: t.user_id || 1,
        rekap_id: null
      }));
    await insert('transaksi', trxBaru);

    // 4) DETAIL TRANSAKSI: hanya yang belum ada
    const adaDetail = new Set((await get('detail_transaksi', 'select=id')).map((r) => r.id));
    const detBaru = (data.detail || [])
      .filter((d) => !adaDetail.has(d.id))
      .map((d) => ({
        id: d.id,
        transaksi_id: d.transaksi_id,
        struk_id: null,
        produk_id: d.produk_id,
        nama_produk: d.nama_produk,
        harga_jual: d.harga_satuan,
        jumlah: d.jumlah,
        subtotal: d.subtotal
      }));
    await insert('detail_transaksi', detBaru);

    return { ok: true };
  } catch (e) {
    return { ok: false, pesan: e.message || String(e) };
  }
}

/** Menyimpan satu tutup buku ke Supabase. | param: x (objek tutup dari aplikasi) | return: Promise<{ok,pesan?}> */
export async function simpanTutup(x) {
  try {
    const res = await fetch(`${BASE}/tutup_buku`, {
      method: 'POST',
      headers: head({ Prefer: 'return=minimal' }),
      body: JSON.stringify({
        id: x.id,
        tanggal: x.tanggal,
        total_penjualan: x.total_sistem ?? x.pendapatan ?? 0,
        uang_di_laci: x.uang_fisik ?? 0,
        selisih: x.selisih ?? 0,
        status: (x.selisih ?? 0) === 0 ? 'sesuai' : x.selisih < 0 ? 'kurang' : 'lebih',
        catatan: x.catatan || null,
        user_id: x.user_id || 1,
        ditutup_pada: x.waktu || new Date().toISOString()
      })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      return { ok: false, pesan: `${res.status} ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, pesan: e.message || String(e) };
  }
}

/** Uji koneksi ke Supabase (dipakai halaman Pengaturan). | param: - | return: Promise<{ok,pesan}> */
export async function ujiKoneksi() {
  try {
    const res = await fetch(`${BASE}/produk?select=id&limit=1`, { headers: head() });
    if (!res.ok) return { ok: false, pesan: `HTTP ${res.status}` };
    const n = (await res.json()).length;
    return { ok: true, pesan: `Terhubung (${SUPA_URL.replace('https://', '')}), data terbaca: ${n} baris contoh` };
  } catch (e) {
    return { ok: false, pesan: e.message || String(e) };
  }
}

