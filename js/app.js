/* ==========================================================================
   TOKO BERKAH — app.js
   Pengendali utama: menentukan halaman mana yang tampil, merender kerangka
   (sidebar + topbar), menangani semua klik tombol data-act, dan menyimpan
   preferensi tema/sidebar.
   --------------------------------------------------------------------------
   PETA FILE — cari teks "BAGIAN n":
     BAGIAN 1  DAFTAR HALAMAN & MENU     objek PG + NAV
     BAGIAN 2  ROUTING & KERANGKA        cur(), shell(), route()
     BAGIAN 3  PENANGANAN KLIK           semua aksi data-act (satu listener)
     BAGIAN 4  TEMA & SIDEBAR            sb(), theme()
     BAGIAN 5  INISIALISASI              pasang listener klik, pulihkan sesi, hashchange, route awal
   ========================================================================== */

/* ==========================================================================
   BAGIAN 1 — DAFTAR HALAMAN & MENU
   PG  : peta hash -> judul, subjudul, dan fungsi render dari pages.js
   NAV : susunan menu sidebar, dikelompokkan per grup
   ========================================================================== */

import { load, db, setDB, me, setMe, KS, save } from './db.js';
import { $, esc, rp, dt, ico, toast, modal, ask, themeIcon } from './ui.js';
import {
  dashboard,
  kasir,
  produk,
  stok,
  stokMenipis,
  laporan,
  transaksi,
  pengaturan,
  login,
  setShellRef,
  pform,
  saveP,
  kform
} from './pages.js';

const PG = {
  dashboard: { t: 'Dashboard', s: 'Ringkasan toko hari ini', html: dashboard },
  kasir: { t: 'Kasir / Penjualan', s: 'Transaksi Penjualan Toko', html: kasir },
  produk: { t: 'Manajemen Produk', s: 'Kelola data produk dan kategori', html: produk },
  stok: { t: 'Manajemen Stok', s: 'Catat mutasi dan penyesuaian stok', html: stok },
  'barang-masuk': { t: 'Barang Masuk', s: 'Pencatatan Stok Masuk', html: stok },
  'stok-menipis': { t: 'Stok Menipis', s: 'Daftar Produk Perlu Diisi Ulang', html: stokMenipis },
  laporan: { t: 'Laporan', s: 'Analisis penjualan dan laba rugi', html: laporan },
  transaksi: { t: 'Riwayat Transaksi', s: 'Daftar seluruh transaksi penjualan', html: transaksi },
  pengaturan: { t: 'Pengaturan', s: 'Pengaturan aplikasi dan profil', html: pengaturan }
};

const NAV = [
  [
    'UTAMA',
    [
      ['dashboard', 'home', 'Dashboard'],
      ['kasir', 'box', 'Kasir']
    ]
  ],
  [
    'INVENTARIS',
    [
      ['produk', 'tag', 'Produk & Kategori'],
      ['stok', 'in', 'Manajemen Stok'],
      ['stok-menipis', 'alert', 'Stok Menipis']
    ]
  ],
  [
    'LAPORAN',
    [
      ['laporan', 'list', 'Laporan Penjualan'],
      ['transaksi', 'recv', 'Riwayat Transaksi']
    ]
  ],
  ['SISTEM', [['pengaturan', 'edit', 'Pengaturan']]]
];

/* ==========================================================================
   BAGIAN 2 — ROUTING & KERANGKA
   cur()   : hash saat ini, divalidasi terhadap PG (fallback: dashboard)
   shell() : bangun ulang sidebar + topbar + isi halaman
   route() : kalau belum login tampilkan form login, kalau sudah render shell
   ========================================================================== */

