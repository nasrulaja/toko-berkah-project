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

import { db, me, save, mut, KS, setMe, setDB, seed, rentangPeriode, ringkasPeriode, tutupBuku, terkunci } from './db.js?v=20261114c';
import { $, $$, esc, rp, dk, dt, ico, toast, modal, ask, opts, popt, empty, today, tip } from './ui.js?v=20261114c';
import { barChart, donut, spark, short } from './charts.js?v=20261114c';

let S = {};

const prod = (id) => db.produk.find((x) => x.id == id);
const kat = (id) => db.kategori.find((x) => x.id == id);
const low = () => db.produk.filter((p) => p.stok <= p.stok_minimum);
/** Tulis stok sebagai "N pack + M pcs" bila produk punya isi per pack > 1. | param: p (produk) | return: string */
const packTxt = (p) => {
  const i = p.isi_pack || 1;
  return i > 1 ? `${Math.floor(p.stok / i)} pack + ${p.stok % i} pcs` : `${p.stok} pcs`;
};
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
const kpi = ({ c, ic, l, h, v, f, sp = '' }) =>
  `<div class="kpi ${c}"><div class="kpi-ic">${ico(ic)}</div><div class="kpi-b"><span class="kpi-l">${l}${h ? tip(h) : ''}</span><h3>${v}</h3><div class="kpi-f">${f}</div></div>${sp}</div>`;

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
  // pembeli dengan total belanja terbesar HARI INI (bukan seluruh data)
  const hariIni = lastDays(m, 1)[0].k,
    byr = new Map();
  db.transaksi
    .filter((t) => dk(t.waktu) === hariIni)
    .forEach((t) => {
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
    kpi({ c: 'k1', ic: 'cash', l: 'Pendapatan hari ini', h: 'Total uang dari semua penjualan hari ini.', v: rp(td.sales), f: trend(td.sales, yd.sales, 'vs kemarin'), sp: spark(w7.map((x) => x.sales)) }),
    kpi({ c: 'k2', ic: 'cart', l: 'Penjualan hari ini', h: 'Jumlah penjualan (struk) yang tercatat hari ini.', v: td.count, f: trend(td.count, yd.count, 'vs kemarin'), sp: spark(w7.map((x) => x.count)) }),
    kpi({ c: 'k3', ic: 'trend', l: 'Laba kotor hari ini', h: 'Penjualan dikurangi harga beli barang yang terjual. Belum dikurangi biaya lain seperti listrik atau gaji.', v: rp(td.profit), f: trend(td.profit, yd.profit, 'vs kemarin'), sp: spark(w7.map((x) => x.profit)) }),
    kpi({ c: 'k4', ic: 'wallet', l: 'Total belanja terbesar harian', h: 'Total belanja terbesar dari satu pembeli pada hari ini. Bukan total seluruh data.', v: tb ? rp(tb[1].v) : 'Rp0', f: `<small>${tb ? `Dari ${esc(tb[0])}` : 'Belum ada transaksi hari ini'}</small>` })
  ].join('');
  const kpis2 = [
    kpi({ c: 'k1', ic: 'list', l: 'Omzet 7 hari', h: 'Total penjualan 7 hari terakhir. Persen menunjukkan perbandingan dengan 7 hari sebelumnya.', v: rp(sum(w7, 'sales')), f: trend(sum(w7, 'sales'), sum(w7p, 'sales'), 'vs 7 hari lalu') }),
    kpi({ c: 'k2', ic: 'layers', l: 'Nilai stok (modal)', h: 'Harga beli dikali stok semua barang yang masih ada. Artinya uang modal yang tertanam di barang.', v: rp(stokBeli), f: trend(stokBeli, stokBeli7, 'vs 7 hari lalu') + `<small class="blk"><span>Potensi jual${tip('Perkiraan uang yang didapat bila semua stok yang ada terjual habis dengan harga jual sekarang.')}</span><b>${rp(stokJual)}</b></small>` }),
    kpi({ c: 'k3', ic: 'box', l: 'Jumlah produk', h: 'Banyaknya jenis barang yang terdaftar.', v: db.produk.length, f: `<small>${db.kategori.length} kategori</small>` }),
    kpi({ c: 'k5', ic: 'alert', l: 'Stok menipis', h: 'Barang yang stoknya sudah sama dengan atau di bawah batas minimum. Segera isi ulang.', v: L.length, f: `<a href="#stok-menipis" class="lk">Lihat semua</a>` })
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
  const hariBaik = [...days].sort((a, b) => b.sales - a.sales)[0],
    ringkasJual = [
      ['Rata-rata / hari', rp(Math.round(rSales / range))],
      ['Perbandingan laba', rSales ? (rProfit / rSales * 100).toFixed(1).replace('.', ',') + '%' : '-'],
      ['Hari terbaik', hariBaik && hariBaik.sales ? hariBaik.d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' }) : '-']
    ];

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

  const first = L[0],
    jam = new Date().getHours(),
    sapa = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
  // ringkasan jam/hari tersibuk (semua data) untuk mengisi kartu Jam Tersibuk
  const cJam = {},
    cHari = {},
    tglSet = new Set();
  db.transaksi.forEach((t) => {
    const d = new Date(t.waktu),
      h = d.getHours();
    cJam[h] = (cJam[h] || 0) + 1;
    cHari[d.getDay()] = (cHari[d.getDay()] || 0) + 1;
    tglSet.add(dk(t.waktu));
  });
  const top3Jam = Object.entries(cJam).sort((a, b) => b[1] - a[1]).slice(0, 3),
    maxJam = top3Jam[0]?.[1] || 1;
  const topK = (o) => Object.entries(o).sort((a, b) => b[1] - a[1])[0],
    tj = topK(cJam),
    th = topK(cHari),
    nmHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    ringkasJam = [
      ['Jam tersibuk', tj ? String(tj[0]).padStart(2, '0') + '.00' : '-'],
      ['Hari tersibuk', th ? nmHari[th[0]] : '-'],
      ['Rata-rata / hari', tglSet.size ? (db.transaksi.length / tglSet.size).toFixed(1).replace('.', ',') + ' trx' : '-']
    ];
  // kartu stok: bila tidak ada yang menipis, tampilkan 5 produk dengan stok paling sedikit
  const sedikit = L.length ? L : [...db.produk].sort((a, b) => a.stok / Math.max(a.stok_minimum, 1) - b.stok / Math.max(b.stok_minimum, 1)).slice(0, 5);
  return `<div class="dash">
  <div class="ban"><span class="ban-ic ${first ? '' : 'ok'}">${ico(first ? 'alert' : 'trend')}</span><span class="ban-t"><b class="ban-h">${sapa}, Toko Berkah</b><span class="ban-s">${
    first
      ? `Stok <b>${esc(first.nama)}</b> tersisa ${first.stok}${L.length > 1 ? ` dan ${L.length - 1} produk lain perlu dibeli ulang` : ''}.`
      : 'Semua stok barang masih aman.'
  }</span></span><span class="ban-a"><a class="btn bp" href="#barang-masuk">Tambah stok</a><a class="btn" href="#laporan">Lihat laporan</a></span></div>
  <div class="kpis">${kpis1}</div><div class="kpis">${kpis2}</div>

  <div class="dgrid">
    <div class="card"><div class="ch"><h4>Penjualan &amp; Laba</h4><div class="chips" role="group" aria-label="Rentang waktu">${[7, 14, 30].map((r) => `<button type="button" data-r="${r}" class="${r === range ? 'on' : ''}">${r}H</button>`).join('')}</div></div>
      <div class="cb"><div class="lgd"><span><i class="dot s1"></i>Penjualan <b>${rp(rSales)}</b></span><span><i class="dot s2"></i>Laba kotor <b>${rp(rProfit)}</b></span></div><div class="chart-wrap">${chart}</div><div class="mini">${ringkasJual.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div></div></div>
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
      (L.length ? '' : '<p class="note ok">Semua stok aman. Produk dengan stok paling sedikit:</p>') +
      sedikit
        .slice(0, 5)
        .map((p) => {
          const pc = Math.max(4, Math.min(100, Math.round((p.stok / Math.max(p.stok_minimum, 1)) * 100)));
          return `<div class="ls"><div class="ls-h"><b>${esc(p.nama)}</b><span class="b ${p.stok <= 0 ? 'r' : L.length ? 'o' : 'g'}">${p.stok <= 0 ? 'Habis' : p.stok + ' tersisa'}</span></div><div class="bar ${p.stok <= 0 ? 'bad' : L.length ? 'warn' : ''}"><i style="width:${Math.min(100, pc)}%"></i></div><small>Minimum ${p.stok_minimum}${L.length ? '' : ' · ' + packTxt(p)}</small></div>`;
        })
        .join('') || empty('Belum ada produk', 'Tambahkan produk lebih dulu.')
    }</div></div>
    <div class="card"><div class="ch"><h4>Jam Tersibuk</h4></div><div class="cb"><div class="chart-wrap sm">${hchart}</div><p class="note">Jumlah transaksi per jam (semua data).</p><div class="mini">${ringkasJam.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>${top3Jam.map(([h, c]) => `<div class="tp" style="margin-top:12px"><span class="rk">${String(h).padStart(2, '0')}</span><div class="tp-b"><div class="tp-h"><b>Pukul ${String(h).padStart(2, '0')}.00</b><span>${c} transaksi</span></div><div class="bar"><i style="width:${Math.round((c / maxJam) * 100)}%"></i></div></div></div>`).join('')}</div></div>
  </div>

  <div class="card"><div class="ch"><h4>Transaksi Terbaru</h4><a href="#transaksi" class="btn sm">Lihat semua</a></div><div class="tw"><table data-size="5"><tr><th>No</th><th>Kode</th><th>Waktu</th><th class="r">Barang</th><th class="r">Total</th></tr>${
    rec.map((t, i) => `<tr><td>${i + 1}</td><td><b>${esc(t.kode)}</b></td><td>${dt(t.waktu)}</td><td class="r">${items.get(t.id) || 0}</td><td class="r">${rp(t.total)}</td></tr>`).join('') ||
    `<tr><td colspan="6">${empty('Belum ada transaksi', 'Riwayat transaksi akan muncul di sini.')}</td></tr>`
  }</table></div></div>
  <div class="tip" id="tip" hidden></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function produk() {
  const fk = S.pk && kat(S.pk) ? String(S.pk) : '',
    list = fk ? db.produk.filter((p) => String(p.kategori_id) === fk) : db.produk;
  setTimeout(() => {
    const e = $('#fkat');
    if (e)
      e.onchange = () => {
        S.pk = e.value;
        shellRef();
      };
    const c = $('#fcari');
    if (c)
      c.oninput = () => {
        const q = c.value.trim().toLowerCase();
        let n = 0;
        const tb = document.querySelectorAll('.pg table')[0];
        [...tb.rows].slice(1).forEach((r) => {
          const ok = !q || r.textContent.toLowerCase().includes(q);
          r.classList.toggle('nf', !ok);
          if (ok) n++;
        });
        if (tb._pg) tb._pg(1);
        $('#fcount').textContent = q ? n + ' cocok' : '';
      };
  });
  return `<div class="card"><div class="ch"><h4>Daftar Produk (${fk ? list.length + ' dari ' + db.produk.length : db.produk.length}) <small id="fcount" class="note"></small></h4><div class="flt"><input id="fcari" type="search" placeholder="Cari nama / barcode…" aria-label="Cari produk" autocomplete="off"><select id="fkat" aria-label="Filter kategori"><option value="">Semua kategori</option>${db.kategori.map((k) => `<option value="${k.id}"${String(k.id) === fk ? ' selected' : ''}>${esc(k.nama)}</option>`).join('')}</select><button class="btn bp" data-act="addp">Tambah produk</button><button class="btn" data-act="addk">Tambah kategori</button></div></div>
  <div class="tw"><table data-size="5"><tr><th>No</th><th>Produk</th><th>Kategori</th><th>Barcode</th><th class="r">Harga Jual</th><th class="r">Harga Beli</th><th class="r">Stok</th><th class="r">Stok Min</th><th class="r">Aksi</th></tr>
  ${
    list
      .map((p, i) => {
        const k = kat(p.kategori_id);
        return `<tr><td>${i + 1}</td><td><b>${esc(p.nama)}</b></td><td>${esc(k?.nama || '-')}</td><td><code>${esc(p.barcode || '-')}</code></td><td class="r">${rp(p.harga)}</td><td class="r">${rp(p.harga_beli)}</td><td class="r"><span class="b ${p.stok <= p.stok_minimum ? 'r' : 'g'}">${p.stok}</span>${(p.isi_pack || 1) > 1 ? `<small class="pk">${packTxt(p)}</small>` : ''}</td><td class="r">${p.stok_minimum}</td><td class="r"><button class="btn sm" data-act="editp" data-id="${p.id}">Ubah</button></td></tr>`;
      })
      .join('') || `<tr><td colspan="9">${fk ? 'Tidak ada produk di kategori ini.' : 'Belum ada produk.'}</td></tr>`
  }</table></div></div>
  <div class="card"><div class="ch"><h4>Kategori (${db.kategori.length})</h4></div><div class="tw"><table data-size="5"><tr><th>No</th><th>Nama Kategori</th><th class="r">Jumlah Produk</th><th class="r">Aksi</th></tr>
  ${db.kategori.map((k, i) => `<tr><td>${i + 1}</td><td>${esc(k.nama)}</td><td class="r">${db.produk.filter((p) => p.kategori_id === k.id).length}</td><td class="r"><button class="btn sm" data-act="editk" data-id="${k.id}">Ubah</button> <button class="btn sm bd" data-act="delk" data-id="${k.id}">Hapus</button></td></tr>`).join('')}</table></div></div>`;
}

/* ==========================================================================
   NOTIFIKASI  (halaman "Semua Notifikasi" + lencana lonceng)
   Notifikasi dibentuk dari data: transaksi, mutasi stok, dan tutup buku.
   Status baca/hapus disimpan per-browser di localStorage (berkah_notif).
   ========================================================================== */
const NK = 'berkah_notif';
const nstate = () => {
  try {
    const s = JSON.parse(localStorage.getItem(NK) || '{}');
    return { read: +s.read || 0, clear: +s.clear || 0, on: s.on !== false, seen: Array.isArray(s.seen) ? s.seen : [] };
  } catch {
    return { read: 0, clear: 0, on: true, seen: [] };
  }
};
const nsave = (s) => {
  try {
    localStorage.setItem(NK, JSON.stringify(s));
  } catch {
    /* penyimpanan tidak tersedia: status baca tidak tersimpan */
  }
};
/** Waktu relatif dalam bahasa Indonesia. | param: iso | return: string */
const ago = (iso) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Baru saja';
  if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  if (s < 2592000) return Math.floor(s / 86400) + ' hari lalu';
  if (s < 31536000) return Math.floor(s / 2592000) + ' bulan lalu';
  return Math.floor(s / 31536000) + ' tahun lalu';
};
/** Daftar notifikasi terbaru (belum dihapus), urut terbaru. | param: - | return: array */
const nevents = () => {
  const out = [],
    nama = (id) => db.produk.find((p) => p.id === id)?.nama || 'Produk';
  db.transaksi.forEach((t) =>
    out.push({ w: t.waktu, ic: 'cart', c: 'g', to: '#transaksi', a: 'Penjualan ' + t.kode, b: 'senilai ' + rp(t.total) + ' tercatat.' })
  );
  db.mutasi
    .filter((m) => m.jenis !== 'jual')
    .forEach((m) => {
      const j = (jb[m.jenis] || ['n', m.jenis])[1];
      out.push({
        w: m.waktu,
        ic: m.jenis === 'masuk' ? 'in' : m.jenis === 'keluar' ? 'up' : 'sliders',
        c: m.jenis === 'masuk' ? 'g' : 'o',
        to: '#stok',
        a: j + ': ' + nama(m.produk_id),
        b: (m.jumlah > 0 ? '+' : '') + m.jumlah + ' (stok jadi ' + m.stok_sesudah + ').'
      });
    });
  (db.tutup || []).forEach((x) =>
    out.push({
      w: x.waktu || x.tanggal + 'T21:00:00',
      ic: 'book',
      c: x.selisih === 0 ? 'g' : 'r',
      to: '#tutup-buku',
      a: 'Tutup buku ' + x.tanggal,
      b: x.selisih === 0 ? 'uang sesuai catatan.' : (x.selisih < 0 ? 'uang kurang ' : 'uang lebih ') + rp(Math.abs(x.selisih)) + '.'
    })
  );
  const st = nstate();
  return out
    .filter((e) => new Date(e.w).getTime() > st.clear)
    .sort((a, b) => (a.w < b.w ? 1 : -1))
    .map((e) => ({ ...e, ts: new Date(e.w).getTime(), id: e.to + '|' + e.w + '|' + e.a }));
};
/** Jumlah notifikasi yang belum dibaca (untuk lencana lonceng). | param: - | return: number */
/** Sakelar notifikasi aktif/nonaktif (dipakai di halaman Notifikasi & Pengaturan). | param: id | return: string HTML */
const notifSwitch = (id) =>
  `<label class="sw"><input type="checkbox" id="${id}" ${nstate().on ? 'checked' : ''}><i></i><span>Notifikasi ${nstate().on ? 'aktif' : 'nonaktif'}</span></label>`;
/** Pasang aksi pada sakelar notifikasi. | param: id | return: void */
const bindSwitch = (id) => {
  const e = $('#' + id);
  if (e)
    e.onchange = () => {
      nsave({ ...nstate(), on: e.checked, read: e.checked ? Date.now() : nstate().read });
      toast(e.checked ? 'Notifikasi diaktifkan' : 'Notifikasi dimatikan');
      shellRef();
    };
};
export const notifUnread = () => {
  const st = nstate();
  if (!st.on) return 0;
  return nevents().filter((e) => e.ts > st.read && !st.seen.includes(e.id)).length;
};

/** Halaman Semua Notifikasi. | param: - | return: string HTML */
export function notifikasi() {
  if (!nstate().on) {
    setTimeout(() => bindSwitch('nsw'));
    return `<div class="card"><div class="ch"><h4>Notifikasi</h4>${notifSwitch('nsw')}</div>${empty('Notifikasi dimatikan', 'Aktifkan sakelar di atas untuk melihat aktivitas toko dan lencana pada lonceng.')}</div>`;
  }
  const st = nstate(),
    ev = nevents(),
    list = ev, // semua notifikasi; daftar dipotong per halaman (10) oleh slideN()
    lowN = low().length;
  setTimeout(() => {
    bindSwitch('nsw');
    document.querySelectorAll('.nt[data-nid]').forEach((a) => {
      a.addEventListener('click', () => {
        const n = nstate();
        if (!n.seen.includes(a.dataset.nid)) nsave({ ...n, seen: [...n.seen, a.dataset.nid].slice(-500) });
        a.classList.remove('nw');
      });
    });
    const r = $('#nread'),
      d = $('#nclear');
    if (r)
      r.onclick = () => {
        nsave({ ...nstate(), read: Date.now(), seen: [] });
        toast('Semua notifikasi ditandai dibaca');
        shellRef();
      };
    if (d)
      d.onclick = () =>
        ask('Hapus semua notifikasi? Riwayat transaksi dan stok tidak ikut terhapus.', () => {
          nsave({ ...nstate(), read: Date.now(), clear: Date.now() });
          shellRef();
        });
  });
  return `<div class="card"><div class="ch"><h4>Semua Notifikasi (${ev.length})</h4><div class="nact">${notifSwitch('nsw')}<button class="btn" id="nread" ${ev.some((e) => e.ts > st.read && !st.seen.includes(e.id)) ? '' : 'disabled'}>Tandai semua dibaca</button><button class="btn bd" id="nclear" ${ev.length ? '' : 'disabled'}>Hapus semua</button></div></div>
  ${lowN ? `<a class="nt nt-warn" href="#stok-menipis"><span class="nic r">${ico('alert')}</span><span class="ntx"><b>${lowN} produk stok menipis</b> perlu diisi ulang.</span><span class="ntm">Lihat</span></a>` : ''}
  ${
    list.length
      ? `<div class="nlist" id="nlist" data-size="10">${list.map((e, i) => `<a class="nt${e.ts > st.read && !st.seen.includes(e.id) ? ' nw' : ''}" data-nid="${esc(e.id)}" data-i="${i + 1}" href="${e.to}"><span class="nno">${i + 1}</span><span class="nic ${e.c}">${ico(e.ic)}</span><span class="ntx"><b>${esc(e.a)}</b> ${esc(e.b)}</span><span class="ntm">${ago(e.w)}</span></a>`).join('')}</div>`
      : empty('Belum ada notifikasi', 'Aktivitas toko akan muncul di sini.')
  }</div>`;
}

/** Halaman Panduan: cara memakai, arti istilah, dan tanya jawab singkat. | param: - | return: string HTML */
export function panduan() {
  const langkah = [
    ['grid', 'Lihat Beranda', 'Ringkasan toko hari ini: penjualan, laba, stok yang hampir habis, dan barang terlaris. Buka tiap hari untuk melihat kondisi toko.', '#dashboard'],
    ['box', 'Isi data Produk', 'Daftarkan barang di Produk & Kategori: nama, harga jual, harga beli, stok, dan isi per pack bila dijual per dus/pack.', '#produk'],
    ['layers', 'Catat Stok', 'Di Manajemen Stok catat barang masuk, barang keluar, atau penyesuaian bila jumlah di rak berbeda dari catatan.', '#stok'],
    ['alert', 'Pantau Stok Menipis', 'Barang yang hampir habis dikumpulkan di satu halaman supaya tahu apa yang harus dibeli lagi.', '#stok-menipis'],
    ['chart', 'Baca Laporan', 'Lihat laba per tanggal, produk terlaris, serta hari dan jam paling ramai.', '#laporan'],
    ['bell', 'Cek Notifikasi', 'Semua aktivitas toko (penjualan, stok, tutup buku) ada di lonceng di kanan atas.', '#notifikasi']
  ];
  const istilah = [
    ['Omzet', 'Total uang dari penjualan, sebelum dikurangi apa pun.'],
    ['Laba kotor', 'Omzet dikurangi harga beli barang yang terjual. Belum dikurangi biaya lain (listrik, gaji, sewa).'],
    ['Margin laba', 'Laba dibanding omzet, dalam persen. Makin besar makin untung per rupiah penjualan.'],
    ['Nilai stok (modal)', 'Harga beli dikali stok semua barang yang masih ada. Uang modal yang sedang tertanam di barang.'],
    ['Potensi jual', 'Perkiraan uang bila semua stok yang ada terjual dengan harga jual sekarang.'],
    ['Stok minimum', 'Batas aman stok. Bila stok sama atau di bawahnya, barang masuk daftar Stok Menipis.'],
    ['Pack', 'Satu kemasan besar berisi beberapa pcs (misal 1 dus = 24 botol). Stok tampil "3 pack + 6 pcs".'],
    ['Mutasi stok', 'Setiap perubahan jumlah stok: terjual, barang masuk, barang keluar, atau penyesuaian.'],
    ['Penyesuaian', 'Mengoreksi stok agar sama dengan hitungan nyata di rak (misal hasil stok opname). Wajib diberi alasan.'],
    ['Tutup buku', 'Pencocokan uang di laci dengan catatan penjualan sistem pada akhir hari. Selisih menunjukkan uang kurang atau lebih.']
  ];
  const tanya = [
    ['Jumlah stok di sistem berbeda dengan di rak. Bagaimana memperbaikinya?', 'Buka Manajemen Stok, pilih jenis Penyesuaian, isi stok sebenarnya di rak, dan tulis alasannya.'],
    ['Bagaimana menambah stok setelah belanja barang?', 'Di Manajemen Stok pilih jenis Barang masuk, isi jumlah dan harga beli. Stok bertambah otomatis.'],
    ['Kenapa angka laba terlihat lebih besar dari untung sebenarnya?', 'Laba kotor belum dikurangi biaya toko seperti listrik, gaji, dan sewa.'],
    ['Bagaimana mencari satu produk dengan cepat?', 'Di Produk & Kategori ketik nama atau barcode di kotak Cari, atau pilih kategori dari filter.'],
    ['Notifikasi saya terlalu banyak.', 'Di halaman Notifikasi tekan Tandai semua dibaca atau Hapus semua. Data transaksi dan stok tidak ikut terhapus.'],
    ['Apakah data saya aman bila browser ditutup?', 'Data tersimpan di browser ini. Jangan hapus data situs, dan jangan memakai tombol Reset di Pengaturan kecuali ingin kembali ke data contoh.']
  ];
  return `<div class="card"><div class="ch"><h4>Mulai dari mana?</h4></div><div class="cb gd">${langkah
    .map(([ic, t, d, h], i) => `<a class="gd-i" href="${h}"><span class="gd-n">${i + 1}</span><span class="nic">${ico(ic)}</span><span><b>${t}</b><small>${d}</small></span></a>`)
    .join('')}</div></div>
  <div class="card"><div class="ch"><h4>Arti istilah</h4></div><div class="cb"><dl class="gl">${istilah.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></div></div>
  <div class="card"><div class="ch"><h4>Pertanyaan umum</h4></div><div class="cb">${tanya
    .map(([q, a]) => `<details class="fq"><summary>${q}</summary><p>${a}</p></details>`)
    .join('')}</div></div>
  <div class="card"><div class="ch"><h4>Tips cepat</h4></div><div class="cb"><ul class="tips"><li>Tanda <span class="inf" style="position:static">?</span> kecil di samping judul angka berisi penjelasan singkat. Arahkan atau sentuh untuk membacanya.</li><li>Angka hijau dengan panah naik berarti lebih baik dari periode sebelumnya, merah berarti turun.</li><li>Di HP gunakan menu bawah. Menu lain ada di tombol <b>Lainnya</b>.</li><li>Tombol bulan/matahari di kanan atas mengganti tema terang dan gelap.</li></ul></div></div>`;
}

/** Halaman stok menipis: hanya produk dengan stok <= stok minimum. | param: - | return: string HTML */
export function stokMenipis() {
  const L = low().sort((a, b) => a.stok - b.stok);
  return `<div class="card"><div class="ch"><h4>Produk perlu diisi ulang (${L.length})</h4></div><div class="tw">${
    L.length
      ? `<table data-size="5"><tr><th>No</th><th>Produk</th><th>Kategori</th><th class="r">Stok</th><th class="r">Stok minimum</th><th>Status</th><th class="r">Aksi</th></tr>${L.map((p, i) => `<tr><td>${i + 1}</td><td><b>${esc(p.nama)}</b></td><td>${esc(kat(p.kategori_id)?.nama || '-')}</td><td class="r">${p.stok}</td><td class="r">${p.stok_minimum}</td><td><span class="b ${p.stok <= 0 ? 'r' : 'o'}">${p.stok <= 0 ? 'Habis' : 'Menipis'}</span></td><td class="r"><a class="btn sm bp" href="#barang-masuk">Isi ulang</a></td></tr>`).join('')}</table>`
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
  const fj = jb[S.mj] ? S.mj : '',
    semua = [...db.mutasi].reverse().filter((m) => !fj || m.jenis === fj),
    rec = semua.slice(0, 200);
  setTimeout(() => {
    const e = $('#fjenis');
    if (e)
      e.onchange = () => {
        S.mj = e.value;
        shellRef();
      };
  });
  return `<div class="card"><div class="ch"><h4>Input Mutasi / Penyesuaian Stok</h4></div><div class="cb"><form id="mform"><div class="row"><div class="fg"><label>Produk</label><select id="mpid" required>${popt(db)}</select></div><div class="fg"><label>Jenis Mutasi</label><select id="mjenis"><option value="masuk">Barang Masuk (+)</option><option value="keluar">Barang Keluar (-)</option><option value="penyesuaian">Penyesuaian (ubah stok langsung)</option></select></div></div><div class="row"><div class="fg"><label id="mjml-l" for="mjml">Jumlah</label><input id="mjml" type="number" min="1" step="1" required></div><div class="fg" id="mhb-w"><label for="mhb">Harga beli (Rp)</label><input id="mhb" type="number" min="0" step="any"></div></div><div class="fg"><label for="mcat">Catatan / alasan</label><input id="mcat" placeholder="Misal: rusak, hilang, bonus supplier"></div><button class="btn bp">Simpan</button></form></div></div>
  <div class="card"><div class="ch"><h4>Riwayat Mutasi Stok (${rec.length}${semua.length > rec.length ? ' terbaru' : ''})</h4><div class="flt"><select id="fjenis" aria-label="Filter jenis mutasi"><option value="">Semua jenis</option>${Object.entries(jb).map(([k, v]) => `<option value="${k}"${k === fj ? ' selected' : ''}>${v[1]}</option>`).join('')}</select></div></div><div class="tw"><table data-size="5"><tr><th>No</th><th>Waktu</th><th>Produk</th><th>Jenis</th><th class="r">Perubahan</th><th class="r">Sebelum</th><th class="r">Sesudah</th><th>Catatan</th></tr>
  ${rec
    .map((m, i) => {
      const p = prod(m.produk_id),
        info = jb[m.jenis] || ['n', m.jenis];
      return `<tr><td>${i + 1}</td><td>${dt(m.waktu)}</td><td>${esc(p?.nama || '(produk dihapus)')}</td><td><span class="b ${info[0]}">${info[1]}</span></td><td class="r ${m.jumlah < 0 ? 'neg' : 'pos'}">${m.jumlah > 0 ? '+' + m.jumlah : m.jumlah}</td><td class="r">${m.stok_sebelum}</td><td class="r">${m.stok_sesudah}</td><td>${esc(m.catatan || '-')}</td></tr>`;
    })
    .join('') || '<tr><td colspan="8">Tidak ada mutasi dengan jenis ini.</td></tr>'}</table></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
/* ==========================================================================
   BAGIAN 3 — HALAMAN LAPORAN & SISTEM
   laporan()    : ringkasan omzet/laba, grafik, dan produk terlaris
   hasilTutupBuku(): riwayat laporan tutup buku (proses dilakukan di desktop)
   transaksi()  : daftar seluruh transaksi + tombol detail
   pengaturan() : profil toko, ganti user, reset ke data contoh, logout
   ========================================================================== */

/** Tampilkan & jalankan tutup buku (akhir periode harian/bulanan/tahunan). | param: - | return: string HTML */
export function hasilTutupBuku() {
  const sel = (n) => (n === 0 ? ['g', 'Sesuai'] : n < 0 ? ['r', 'Kurang ' + rp(-n)] : ['o', 'Lebih ' + rp(n)]);
  const tglId = (k) => new Date(k + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const jn = { harian: 'Harian', bulanan: 'Bulanan', tahunan: 'Tahunan' };
  const jenis = jn[S.tb] ? S.tb : 'harian',
    ring = ringkasPeriode(jenis);
  // tombol proses: hari ini / bulan ini / tahun ini sesuai jenis terpilih
  const proses = (e) => {
    e.preventDefault();
    if (!ring.bisaDitutup) return;
    const f = $('#tbfisik');
    const raw = f && f.value.trim() !== '' ? Number(f.value) : NaN;
    const cat = ($('#tbcat') || {}).value || '';
    ask(`Tutup buku <b>${jn[jenis]}</b> periode <b>${esc(ring.label)}</b>?<br><br>Pendapatan ${rp(ring.pendapatan)} − pengeluaran ${rp(ring.pengeluaran)} = laba <b>${rp(ring.laba)}</b>.<br><br>Setelah ditutup, ${ring.transaksi} transaksi periode ini <b>dikunci</b> dan tidak bisa diubah.`, () => {
      const l = tutupBuku(jenis, new Date(), Number.isFinite(raw) ? raw : null, cat);
      if (!l) {
        toast('Periode ini tidak bisa ditutup');
        return;
      }
      save();
      toast('Tutup buku berhasil · ' + l.periode);
      shellRef();
    });
  };
  const rec = [...db.tutup].sort((a, b) => (a.waktu < b.waktu ? 1 : -1)),
    selisihHari = db.tutup.filter((x) => x.selisih !== 0).length,
    pendapatanAll = db.tutup.reduce((a, x) => a + (x.pendapatan ?? x.total_sistem ?? 0), 0),
    pengeluaranAll = db.tutup.reduce((a, x) => a + (x.pengeluaran ?? 0), 0);
  // pasang handler setelah HTML disisipkan
  setTimeout(() => {
    const jenisSel = $('#tbjenis');
    if (jenisSel)
      jenisSel.onchange = () => {
        S.tb = jenisSel.value;
        shellRef();
      };
    const form = $('#tbform');
    if (form) form.onsubmit = proses;
  }, 0);
  return `<div class="card"><div class="cb"><b>Apa itu tutup buku?</b><p>Tutup buku adalah proses akhir periode (harian, bulanan, atau tahunan) untuk mengunci seluruh catatan transaksi, menghitung total pendapatan dan pengeluaran, serta merapikan pembukuan agar siap digunakan untuk periode berikutnya.</p></div></div>
  <div class="card"><div class="ch"><h4>Proses tutup buku</h4><div class="flt"><select id="tbjenis" aria-label="Jenis periode tutup buku">${Object.entries(jn).map(([k, v]) => `<option value="${k}"${k === jenis ? ' selected' : ''}>${v}</option>`).join('')}</select></div></div><div class="cb">
    <div class="row"><div class="fg"><label>Periode</label><input value="${esc(ring.label)}" readonly></div><div class="fg"><label>Rentang</label><input value="${esc(ring.dari === ring.sampai ? ring.dari : ring.dari + ' s/d ' + ring.sampai)}" readonly></div></div>
    <div class="row"><div class="fg"><label>Transaksi</label><input value="${ring.transaksi}" readonly></div><div class="fg"><label>Status</label><input value="${ring.bisaDitutup ? 'Siap ditutup' : ring.sudahDitutup ? 'Sudah ditutup' : 'Belum ada transaksi'}" readonly></div></div>
    <div class="stats"><div class="st lt" style="background:#3DB5FF"><span>Pendapatan</span><h3>${rp(ring.pendapatan)}</h3></div><div class="st" style="background:#B54708"><span>Pengeluaran (modal)</span><h3>${rp(ring.pengeluaran)}</h3></div><div class="st" style="background:#0E9384"><span>Laba</span><h3>${rp(ring.laba)}</h3></div></div>
    <div class="row"><div class="fg"><label for="tbfisik">Uang fisik di kasir (opsional)</label><input id="tbfisik" type="number" min="0" step="any" placeholder="Kosongkan bila tidak dihitung"></div><div class="fg"><label for="tbcat">Catatan</label><input id="tbcat" placeholder="Misal: uang kembalian salah hitung"></div></div>
    <form id="tbform"><button class="btn bp"${ring.bisaDitutup ? '' : ' disabled'}>${ring.bisaDitutup ? `Tutup buku ${jn[jenis].toLowerCase()} ini` : 'Tidak bisa ditutup'}</button></form>
  </div></div>
  <div class="stats"><div class="st" style="background:#092C4C"><span>Periode sudah ditutup</span><h3>${db.tutup.length}</h3></div><div class="st" style="background:#B54708"><span>Periode ada selisih</span><h3>${selisihHari}</h3></div><div class="st" style="background:#0E9384"><span>Total pendapatan</span><h3>${rp(pendapatanAll)}</h3></div><div class="st" style="background:#475467"><span>Total pengeluaran</span><h3>${rp(pengeluaranAll)}</h3></div></div>
  <div class="card"><div class="ch"><h4>Riwayat tutup buku (${rec.length})</h4></div><div class="tw">${
    rec.length
      ? `<table data-size="5"><tr><th>No</th><th>Periode</th><th>Pendapatan</th><th>Pengeluaran</th><th>Laba</th><th>Selisih</th></tr>${rec.map((x, i) => `<tr><td>${i + 1}</td><td><b>${esc(x.periode || tglId(x.tanggal))}</b><small class="note">${esc(jn[x.jenis] || 'Harian')}</small></td><td class="r">${rp(x.pendapatan ?? x.total_sistem ?? 0)}</td><td class="r">${rp(x.pengeluaran ?? 0)}</td><td class="r">${rp(x.laba ?? (x.total_sistem ?? 0) - (x.pengeluaran ?? 0))}</td><td><span class="b ${sel(x.selisih)[0]}">${sel(x.selisih)[1]}</span></td></tr>`).join('')}</table>`
      : empty('Belum ada hasil tutup buku', 'Pilih periode lalu tekan tombol tutup buku untuk mengunci catatan periode tersebut.')
  }</div></div>`;
}

export function laporan() {
  /* --- Filter periode: menyaring SEMUA angka & tabel di halaman ini --- */
  const tf = ['semua', 'hari', '7hari', '30hari', 'bulan', 'tahun'].includes(S.lp) ? S.lp : 'semua';
  const kini = new Date(),
    awalHari = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate()).getTime();
  const batas = {
    semua: 0,
    hari: awalHari,
    '7hari': awalHari - 6 * 864e5,
    '30hari': awalHari - 29 * 864e5,
    bulan: new Date(kini.getFullYear(), kini.getMonth(), 1).getTime(),
    tahun: new Date(kini.getFullYear(), 0, 1).getTime()
  }[tf];
  const labelPeriode = {
    semua: 'seluruh data',
    hari: 'hari ini',
    '7hari': '7 hari terakhir',
    '30hari': '30 hari terakhir',
    bulan: 'bulan ini',
    tahun: 'tahun ini'
  }[tf];
  // transaksi yang lolos filter; idOk dipakai untuk menyaring detail
  const trx = db.transaksi.filter((t) => new Date(t.waktu).getTime() >= batas),
    idOk = new Set(trx.map((t) => t.id));

  const totJual = trx.reduce((a, t) => a + t.total, 0);
  // modal dari snapshot harga_beli di detail transaksi (data lama tanpa snapshot: pakai harga beli produk saat ini)
  let modalAwal = 0;
  const top = new Map();
  db.detail.forEach((d) => {
    if (!idOk.has(d.transaksi_id)) return;
    modalAwal += (d.harga_beli ?? prod(d.produk_id)?.harga_beli ?? 0) * d.jumlah;
    const x = top.get(d.nama_produk) || { q: 0, v: 0 };
    x.q += d.jumlah;
    x.v += d.subtotal;
    top.set(d.nama_produk, x);
  });
  const laba = totJual - modalAwal;
  // laba per transaksi (harga jual - snapshot harga beli) lalu dikelompokkan per tanggal & per hari
  const labaT = new Map();
  db.detail.forEach((d) => {
    if (!idOk.has(d.transaksi_id)) return;
    const hb = d.harga_beli ?? prod(d.produk_id)?.harga_beli ?? d.harga_satuan;
    labaT.set(d.transaksi_id, (labaT.get(d.transaksi_id) || 0) + (d.harga_satuan - hb) * d.jumlah);
  });
  const perTgl = new Map(),
    namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    perHari = namaHari.map(() => ({ c: 0, v: 0 }));
  trx.forEach((t) => {
    const k = dk(t.waktu),
      x = perTgl.get(k) || { c: 0, v: 0, l: 0 };
    x.c++;
    x.v += t.total;
    x.l += labaT.get(t.id) || 0;
    perTgl.set(k, x);
    const h = perHari[new Date(t.waktu).getDay()];
    h.c++;
    h.v += t.total;
  });
  const tglId = (k) => new Date(k + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const harian = [...perTgl.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14),
    ramai = [...perTgl.entries()].sort((a, b) => b[1].c - a[1].c || b[1].v - a[1].v).slice(0, 5),
    urutHari = [1, 2, 3, 4, 5, 6, 0].map((i) => ({ n: namaHari[i], ...perHari[i] })),
    maxHari = Math.max(1, ...urutHari.map((h) => h.c)),
    hariTop = [...urutHari].sort((a, b) => b.c - a.c)[0];
  const best = [...top.entries()].sort((a, b) => b[1].q - a[1].q).slice(0, 5);
  // pembeli dengan total belanja terbesar (nama pembeli pada data contoh adalah DUMMY)
  const by = new Map();
  trx.forEach((t) => {
    const x = by.get(t.pembeli || 'Umum') || { c: 0, v: 0 };
    x.c++;
    x.v += t.total;
    by.set(t.pembeli || 'Umum', x);
  });
  const buyers = [...by.entries()].sort((a, b) => b[1].v - a[1].v).slice(0, 5);
  // filter periode: menyaring semua tabel & angka di bawah ini
  setTimeout(() => {
    const e = $('#flp');
    if (e)
      e.onchange = () => {
        S.lp = e.value;
        shellRef();
      };
  });
  const opsi = [
      ['semua', 'Semua data'],
      ['hari', 'Hari ini'],
      ['7hari', '7 hari terakhir'],
      ['30hari', '30 hari terakhir'],
      ['bulan', 'Bulan ini'],
      ['tahun', 'Tahun ini']
    ],
    fltBar = `<div class="flt"><select id="flp" aria-label="Filter periode laporan">${opsi.map(([k, v]) => `<option value="${k}"${k === tf ? ' selected' : ''}>${v}</option>`).join('')}</select></div>`;
  return `<div class="card"><div class="ch"><h4>Ringkasan ${esc(labelPeriode)}</h4>${fltBar}</div><div class="cb"><p class="note">Angka dan tabel di halaman ini mengikuti periode yang dipilih. Periode sekarang: <b>${esc(labelPeriode)}</b> — ${trx.length} dari ${db.transaksi.length} transaksi.</p></div></div>
  <div class="stats"><div class="st lt" style="background:#3DB5FF"><span>Total Omzet</span><h3>${rp(totJual)}</h3></div><div class="st" style="background:#0E9384"><span>Estimasi Laba Kotor</span><h3>${rp(laba)}</h3></div><div class="st" style="background:#092C4C"><span>Total Transaksi</span><h3>${trx.length}</h3></div></div>
  <div class="card"><div class="ch"><h4>Penjualan &amp; laba harian</h4></div><div class="tw">${
    harian.length
      ? `<table data-size="5"><tr><th>No</th><th>Tanggal</th><th class="r">Transaksi</th><th class="r">Omzet</th><th class="r">Laba kotor</th></tr>${harian.map(([k, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(tglId(k))}</b></td><td class="r">${x.c}</td><td class="r">${rp(x.v)}</td><td class="r"><span class="b ${x.l >= 0 ? 'g' : 'r'}">${rp(x.l)}</span></td></tr>`).join('')}</table>`
      : empty('Belum ada penjualan', 'Laba harian muncul setelah ada transaksi.')
  }</div></div>
  <div class="card"><div class="ch"><h4>Transaksi terbanyak harian</h4></div><div class="tw">${
    ramai.length
      ? `<table data-size="5"><tr><th>No</th><th>Tanggal</th><th class="r">Transaksi</th><th class="r">Omzet</th></tr>${ramai.map(([k, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(tglId(k))}</b></td><td class="r">${x.c}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : empty('Belum ada transaksi', 'Daftar muncul setelah ada transaksi.')
  }</div></div>
  <div class="card"><div class="ch"><h4>Transaksi terbanyak mingguan</h4>${hariTop && hariTop.c ? `<span class="b g">Tersibuk: ${hariTop.n} (${hariTop.c} transaksi)</span>` : ''}</div><div class="cb hr">${urutHari
    .map((h) => `<div class="hr-r"><span class="hr-n">${h.n}</span><span class="hr-b"><i style="width:${Math.round((h.c / maxHari) * 100)}%"></i></span><span class="hr-v">${h.c} <small>transaksi</small></span></div>`)
    .join('')}</div></div>
  <div class="card"><div class="ch"><h4>Produk terlaris</h4></div><div class="tw">${
    best.length
      ? `<table data-size="5"><tr><th>No</th><th>Produk</th><th class="r">Terjual</th><th class="r">Omzet</th></tr>${best.map(([n, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(n)}</b></td><td class="r">${x.q}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : empty('Belum ada penjualan', 'Produk terlaris muncul setelah ada transaksi.')
  }</div></div>
  <div class="card"><div class="ch"><h4>Belanja terbesar per pembeli</h4></div><div class="tw">${
    buyers.length
      ? `<table data-size="5"><tr><th>No</th><th>Pembeli</th><th class="r">Transaksi</th><th class="r">Total belanja</th></tr>${buyers.map(([nm, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(nm)}</b></td><td class="r">${x.c}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : empty('Belum ada pembeli', 'Daftar muncul setelah ada transaksi.')
  }</div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function transaksi() {
  const rec = [...db.transaksi].reverse(),
    nKunci = rec.filter(terkunci).length;
  return `<div class="card"><div class="ch"><h4>Riwayat Transaksi (${rec.length})</h4>${nKunci ? `<span class="b r">${nKunci} terkunci tutup buku</span>` : ''}</div><div class="tw"><table data-size="5"><tr><th>No</th><th>Kode</th><th>Waktu</th><th class="r">Total</th><th>Status</th><th class="r">Aksi</th></tr>
  ${rec.map((t, i) => `<tr><td>${i + 1}</td><td><b>${t.kode}</b></td><td>${dt(t.waktu)}</td><td class="r">${rp(t.total)}</td><td>${terkunci(t) ? `<span class="b r">Terkunci</span>` : `<span class="b g">Terbuka</span>`}</td><td class="r"><button class="btn sm" data-act="det" data-id="${t.id}">Detail</button></td></tr>`).join('')}</table></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function pengaturan() {
  setTimeout(() => {
    bindSwitch('nsw2');
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
  <div class="card"><div class="ch"><h4>Notifikasi</h4></div><div class="cb"><p style="margin:0 0 10px">Tampilkan aktivitas toko (penjualan, stok, tutup buku) di halaman Notifikasi dan lencana angka pada lonceng.</p>${notifSwitch('nsw2')}</div></div>
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
  return `${p.id ? '<p class="note" style="margin:0 0 10px">Nama dan barcode produk tidak dapat diubah.</p>' : ''}<div class="fg"><label>Nama produk</label><input name="nama" required value="${esc(p.nama)}"${p.id ? ' readonly class="ro"' : ''}></div><div class="row"><div class="fg"><label>Barcode</label><input name="barcode" value="${esc(p.barcode)}"${p.id ? ' readonly class="ro"' : ''}></div><div class="fg"><label>Kategori</label><select name="kategori_id"><option value="">Tanpa Kategori</option>${opts(db.kategori, p.kategori_id)}</select></div></div><div class="row"><div class="fg"><label>Harga jual</label><input name="harga" type="number" min="0" required value="${p.harga ?? ''}"></div><div class="fg"><label>Harga beli</label><input name="harga_beli" type="number" min="0" required value="${p.harga_beli ?? ''}"></div></div><div class="row"><div class="fg"><label>${p.id ? 'Stok saat ini' : 'Stok awal'}</label><input name="stok" type="number" min="0" step="1" inputmode="numeric" required value="${p.id ? p.stok : 0}"></div><div class="fg"><label>Stok minimum</label><input name="stok_minimum" type="number" min="0" step="1" inputmode="numeric" required value="${p.stok_minimum ?? 5}"></div></div><div class="fg"><label>Isi per pack (pcs)</label><input name="isi_pack" type="number" min="1" step="1" inputmode="numeric" value="${p.isi_pack ?? 1}"><small>Isi 1 bila tidak dijual per pack. Stok di tabel tampil sebagai pack + pcs.</small></div>`;
}

export function saveP(d, p) {
  // nama & barcode produk yang sudah ada tidak boleh diubah
  if (p) d = { ...d, nama: p.nama, barcode: p.barcode || '' };
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
  const isi = d.isi_pack === '' || d.isi_pack == null ? 1 : +d.isi_pack;
  if (!Number.isInteger(isi) || isi < 1) {
    toast('Isi per pack harus bilangan bulat 1 atau lebih');
    return false;
  }
  const v = {
    isi_pack: isi,
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
    `<div class="lg"><div class="lg-c"><form class="lg-card" id="af" novalidate><h2 class="lg-t">Masuk</h2><p class="lg-s">Toko Berkah · kelola stok dan transaksi</p><div class="lg-al" id="al" role="alert" hidden></div>
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
