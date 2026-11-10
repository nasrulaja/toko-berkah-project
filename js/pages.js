/* ==========================================================================
   TOKO BERKAH — pages.js
   Semua halaman aplikasi. Tiap fungsi di sini hanya MENGEMBALIKAN string HTML
   (tidak menyentuh DOM langsung); app.js yang menyisipkannya lewat shell().
   Data diambil dari db.js, tampilan dibantu helper dari ui.js.
   --------------------------------------------------------------------------
   PETA FILE — cari teks "BAGIAN n":
     BAGIAN 1  PEMBANTU DATA & STATE   prod(), kat(), low(), jb, shellRef
     BAGIAN 2  HALAMAN UTAMA           dashboard(), kasir(), produk(), stokMenipis(), stok()
     BAGIAN 3  LAPORAN & SISTEM        laporan(), transaksi(), pengaturan()
     BAGIAN 4  FORM PRODUK & KATEGORI  pform(), saveP(), kform()
     BAGIAN 5  HALAMAN LOGIN           login()
   ========================================================================== */

/* ==========================================================================
   BAGIAN 1 — PEMBANTU DATA & STATE
   S   : state sementara per halaman (keranjang kasir, kata kunci, filter)
   prod/kat/low : pencarian data yang sering dipakai
   jb  : label + warna badge untuk jenis mutasi stok
   shellRef : diisi app.js lewat setShellRef() agar halaman bisa minta render
              ulang seluruh kerangka (mis. setelah login atau simpan data)
   ========================================================================== */