const cur = () => (Object.prototype.hasOwnProperty.call(PG, location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard');

function shell() {
  const k = cur(),
    p = PG[k],
    navK = k === 'barang-masuk' ? 'stok' : k; // #barang-masuk menyorot menu Manajemen Stok
  $('#app').innerHTML =
    `<aside class="side" id="sd"><div class="logo"><i>B</i><span class="nm">Toko Berkah</span><button class="sbt" data-act="collapse" aria-label="Ciutkan atau lebarkan menu">${ico('menu')}</button></div>${NAV.map(([g, it]) => `<div class="grp">${g}</div>` + it.map(([id, ic, l]) => `<a class="nav ${id === navK ? 'on' : ''}" href="#${id}" title="${l}">${ico(ic)}<span class="ln">${l}</span>${id === 'stok-menipis' && db.produk.filter((p) => p.stok <= p.stok_minimum).length ? `<span class="b r" style="margin-left:auto">${db.produk.filter((p) => p.stok <= p.stok_minimum).length}</span>` : ''}</a>`).join('')).join('')}</aside>
<div class="main"><header class="top"><button class="ic" id="burger" data-act="menu" aria-label="Menu">${ico('menu')}</button><span class="sp"></span><button class="ic" data-act="theme" aria-label="Ganti tema">${themeIcon()}</button><div class="av"><b>${esc(me.nama[0])}</b><span>${esc(me.nama)}</span></div><button class="ic" data-act="logout" aria-label="Keluar" title="Keluar">${ico('out')}</button></header>
<main class="pg"><div class="ph"><div><h2>${p.t}</h2><p>${p.s}</p></div><div>${p.act || ''}</div></div>${p.html()}</main><footer class="ft">Dikembangkan oleh Ruelz</footer></div>`;
}

setShellRef(shell);

/* ==========================================================================
   BAGIAN 3 — PENANGANAN KLIK (data-act)
   Satu listener global di document menangani semua tombol: menu, tema, logout,
   tambah/ubah/hapus produk & kategori, dan detail transaksi.
   ========================================================================== */

function onClick(e) {
  {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const a = b.dataset.act,
      id = +b.dataset.id;
    const prod = (id) => db.produk.find((x) => x.id == id);
    const kat = (id) => db.kategori.find((x) => x.id == id);

    if (a === 'x') $('#ov').innerHTML = '';
    else if (a === 'menu') $('#sd').classList.toggle('open');
    else if (a === 'collapse') sb(!document.documentElement.classList.contains('sbmin'));
    else if (a === 'theme') {
      const nt = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      b.classList.add('spin');
      setTimeout(() => b.classList.remove('spin'), 700);
      if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        theme(nt);
        b.innerHTML = themeIcon();
      } else {
        const r = b.getBoundingClientRect(),
          x = r.left + r.width / 2,
          y = r.top + r.height / 2,
          R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document
          .startViewTransition(() => {
            theme(nt);
            b.innerHTML = themeIcon();
          })
          .ready.then(() =>
            document.documentElement.animate(
              { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
              { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
            )
          )
          .catch(() => {});
      }
    } else if (a === 'logout') {
      setMe(null);
      try {
        localStorage.removeItem(KS);
      } catch (e) {}
      route();
    } else if (a === 'addp') modal('Tambah produk', pform(), 'Simpan', (d) => saveP(d));
    else if (a === 'editp') {
      const p = prod(id);
      modal('Ubah produk', pform(p), 'Simpan', (d) => saveP(d, p));
    } else if (a === 'delp') {
      const p = prod(id);
      ask(`Hapus produk <b>${esc(p.nama)}</b>? Riwayat transaksi tetap tersimpan.`, () => {
        db.produk = db.produk.filter((x) => x.id !== id);
        save();
        toast('Produk dihapus');
        shell();
      });
    } else if (a === 'addk') kform();
    else if (a === 'editk') kform(kat(id));
    else if (a === 'delk') {
      const k = kat(id);
      ask(`Hapus kategori <b>${esc(k.nama)}</b>? Produk di dalamnya menjadi tanpa kategori.`, () => {
        db.produk.forEach((p) => {
          if (p.kategori_id === id) p.kategori_id = null;
        });
        db.kategori = db.kategori.filter((x) => x.id !== id);
        save();
        toast('Kategori dihapus');
        shell();
      });
    } else if (a === 'det') {
      const t = db.transaksi.find((x) => x.id === id);
      modal(
        t.kode,
        `<p>${dt(t.waktu)} · <span class="b n">${t.sumber}</span></p><div class="tw"><table style="min-width:0"><tr><th>Item</th><th class="r">Harga</th><th class="r">Qty</th><th class="r">Subtotal</th></tr>${db.detail
          .filter((d) => d.transaksi_id === id)
          .map(
            (d) =>
              `<tr><td>${esc(d.nama_produk)}</td><td class="r">${rp(d.harga_satuan)}</td><td class="r">${d.jumlah}</td><td class="r">${rp(d.subtotal)}</td></tr>`
          )
          .join(
            ''
          )}</table></div><div class="li"><span>Total</span><b>${rp(t.total)}</b></div><div class="li"><span>Uang diterima</span><span>${rp(t.uang_diterima)}</span></div><div class="li"><span>Kembalian</span><span>${rp(t.kembalian)}</span></div>`
      );
    }
  }
}

/* ==========================================================================
   BAGIAN 4 — TEMA & SIDEBAR
   route()  : pindah halaman; kalau belum login, arahkan ke form login
   sb()     : ciutkan/lebarkan sidebar (disimpan di localStorage)
   theme()  : ganti tema terang/gelap (disimpan di localStorage)
   ========================================================================== */

function route() {
  if (!me) {
    login(route);
    return;
  }
  shell();
  window.scrollTo(0, 0);
}
function sb(v) {
  document.documentElement.classList.toggle('sbmin', v);
  try {
    localStorage.setItem('berkah_sb', v ? '1' : '0');
  } catch (e) {}
}
function theme(t) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem('berkah_theme', t);
  } catch (e) {}
}

/* ==========================================================================
   BAGIAN 5 — INISIALISASI
   Terapkan preferensi tersimpan, muat database, pulihkan sesi login, lalu
   render halaman pertama. Setiap akses localStorage dibungkus try/catch agar
   aplikasi tetap jalan walau penyimpanan diblokir browser.
   ========================================================================== */

// Satu listener klik untuk seluruh aplikasi (juga aktif di halaman login, mis. tombol tema)
document.addEventListener('click', onClick);

// Initialization
try {
  sb(innerWidth < 992 || localStorage.getItem('berkah_sb') !== '0');
} catch (e) {
  sb(true);
}
try {
  theme(localStorage.getItem('berkah_theme') || 'light');
} catch (e) {
  theme('light');
}

setDB(load());
try {
  const s = localStorage.getItem(KS);
  setMe(db.users.find((u) => u.id == s) || null);
} catch (e) {}

addEventListener('hashchange', () => {
  if (innerWidth < 992) sb(true);
  route();
});
route();
