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

import { muatDB, simpanDB } from './api.js?v=20261117g';

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
