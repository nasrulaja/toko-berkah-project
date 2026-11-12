import { load, db, setDB, me, setMe, KS, save, mut } from './db.js?v=20261112b';
import { $, $$, esc, rp, dt, ico, toast, modal, ask, themeIcon } from './ui.js?v=20261112b';
import { dashboard, produk, stok, laporan, hasilTutupBuku, notifikasi, transaksi, pengaturan, login, setShellRef, pform, saveP, kform } from './pages.js?v=20261112b';

let S = {};

const PG = {
  'dashboard': { t: 'Dashboard', s: 'Ringkasan toko hari ini', html: dashboard },
  'produk': { t: 'Manajemen Produk', s: 'Kelola data produk dan kategori', html: produk },
  'stok': { t: 'Manajemen Stok', s: 'Catat mutasi dan penyesuaian stok', html: stok },
  'barang-masuk': { t: 'Barang Masuk', s: 'Pencatatan Stok Masuk', html: stok },
  'stok-menipis': { t: 'Stok Menipis', s: 'Daftar Produk Perlu Diisi Ulang', html: produk },
  'tutup-buku': { t: 'Hasil Tutup Buku', s: 'Laporan hasil proses tutup buku desktop', html: hasilTutupBuku },
  'laporan': { t: 'Laporan', s: 'Analisis penjualan dan laba rugi', html: laporan },
  'notifikasi': { t: 'Notifikasi', s: 'Aktivitas stok, transaksi, dan tutup buku', html: notifikasi },
  'transaksi': { t: 'Riwayat Transaksi', s: 'Daftar seluruh transaksi penjualan', html: transaksi },
  'pengaturan': { t: 'Pengaturan', s: 'Pengaturan aplikasi dan profil', html: pengaturan }
};

const NAV = [
  ['UTAMA', [['dashboard', 'home', 'Dashboard']]],
  ['INVENTARIS', [['produk', 'tag', 'Produk & Kategori'], ['stok', 'in', 'Manajemen Stok'], ['stok-menipis', 'alert', 'Stok Menipis']]],
  ['LAPORAN', [['laporan', 'list', 'Laporan Penjualan'], ['tutup-buku', 'recv', 'Hasil Tutup Buku'], ['notifikasi', 'bell', 'Notifikasi'], ['transaksi', 'recv', 'Riwayat Transaksi']]],
  ['SISTEM', [['pengaturan', 'edit', 'Pengaturan']]]
];

const cur = () => (location.hash.slice(1) in PG ? location.hash.slice(1) : 'dashboard');

