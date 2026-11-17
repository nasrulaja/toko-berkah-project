/* ==========================================================================
   TOKO BERKAH — core/db.js
   Sumber data tunggal: DATABASE SUPABASE. Aplikasi tidak menyimpan data toko
   di browser (tidak ada salinan lokal maupun data contoh); semua dimuat dari
   Supabase dan setiap perubahan ditulis kembali ke sana.
   Lokasi: js/core/db.js — diimpor sebagai './core/db.js' dari js/.
   --------------------------------------------------------------------------
   PETA FILE — cari teks "BAGIAN n":
     BAGIAN 1  KUNCI & STATE        kunci sesi + user aktif
     BAGIAN 2  MUAT & SIMPAN        load(), save()
     BAGIAN 3  MUTASI STOK          mut(), terkunci()
   ========================================================================== */

import { muatDB, simpanDB } from './api.js?v=20261117j';

/* ==========================================================================
   BAGIAN 1 — KUNCI & STATE
   Hanya sesi login (siapa yang masuk) yang diingat browser. Data toko tidak.
   ========================================================================== */

export const KS = 'berkah_session';
export let db;
export let me = null;

/** Dari mana data terakhir dimuat: selalu 'supabase' bila berhasil. Dipakai halaman Pengaturan. */
export let dbSumber = 'supabase';
/** Pesan galat terakhir dari Supabase (kosong bila tidak ada masalah). */
export let dbGalat = '';

/** Akun demo sementara: dipakai untuk login saat pengembangan/uji coba.
 *  Akun ini TIDAK bergantung pada Supabase dan selalu disisipkan ke db.users
 *  oleh load(), supaya bisa masuk walau data Supabase tidak punya user yang cocok.
 *  Kredensial: email `berkah@gmail.com`, kata sandi `berkah123`.
 *  Hapus DEMO_USER dari load() bila verifikasi login sudah pindah ke server. */
export const DEMO_USER = {
  id: 'demo',
  nama: 'Berkah',
  email: 'berkah@gmail.com',
  pw: btoa('berkah123'),
  role_id: 1,
  bisa_kelola_barang: true,
  bisa_transaksi: true
};

/** Menyisipkan akun demo ke daftar user bila belum ada. | param: list (array user) | return: array user
 *  Bila email demo sudah ada tetapi kata sandinya tidak cocok (mis. data Supabase
 *  menyimpan pw = null karena hash tidak pernah dikirim ke klien), entri itu
 *  ditimpa dengan DEMO_USER supaya akun demo dijamin bisa dipakai. */
function denganDemo(list) {
  const arr = Array.isArray(list) ? list : [];
  const i = arr.findIndex((u) => u && u.email === DEMO_USER.email);
  if (i === -1) return [DEMO_USER, ...arr];
  // sudah ada dan kata sandinya cocok: biarkan apa adanya
  if (arr[i].pw === DEMO_USER.pw) return arr;
  // ada tapi tanpa/tidak cocok kata sandi: pakai data demo yang pasti bisa masuk
  const copy = arr.slice();
  copy[i] = { ...arr[i], ...DEMO_USER };
  return copy;
}

/** Menetapkan user yang sedang login. | param: val (objek user) | return: void */
export const setMe = (val) => {
  me = val;
};

/** Mengganti objek database aktif. | param: val (objek DB) | return: void */
export const setDB = (val) => {
  db = val;
};

/* ==========================================================================
   BAGIAN 2 — MUAT & SIMPAN
   ========================================================================== */

/** Memuat seluruh data dari Supabase. Bila gagal, galatnya dilempar ke pemanggil.
 *  param: - | return: Promise<objek DB> */
export async function load() {
  try {
    const d = await muatDB();
    dbGalat = '';
    // akun demo: selalu bisa masuk walau Supabase tidak punya user yang cocok.
    // Disisipkan di satu-satunya jalur muat (Supabase) karena load() kini
    // tidak lagi memakai fallback localStorage/seed.
    if (d) d.users = denganDemo(d.users);
    return d;
  } catch (e) {
    dbGalat = e.message || String(e);
    throw e;
  }
}

/** Antrean simpan: perubahan dikirim satu per satu agar urutannya tidak bertabrakan. */
let antrean = Promise.resolve({ ok: true });

/** Menulis perubahan ke Supabase lalu memuat ulang dari sana, sehingga yang tampil
 *  selalu sama dengan isi database (id asli, urutan, dan angka dari server).
 *  Bila gagal, tampilan dikembalikan ke isi database.
 *  param: - | return: Promise<{ok:boolean, pesan?:string}> */
export function save() {
  antrean = antrean.then(async () => {
    const r = await simpanDB(db);
    try {
      setDB(await muatDB());
    } catch (e) {
      if (r.ok) return { ok: false, pesan: 'Tersimpan, tetapi gagal memuat ulang: ' + (e.message || e) };
    }
    dbGalat = r.ok ? '' : r.pesan || '';
    return r;
  });
  return antrean;
}

/* ==========================================================================
   BAGIAN 3 — MUTASI STOK
   mut() mengubah stok produk di memori dan mencatat riwayatnya. Keduanya baru
   masuk database saat save() dipanggil.
   ========================================================================== */

/** Mencatat satu mutasi stok (masuk/penyesuaian/keluar) dan memperbarui stok produk. | param: p (produk), jenis (string), jml (angka delta), o (opsi) | return: void */
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
    user_id: me?.id || 1
  });
}

/** Apakah transaksi terkunci (sudah masuk tutup buku). | param: t (transaksi) | return: boolean */
export const terkunci = (t) => !!t.terkunci;
