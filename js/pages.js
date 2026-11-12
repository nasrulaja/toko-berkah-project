/* ==========================================================================
   TOKO BERKAH — pages.js
   Semua halaman aplikasi. Tiap fungsi di sini hanya MENGEMBALIKAN string HTML
   (tidak menyentuh DOM langsung); app.js yang menyisipkannya lewat shell().
   Data diambil dari db.js, tampilan dibantu helper dari ui.js.
   --------------------------------------------------------------------------
   PETA FILE — cari teks "BAGIAN n":
     BAGIAN 1  PEMBANTU DATA & STATE   prod(), kat(), low(), jb, shellRef
     BAGIAN 2  HALAMAN UTAMA           dashboard(), produk(), stokMenipis(), stok()
     BAGIAN 3  LAPORAN & SISTEM        laporan(), transaksi(), pengaturan()
     BAGIAN 4  FORM PRODUK & KATEGORI  pform(), saveP(), kform()
     BAGIAN 5  HALAMAN LOGIN           login()
   ========================================================================== */

/* ==========================================================================
   BAGIAN 1 — PEMBANTU DATA & STATE
   S   : state sementara per halaman (kata kunci, filter, rentang grafik)
   prod/kat/low : pencarian data yang sering dipakai
   jb  : label + warna badge untuk jenis mutasi stok
   shellRef : diisi app.js lewat setShellRef() agar halaman bisa minta render
              ulang seluruh kerangka (mis. setelah login atau simpan data)
   ========================================================================== */

import { db, me, save, mut, KS, setMe, setDB, seed } from './db.js';
import { $, $$, esc, rp, dk, dt, ico, toast, modal, ask, opts, popt, empty, today, themeIcon } from './ui.js';
import { barChart, donut, spark, short } from './charts.js';

let S = {};

const prod = (id) => db.produk.find((x) => x.id == id);
const kat = (id) => db.kategori.find((x) => x.id == id);
const low = () => db.produk.filter((p) => p.stok <= p.stok_minimum);
const jb = {
  jual: ['r', 'Terjual'],
  masuk: ['g', 'Barang masuk'],
  keluar: ['o', 'Barang keluar'],
  penyesuaian: ['o', 'Penyesuaian']
};

let shellRef = () => {};
export function setShellRef(fn) {
  shellRef = fn;
}

/* ==========================================================================
   BAGIAN 2 — HALAMAN UTAMA
   dashboard() : KPI + tren, grafik penjualan & laba, donat kategori, terlaris, stok menipis, jam tersibuk
   produk()    : tabel produk + filter kategori + tombol tambah/ubah/hapus
   stok()      : form barang masuk/penyesuaian + riwayat mutasi stok
   ========================================================================== */

/** Agregasi penjualan per hari. | param: - | return: objek { 'YYYY-MM-DD': {sales, profit, count} } */
const agg = () => {
  const m = {},
    tk = new Map();
  db.transaksi.forEach((t) => {
    const k = dk(t.waktu);
    tk.set(t.id, k);
    const o = (m[k] ||= { sales: 0, profit: 0, count: 0 });
    o.sales += t.total;
    o.count++;
  });
  // laba per item: harga jual - harga beli (snapshot di detail; data lama: harga beli produk saat ini)
  db.detail.forEach((d) => {
    const k = tk.get(d.transaksi_id);
    if (k) m[k].profit += (d.harga_satuan - (d.harga_beli ?? prod(d.produk_id)?.harga_beli ?? d.harga_satuan)) * d.jumlah;
  });
  return m;
};

/** Ambil n hari terakhir (termasuk hari ini), mundur offset hari. | param: m (hasil agg), n, offset | return: array */
const lastDays = (m, n, offset = 0) =>
  [...Array(n)].map((_, i) => {
    const d = new Date(Date.now() - (n - 1 - i + offset) * 864e5),
      k = dk(d.toISOString());
    return { d, k, ...(m[k] || { sales: 0, profit: 0, count: 0 }) };
  });

/** Badge tren persen vs periode sebelumnya. | param: cur, prev, label | return: string HTML */
const trend = (cur, prev, label) => {
  if (!prev && !cur) return `<small>${label}</small>`;
  if (!prev) return `<span class="tr up">${ico('up')}Baru</span><small>${label}</small>`;
  const pc = Math.round(((cur - prev) / prev) * 100),
    up = pc >= 0;
  return `<span class="tr ${up ? 'up' : 'dn'}">${ico(up ? 'up' : 'down')}${up ? '+' : ''}${pc}%</span><small>${label}</small>`;
};

/** Kartu KPI dengan ikon, nilai, tren, dan sparkline. | param: { c, ic, l, v, f, sp } | return: string HTML */
const kpi = ({ c, ic, l, v, f, sp = '' }) =>
  `<div class="kpi ${c}"><div class="kpi-ic">${ico(ic)}</div><div class="kpi-b"><span class="kpi-l">${l}</span><h3>${v}</h3><div class="kpi-f">${f}</div></div>${sp}</div>`;

