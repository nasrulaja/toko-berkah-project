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

import { load, db, setDB, me, setMe, KS, save } from './db.js?v=20261112a';
import { $, esc, rp, dt, ico, toast, modal, ask, themeIcon } from './ui.js?v=20261112a';
import {
  dashboard,
  produk,
  stok,
  stokMenipis,
  notifikasi,
  notifUnread,
  laporan,
  hasilTutupBuku,
  transaksi,
  pengaturan,
  login,
  setShellRef,
  pform,
  saveP,
  kform
} from './pages.js?v=20261112a';

const PG = {
  dashboard: { t: 'Dasbor', s: 'Ringkasan toko hari ini', html: dashboard },
  produk: { t: 'Manajemen Produk', s: 'Kelola data produk dan kategori', html: produk },
  stok: { t: 'Manajemen Stok', s: 'Catat mutasi dan penyesuaian stok', html: stok },
  'barang-masuk': { t: 'Barang Masuk', s: 'Pencatatan Stok Masuk', html: stok },
  notifikasi: { t: 'Semua Notifikasi', s: 'Lihat semua aktivitas toko', html: notifikasi },
  'stok-menipis': { t: 'Stok Menipis', s: 'Daftar Produk Perlu Diisi Ulang', html: stokMenipis },
  'tutup-buku': { t: 'Hasil Tutup Buku', s: 'Laporan hasil proses tutup buku desktop', html: hasilTutupBuku },
  laporan: { t: 'Laporan', s: 'Analisis penjualan dan laba rugi', html: laporan },
  transaksi: { t: 'Riwayat Transaksi', s: 'Daftar seluruh transaksi penjualan', html: transaksi },
  pengaturan: { t: 'Pengaturan', s: 'Pengaturan aplikasi dan profil', html: pengaturan }
};

const NAV = [
  [
    'UTAMA',
    [
      ['dashboard', 'home', 'Dasbor']
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
      ['tutup-buku', 'wallet', 'Hasil Tutup Buku'],
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
<div class="main"><header class="top"><span class="brand"><i>B</i><b>${p.t}</b></span><span class="tdate">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span><span class="sp"></span><a class="ic bell" href="#notifikasi" title="Notifikasi" aria-label="Notifikasi">${ico('bell')}${notifUnread() ? `<em>${notifUnread() > 99 ? '99+' : notifUnread()}</em>` : ''}</a><button class="ic" data-act="theme" aria-label="Ganti tema">${themeIcon()}</button><button class="ic" data-act="logout" aria-label="Keluar" title="Keluar">${ico('out')}</button></header>
<main class="pg"><div class="ph"><div><h2>${p.t}</h2><p>${p.s}</p></div><div>${p.act || ''}</div></div>${p.html()}</main><footer class="ft">Dikembangkan oleh Ruelz</footer></div>${bottomNav(navK)}`;
  labelTables();
}

/** Bar menu bawah khusus HP (rail kaca disembunyikan di layar kecil). | param: k (menu aktif) | return: string HTML */
function bottomNav(k) {
  const items = [
      ['dashboard', 'home', 'Beranda'],
      ['produk', 'tag', 'Produk'],
      ['stok', 'in', 'Stok']
    ],
    nLow = db.produk.filter((p) => p.stok <= p.stok_minimum).length,
    moreOn = ['stok-menipis', 'laporan', 'tutup-buku', 'transaksi', 'pengaturan'].includes(k);
  return `<nav class="bnav" aria-label="Menu utama">${items
    .map(([id, ic, l]) => `<a href="#${id}" class="${id === k ? 'on' : ''}">${ico(ic)}<span>${l}</span></a>`)
    .join('')}<button type="button" data-act="more" class="${moreOn ? 'on' : ''}">${ico('menu')}<span>Lainnya</span>${nLow ? `<em>${nLow}</em>` : ''}</button></nav>`;
}

/** Beri atribut data-label pada sel tabel agar bisa ditampilkan sebagai kartu di HP. | param: - | return: void */
function labelTables() {
  document.querySelectorAll('.tw table').forEach((t) => {
    const rows = [...t.rows],
      head = rows.find((r) => r.querySelector('th'));
    if (!head) return;
    const names = [...head.cells].map((c) => c.textContent.trim());
    rows.forEach((r) => {
      if (r === head || r.cells.length !== names.length) return;
      [...r.cells].forEach((c, i) => (c.dataset.label = names[i]));
    });
  });
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
    else if (a === 'more') {
      const nLow = db.produk.filter((p) => p.stok <= p.stok_minimum).length;
      modal(
        'Menu lainnya',
        `<div class="mlist"><a href="#stok-menipis" data-act="x">${ico('alert')}<span>Stok Menipis</span>${nLow ? `<b class="b r">${nLow}</b>` : ''}</a><a href="#laporan" data-act="x">${ico('list')}<span>Laporan Penjualan</span></a><a href="#tutup-buku" data-act="x">${ico('wallet')}<span>Hasil Tutup Buku</span></a><a href="#transaksi" data-act="x">${ico('recv')}<span>Riwayat Transaksi</span></a><a href="#pengaturan" data-act="x">${ico('edit')}<span>Pengaturan</span></a><button type="button" data-act="logout">${ico('out')}<span>Keluar</span></button></div>`,
        ''
      );
    }
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
      $('#ov').innerHTML = '';
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
        `<p>${dt(t.waktu)}</p><div class="tw"><table style="min-width:0"><tr><th>Barang</th><th class="r">Harga</th><th class="r">Jml</th><th class="r">Subtotal</th></tr>${db.detail
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

/* Efek loading antar halaman: lapisan #pl tampil sebentar, halaman diganti
   di baliknya, lalu lapisan memudar. Dilewati bila pengguna memilih "kurangi animasi". */
const LOAD_FEEDBACK_MS = 120;
let loadTimer;
function loader(on) {
  let l = $('#pl');
  if (!l) {
    l = document.createElement('div');
    l.id = 'pl';
    l.setAttribute('role', 'status');
    l.setAttribute('aria-live', 'polite');
    l.setAttribute('aria-label', 'Memuat halaman');
    l.innerHTML =
      '<div class="pl-card"><span class="pl-orbit" aria-hidden="true"><span class="pl-ring"></span></span><span class="pl-label">Memuat halaman</span><span class="pl-track" aria-hidden="true"><span></span></span></div>';
    document.body.append(l);
  }
  // paksa reflow supaya transisi opacity jalan saat lapisan baru dibuat
  void l.offsetWidth;
  l.classList.toggle('on', on);
}
function go() {
  clearTimeout(loadTimer);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return route();
  loader(true);
  route();
  loadTimer = setTimeout(() => {
    loader(false);
  }, LOAD_FEEDBACK_MS);
}

addEventListener('hashchange', () => {
  if (innerWidth < 992) sb(true);
  go();
});
route();
if (me && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // muat awal: tampilkan loading singkat seperti pindah halaman
  loader(true);
  setTimeout(() => loader(false), LOAD_FEEDBACK_MS);
}