function renderNotifContent() {
  const dk = iso => new Date(iso).toLocaleDateString('en-CA');
  const td = dk(new Date().toISOString());
  const yd = dk(new Date(Date.now() - 864e5).toISOString());

  const trTd = db.transaksi.filter(t => dk(t.waktu) === td);
  const trYd = db.transaksi.filter(t => dk(t.waktu) === yd);

  let salesHtml = '';

  if (!trTd.length) {
    salesHtml = `
      <div class="notif-card">
        <h5>Ringkasan Penjualan Hari Ini</h5>
        <div class="notif-empty">Belum ada penjualan hari ini</div>
      </div>
    `;
  } else {
    const totalToday = trTd.reduce((a, t) => a + t.total, 0);
    const totalYesterday = trYd.reduce((a, t) => a + t.total, 0);

    const txIdsTd = new Set(trTd.map(t => t.id));
    const detailsTd = db.detail.filter(d => txIdsTd.has(d.transaksi_id));
    const totalItems = detailsTd.reduce((a, d) => a + d.jumlah, 0);

    const prodQtyMap = {};
    detailsTd.forEach(d => {
      prodQtyMap[d.nama_produk] = (prodQtyMap[d.nama_produk] || 0) + d.jumlah;
    });
    let topProd = '-', maxQty = 0;
    Object.entries(prodQtyMap).forEach(([name, qty]) => {
      if (qty > maxQty) { maxQty = qty; topProd = name; }
    });
    const topProdText = maxQty ? `${topProd} (${maxQty} barang)` : '-';

    const diff = totalToday - totalYesterday;
    let compText = '';
    if (totalYesterday === 0) {
      compText = totalToday > 0 ? `<span class="up">+100% vs kemarin</span>` : `<span>0% vs kemarin</span>`;
    } else {
      const pct = Math.round((diff / totalYesterday) * 100);
      if (pct > 0) compText = `<span class="up">Naik ${pct}% (${rp(diff)})</span>`;
      else if (pct < 0) compText = `<span class="down">Turun ${Math.abs(pct)}% (${rp(Math.abs(diff))})</span>`;
      else compText = `<span>Sama dengan kemarin</span>`;
    }

    let webCount = 0, androidCount = 0, desktopCount = 0;
    trTd.forEach(t => {
      const s = (t.sumber || '').toLowerCase();
      if (s.includes('android')) androidCount++;
      else if (s.includes('desktop')) desktopCount++;
      else webCount++;
    });

    salesHtml = `
      <div class="notif-card">
        <h5 style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span>Ringkasan Penjualan Hari Ini</span>
        </h5>
        <div class="notif-row"><span>Total Penjualan</span><b>${rp(totalToday)}</b></div>
        <div class="notif-row"><span>Transaksi & Barang</span><b>${trTd.length} transaksi (${totalItems} barang)</b></div>
        <div class="notif-row"><span>Produk Terlaris</span><b>${esc(topProdText)}</b></div>
        <div class="notif-row"><span>Perbandingan Kemarin</span><b>${compText}</b></div>
        <div class="notif-grid">
          <div class="notif-src"><span>Web</span><b>${webCount}</b></div>
          <div class="notif-src"><span>Android</span><b>${androidCount}</b></div>
          <div class="notif-src"><span>Desktop</span><b>${desktopCount}</b></div>
        </div>
      </div>
    `;
  }

  const lowStock = db.produk.filter(p => p.stok <= p.stok_minimum);
  let lowHtml = '';

  if (!lowStock.length) {
    lowHtml = `
      <div class="notif-sec">
        <div class="notif-h"><span>Peringatan Stok Menipis</span></div>
        <div class="notif-empty">Semua stok aman</div>
      </div>
    `;
  } else {
    lowHtml = `
      <div class="notif-sec">
        <div class="notif-h">
          <span>Stok Menipis (${lowStock.length})</span>
          <a href="#stok-menipis" data-act="notif-link">Lihat semua</a>
        </div>
        ${lowStock.slice(0, 5).map(p => `
          <div class="notif-item">
            <span>${esc(p.nama)}</span>
            <b>Sisa ${p.stok}</b>
          </div>
        `).join('')}
      </div>
    `;
  }

  return `
    <div class="notif-sec">
      ${salesHtml}
      ${lowHtml}
      <div class="notif-all"><a href="#notifikasi" data-act="notif-link">Lihat semua aktivitas</a></div>
    </div>
  `;
}

function shell() {
  const k = cur(), p = PG[k];
  const lowCount = db.produk.filter(p => p.stok <= p.stok_minimum).length;
  $('#app').innerHTML = `<aside class="side" id="sd"><div class="logo"><i>B</i><span class="nm">Toko Berkah</span><button class="sbt" data-act="collapse" aria-label="Ciutkan atau lebarkan menu">${ico('menu')}</button></div>${NAV.map(([g, it]) => `<div class="grp">${g}</div>` + it.map(([id, ic, l]) => `<a class="nav ${id === k ? 'on' : ''}" href="#${id}" title="${l}">${ico(ic)}<span class="ln">${l}</span>${id === 'stok-menipis' && db.produk.filter(p => p.stok <= p.stok_minimum).length ? `<span class="b r" style="margin-left:auto">${db.produk.filter(p => p.stok <= p.stok_minimum).length}</span>` : ''}</a>`).join('')).join('')}</aside>
<div class="main"><header class="top"><button class="ic" id="burger" data-act="menu" aria-label="Menu">${ico('menu')}</button><span class="sp"></span><button class="ic" data-act="theme" aria-label="Ganti tema">${themeIcon()}</button><div style="position:relative"><button class="notif-btn" data-act="notif" aria-label="Notifikasi">${ico('bell')}${lowCount ? `<span class="badge">${lowCount}</span>` : ''}</button><div class="notif-drop" id="notif-drop" hidden></div></div><div class="av"><b>${esc(me.nama[0])}</b><span>${esc(me.nama)}</span></div><button class="ic" data-act="logout" aria-label="Keluar" title="Keluar">${ico('out')}</button></header>
<main class="pg"><div class="ph"><div><h2>${p.t}</h2><p>${p.s}</p></div><div>${p.act || ''}</div></div>${p.html()}</main></div>`;
  bind();
}

setShellRef(shell);