/** Halaman dashboard: banner, KPI, grafik penjualan & laba, donat kategori, terlaris, stok menipis, jam tersibuk, transaksi terbaru. | param: - | return: string HTML */
export function dashboard() {
  const L = low(),
    m = agg(),
    range = S.range || 7;
  const td = lastDays(m, 1)[0],
    yd = lastDays(m, 1, 1)[0],
    w7 = lastDays(m, 7),
    w7p = lastDays(m, 7, 7);
  const sum = (a, k) => a.reduce((x, y) => x + y[k], 0);
  // pembeli dengan total belanja terbesar (seluruh data)
  const byr = new Map();
  db.transaksi.forEach((t) => {
    const k = t.pembeli || 'Umum',
      x = byr.get(k) || { c: 0, v: 0 };
    x.c++;
    x.v += t.total;
    byr.set(k, x);
  });
  const tb = [...byr.entries()].sort((a, b) => b[1].v - a[1].v)[0];

  /* --- KPI --- */
  const stokBeli = db.produk.reduce((a, p) => a + p.stok * p.harga_beli, 0),
    stokJual = db.produk.reduce((a, p) => a + p.stok * p.harga, 0);
  // nilai stok 7 hari lalu: stok sekarang dikurangi semua mutasi sesudah titik itu (harga beli = harga saat ini)
  const t7 = Date.now() - 7 * 864e5,
    ubah = new Map();
  db.mutasi.forEach((x) => {
    if (new Date(x.waktu).getTime() > t7) ubah.set(x.produk_id, (ubah.get(x.produk_id) || 0) + x.jumlah);
  });
  const stokBeli7 = db.produk.reduce((a, p) => a + (p.stok - (ubah.get(p.id) || 0)) * p.harga_beli, 0);
  const kpis1 = [
    kpi({ c: 'k1', ic: 'cash', l: 'Penjualan hari ini', v: rp(td.sales), f: trend(td.sales, yd.sales, 'vs kemarin'), sp: spark(w7.map((x) => x.sales)) }),
    kpi({ c: 'k2', ic: 'cart', l: 'Transaksi hari ini', v: td.count, f: trend(td.count, yd.count, 'vs kemarin'), sp: spark(w7.map((x) => x.count)) }),
    kpi({ c: 'k3', ic: 'trend', l: 'Laba kotor hari ini', v: rp(td.profit), f: trend(td.profit, yd.profit, 'vs kemarin'), sp: spark(w7.map((x) => x.profit)) }),
    kpi({ c: 'k4', ic: 'wallet', l: 'Pembeli teratas', v: tb ? rp(tb[1].v) : 'Rp0', f: tb ? `<small><b>${esc(tb[0])}</b> · ${tb[1].c} transaksi</small>` : '<small>Belum ada transaksi</small>' })
  ].join('');
  const kpis2 = [
    kpi({ c: 'k1', ic: 'list', l: 'Omzet 7 hari', v: rp(sum(w7, 'sales')), f: trend(sum(w7, 'sales'), sum(w7p, 'sales'), 'vs 7 hari lalu') }),
    kpi({ c: 'k2', ic: 'layers', l: 'Nilai stok (modal)', v: rp(stokBeli), f: trend(stokBeli, stokBeli7, 'vs 7 hari lalu') + `<small class="blk">Potensi jual ${rp(stokJual)}</small>` }),
    kpi({ c: 'k3', ic: 'box', l: 'Jumlah produk', v: db.produk.length, f: `<small>${db.kategori.length} kategori</small>` }),
    kpi({ c: 'k5', ic: 'alert', l: 'Stok menipis', v: L.length, f: `<a href="#stok-menipis" class="lk">Lihat semua</a>` })
  ].join('');

  /* --- Grafik penjualan & laba --- */
  const days = lastDays(m, range);
  const lab = days.map((x) => (range === 7 ? x.d.toLocaleDateString('id-ID', { weekday: 'short' }) : x.d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })));
  const chart = barChart({
    labels: lab,
    every: range > 14 ? 3 : range > 7 ? 2 : 1,
    series: [
      { name: 'Penjualan', cls: 's1', values: days.map((x) => x.sales) },
      { name: 'Laba', cls: 's2', values: days.map((x) => x.profit) }
    ],
    fmt: rp
  });
  const rSales = sum(days, 'sales'),
    rProfit = sum(days, 'profit');

  /* --- Donat kategori --- */
  const byKat = {};
  db.detail.forEach((d) => {
    const n = kat(prod(d.produk_id)?.kategori_id)?.nama || 'Tanpa kategori';
    byKat[n] = (byKat[n] || 0) + d.subtotal;
  });
  const totKat = Object.values(byKat).reduce((a, b) => a + b, 0);
  const dn = donut({
    items: Object.entries(byKat).map(([label, value]) => ({ label, value })),
    center: { top: 'Rp' + short(totKat), bottom: 'Omzet' },
    fmt: rp
  });

  /* --- Produk terlaris --- */
  const tp = {};
  db.detail.forEach((d) => {
    const o = (tp[d.produk_id] ||= { nama: d.nama_produk, id: d.produk_id, q: 0, v: 0 });
    o.q += d.jumlah;
    o.v += d.subtotal;
  });
  const best = Object.values(tp).sort((a, b) => b.q - a.q).slice(0, 5),
    bmax = Math.max(...best.map((x) => x.q), 1);

  /* --- Jam tersibuk --- */
  const hrs = db.transaksi.map((t) => new Date(t.waktu).getHours());
  const h0 = Math.min(8, ...hrs),
    h1 = Math.max(18, ...hrs);
  const hours = [...Array(h1 - h0 + 1)].map((_, i) => h0 + i);
  const hc = hours.map((h) => hrs.filter((x) => x === h).length);
  const hchart = barChart({
    labels: hours.map((h) => String(h).padStart(2, '0')),
    series: [{ name: 'Transaksi', cls: 's3', values: hc }],
    fmt: (v) => v + ' transaksi',
    yfmt: (v) => String(Math.round(v)),
    w: 360,
    h: 250,
    left: 30
  });

  /* --- Transaksi terbaru --- */
  const items = new Map();
  db.detail.forEach((d) => items.set(d.transaksi_id, (items.get(d.transaksi_id) || 0) + d.jumlah));
  const rec = [...db.transaksi].reverse().slice(0, 6);

  setTimeout(() => {
    $$('.chips button').forEach((b) => {
      b.onclick = () => {
        S.range = +b.dataset.r;
        shellRef();
      };
    });
    const root = $('.dash'),
      tip = $('#tip');
    if (!root || !tip) return;
    // tooltip grafik: data-tip = "judul|teks|kelas|teks|kelas..."
    const show = (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) return (tip.hidden = true);
      const [title, ...r] = t.dataset.tip.split('|');
      let h = `<b>${esc(title)}</b>`;
      for (let i = 0; i < r.length; i += 2) h += `<div><i class="dot ${esc(r[i + 1] || '')}"></i>${esc(r[i])}</div>`;
      tip.innerHTML = h;
      tip.hidden = false;
      const w = tip.offsetWidth,
        x = Math.min(e.clientX + 14, innerWidth - w - 8);
      tip.style.left = Math.max(8, x) + 'px';
      tip.style.top = e.clientY + 16 + 'px';
    };
    root.addEventListener('mousemove', show);
    root.addEventListener('mouseover', show);
    root.addEventListener('mouseleave', () => (tip.hidden = true));
  }, 0);

  const first = L[0];
  return `<div class="dash">
  <div class="ban"><span class="ban-ic ${first ? '' : 'ok'}">${ico(first ? 'alert' : 'trend')}</span><span class="ban-t"><b>Selamat datang, ${esc(me.nama)}</b><br>${
    first
      ? `Stok <b>${esc(first.nama)}</b> tersisa ${first.stok}${L.length > 1 ? ` dan ${L.length - 1} produk lain perlu dibeli ulang` : ''}.`
      : 'Semua stok barang masih aman. ' + (td.count ? `Hari ini sudah ada ${td.count} transaksi.` : 'Belum ada transaksi hari ini.')
  }</span><a class="btn bp" href="#barang-masuk">Tambah stok</a></div>
  <div class="kpis">${kpis1}</div><div class="kpis">${kpis2}</div>

  <div class="dgrid">
    <div class="card"><div class="ch"><h4>Penjualan &amp; Laba</h4><div class="chips" role="group" aria-label="Rentang waktu">${[7, 14, 30].map((r) => `<button type="button" data-r="${r}" class="${r === range ? 'on' : ''}">${r}H</button>`).join('')}</div></div>
      <div class="cb"><div class="lgd"><span><i class="dot s1"></i>Penjualan <b>${rp(rSales)}</b></span><span><i class="dot s2"></i>Laba kotor <b>${rp(rProfit)}</b></span></div><div class="chart-wrap">${chart}</div></div></div>
    <div class="card"><div class="ch"><h4>Penjualan per Kategori</h4></div><div class="cb">${
      totKat
        ? `<div class="dn-wrap">${dn.svg}</div><ul class="lgl">${dn.legend}</ul>`
        : empty('Belum ada data', 'Grafik muncul setelah ada penjualan.')
    }</div></div>
  </div>

  <div class="dgrid3">
    <div class="card"><div class="ch"><h4>Produk Terlaris</h4><a href="#laporan" class="btn sm">Laporan</a></div><div class="cb">${
      best
        .map(
          (x, i) =>
            `<div class="tp"><span class="rk">${i + 1}</span><div class="tp-b"><div class="tp-h"><b>${esc(prod(x.id)?.nama || x.nama)}</b><span>${x.q} terjual</span></div><div class="bar"><i style="width:${Math.round((x.q / bmax) * 100)}%"></i></div><small>${rp(x.v)}</small></div></div>`
        )
        .join('') || empty('Belum ada penjualan', 'Produk terlaris tampil setelah ada transaksi.')
    }</div></div>
    <div class="card"><div class="ch"><h4>Stok Menipis</h4><a href="#stok-menipis" class="btn sm">Lihat semua</a></div><div class="cb">${
      L.slice(0, 5)
        .map((p) => {
          const pc = Math.max(4, Math.min(100, Math.round((p.stok / Math.max(p.stok_minimum, 1)) * 100)));
          return `<div class="ls"><div class="ls-h"><b>${esc(p.nama)}</b><span class="b ${p.stok <= 0 ? 'r' : 'o'}">${p.stok <= 0 ? 'Habis' : p.stok + ' tersisa'}</span></div><div class="bar ${p.stok <= 0 ? 'bad' : 'warn'}"><i style="width:${pc}%"></i></div><small>Minimum ${p.stok_minimum}</small></div>`;
        })
        .join('') || empty('Aman', 'Tidak ada barang yang menipis.')
    }</div></div>
    <div class="card"><div class="ch"><h4>Jam Tersibuk</h4></div><div class="cb"><div class="chart-wrap sm">${hchart}</div><p class="note">Jumlah transaksi per jam (semua data).</p></div></div>
  </div>

  <div class="card"><div class="ch"><h4>Transaksi Terbaru</h4><a href="#transaksi" class="btn sm">Lihat semua</a></div><div class="tw"><table><tr><th>Kode</th><th>Waktu</th><th>Pembeli</th><th class="r">Barang</th><th class="r">Total</th></tr>${
    rec.map((t) => `<tr><td><b>${esc(t.kode)}</b></td><td>${dt(t.waktu)}</td><td>${esc(t.pembeli || 'Umum')}</td><td class="r">${items.get(t.id) || 0}</td><td class="r">${rp(t.total)}</td></tr>`).join('') ||
    `<tr><td colspan="5">${empty('Belum ada transaksi', 'Riwayat transaksi akan muncul di sini.')}</td></tr>`
  }</table></div></div>
  <div class="tip" id="tip" hidden></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function produk() {
  return `<div class="card"><div class="ch"><h4>Daftar Produk (${db.produk.length})</h4><div class="flt"><button class="btn bp" data-act="addp">Tambah produk</button><button class="btn" data-act="addk">Tambah kategori</button></div></div>
  <div class="tw"><table><tr><th>Produk</th><th>Kategori</th><th>Barcode</th><th class="r">Harga Jual</th><th class="r">Harga Beli</th><th class="r">Stok</th><th class="r">Stok Min</th><th class="r">Aksi</th></tr>
  ${
    db.produk
      .map((p) => {
        const k = kat(p.kategori_id);
        return `<tr><td><b>${esc(p.nama)}</b></td><td>${esc(k?.nama || '-')}</td><td><code>${esc(p.barcode || '-')}</code></td><td class="r">${rp(p.harga)}</td><td class="r">${rp(p.harga_beli)}</td><td class="r"><span class="b ${p.stok <= p.stok_minimum ? 'r' : 'g'}">${p.stok}</span></td><td class="r">${p.stok_minimum}</td><td class="r"><button class="btn sm" data-act="editp" data-id="${p.id}">Ubah</button> <button class="btn sm bd" data-act="delp" data-id="${p.id}">Hapus</button></td></tr>`;
      })
      .join('') || '<tr><td colspan="8">Belum ada produk.</td></tr>'
  }</table></div></div>
  <div class="card"><div class="ch"><h4>Kategori (${db.kategori.length})</h4></div><div class="tw"><table><tr><th>Nama Kategori</th><th class="r">Jumlah Produk</th><th class="r">Aksi</th></tr>
  ${db.kategori.map((k) => `<tr><td>${esc(k.nama)}</td><td class="r">${db.produk.filter((p) => p.kategori_id === k.id).length}</td><td class="r"><button class="btn sm" data-act="editk" data-id="${k.id}">Ubah</button> <button class="btn sm bd" data-act="delk" data-id="${k.id}">Hapus</button></td></tr>`).join('')}</table></div></div>`;
}

/** Halaman stok menipis: hanya produk dengan stok <= stok minimum. | param: - | return: string HTML */
export function stokMenipis() {
  const L = low().sort((a, b) => a.stok - b.stok);
  return `<div class="card"><div class="ch"><h4>Produk perlu diisi ulang (${L.length})</h4></div><div class="tw">${
    L.length
      ? `<table><tr><th>Produk</th><th>Kategori</th><th class="r">Stok</th><th class="r">Stok minimum</th><th>Status</th><th class="r">Aksi</th></tr>${L.map((p) => `<tr><td><b>${esc(p.nama)}</b></td><td>${esc(kat(p.kategori_id)?.nama || '-')}</td><td class="r">${p.stok}</td><td class="r">${p.stok_minimum}</td><td><span class="b ${p.stok <= 0 ? 'r' : 'o'}">${p.stok <= 0 ? 'Habis' : 'Menipis'}</span></td><td class="r"><a class="btn sm bp" href="#barang-masuk">Isi ulang</a></td></tr>`).join('')}</table>`
      : empty('Semua stok aman', 'Tidak ada barang di bawah stok minimum.')
  }</div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function stok() {
  setTimeout(() => {
    const jenisEl = $('#mjenis'),
      pidEl = $('#mpid'),
      jmlEl = $('#mjml'),
      catEl = $('#mcat'),
      hbEl = $('#mhb');
    // sesuaikan isian dengan jenis mutasi: penyesuaian boleh 0 dan wajib alasan; harga beli hanya untuk barang masuk
    const syncForm = () => {
      const j = jenisEl.value;
      jmlEl.min = j === 'penyesuaian' ? '0' : '1';
      $('#mjml-l').textContent = j === 'penyesuaian' ? 'Stok sebenarnya di rak' : 'Jumlah';
      catEl.required = j === 'penyesuaian';
      $('#mhb-w').hidden = j !== 'masuk';
      hbEl.required = j === 'masuk';
      const p = prod(pidEl.value);
      if (p && j === 'masuk') hbEl.value = p.harga_beli;
    };
    jenisEl.onchange = syncForm;
    pidEl.onchange = syncForm;
    syncForm();
    $('#mform').onsubmit = (e) => {
      e.preventDefault();
      const p = prod(pidEl.value),
        j = jenisEl.value,
        q = +jmlEl.value,
        cat = catEl.value.trim();
      if (!p || !Number.isInteger(q)) return toast('Isi data dengan benar');
      if (j === 'masuk') {
        const hb = +hbEl.value;
        if (q < 1 || !(hb >= 0)) return toast('Isi jumlah dan harga beli dengan benar');
        mut(p, 'masuk', q, { hb, cat: cat || 'Barang masuk' });
        p.harga_beli = hb;
        p.updated_at = new Date().toISOString();
      } else if (j === 'keluar') {
        if (q < 1) return toast('Jumlah minimal 1');
        if (p.stok < q) return toast('Stok tidak cukup');
        mut(p, 'keluar', -q, { cat: cat || 'Barang keluar' });
      } else {
        if (q < 0) return toast('Stok tidak boleh negatif');
        if (!cat) return toast('Alasan wajib diisi untuk penyesuaian');
        if (q === p.stok) return toast('Stok sudah sama, tidak ada perubahan');
        mut(p, 'penyesuaian', q - p.stok, { cat });
      }
      save();
      toast('Stok diperbarui');
      shellRef();
    };
  }, 0);
  const rec = [...db.mutasi].reverse().slice(0, 200);
  return `<div class="card"><div class="ch"><h4>Input Mutasi / Penyesuaian Stok</h4></div><div class="cb"><form id="mform"><div class="row"><div class="fg"><label>Produk</label><select id="mpid" required>${popt(db)}</select></div><div class="fg"><label>Jenis Mutasi</label><select id="mjenis"><option value="masuk">Barang Masuk (+)</option><option value="keluar">Barang Keluar (-)</option><option value="penyesuaian">Penyesuaian (ubah stok langsung)</option></select></div></div><div class="row"><div class="fg"><label id="mjml-l" for="mjml">Jumlah</label><input id="mjml" type="number" min="1" step="1" required></div><div class="fg" id="mhb-w"><label for="mhb">Harga beli (Rp)</label><input id="mhb" type="number" min="0" step="any"></div></div><div class="fg"><label for="mcat">Catatan / alasan</label><input id="mcat" placeholder="Misal: rusak, hilang, bonus supplier"></div><button class="btn bp">Simpan Mutasi</button></form></div></div>
  <div class="card"><div class="ch"><h4>Riwayat Mutasi Stok (${rec.length}${db.mutasi.length > rec.length ? ' terbaru' : ''})</h4></div><div class="tw"><table><tr><th>Waktu</th><th>Produk</th><th>Jenis</th><th class="r">Perubahan</th><th class="r">Sebelum</th><th class="r">Sesudah</th><th>Catatan</th></tr>
  ${rec
    .map((m) => {
      const p = prod(m.produk_id),
        info = jb[m.jenis] || ['n', m.jenis];
      return `<tr><td>${dt(m.waktu)}</td><td>${esc(p?.nama || '(produk dihapus)')}</td><td><span class="b ${info[0]}">${info[1]}</span></td><td class="r ${m.jumlah < 0 ? 'neg' : 'pos'}">${m.jumlah > 0 ? '+' + m.jumlah : m.jumlah}</td><td class="r">${m.stok_sebelum}</td><td class="r">${m.stok_sesudah}</td><td>${esc(m.catatan || '-')}</td></tr>`;
    })
    .join('')}</table></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
/* ==========================================================================
   BAGIAN 3 — HALAMAN LAPORAN & SISTEM
   laporan()    : ringkasan omzet/laba, grafik, dan produk terlaris
   transaksi()  : daftar seluruh transaksi + tombol detail
   pengaturan() : profil toko, ganti user, reset ke data contoh, logout
   ========================================================================== */

/** Halaman Tutup Buku: cocokkan uang fisik dengan catatan penjualan sistem pada satu tanggal. | param: - | return: string HTML */
export function tutupBuku() {
  const tgl = S.tb && S.tb <= today() ? S.tb : today(),
    tot = db.transaksi.filter((t) => dk(t.waktu) === tgl).reduce((a, t) => a + t.total, 0),
    ada = db.tutup.find((x) => x.tanggal === tgl);
  const sel = (n) => (n === 0 ? ['g', 'Sesuai'] : n < 0 ? ['r', 'Kurang ' + rp(-n)] : ['o', 'Lebih ' + rp(n)]);
  const tglId = (k) => new Date(k + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  setTimeout(() => {
    const fi = $('#tbfisik'),
      sl = $('#tbsel'),
      cat = $('#tbcat');
    if (!fi) return;
    const hit = () => {
      const v = fi.value === '' ? null : +fi.value;
      if (v === null || !(v >= 0)) {
        sl.textContent = '-';
        sl.className = '';
        cat.required = false;
        return null;
      }
      const d = v - tot,
        [c, l] = sel(d);
      sl.textContent = l;
      sl.className = 'b ' + c;
      cat.required = d !== 0;
      return d;
    };
    fi.oninput = hit;
    hit();
    $('#tbtgl').onchange = (e) => {
      S.tb = e.target.value || today();
      shellRef();
    };
    $('#tbform').onsubmit = (e) => {
      e.preventDefault();
      const d = hit(),
        v = +fi.value;
      if (d === null) return toast('Isi uang fisik dengan benar');
      if (d !== 0 && !cat.value.trim()) return toast('Catatan wajib diisi jika ada selisih');
      const row = { id: ada ? ada.id : ++db.n, tanggal: tgl, total_sistem: tot, uang_fisik: v, selisih: d, catatan: cat.value.trim(), waktu: new Date().toISOString(), user_id: me?.id || 1 };
      if (ada) Object.assign(ada, row);
      else db.tutup.push(row);
      save();
      toast(d === 0 ? 'Tutup buku tersimpan: uang sesuai' : 'Tutup buku tersimpan: ' + sel(d)[1]);
      shellRef();
    };
  });
  const rec = [...db.tutup].sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1)),
    kurang = db.tutup.reduce((a, x) => a + (x.selisih < 0 ? x.selisih : 0), 0),
    hariSel = db.tutup.filter((x) => x.selisih !== 0).length;
  return `<div class="stats"><div class="st lt" style="background:#3DB5FF"><span>Hari sudah ditutup</span><h3>${db.tutup.length}</h3></div><div class="st" style="background:#0E9384"><span>Hari ada selisih</span><h3>${hariSel}</h3></div><div class="st" style="background:#092C4C"><span>Total uang kurang</span><h3>${rp(-kurang)}</h3></div></div>
  <div class="card"><div class="ch"><h4>Tutup Buku Harian</h4></div><div class="cb"><form id="tbform" novalidate><div class="row"><div class="fg"><label for="tbtgl">Tanggal</label><input id="tbtgl" type="date" max="${today()}" value="${tgl}"></div><div class="fg"><label>Penjualan menurut sistem</label><div style="font-size:20px;font-weight:700;padding:8px 0">${rp(tot)}</div></div></div>${ada ? `<p class="note">Tanggal ini sudah ditutup (${rp(ada.uang_fisik)}). Menyimpan lagi akan memperbarui catatannya.</p>` : ''}<div class="row"><div class="fg"><label for="tbfisik">Uang fisik yang disetor / dihitung (Rp)</label><input id="tbfisik" type="number" min="0" step="any" inputmode="numeric" value="${ada ? ada.uang_fisik : ''}"></div><div class="fg"><label>Selisih</label><div style="padding:8px 0"><span id="tbsel">-</span></div></div></div><div class="fg"><label for="tbcat">Catatan / alasan selisih</label><input id="tbcat" value="${ada ? esc(ada.catatan) : ''}" placeholder="Wajib diisi bila ada selisih, misal: uang kembalian salah"></div><button class="btn bp" type="submit">${ada ? 'Perbarui Tutup Buku' : 'Tutup Buku'}</button></form></div></div>
  <div class="card"><div class="ch"><h4>Riwayat Tutup Buku (${rec.length})</h4></div><div class="tw">${
    rec.length
      ? `<table><tr><th>Tanggal</th><th class="r">Menurut sistem</th><th class="r">Uang fisik</th><th>Selisih</th><th>Catatan</th></tr>${rec.map((x) => `<tr><td><b>${esc(tglId(x.tanggal))}</b></td><td class="r">${rp(x.total_sistem)}</td><td class="r">${rp(x.uang_fisik)}</td><td><span class="b ${sel(x.selisih)[0]}">${sel(x.selisih)[1]}</span></td><td>${esc(x.catatan || '-')}</td></tr>`).join('')}</table>`
      : empty('Belum ada tutup buku', 'Isi uang fisik di atas lalu tekan Tutup Buku.')
  }</div></div>`;
}

export function laporan() {
  const totJual = db.transaksi.reduce((a, t) => a + t.total, 0);
  // modal dari snapshot harga_beli di detail transaksi (data lama tanpa snapshot: pakai harga beli produk saat ini)
  let modalAwal = 0;
  const top = new Map();
  db.detail.forEach((d) => {
    modalAwal += (d.harga_beli ?? prod(d.produk_id)?.harga_beli ?? 0) * d.jumlah;
    const x = top.get(d.nama_produk) || { q: 0, v: 0 };
    x.q += d.jumlah;
    x.v += d.subtotal;
    top.set(d.nama_produk, x);
  });
  const laba = totJual - modalAwal;
  const best = [...top.entries()].sort((a, b) => b[1].q - a[1].q).slice(0, 5);
  // pembeli dengan total belanja terbesar (nama pembeli pada data contoh adalah DUMMY)
  const by = new Map();
  db.transaksi.forEach((t) => {
    const x = by.get(t.pembeli || 'Umum') || { c: 0, v: 0 };
    x.c++;
    x.v += t.total;
    by.set(t.pembeli || 'Umum', x);
  });
  const buyers = [...by.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 5);
  return `<div class="stats"><div class="st lt" style="background:#3DB5FF"><span>Total Omzet</span><h3>${rp(totJual)}</h3></div><div class="st" style="background:#0E9384"><span>Estimasi Laba Kotor</span><h3>${rp(laba)}</h3></div><div class="st" style="background:#092C4C"><span>Total Transaksi</span><h3>${db.transaksi.length}</h3></div></div>
  <div class="card"><div class="ch"><h4>Produk terlaris</h4></div><div class="tw">${
    best.length
      ? `<table><tr><th>#</th><th>Produk</th><th class="r">Terjual</th><th class="r">Omzet</th></tr>${best.map(([n, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(n)}</b></td><td class="r">${x.q}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : empty('Belum ada penjualan', 'Produk terlaris muncul setelah ada transaksi.')
  }</div></div>
  <div class="card"><div class="ch"><h4>Pembeli teratas</h4></div><div class="tw">${
    buyers.length
      ? `<table><tr><th>#</th><th>Pembeli</th><th class="r">Transaksi</th><th class="r">Total belanja</th></tr>${buyers.map(([n, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(n)}</b></td><td class="r">${x.c}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : empty('Belum ada pembeli', 'Pembeli teratas muncul setelah ada transaksi.')
  }</div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function transaksi() {
  const rec = [...db.transaksi].reverse();
  return `<div class="card"><div class="ch"><h4>Riwayat Transaksi (${rec.length})</h4></div><div class="tw"><table><tr><th>Kode</th><th>Waktu</th><th>Pembeli</th><th class="r">Total</th><th class="r">Aksi</th></tr>
  ${rec.map((t) => `<tr><td><b>${t.kode}</b></td><td>${dt(t.waktu)}</td><td>${esc(t.pembeli || 'Umum')}</td><td class="r">${rp(t.total)}</td><td class="r"><button class="btn sm" data-act="det" data-id="${t.id}">Detail</button></td></tr>`).join('')}</table></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function pengaturan() {
  setTimeout(() => {
    $('#resetDB').onclick = () => {
      ask('Reset seluruh data ke awal (data contoh)? Data Anda akan terhapus.', () => {
        setDB(seed());
        save();
        toast('Data direset ke contoh');
        shellRef();
      });
    };
  }, 0);
  return `<div class="card"><div class="ch"><h4>Profil Toko</h4></div><div class="cb"><p>Pengguna Aktif: <b>${esc(me.nama)}</b> (${esc(me.email)})</p></div></div>
  <div class="card"><div class="ch"><h4>Pembersihan Data</h4></div><div class="cb"><button class="btn bd" id="resetDB">Reset Basis Data ke Contoh</button></div></div>`;
}

/* ==========================================================================
   BAGIAN 4 — FORM PRODUK & KATEGORI
   pform() : isi form (kosong untuk produk baru, terisi untuk ubah)
   saveP() : validasi barcode unik lalu simpan; produk baru juga mencatat
             stok awal lewat mut()
   kform() : form tambah/ubah kategori dengan validasi nama unik
   ========================================================================== */

export function pform(p = {}) {
  return `<div class="fg"><label>Nama produk</label><input name="nama" required value="${esc(p.nama)}"></div><div class="row"><div class="fg"><label>Barcode</label><input name="barcode" value="${esc(p.barcode)}"></div><div class="fg"><label>Kategori</label><select name="kategori_id"><option value="">Tanpa Kategori</option>${opts(db.kategori, p.kategori_id)}</select></div></div><div class="row"><div class="fg"><label>Harga jual</label><input name="harga" type="number" min="0" required value="${p.harga ?? ''}"></div><div class="fg"><label>Harga beli</label><input name="harga_beli" type="number" min="0" required value="${p.harga_beli ?? ''}"></div></div><div class="row"><div class="fg"><label>${p.id ? 'Stok saat ini' : 'Stok awal'}</label><input name="stok" type="number" min="0" step="1" inputmode="numeric" required value="${p.id ? p.stok : 0}"></div><div class="fg"><label>Stok minimum</label><input name="stok_minimum" type="number" min="0" step="1" inputmode="numeric" required value="${p.stok_minimum ?? 5}"></div></div>`;
}

export function saveP(d, p) {
  // barcode opsional: yang kosong tidak dicek keunikannya
  if (d.barcode.trim() && db.produk.some((x) => x.barcode === d.barcode.trim() && x.id !== p?.id)) {
    toast('Barcode sudah dipakai produk lain');
    return false;
  }
  // stok & stok minimum harus bilangan bulat >= 0
  const stokBaru = d.stok === '' || d.stok == null ? NaN : +d.stok,
    stokMin = d.stok_minimum === '' || d.stok_minimum == null ? NaN : +d.stok_minimum;
  if (!Number.isInteger(stokBaru) || stokBaru < 0) {
    toast('Stok harus bilangan bulat 0 atau lebih');
    return false;
  }
  if (!Number.isInteger(stokMin) || stokMin < 0) {
    toast('Stok minimum harus bilangan bulat 0 atau lebih');
    return false;
  }
  const v = {
    nama: d.nama.trim(),
    barcode: d.barcode.trim(),
    kategori_id: d.kategori_id ? +d.kategori_id : null,
    harga: +d.harga,
    harga_beli: +d.harga_beli,
    stok_minimum: stokMin,
    updated_at: new Date().toISOString()
  };
  if (p) {
    Object.assign(p, v);
    // stok diubah lewat form produk: dicatat sebagai penyesuaian agar riwayat tetap utuh
    if (stokBaru !== p.stok) mut(p, 'penyesuaian', stokBaru - p.stok, { cat: 'Diubah lewat form produk' });
  } else {
    const n = { id: ++db.n, stok: 0, created_at: v.updated_at, ...v };
    db.produk.push(n);
    if (stokBaru > 0) mut(n, 'masuk', stokBaru, { hb: n.harga_beli, cat: 'Stok awal' });
  }
  save();
  toast('Produk disimpan');
  shellRef();
}

export function kform(k) {
  modal(
    k ? 'Ubah kategori' : 'Tambah kategori',
    `<div class="fg"><label>Nama kategori</label><input name="nama" required value="${esc(k?.nama)}"></div>`,
    'Simpan',
    (d) => {
      const n = d.nama.trim();
      if (db.kategori.some((x) => x.nama.toLowerCase() === n.toLowerCase() && x.id !== k?.id)) {
        toast('Nama kategori sudah ada');
        return false;
      }
      if (k) k.nama = n;
      else db.kategori.push({ id: ++db.n, nama: n, created_at: new Date().toISOString() });
      save();
      toast('Kategori disimpan');
      shellRef();
    }
  );
}

/* ==========================================================================
   BAGIAN 5 — HALAMAN LOGIN
   Menampilkan kartu login di #app. Sandi dibandingkan dengan btoa(pw); bila
   cocok, setMe() + simpan ID user di localStorage (KS), lalu routeFn() agar
   shell langsung dirender tanpa refresh.
   ========================================================================== */

export function login(routeFn) {
  $('#app').innerHTML =
    `<div class="lg"><button type="button" class="ic lg-th" data-act="theme" aria-label="Ganti tema">${themeIcon()}</button><div class="lg-c"><form class="lg-card" id="af" novalidate><h2 class="lg-t">Masuk</h2><p class="lg-s">Toko Berkah · kelola stok dan transaksi</p><div class="lg-al" id="al" role="alert" hidden></div>
  <div class="lg-f"><label class="lg-l" for="em">${ico('mail')}Surel</label><div class="lg-w" id="w1"><span class="lg-i">${ico('mail')}</span><input id="em" name="email" type="email" autocomplete="username" placeholder="surel@contoh.com" value="berkah@gmail.com"></div></div>
  <div class="lg-f"><label class="lg-l" for="pw">${ico('lock')}Kata sandi</label><div class="lg-w" id="w2"><span class="lg-i">${ico('lock')}</span><input id="pw" name="pw" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" value="berkah123"><button type="button" class="lg-eye" id="eye" aria-label="Tampilkan kata sandi">${ico('eye')}</button></div></div>
  <button class="lg-b">Masuk</button></form></div></div>`;
  $('#eye').onclick = () => {
    const i = $('#pw');
    i.type = i.type === 'password' ? 'text' : 'password';
  };
  $('#af').onsubmit = (e) => {
    e.preventDefault();
    const em = $('#em').value.trim().toLowerCase(),
      pw = $('#pw').value,
      al = $('#al');
    $('#w1').classList.toggle('bad', !em);
    $('#w2').classList.toggle('bad', !pw);
    const err = (m) => {
      al.textContent = m;
      al.hidden = false;
    };
    if (!em || !pw) return err('Surel dan kata sandi wajib diisi');
    const user = db.users.find((u) => u.email === em && u.pw === btoa(pw));
    if (!user) return err('Surel atau kata sandi salah');
    setMe(user);
    try {
      localStorage.setItem(KS, user.id);
    } catch (e) {}
    location.hash = '#dashboard';
    routeFn();
  };
}