import { db, me, save, mut, sell, KS, setMe, setDB, seed } from './db.js';
import { $, $$, esc, rp, dk, dt, ico, toast, modal, ask, opts, popt, today, empty, themeIcon } from './ui.js';

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
   dashboard() : ringkasan hari ini, grafik 7 hari, stok menipis, transaksi
   kasir()     : pencarian produk, keranjang, hitung kembalian, simpan jual
   produk()    : tabel produk + filter kategori + tombol tambah/ubah/hapus
   stok()      : form barang masuk/penyesuaian + riwayat mutasi stok
   ========================================================================== */

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function dashboard() {
  const td = today(),
    tr = db.transaksi.filter((t) => dk(t.waktu) === td),
    L = low();
  const days = [...Array(7)].map((_, i) => {
      const d = new Date(Date.now() - (6 - i) * 864e5),
        k = dk(d.toISOString());
      return {
        l: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        v: db.transaksi.filter((t) => dk(t.waktu) === k).reduce((a, t) => a + t.total, 0)
      };
    }),
    mx = Math.max(...days.map((d) => d.v), 1);
  const bars = days
    .map((d, i) => {
      const h = (d.v / mx) * 150;
      return `<rect x="${i * 60 + 14}" y="${170 - h}" width="34" height="${h}" rx="4" fill="#3DB5FF"><title>${rp(d.v)}</title></rect><text x="${i * 60 + 31}" y="190" text-anchor="middle" font-size="12" fill="currentColor">${d.l}</text>`;
    })
    .join('');
  const rec = [...db.transaksi].reverse().slice(0, 5);
  return `<div class="ban"><span><b>Selamat datang, ${esc(me.nama)}</b><br>${L.length ? `Ada ${L.length} barang yang stoknya menipis dan perlu dibeli ulang.` : 'Semua stok barang masih aman.'}</span><a class="btn bp" href="#barang-masuk">Catat barang masuk</a></div>
  <div class="stats"><div class="st lt" style="background:#3DB5FF"><span>Penjualan hari ini</span><h3>${rp(tr.reduce((a, t) => a + t.total, 0))}</h3></div><div class="st" style="background:#092C4C"><span>Transaksi hari ini</span><h3>${tr.length}</h3></div><div class="st" style="background:#0E9384"><span>Jumlah produk</span><h3>${db.produk.length}</h3></div><div class="st" style="background:#E04F16"><span>Stok menipis</span><h3>${L.length}</h3></div></div>
  <div class="g2"><div class="card"><div class="ch"><h4>Penjualan 7 hari terakhir</h4></div><div class="cb"><svg viewBox="0 0 420 200" width="100%" role="img" aria-label="Grafik penjualan 7 hari">${bars}</svg></div></div>
  <div class="card"><div class="ch"><h4>Stok menipis</h4><a href="#stok-menipis" class="btn sm">Lihat semua</a></div><div class="cb">${
    L.slice(0, 5)
      .map((p) => `<div class="li"><span>${esc(p.nama)}</span><span class="b r">${p.stok}</span></div>`)
      .join('') || empty('Aman', 'Tidak ada barang yang menipis.')
  }</div></div></div>
  <div class="card"><div class="ch"><h4>Transaksi terbaru</h4><a href="#transaksi" class="btn sm">Lihat semua</a></div><div class="tw"><table><tr><th>Kode</th><th>Waktu</th><th>Sumber</th><th class="r">Total</th></tr>${rec.map((t) => `<tr><td>${t.kode}</td><td>${dt(t.waktu)}</td><td><span class="b n">${t.sumber}</span></td><td class="r">${rp(t.total)}</td></tr>`).join('')}</table></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function kasir() {
  S.cart = S.cart || new Map();
  S.q = S.q || '';
  S.k = S.k || '';
  setTimeout(() => {
    const renderCart = () => {
      const items = [...S.cart.entries()].map(([id, q]) => [prod(id), q]).filter(([p]) => p);
      const tot = items.reduce((a, [p, q]) => a + p.harga * q, 0);
      $('#cart').innerHTML = items.length
        ? items
            .map(
              ([p, q]) =>
                `<div class="li"><div><b>${esc(p.nama)}</b><br><small>${rp(p.harga)} × ${q}</small></div><div class="qty"><button data-c="-" data-id="${p.id}">-</button><span>${q}</span><button data-c="+" data-id="${p.id}">+</button><button data-c="x" data-id="${p.id}">×</button></div></div>`
            )
            .join('')
        : empty('Keranjang kosong', 'Klik produk di sebelah kiri.');
      $('#tot').textContent = rp(tot);
      S.total = tot;
      if (!S.cashTouched) $('#cash').value = tot || '';
      updPay(items.length);
    };
    // hitung kembalian dari uang yang benar-benar diterima kasir
    const updPay = (n) => {
      const tot = S.total || 0,
        cash = +$('#cash').value || 0;
      $('#chg').textContent = cash >= tot ? rp(cash - tot) : 'Kurang ' + rp(tot - cash);
      $('#pay').disabled = !n || cash < tot;
    };
    renderCart();
    $('#cash').oninput = () => {
      S.cashTouched = true;
      updPay([...S.cart.keys()].filter((id) => prod(id)).length);
    };
    $('#cashpas').onclick = () => {
      S.cashTouched = false;
      $('#cash').value = S.total || '';
      updPay([...S.cart.keys()].filter((id) => prod(id)).length);
    };
    $('#psearch').oninput = (e) => {
      S.q = e.target.value.toLowerCase();
      drawProds();
    };
    $('#pkat').onchange = (e) => {
      S.k = e.target.value;
      drawProds();
    };
    const drawProds = () => {
      const list = db.produk.filter(
        (p) =>
          (!S.k || p.kategori_id == S.k) &&
          (!S.q || p.nama.toLowerCase().includes(S.q) || (p.barcode && p.barcode.includes(S.q)))
      );
      $('#plist').innerHTML =
        list
          .map(
            (p) =>
              `<button class="pcard ${p.stok <= 0 ? 'off' : ''}" data-pid="${p.id}" ${p.stok <= 0 ? 'disabled' : ''}><b>${esc(p.nama)}</b><div class="p"><span class="pr">${rp(p.harga)}</span><span class="b ${p.stok <= p.stok_minimum ? 'r' : 'n'}">Stok ${p.stok}</span></div></button>`
          )
          .join('') || empty('Tidak ditemukan', 'Coba kata kunci lain.');
      $$('#plist .pcard').forEach(
        (b) =>
          (b.onclick = () => {
            const id = +b.dataset.pid,
              p = prod(id),
              cur = S.cart.get(id) || 0;
            if (cur + 1 > p.stok) return toast('Stok tidak mencukupi');
            S.cart.set(id, cur + 1);
            renderCart();
          })
      );
    };
    drawProds();
    $('#cart').onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const c = b.dataset.c,
        id = +b.dataset.id,
        p = prod(id),
        cur = S.cart.get(id) || 0;
      if (c === '+') {
        if (cur + 1 > p.stok) return toast('Stok tidak mencukupi');
        S.cart.set(id, cur + 1);
      } else if (c === '-') {
        if (cur - 1 <= 0) S.cart.delete(id);
        else S.cart.set(id, cur - 1);
      } else if (c === 'x') S.cart.delete(id);
      renderCart();
    };
    $('#pay').onclick = () => {
      const items = [...S.cart.entries()];
      if (!items.length) return;
      const cash = +$('#cash').value;
      if (!(cash >= (S.total || 0))) return toast('Uang diterima kurang dari total');
      const t = sell(items, new Date().toISOString(), 'kasir', cash);
      if (!t) return toast('Transaksi gagal: stok tidak cukup');
      save();
      S.cart.clear();
      S.cashTouched = false;
      toast('Transaksi berhasil! Kembalian ' + rp(t.kembalian));
      shellRef();
    };
  }, 0);
  return `<div class="pos"><div class="card cb"><div class="flt" style="margin-bottom:12px"><input id="psearch" placeholder="Cari nama / barcode..." value="${esc(S.q)}"><select id="pkat"><option value="">Semua Kategori</option>${opts(db.kategori, S.k)}</select></div><div class="pgrid" id="plist"></div></div>
  <div class="card cb"><h4 style="margin-bottom:12px">Keranjang</h4><div id="cart"></div><div class="li" style="margin-top:12px"><b>Total</b><b id="tot" style="font-size:18px;color:var(--p)">Rp0</b></div><div class="fg" style="margin-top:12px"><label for="cash">Uang diterima (Rp)</label><div class="flt" style="flex-wrap:nowrap"><input id="cash" type="number" min="0" step="any" inputmode="numeric" style="flex:1"><button type="button" class="btn" id="cashpas">Uang pas</button></div></div><div class="li"><span>Kembalian</span><b id="chg">Rp0</b></div><button class="btn bp" id="pay" style="width:100%;margin-top:12px" disabled>Bayar sekarang</button></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function produk() {
  return `<div class="card"><div class="ch"><h4>Daftar Produk (${db.produk.length})</h4><div class="flt"><button class="btn bp" data-act="addp">Tambah produk</button><button class="btn" data-act="addk">Tambah kategori</button></div></div>
  <div class="tw"><table><tr><th>Produk</th><th>Kategori</th><th>Barcode</th><th class="r">Harga Jual</th><th class="r">Harga Beli</th><th class="r">Stok</th><th class="r">Aksi</th></tr>
  ${
    db.produk
      .map((p) => {
        const k = kat(p.kategori_id);
        return `<tr><td><b>${esc(p.nama)}</b></td><td>${esc(k?.nama || '-')}</td><td><code>${esc(p.barcode || '-')}</code></td><td class="r">${rp(p.harga)}</td><td class="r">${rp(p.harga_beli)}</td><td class="r"><span class="b ${p.stok <= p.stok_minimum ? 'r' : 'g'}">${p.stok}</span></td><td class="r"><button class="btn sm" data-act="editp" data-id="${p.id}">Ubah</button> <button class="btn sm bd" data-act="delp" data-id="${p.id}">Hapus</button></td></tr>`;
      })
      .join('') || '<tr><td colspan="7">Belum ada produk.</td></tr>'
  }</table></div></div>
  <div class="card"><div class="ch"><h4>Kategori (${db.kategori.length})</h4></div><div class="tw"><table><tr><th>Nama Kategori</th><th class="r">Jumlah Produk</th><th class="r">Aksi</th></tr>
  ${db.kategori.map((k) => `<tr><td>${esc(k.nama)}</td><td class="r">${db.produk.filter((p) => p.kategori_id === k.id).length}</td><td class="r"><button class="btn sm" data-act="editk" data-id="${k.id}">Ubah</button> <button class="btn sm bd" data-act="delk" data-id="${k.id}">Hapus</button></td></tr>`).join('')}</table></div></div>`;
}

/** Halaman stok menipis: hanya produk dengan stok <= stok minimum. | param: - | return: string HTML */
export function stokMenipis() {
  const L = low().sort((a, b) => a.stok - b.stok);
  return `<div class="card"><div class="ch"><h4>Produk perlu diisi ulang (${L.length})</h4></div><div class="tw">${
    L.length
      ? `<table><tr><th>Produk</th><th>Kategori</th><th class="r">Stok</th><th class="r">Stok minimum</th><th>Status</th><th class="r">Aksi</th></tr>${L.map((p) => `<tr><td><b>${esc(p.nama)}</b></td><td>${esc(kat(p.kategori_id)?.nama || '-')}</td><td class="r">${p.stok}</td><td class="r">${p.stok_minimum}</td><td><span class="b ${p.stok <= 0 ? 'r' : 'o'}">${p.stok <= 0 ? 'Habis' : 'Menipis'}</span></td><td class="r"><a class="btn sm bp" href="#barang-masuk">Restock</a></td></tr>`).join('')}</table>`
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
  return `<div class="card"><div class="ch"><h4>Input Mutasi / Penyesuaian Stok</h4></div><div class="cb"><form id="mform"><div class="row"><div class="fg"><label>Produk</label><select id="mpid" required>${popt(db)}</select></div><div class="fg"><label>Jenis Mutasi</label><select id="mjenis"><option value="masuk">Barang Masuk (+)</option><option value="keluar">Barang Keluar (-)</option><option value="penyesuaian">Penyesuaian (set stok)</option></select></div></div><div class="row"><div class="fg"><label id="mjml-l" for="mjml">Jumlah</label><input id="mjml" type="number" min="1" step="1" required></div><div class="fg" id="mhb-w"><label for="mhb">Harga beli (Rp)</label><input id="mhb" type="number" min="0" step="any"></div></div><div class="fg"><label for="mcat">Catatan / alasan</label><input id="mcat" placeholder="Misal: rusak, hilang, bonus supplier"></div><button class="btn bp">Simpan Mutasi</button></form></div></div>
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
  return `<div class="stats"><div class="st lt" style="background:#3DB5FF"><span>Total Omzet</span><h3>${rp(totJual)}</h3></div><div class="st" style="background:#0E9384"><span>Estimasi Laba Kotor</span><h3>${rp(laba)}</h3></div><div class="st" style="background:#092C4C"><span>Total Transaksi</span><h3>${db.transaksi.length}</h3></div></div>
  <div class="card"><div class="ch"><h4>Produk terlaris</h4></div><div class="tw">${
    best.length
      ? `<table><tr><th>#</th><th>Produk</th><th class="r">Terjual</th><th class="r">Omzet</th></tr>${best.map(([n, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(n)}</b></td><td class="r">${x.q}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : empty('Belum ada penjualan', 'Produk terlaris muncul setelah ada transaksi.')
  }</div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function transaksi() {
  const rec = [...db.transaksi].reverse();
  return `<div class="card"><div class="ch"><h4>Riwayat Transaksi (${rec.length})</h4></div><div class="tw"><table><tr><th>Kode</th><th>Waktu</th><th>Sumber</th><th class="r">Total</th><th class="r">Aksi</th></tr>
  ${rec.map((t) => `<tr><td><b>${t.kode}</b></td><td>${dt(t.waktu)}</td><td><span class="b n">${t.sumber}</span></td><td class="r">${rp(t.total)}</td><td class="r"><button class="btn sm" data-act="det" data-id="${t.id}">Detail</button></td></tr>`).join('')}</table></div></div>`;
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
  return `<div class="fg"><label>Nama produk</label><input name="nama" required value="${esc(p.nama)}"></div><div class="row"><div class="fg"><label>Barcode</label><input name="barcode" value="${esc(p.barcode)}"></div><div class="fg"><label>Kategori</label><select name="kategori_id"><option value="">Tanpa Kategori</option>${opts(db.kategori, p.kategori_id)}</select></div></div><div class="row"><div class="fg"><label>Harga jual</label><input name="harga" type="number" min="0" required value="${p.harga ?? ''}"></div><div class="fg"><label>Harga beli</label><input name="harga_beli" type="number" min="0" required value="${p.harga_beli ?? ''}"></div></div><div class="row">${p.id ? '' : `<div class="fg"><label>Stok awal</label><input name="stok" type="number" min="0" required value="0"></div>`}<div class="fg"><label>Stok minimum</label><input name="stok_minimum" type="number" min="0" required value="${p.stok_minimum ?? 5}"></div></div>`;
}

export function saveP(d, p) {
  // barcode opsional: yang kosong tidak dicek keunikannya
  if (d.barcode.trim() && db.produk.some((x) => x.barcode === d.barcode.trim() && x.id !== p?.id)) {
    toast('Barcode sudah dipakai produk lain');
    return false;
  }
  const v = {
    nama: d.nama.trim(),
    barcode: d.barcode.trim(),
    kategori_id: d.kategori_id ? +d.kategori_id : null,
    harga: +d.harga,
    harga_beli: +d.harga_beli,
    stok_minimum: +d.stok_minimum,
    updated_at: new Date().toISOString()
  };
  if (p) Object.assign(p, v);
  else {
    const n = { id: ++db.n, stok: 0, created_at: v.updated_at, ...v };
    db.produk.push(n);
    if (+d.stok > 0) mut(n, 'masuk', +d.stok, { hb: n.harga_beli, cat: 'Stok awal' });
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
    `<div class="lg"><button type="button" class="ic lg-th" data-act="theme" aria-label="Ganti tema">${themeIcon()}</button><div class="lg-c"><form class="lg-card" id="af" novalidate><h2 class="lg-t">Masuk</h2><p class="lg-s">Toko Berkah · kelola stok dan penjualan</p><div class="lg-al" id="al" role="alert" hidden></div>
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