function bind() {
  document.onclick = e => {
    const drop = $('#notif-drop');
    if (drop && !drop.hidden && !e.target.closest('[data-act="notif"]') && !e.target.closest('#notif-drop')) {
      drop.hidden = true;
    }

    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act, id = +b.dataset.id;
    const prod = id => db.produk.find(x => x.id == id);
    const kat = id => db.kategori.find(x => x.id == id);

    if (a === 'x') $('#ov').innerHTML = '';
    else if (a === 'notif') {
      if (drop) {
        const isHidden = drop.hidden;
        if (isHidden) {
          drop.innerHTML = renderNotifContent();
          drop.hidden = false;
        } else {
          drop.hidden = true;
        }
      }
    }
    else if (a === 'notif-link') {
      if (drop) drop.hidden = true;
    }
    else if (a === 'menu') $('#sd').classList.toggle('open');
    else if (a === 'collapse') sb(!document.documentElement.classList.contains('sbmin'));
    else if (a === 'theme') {
      const nt = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      b.classList.add('spin'); setTimeout(() => b.classList.remove('spin'), 700);
      if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        theme(nt); b.innerHTML = themeIcon();
      } else {
        const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        document.startViewTransition(() => { theme(nt); b.innerHTML = themeIcon(); }).ready.then(() => document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] }, { duration: 700, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => { });
      }
    }
    else if (a === 'logout') { setMe(null); try { localStorage.removeItem(KS) } catch (e) { } route() }
    else if (a === 'addp') modal('Tambah produk', pform(), 'Simpan', d => saveP(d));
    else if (a === 'editp') { const p = prod(id); modal('Ubah produk', pform(p), 'Simpan', d => saveP(d, p)) }
    else if (a === 'delp') { const p = prod(id); ask(`Hapus produk <b>${esc(p.nama)}</b>? Riwayat transaksi tetap tersimpan.`, () => { db.produk = db.produk.filter(x => x.id !== id); save(); toast('Produk dihapus'); shell() }) }
    else if (a === 'addk') kform(); else if (a === 'editk') kform(kat(id));
    else if (a === 'delk') { const k = kat(id); ask(`Hapus kategori <b>${esc(k.nama)}</b>? Produk di dalamnya menjadi tanpa kategori.`, () => { db.produk.forEach(p => { if (p.kategori_id === id) p.kategori_id = null }); db.kategori = db.kategori.filter(x => x.id !== id); save(); toast('Kategori dihapus'); shell() }) }
    else if (a === 'det') {
      const t = db.transaksi.find(x => x.id === id);
      modal(t.kode, `<p>${dt(t.waktu)} · <span class="b n">${t.sumber}</span></p><div class="tw"><table style="min-width:0"><tr><th>Item</th><th class="r">Harga</th><th class="r">Qty</th><th class="r">Subtotal</th></tr>${db.detail.filter(d => d.transaksi_id === id).map(d => `<tr><td>${esc(d.nama_produk)}</td><td class="r">${rp(d.harga_satuan)}</td><td class="r">${d.jumlah}</td><td class="r">${rp(d.subtotal)}</td></tr>`).join('')}</table></div><div class="li"><span>Total</span><b>${rp(t.total)}</b></div><div class="li"><span>Uang diterima</span><span>${rp(t.uang_diterima)}</span></div><div class="li"><span>Kembalian</span><span>${rp(t.kembalian)}</span></div>`)
    }
  }
}

function route() { if (!me) { login(route); return } shell(); window.scrollTo(0, 0) }
function sb(v) { document.documentElement.classList.toggle('sbmin', v); try { localStorage.setItem('berkah_sb', v ? '1' : '0') } catch (e) { } }
function theme(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('berkah_theme', t) } catch (e) { } }

// Initialization
try { sb(innerWidth < 992 || localStorage.getItem('berkah_sb') !== '0') } catch (e) { sb(true) }
try { theme(localStorage.getItem('berkah_theme') || 'light') } catch (e) { theme('light') }

setDB(load());
try { const s = localStorage.getItem(KS); setMe(db.users.find(u => u.id == s) || null) } catch (e) { }

addEventListener('hashchange', () => { S = {}; if (innerWidth < 992) sb(true); route() });
route();

// Liquid Glass Particles Animation
(function initParticles() {
  const container = $('#particles');
  if (!container) return;
  for (let i = 0; i < 5; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.animationDelay = i * 3 + 's';
    container.appendChild(p);
  }
  document.addEventListener('mousemove', e => {
    const particles = $$('.particle', container);
    particles.forEach((p, idx) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20 * (idx + 1);
      const y = (e.clientY / window.innerHeight - 0.5) * 20 * (idx + 1);
      p.style.transform = `translate(${x}px,${y}px)`;
    });
  });
})();
