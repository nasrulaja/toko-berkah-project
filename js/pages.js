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

import { db, me, save, mut, KS, setMe, terkunci, sah, setStatusTransaksi, dbGalat } from './core/db.js?v=20261119a';
import { $, $$, esc, rp, dk, dt, ico, toast, modal, ask, opts, popt, empty, today, tip } from './ui.js?v=20261117m';
import { barChart, donut, spark, short } from './charts.js?v=20261117m';
import { unduhXls } from './core/excel.js?v=20261126b';

let S = {};

/* ---- Tombol unduh Excel ----
   Satu penangan klik untuk semua halaman: tombol membawa nama berkasnya di
   data-xls, lalu isinya diambil dari tabel terdekat di kartu yang sama.
   Dengan cara ini tidak perlu menulis ulang daftar kolom di tiap halaman —
   yang diunduh SELALU sama dengan yang terlihat di layar, termasuk saat
   filter atau pencarian sedang aktif. Itu sebabnya tidak ada tombol ekspor
   terpisah per tabel dengan kolom sendiri-sendiri (mudah jadi tidak sinkron). */
const angkaDari = (s) => {
  // "Rp56.500" / "1.234" / "-3" -> 56500 / 1234 / -3. Format Indonesia: titik = ribuan.
  const n = Number(String(s ?? '').replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && String(s ?? '').trim() !== '' ? n : '';
};

/** Ambil isi tabel dalam sebuah kartu jadi {kolom, baris} siap ekspor.
 *  param: kartu (elemen .card) | return: {kolom, baris} | null bila tak ada tabel */
function tabelKeData(kartu) {
  const tb = kartu?.querySelector('table');
  if (!tb) return null;
  const barisKepala = [...tb.rows].find((r) => r.querySelector('th'));
  if (!barisKepala) return null;
  // Kolom "Aksi" berisi tombol — tidak ada gunanya di Excel.
  const buang = new Set();
  [...barisKepala.cells].forEach((c, i) => {
    if (/^(aksi|action|#)$/i.test(c.textContent.trim())) buang.add(i);
  });
  const kolom = [];
  [...barisKepala.cells].forEach((c, i) => {
    if (buang.has(i)) return;
    const label = c.textContent.trim() || 'Kolom ' + (i + 1);
    // Tebak tipe dari judul: kolom uang/angka dikirim sebagai Number agar bisa dijumlahkan Excel.
    const tipe = /^(no|total|omzet|harga|stok|jumlah|terjual|transaksi|penjualan|uang|selisih|pendapatan|pengeluaran|margin|laba|rata|qty|barang)/i.test(label)
      ? 'Number'
      : 'String';
    kolom.push({ label, tipe, lebar: tipe === 'Number' ? 90 : 150 });
  });
  const baris = [];
  [...tb.rows].forEach((r) => {
    if (r === barisKepala || r.querySelector('th')) return;
    // Lewati baris "kosong" (colspan penuh berisi pesan "Tidak ada data").
    if (r.cells.length === 1 && r.cells[0].hasAttribute('colspan')) return;
    const isi = [];
    [...r.cells].forEach((c, i) => {
      if (buang.has(i)) return;
      const teks = c.textContent.replace(/\s+/g, ' ').trim();
      const k = kolom[isi.length];
      isi.push(k?.tipe === 'Number' ? angkaDari(teks) : teks);
    });
    if (isi.length) baris.push(isi);
  });
  return baris.length ? { kolom, baris } : null;
}

/** Klik tombol [data-xls]: unduh tabel pada kartu itu sebagai Excel. */
function eksporKartu(btn) {
  const kartu = btn.closest('.card') || btn.closest('div');
  const judul = btn.dataset.xls || kartu?.querySelector('h4')?.textContent.trim() || 'Data';
  const data = tabelKeData(kartu);
  if (!data) return toast('Tidak ada data untuk diunduh');
  const ok = unduhXls(judul.replace(/\s*\(\d+.*?\)\s*$/, ''), data.kolom, data.baris);
  toast(ok ? `${data.baris.length} baris diunduh sebagai Excel` : 'Gagal membuat berkas Excel');
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-xls]');
  if (b) {
    e.preventDefault();
    eksporKartu(b);
  }
});

/** Markup tombol unduh Excel. | param: nama (nama berkas) | return: string HTML */
const btnXls = (nama) =>
  `<button type="button" class="btn sm xls" data-xls="${esc(nama)}" title="Unduh data ini sebagai berkas Excel">${ico('down')}<span>Excel</span></button>`;

/** Mengisi filter halaman dari tautan (mis. #laporan?lp=hari) sebelum halaman digambar. | param: o (objek kunci-nilai) | return: void */
export const terapkanFilter = (o) => {
  // halaman stok: ?mpid=<id> memilih produk langsung di kotak produk (dipakai tautan "Isi ulang")
  if (o.mpid !== undefined) {
    S.mpid = prod(o.mpid) ? o.mpid : '';
    delete o.mpid;
  }
  return Object.assign(S, o);
};

/** Nama bulan singkat untuk label filter. | param: - | return: array 12 nama */
const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Daftar periode filter tetap. Pilihan bulan spesifik ditambahkan terpisah
 *  oleh opsiPeriode() karena bergantung pada data yang ada. | param: - | return: array [kunci, label] */
const PERIODE = [
  ['semua', 'Semua data'],
  ['hari', 'Hari ini'],
  ['7hari', '7 hari terakhir'],
  ['30hari', '30 hari terakhir'],
  ['bulan', 'Bulan ini'],
  ['bulankmr', 'Bulan kemarin'],
  ['tahun', 'Tahun ini']
];

/** Bulan yang punya transaksi, terbaru lebih dulu. | param: - | return: array [{ kunci, label }] */
const bulanAdaData = () => {
  const set = new Set();
  db.transaksi.forEach((t) => {
    const w = new Date(t.waktu);
    if (!isNaN(w)) set.add(w.getFullYear() * 12 + w.getMonth()); // kunci unik per bulan
  });
  return [...set]
    .sort((a, b) => b - a) // terbaru dulu
    .map((n) => {
      const th = Math.floor(n / 12),
        bl = n % 12;
      return { kunci: 'bl:' + th + '-' + String(bl + 1).padStart(2, '0'), label: NAMA_BULAN[bl] + ' ' + th };
    });
};

/** Gabungan periode tetap + pilihan bulan. | param: - | return: array [kunci, label] */
const opsiPeriode = () => [...PERIODE, ...bulanAdaData().map((b) => [b.kunci, b.label])];

/** label "Okt 2026" untuk kunci bl:2026-10. | param: kunci (string) | return: string */
const labelBulanKunci = (kunci) => {
  const m = /^bl:(\d{4})-(\d{2})$/.exec(kunci);
  if (!m) return '';
  return NAMA_BULAN[Number(m[2]) - 1] + ' ' + m[1];
};

/** Batas awal & akhir periode (ms). Akhir bersifat eksklusif (boleh undefined = tanpa batas). | param: tf (kunci periode) | return: { awal, akhir } */
const rentangPeriode = (tf) => {
  const k = new Date(),
    th = k.getFullYear(),
    bl = k.getMonth(),
    h = new Date(th, bl, k.getDate()).getTime(),
    // Bulan kemarin: 1 .. akhir bulan lalu. Akhir bulan lalu = tanggal 0 bulan ini,
    // jadi otomatis benar walau kemarin Januari, atau Februari saat tahun kabisat.
    awalKmr = new Date(th, bl - 1, 1).getTime(),
    akhirKmr = new Date(th, bl, 1).getTime();
  // Kunci bulan spesifik: bl:2026-10 -> 1 Okt .. 1 Nov 2026.
  const pilih = /^bl:(\d{4})-(\d{2})$/.exec(tf || '');
  if (pilih) {
    const y = Number(pilih[1]),
      m = Number(pilih[2]) - 1;
    return { awal: new Date(y, m, 1).getTime(), akhir: new Date(y, m + 1, 1).getTime() };
  }
  switch (tf) {
    case 'hari': return { awal: h, akhir: h + 864e5 };
    case '7hari': return { awal: h - 6 * 864e5 };
    case '30hari': return { awal: h - 29 * 864e5 };
    case 'bulan': return { awal: new Date(th, bl, 1).getTime(), akhir: new Date(th, bl + 1, 1).getTime() };
    case 'bulankmr': return { awal: awalKmr, akhir: akhirKmr };
    case 'tahun': return { awal: new Date(th, 0, 1).getTime(), akhir: new Date(th + 1, 0, 1).getTime() };
    default: return { awal: 0 };
  }
};

/** Format tanggal jadi YYYY-MM-DD untuk <input type="date">. | param: ms atau Date | return: string */
const tglKunci = (ms) => {
  const d = ms instanceof Date ? ms : new Date(ms),
    p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};

/** Rentang dari dua tanggal pilihan pengguna (YYYY-MM-DD), akhir inklusif.
 *  Akhir digeser ke 00:00 hari berikutnya karena semua perbandingan memakai batas eksklusif.
 *  param: dari, sampai (string YYYY-MM-DD) | return: { awal, akhir } */
const rentangTanggal = (dari, sampai) => {
  const baca = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    const y = Number(m[1]),
      mo = Number(m[2]) - 1,
      d = Number(m[3]),
      t = new Date(y, mo, d);
    // Tolak tanggal yang "dibalap" JS, misal 2026-13-45 -> 2027-02-14
    if (isNaN(t) || t.getFullYear() !== y || t.getMonth() !== mo || t.getDate() !== d) return null;
    return t;
  };
  let a = baca(dari),
    b = baca(sampai);
  if (!a && !b) return { awal: 0 };
  if (!a) return { awal: 0, akhir: new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1).getTime() }; // hanya "sampai": mulai dari awal data
  if (!b) b = a; // hanya "dari" diisi: satu hari itu saja
  if (b < a) [a, b] = [b, a]; // terbalik: tukar supaya tetap masuk akal
  return { awal: a.getTime(), akhir: new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1).getTime() };
};

/** Rentang aktif untuk halaman laporan/riwayat. Kunci 'rentang' memakai tanggal pilihan pengguna;
 *  selain itu memakai periode cepat. | param: kunci, dari, sampai | return: { awal, akhir } */
const rentangAktif = (kunci, dari, sampai) => (kunci === 'rentang' ? rentangTanggal(dari, sampai) : rentangPeriode(kunci));

/** Batas awal periode dalam ms (untuk perbandingan sederhana). | param: tf (kunci periode) | return: ms */
const awalPeriode = (tf) => rentangPeriode(tf).awal;

/** Saring transaksi sesuai periode. Memakai batas akhir juga, supaya "bulan kemarin" tidak ikut bulan ini. | param: daftar (array), tf (kunci periode) | return: array */
const dalamPeriode = (daftar, tf, dari, sampai) => {
  const { awal, akhir } = rentangAktif(tf, dari, sampai);
  return daftar.filter((x) => {
    const w = new Date(x.waktu).getTime();
    return w >= awal && (akhir === undefined || w < akhir);
  });
};

/** Tanggal panjang untuk ditampilkan: "Senin, 9 November 2026". | param: kunci YYYY-MM-DD | return: string */
const tglId = (k) => new Date(k + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Batas atas datepicker: hari ini (tidak perlu memilih tanggal masa depan). | param: - | return: string YYYY-MM-DD */
const hariIniKunci = () => tglKunci(Date.now());

/** Combobox produk: satu kotak cari yang sekaligus jadi pemilih produk (menggantikan kotak cari + select terpisah).
 *  Daftar pilihan muncul di bawah kotak; cocok bila nama atau barcode memuat kata kunci.
 *  Produk yang benar-benar terpilih disimpan di atribut data-pilih pada kotak.
 *  param: idAwalan ('mp'), nilai terpilih | return: string HTML */
const kotakProduk = (idAwalan, terpilih) => {
  const p = terpilih ? prod(terpilih) : null;
  return `<div class="pk" id="${idAwalan}-k" data-pilih="${p ? p.id : ''}">
    <input type="search" id="${idAwalan}cari" role="combobox" aria-expanded="false" aria-controls="${idAwalan}-l" aria-autocomplete="list"
      placeholder="Cari nama atau barcode…" autocomplete="off" value="${p ? esc(p.nama) : ''}">
    <button type="button" class="btn pk-b" id="${idAwalan}btn" data-scan="#${idAwalan}cari" aria-label="Scan barcode">${ico('scan')}Scan</button>
    <div class="pk-l" id="${idAwalan}-l" role="listbox" hidden></div>
    <input type="hidden" id="${idAwalan}id" value="${p ? p.id : ''}">
  </div>`;
};

/** Pasang perilaku combobox produk: ketik untuk menyaring, klik/Enter untuk memilih, Esc untuk menutup.
 *  Produk aktif disimpan di kotak (data-pilih), bukan di teks, jadi mengetik tidak menghapus pilihan
 *  sampai produk lain dipilih. param: idAwalan, saatPilih (fn(produk)) | return: - */
const pasangProduk = (idAwalan, saatPilih) => {
  setTimeout(() => {
    const kotak = document.querySelector('#' + idAwalan + '-k'),
      cari = document.querySelector('#' + idAwalan + 'cari'),
      daftar = document.querySelector('#' + idAwalan + '-l'),
      simpan = document.querySelector('#' + idAwalan + 'id');
    if (!kotak || !cari || !daftar || !simpan) return;
    const aktif = () => prod(kotak.dataset.pilih);
    let sorot = -1,
      hasil = [];
    const tutup = () => {
      daftar.hidden = true;
      cari.setAttribute('aria-expanded', 'false');
      sorot = -1;
    };
    // pulihkan teks kotak ke nama produk aktif (atau kosong bila belum ada)
    const pulih = () => {
      const p = aktif();
      cari.value = p ? p.nama : '';
      tutup();
    };
    const gambar = () => {
      const q = cari.value.trim().toLowerCase();
      hasil = (q ? db.produk.filter((x) => `${x.nama} ${x.barcode || ''}`.toLowerCase().includes(q)) : db.produk).slice(0, 50);
      daftar.innerHTML = hasil.length
        ? hasil
            .map(
              (x, i) =>
                `<div class="pk-o${x.id == kotak.dataset.pilih ? ' on' : ''}${i === sorot ? ' sorot' : ''}" role="option" data-id="${x.id}"><span class="pk-n">${esc(x.nama)}</span><span class="pk-s">stok ${x.stok}${x.barcode ? ' · ' + esc(x.barcode) : ''}</span></div>`
            )
            .join('')
        : `<div class="pk-o pk-kosong" aria-disabled="true">Produk tidak ditemukan</div>`;
      daftar.hidden = false;
      cari.setAttribute('aria-expanded', 'true');
      daftar.querySelector('.pk-o.sorot')?.scrollIntoView({ block: 'nearest' });
    };
    // pilih produk: isi kotak dengan nama, simpan id, lalu beri tahu pemanggil
    const pilih = (id) => {
      const p = prod(id);
      if (!p) return;
      kotak.dataset.pilih = p.id;
      simpan.value = p.id;
      cari.value = p.nama;
      tutup();
      saatPilih(p);
    };
    cari.oninput = () => {
      sorot = 0;
      gambar();
    };
    cari.onfocus = () => gambar();
    cari.onkeydown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (daftar.hidden) return gambar();
        e.preventDefault();
        sorot = e.key === 'ArrowDown' ? Math.min(sorot + 1, hasil.length - 1) : Math.max(sorot - 1, 0);
        gambar();
      } else if (e.key === 'Enter') {
        // Enter saat daftar terbuka: pilih yang disorot, jangan kirim form
        if (!daftar.hidden && hasil.length) {
          e.preventDefault();
          pilih(hasil[Math.max(0, sorot)].id);
        }
      } else if (e.key === 'Escape') {
        pulih();
      }
    };
    daftar.onmousedown = (e) => {
      const o = e.target.closest('.pk-o');
      if (!o || !o.dataset.id) return;
      e.preventDefault(); // jangan sampai kotak kehilangan fokus sebelum dipilih
      pilih(o.dataset.id);
    };
    // klik di luar: tutup daftar, buang kata kunci yang tak terpakai, kenalkan lagi produk aktif
    document.addEventListener('mousedown', (e) => {
      if (kotak.contains(e.target) || daftar.hidden) return;
      pulih();
    });
    if (!aktif() && simpan.value) pulih();
  }, 0);
};

/** Simpan sesudah mutasi stok: halaman dibangun ulang penuh (data diambil lagi dari Supabase),
 *  jadi kotak produk diisi ulang dengan produk yang baru diubah, bukan mengandalkan keadaan lama.
 *  param: id produk, pesan | return: - */
function simpanLaluTampilkan(idProduk, pesan) {
  S.mpid = String(idProduk || '');
  simpan(pesan);
}

/** Periode yang dipilih sepenuhnya berada di masa depan? Dipakai untuk memilih kata pada keadaan kosong.
 *  Dianggap masa depan bila tanggal mulainya sesudah hari ini (rentang terbalik sudah ditukar oleh rentangTanggal).
 *  param: dari, sampai (YYYY-MM-DD, boleh kosong) | return: bool */
const periodeMasaDepan = (dari, sampai) => {
  const a = dari || sampai,
    b = sampai || dari;
  if (!a || !b) return false;
  const { awal } = rentangTanggal(a, b);
  const mulaiHariIni = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  return awal >= mulaiHariIni + 864e5; // >= 00:00 besok
};

/** Teks keadaan kosong yang membedakan masa lalu & masa depan.
 *  "Tidak ada transaksi" untuk periode yang sudah lewat, "Belum ada transaksi" untuk periode mendatang.
 *  param: depan (bool dari periodeMasaDepan), sub (keterangan tambahan) | return: string HTML */
const kosongTrx = (depan, sub) =>
  depan
    ? empty('Belum ada transaksi', sub || 'Periode ini belum berjalan, transaksi akan muncul setelah harinya tiba.')
    : empty('Tidak ada transaksi', sub || 'Tidak ada penjualan pada periode ini. Coba pilih tanggal lain.');

/** HTML datepicker "dari - sampai" + tombol Terapkan/Reset. Ikon & teks disesuaikan nama kontrol.
 *  param: idAwalan ('rd'/'td'), dari, sampai, aktif (bool) | return: string HTML */
const kotakTanggal = (idAwalan, dari, sampai, aktif) => `<span class="rgx${aktif ? ' on' : ''}" data-rgx>
  <input type="date" id="${idAwalan}1" value="${esc(dari || '')}" max="${hariIniKunci()}" aria-label="Tanggal mulai">
  <span class="rgx-s">s/d</span>
  <input type="date" id="${idAwalan}2" value="${esc(sampai || '')}" max="${hariIniKunci()}" aria-label="Tanggal akhir">
  <button class="btn sm" data-act="${idAwalan}go">Terapkan</button>
  ${aktif ? `<button class="btn sm gh" data-act="${idAwalan}rst">Reset</button>` : ''}
</span>`;

/** Pasang kejadian pada datepicker: tombol Terapkan/Reset dan Enter pada input.
 *  param: idAwalan, simpan (fn(dari, sampai) untuk menetapkan), batal (fn() untuk reset), render () | return: - */
const pasangTanggal = (idAwalan, simpan, batal, render) => {
  // Semua query dilakukan DI DALAM setTimeout: pada saat fungsi ini dipanggil,
  // HTML baru belum terpasang, jadi referensi yang diambil lebih awal akan basi.
  setTimeout(() => {
    const i1 = document.querySelector('#' + idAwalan + '1'),
      i2 = document.querySelector('#' + idAwalan + '2');
    const terapkan = () => {
      const a = i1?.value || '',
        b = i2?.value || '';
      if (!a && !b) return toast('Pilih tanggal dulu');
      simpan(a, b);
      render();
    };
    const go = document.querySelector('[data-act="' + idAwalan + 'go"]'),
      rst = document.querySelector('[data-act="' + idAwalan + 'rst"]');
    if (go) go.onclick = terapkan;
    if (rst) rst.onclick = () => { batal(); render(); };
    [i1, i2].forEach((el) => {
      if (!el) return;
      el.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); terapkan(); } };
      // isi otomatis tanggal kedua bila masih kosong, supaya sekali pilih sudah langsung bisa Terapkan
      el.onchange = () => {
        if (i1?.value && i2 && !i2.value) i2.value = i1.value;
        if (i2?.value && i1 && !i1.value) i1.value = i2.value;
      };
    });
  }, 0);
};

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

/** Lencana status transaksi. Gagal = merah (tidak dihitung), berhasil = hijau.
 *  Diekspor agar dialog detail di app.js memakai tampilan yang sama.
 *  param: t (transaksi) | return: string HTML */
export const stBadge = (t) =>
  sah(t) ? `<span class="b g" title="Transaksi sah dan dihitung sebagai penjualan">Berhasil</span>` : `<span class="b r" title="Transaksi gagal/batal: masih tampil di riwayat, tetapi tidak dihitung sebagai penjualan">Gagal</span>`;

/** Apakah transaksi dihitung sebagai penjualan (status bukan 'gagal'). Diekspor untuk app.js. */
export { sah };

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

/** Agregasi penjualan per hari. Hanya transaksi sah (status bukan 'gagal') yang dihitung.
 *  param: - | return: objek { 'YYYY-MM-DD': {sales, profit, count} } */
const agg = () => {
  const m = {},
    tk = new Map();
  db.transaksi.forEach((t) => {
    if (!sah(t)) return;
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
  if (!prev && !cur) return `${tip('Belum ada data untuk dibandingkan. Persentase perubahan akan muncul setelah ada penjualan.')}<small>${label}</small>`;
  const info = tip(`Persentase perubahan ${label}. Hijau berarti naik, merah berarti turun. Tulisan Baru berarti belum ada data pembanding.`);
  if (!prev) return `<span class="tr up">${ico('up')}Baru</span>${info}<small>${label}</small>`;
  const pc = Math.round(((cur - prev) / prev) * 100),
    up = pc >= 0;
  return `<span class="tr ${up ? 'up' : 'dn'}">${ico(up ? 'up' : 'down')}${up ? '+' : ''}${pc}%</span>${info}<small>${label}</small>`;
};

/** Kartu KPI dengan ikon, nilai, tren, dan sparkline. | param: { c, ic, l, v, f, sp, lnk } | return: string HTML
 *  lnk: hash tujuan halaman selengkapnya (mis. '#laporan'); bila diisi, kartu menampilkan
 *  tautan "Selengkapnya" dan seluruh kartu bisa diklik. Klik pada tautan di dalam kartu
 *  (tip '?', "Lihat semua") dibiarkan berjalan sendiri lewat penanganan di app.js. */
const kpi = ({ c, ic, l, h, v, f, sp = '', lnk = '' }) =>
  `<div class="kpi ${c}${lnk ? ' has-lnk' : ''}"${lnk ? ` data-kpi-link="${lnk}"` : ''}><div class="kpi-ic">${ico(ic)}</div><div class="kpi-b"><span class="kpi-l">${l}${h ? tip(h) : ''}</span><h3>${v}</h3><div class="kpi-f">${f}</div>${lnk ? `<a class="kpi-more" href="${lnk}">Selengkapnya<span aria-hidden="true">→</span></a>` : ''}</div>${sp}</div>`;

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
  // transaksi dengan total belanja terbesar HARI INI (per hari, bukan per pembeli);
  // transaksi gagal tidak ikut dihitung
  const hariIni = lastDays(m, 1)[0].k,
    trxHariIni = db.transaksi.filter((t) => sah(t) && dk(t.waktu) === hariIni),
    belanjaMax = trxHariIni.reduce((a, t) => (t.total > a ? t.total : a), 0);

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
    kpi({ c: 'k1', ic: 'cash', l: 'Pendapatan hari ini', h: 'Total uang dari semua penjualan hari ini.', v: rp(td.sales), f: trend(td.sales, yd.sales, 'dibanding kemarin'), sp: spark(w7.map((x) => x.sales)), lnk: '#laporan?lp=hari' }),
    kpi({ c: 'k2', ic: 'cart', l: 'Penjualan hari ini', h: 'Jumlah penjualan (struk) yang tercatat hari ini.', v: td.count, f: trend(td.count, yd.count, 'dibanding kemarin'), sp: spark(w7.map((x) => x.count)), lnk: '#transaksi?tp=hari' }),
    kpi({ c: 'k3', ic: 'trend', l: 'Laba kotor hari ini', h: 'Penjualan dikurangi harga beli barang yang terjual. Belum dikurangi biaya operasional toko seperti listrik.', v: rp(td.profit), f: trend(td.profit, yd.profit, 'dibanding kemarin'), sp: spark(w7.map((x) => x.profit)), lnk: '#laporan?lp=hari' }),
    kpi({ c: 'k4', ic: 'wallet', l: 'Total belanja terbesar harian', h: 'Nilai satu transaksi paling besar pada hari ini. Dihitung per hari, bukan per pembeli.', v: rp(belanjaMax), f: `<small>${trxHariIni.length ? `Dari ${trxHariIni.length} transaksi hari ini` : 'Tidak ada transaksi hari ini'}</small>`, lnk: '#transaksi?tp=hari&tu=total' })
  ].join('');
  const kpis2 = [
    kpi({ c: 'k1', ic: 'list', l: 'Omzet 7 hari', h: 'Total penjualan 7 hari terakhir. Persen menunjukkan perbandingan dengan 7 hari sebelumnya.', v: rp(sum(w7, 'sales')), f: trend(sum(w7, 'sales'), sum(w7p, 'sales'), 'dibanding 7 hari lalu'), lnk: '#laporan?lp=7hari' }),
    kpi({ c: 'k2', ic: 'layers', l: 'Nilai stok (modal)', h: 'Harga beli dikali stok semua barang yang masih ada. Artinya uang modal yang tertanam di barang.', v: rp(stokBeli), f: trend(stokBeli, stokBeli7, 'dibanding 7 hari lalu') + `<small class="blk"><span>Potensi jual${tip('Perkiraan uang yang didapat bila semua stok yang ada terjual habis dengan harga jual sekarang.')}</span><b>${rp(stokJual)}</b></small>`, lnk: '#stok' }),
    kpi({ c: 'k3', ic: 'box', l: 'Jumlah produk', h: 'Banyaknya jenis barang yang terdaftar.', v: db.produk.length, f: `<small>${db.kategori.length} kategori</small>`, lnk: '#produk' }),
    kpi({ c: 'k5', ic: 'alert', l: 'Stok menipis', h: 'Barang yang stoknya sudah sama dengan atau di bawah batas minimum. Segera isi ulang.', v: L.length, f: `<small>${L.length ? 'Perlu segera diisi ulang' : 'Semua stok aman'}</small>`, lnk: '#stok-menipis' })
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
      ['Margin laba', rSales ? (rProfit / rSales * 100).toFixed(1).replace('.', ',') + '%' : '-'],
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
  const hrs = db.transaksi.filter(sah).map((t) => new Date(t.waktu).getHours());
  const h0 = Math.min(8, ...hrs),
    h1 = Math.max(18, ...hrs);
  const hours = [...Array(h1 - h0 + 1)].map((_, i) => h0 + i);
  const hc = hours.map((h) => hrs.filter((x) => x === h).length);
  const hchart = barChart({
    labels: hours.map((h) => String(h).padStart(2, '0')),
    series: [{ name: 'Transaksi', cls: 's3', values: hc }],
    fmt: (v) => v + ' transaksi',
    yfmt: (v) => String(Math.round(v)),
    int: true,
    w: 300,
    h: 230,
    left: 24
  });

  /* --- Transaksi terbaru (semua status, termasuk gagal, agar terlihat di beranda) --- */
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
    tglSet = new Set(),
    trxSah = db.transaksi.filter(sah);
  trxSah.forEach((t) => {
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
      ['Rata-rata / hari', tglSet.size ? (trxSah.length / tglSet.size).toFixed(1).replace('.', ',') + '<i>transaksi</i>' : '-']
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
    <div class="card"><div class="ch"><h4>Penjualan &amp; Laba</h4><div class="chips" role="group" aria-label="Rentang waktu">${[7, 14, 30].map((r) => `<button type="button" data-r="${r}" class="${r === range ? 'on' : ''}">${r}H</button>`).join('')}</div><a href="#laporan" class="btn sm">Selengkapnya</a></div>
      <div class="cb"><div class="lgd"><span><i class="dot s1"></i>Penjualan <b>${rp(rSales)}</b></span><span><i class="dot s2"></i>Laba kotor <b>${rp(rProfit)}</b></span></div><div class="chart-wrap">${chart}</div><div class="mini">${ringkasJual.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div></div></div>
    <div class="card"><div class="ch"><h4>Penjualan per Kategori</h4><a href="#laporan" class="btn sm">Selengkapnya</a></div><div class="cb">${
      totKat
        ? `<div class="dn-wrap">${dn.svg}</div><ul class="lgl">${dn.legend}</ul>`
        : empty('Belum ada data', 'Grafik muncul setelah ada penjualan.')
    }</div></div>
  </div>

  <div class="dgrid3">
    <div class="card"><div class="ch"><h4>Produk Terlaris</h4><a href="#laporan" class="btn sm">Selengkapnya</a></div><div class="cb">${
      best
        .map(
          (x, i) =>
            `<div class="tp"><span class="rk">${i + 1}</span><div class="tp-b"><div class="tp-h"><b>${esc(prod(x.id)?.nama || x.nama)}</b><span>${x.q} terjual</span></div><div class="bar"><i style="width:${Math.round((x.q / bmax) * 100)}%"></i></div><small>${rp(x.v)}</small></div></div>`
        )
        .join('') || empty('Belum ada penjualan', 'Produk terlaris tampil setelah ada transaksi.')
    }</div></div>
    <div class="card"><div class="ch"><h4>Stok Menipis</h4><a href="#stok-menipis" class="btn sm">Selengkapnya</a></div><div class="cb">${
      (L.length ? '' : '<p class="note ok">Semua stok aman. Produk dengan stok paling sedikit:</p>') +
      sedikit
        .slice(0, 5)
        .map((p) => {
          const pc = Math.max(4, Math.min(100, Math.round((p.stok / Math.max(p.stok_minimum, 1)) * 100)));
          return `<div class="ls"><div class="ls-h"><b>${esc(p.nama)}</b><span class="b ${p.stok <= 0 ? 'r' : L.length ? 'o' : 'g'}">${p.stok <= 0 ? 'Habis' : p.stok + ' tersisa'}</span></div><div class="bar ${p.stok <= 0 ? 'bad' : L.length ? 'warn' : ''}"><i style="width:${Math.min(100, pc)}%"></i></div><small>Minimum ${p.stok_minimum}${L.length ? '' : ' · ' + packTxt(p)}</small></div>`;
        })
        .join('') || empty('Belum ada produk', 'Tambahkan produk lebih dulu.')
    }</div></div>
    <div class="card"><div class="ch"><h4>Jam Tersibuk</h4><a href="#laporan" class="btn sm">Selengkapnya</a></div><div class="cb"><div class="chart-wrap sm">${hchart}</div><p class="note">Jumlah transaksi per jam (semua data).</p><div class="mini">${ringkasJam.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>${top3Jam.map(([h, c]) => `<div class="tp" style="margin-top:12px"><span class="rk">${String(h).padStart(2, '0')}</span><div class="tp-b"><div class="tp-h"><b>Pukul ${String(h).padStart(2, '0')}.00</b><span>${c} transaksi</span></div><div class="bar"><i style="width:${Math.round((c / maxJam) * 100)}%"></i></div></div></div>`).join('')}</div></div>
  </div>

  <div class="card"><div class="ch"><h4>Transaksi Terbaru</h4><a href="#transaksi" class="btn sm">Selengkapnya</a></div><div class="tw"><table data-size="99"><tr><th>No</th><th>Kode</th><th>Waktu</th><th class="r">Barang</th><th class="r">Total</th><th>Status</th></tr>${
    rec.slice(0, 5).map((t, i) => `<tr><td>${i + 1}</td><td><b>${esc(t.kode)}</b></td><td>${dt(t.waktu)}</td><td class="r">${items.get(t.id) || 0}</td><td class="r">${rp(t.total)}</td><td>${stBadge(t)}</td></tr>`).join('') ||
    `<tr><td colspan="6">${empty('Tidak ada transaksi', 'Riwayat transaksi akan muncul di sini.')}</td></tr>`
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
  return `<div class="card"><div class="ch"><h4>Daftar Produk (${fk ? list.length + ' dari ' + db.produk.length : db.produk.length}) <small id="fcount" class="note"></small></h4><div class="flt"><div class="scn"><input id="fcari" type="search" placeholder="Cari nama / barcode…" aria-label="Cari produk" autocomplete="off"><button type="button" class="btn scn-b" data-scan="#fcari" aria-label="Scan barcode">${ico('scan')}Scan</button></div><select id="fkat" aria-label="Filter kategori"><option value="">Semua kategori</option>${db.kategori.map((k) => `<option value="${k.id}"${String(k.id) === fk ? ' selected' : ''}>${esc(k.nama)}</option>`).join('')}</select><button class="btn bp" data-act="addp">Tambah produk</button><button class="btn" data-act="addk">Tambah kategori</button></div></div>
  <div class="tw"><table data-size="5"><tr><th>No</th><th class="l">Produk</th><th class="l">Kategori</th><th class="l">Barcode</th><th class="r">Harga Jual</th><th class="r">Harga Beli</th><th class="r">Stok</th><th class="r">Stok Min</th><th class="r">Aksi</th></tr>
  ${
    list
      .map((p, i) => {
        const k = kat(p.kategori_id);
        return `<tr><td>${i + 1}</td><td class="l"><b>${esc(p.nama)}</b></td><td class="l">${esc(k?.nama || '-')}</td><td class="l"><code>${esc(p.barcode || '-')}</code></td><td class="r">${rp(p.harga)}</td><td class="r">${rp(p.harga_beli)}</td><td class="r"><span class="b ${p.stok <= p.stok_minimum ? 'r' : 'g'}">${p.stok}</span>${(p.isi_pack || 1) > 1 ? `<small class="pk">${packTxt(p)}</small>` : ''}</td><td class="r">${p.stok_minimum}</td><td class="r"><button class="btn sm" data-act="editp" data-id="${p.id}">Ubah</button></td></tr>`;
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
    out.push(
      sah(t)
        ? { w: t.waktu, ic: 'cart', c: 'g', to: '#transaksi', a: 'Penjualan ' + t.kode, b: 'senilai ' + rp(t.total) + ' tercatat.' }
        : { w: t.waktu, ic: 'alert', c: 'r', to: '#transaksi', a: 'Transaksi gagal ' + t.kode, b: 'senilai ' + rp(t.total) + ' dibatalkan, tidak dihitung sebagai penjualan.' }
    )
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
      a: 'Tutup buku ' + new Date(x.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
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
/** Sakelar notifikasi aktif/nonaktif (hanya di halaman Pengaturan). | param: id | return: string HTML */
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

/** Halaman Semua Notifikasi (sakelar aktif/nonaktif hanya ada di Pengaturan). | param: - | return: string HTML */
export function notifikasi() {
  if (!nstate().on) {
    return `<div class="card"><div class="ch"><h4>Notifikasi</h4></div>${empty('Notifikasi dimatikan', 'Aktifkan sakelar Notifikasi di halaman Pengaturan untuk melihat aktivitas toko dan lencana pada lonceng.')}</div>`;
  }
  const st = nstate(),
    ev = nevents(),
    lowN = low().length;
  // filter: semua / belum dibaca / penjualan / stok / tutup buku
  const fk = ['semua', 'baru', 'jual', 'stok', 'tutup'].includes(S.nf) ? S.nf : 'semua';
  const jenis = (e) => (e.to === '#transaksi' ? 'jual' : e.to === '#tutup-buku' ? 'tutup' : 'stok');
  const baru = (e) => e.ts > st.read && !st.seen.includes(e.id);
  const list = ev.filter((e) => (fk === 'semua' ? true : fk === 'baru' ? baru(e) : jenis(e) === fk));
  setTimeout(() => {
    const f = $('#nf');
    if (f)
      f.onchange = () => {
        S.nf = f.value;
        shellRef();
      };
    const c = $('#ncari');
    if (c)
      c.oninput = () => {
        const q = c.value.trim().toLowerCase();
        let n = 0;
        document.querySelectorAll('#nlist .nt').forEach((a) => {
          const ok = !q || a.textContent.toLowerCase().includes(q);
          a.hidden = !ok;
          if (ok) n++;
        });
        $('#ncount').textContent = q ? n + ' cocok' : '';
      };
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
  const opsi = [
    ['semua', `Semua (${ev.length})`],
    ['baru', `Belum dibaca (${ev.filter(baru).length})`],
    ['jual', 'Penjualan'],
    ['stok', 'Stok'],
    ['tutup', 'Tutup buku']
  ];
  return `<div class="card"><div class="ch"><h4>Semua Notifikasi (${list.length}) <small id="ncount" class="note"></small></h4><div class="nact"><div class="flt"><input id="ncari" type="search" placeholder="Cari notifikasi…" aria-label="Cari notifikasi" autocomplete="off"><select id="nf" aria-label="Filter jenis notifikasi">${opsi
    .map(([k, v]) => `<option value="${k}"${k === fk ? ' selected' : ''}>${esc(v)}</option>`)
    .join('')}</select></div><button class="btn" id="nread" ${
    ev.some((e) => baru(e)) ? '' : 'disabled'
  }>Tandai semua dibaca</button><button class="btn bd" id="nclear" ${ev.length ? '' : 'disabled'}>Hapus semua</button></div></div>
  ${lowN ? `<a class="nt nt-warn" href="#stok-menipis"><span class="nic r">${ico('alert')}</span><span class="ntx"><b>${lowN} produk stok menipis</b> perlu diisi ulang.</span><span class="ntm">Lihat</span></a>` : ''}
  ${
    list.length
      ? `<div class="nlist" id="nlist" data-size="10">${list
          .map(
            (e, i) =>
              `<a class="nt${baru(e) ? ' nw' : ''}" data-nid="${esc(e.id)}" data-i="${i + 1}" href="${e.to}"><span class="nno">${
                i + 1
              }</span><span class="nic ${e.c}">${ico(e.ic)}</span><span class="ntx"><b>${esc(e.a)}</b> ${esc(
                e.b
              )}</span><span class="ntm">${ago(e.w)}</span></a>`
          )
          .join('')}</div>`
      : empty(
          fk === 'semua' ? 'Belum ada notifikasi' : 'Tidak ada notifikasi untuk filter ini',
          fk === 'semua' ? 'Aktivitas toko akan muncul di sini.' : 'Coba pilih filter lain atau kata kunci yang berbeda.'
        )
  }</div>`;
}

/** Halaman Panduan: cara memakai, arti istilah, dan tanya jawab singkat. | param: - | return: string HTML */
export function panduan() {
  const langkah = [
    ['grid', 'Lihat Beranda', 'Ringkasan toko hari ini: penjualan, laba, stok yang hampir habis, dan barang terlaris. Buka tiap hari untuk melihat kondisi toko.', '#dashboard'],
    ['box', 'Isi data Produk', 'Daftarkan barang di Produk & Kategori: nama, harga jual, harga beli, stok, dan isi per pack bila dijual per dus/pack.', '#produk'],
    ['layers', 'Catat Stok', 'Di Manajemen Stok catat barang masuk, barang keluar, atau penyesuaian bila jumlah di rak berbeda dari catatan.', '#stok'],
    ['alert', 'Pantau Stok Menipis', 'Barang yang hampir habis dikumpulkan di satu halaman supaya tahu apa yang harus dibeli lagi.', '#stok-menipis'],
    ['recv', 'Lihat Riwayat Transaksi', 'Daftar semua penjualan beserta kode, waktu, dan total. Tekan tombol Detail untuk melihat barang yang dibeli. Status Terkunci berarti periodenya sudah ditutup buku.', '#transaksi'],
    ['chart', 'Baca Laporan', 'Pilih periode di bagian atas (hari ini, 7 hari, 30 hari, bulan ini, bulan kemarin, tahun ini, atau semua data). Untuk bulan tertentu, buka daftar "Pilih bulan" lalu pilih bulannya, misalnya Okt 2026. Angka dan tabel di bawahnya ikut berubah: omzet dan laba kotor, hari dan tanggal tersibuk, produk terlaris, dan belanja terbesar.', '#laporan'],
    ['book', 'Tutup Buku', 'Halaman ini hanya menampilkan hasil tutup buku: jumlah periode yang sudah ditutup, periode yang ada selisih, total uang kurang, dan riwayat per periode (penjualan sistem, uang di laci, selisih). Proses tutup buku dilakukan di aplikasi Desktop. Kotak Selisih menunjukkan pemasukan dikurangi pengeluaran.', '#tutup-buku'],
    ['bell', 'Cek Notifikasi', 'Semua aktivitas toko (penjualan, stok, tutup buku) ada di lonceng di kanan atas. Gunakan filter (Semua, Belum dibaca, Penjualan, Stok, Tutup buku) atau kotak Cari untuk memilih notifikasi. Klik satu notifikasi untuk membukanya; statusnya langsung jadi dibaca dan angka di lonceng berkurang. Sakelar aktif/nonaktif ada di Pengaturan.', '#notifikasi']
  ];
  const istilah = [
    ['Omzet', 'Total uang dari penjualan, sebelum dikurangi apa pun.'],
    ['Laba kotor', 'Omzet dikurangi harga beli barang yang terjual. Belum dikurangi biaya operasional toko (listrik, sewa).'],
    ['Margin laba', 'Laba dibanding omzet, dalam persen. Makin besar makin untung per rupiah penjualan.'],
    ['Nilai stok (modal)', 'Harga beli dikali stok semua barang yang masih ada. Uang modal yang sedang tertanam di barang.'],
    ['Potensi jual', 'Perkiraan uang bila semua stok yang ada terjual dengan harga jual sekarang.'],
    ['Stok minimum', 'Batas aman stok. Bila stok sama atau di bawahnya, barang masuk daftar Stok Menipis.'],
    ['Pack', 'Satu kemasan besar berisi beberapa pcs (misal 1 dus = 24 botol). Stok tampil "3 pack + 6 pcs".'],
    ['Mutasi stok', 'Setiap perubahan jumlah stok: terjual, barang masuk, barang keluar, atau penyesuaian.'],
    ['Penyesuaian', 'Mengoreksi stok agar sama dengan hitungan nyata di rak (misal hasil stok opname). Wajib diberi alasan.'],
    ['Pendapatan', 'Total uang yang masuk dari penjualan pada periode itu (sama dengan omzet).'],
    ['Pengeluaran (modal)', 'Harga beli barang yang sudah terjual pada periode itu. Bukan biaya listrik atau sewa.'],
    ['Penjualan hari ini', 'Jumlah transaksi (struk) hari ini, bukan jumlah rupiah. Rupiahnya ada di Pendapatan hari ini.'],
    ['Total belanja terbesar', 'Nilai satu transaksi terbesar pada hari itu.'],
    ['Tutup buku', 'Penutupan akhir periode yang dilakukan di aplikasi Desktop: uang di laci dibandingkan dengan total penjualan sistem, lalu transaksi periode itu dikunci. Web hanya menampilkan hasilnya.'],
    ['Transaksi terkunci', 'Transaksi dari periode yang sudah ditutup. Tidak bisa diubah lagi supaya pembukuan tetap konsisten.'],
    ['Uang fisik', 'Uang nyata yang dihitung di laci kasir. Diisi saat tutup buku di Desktop dan ditampilkan di web sebagai Uang di laci.'],
    ['Selisih (kotak di Tutup Buku)', 'Pemasukan dikurangi pengeluaran dari seluruh periode yang sudah ditutup. Biru bertuliskan "Untung" bila positif, merah "Rugi" bila negatif, "Impas" bila nol.'],
    ['Selisih uang laci', 'Uang fisik dikurangi catatan sistem. "Kurang" berarti uang di laci lebih sedikit, "Lebih" berarti lebih banyak, "Sesuai" berarti cocok.'],
    ['Untung / Rugi / Impas', 'Untung: pemasukan lebih besar dari pengeluaran. Rugi: lebih kecil. Impas: sama persis.']
  ];
  const tanya = [
    ['Jumlah stok di sistem berbeda dengan di rak. Bagaimana memperbaikinya?', 'Buka Manajemen Stok, pilih jenis Penyesuaian, isi stok sebenarnya di rak, dan tulis alasannya.'],
    ['Bagaimana menambah stok setelah belanja barang?', 'Di Manajemen Stok pilih jenis Barang masuk, isi jumlah dan harga beli. Stok bertambah otomatis.'],
    ['Kenapa angka laba terlihat lebih besar dari untung sebenarnya?', 'Laba kotor belum dikurangi biaya operasional toko seperti listrik dan sewa.'],
    ['Bagaimana mencari satu produk dengan cepat?', 'Di Produk & Kategori ketik nama atau barcode di kotak Cari, atau pilih kategori dari filter.'],
    ['Kenapa penjualan ditolak?', 'Biasanya karena periode hari itu sudah ditutup buku, atau stok barang tidak cukup. Periode yang sudah ditutup tidak bisa diisi penjualan baru.'],
    ['Bagaimana cara tutup buku?', 'Tutup buku dilakukan di aplikasi Desktop: isi uang di laci, sistem membandingkannya dengan total penjualan, lalu menyimpan hasilnya. Di web, buka menu Tutup Buku untuk melihat hasilnya.'],
    ['Uang di laci kurang dari catatan sistem, apa yang terjadi?', 'Saat tutup buku di Desktop, sistem mencatat selisihnya. Di web, selisih tampil sebagai "Kurang" di Riwayat tutup buku dan dijumlahkan di kotak Total uang kurang, sehingga pemilik toko bisa menelusurinya.'],
    ['Kenapa transaksi tidak bisa diubah?', 'Transaksi dari periode yang sudah ditutup dikunci. Ini disengaja agar angka pembukuan tidak berubah setelah dilaporkan.'],
    ['Bagaimana melihat laporan untuk bulan ini saja?', 'Di Laporan pilih periode "Bulan ini" pada menu di bagian atas. Semua angka dan tabel menyesuaikan.'],
    ['Tabel terlalu panjang, bagaimana melihat sisanya?', 'Gunakan tombol panah di bawah tabel, atau ketik nomor halaman langsung.'],
    ['Bagaimana membaca satu notifikasi saja?', 'Klik notifikasinya. Statusnya langsung jadi dibaca dan angka di lonceng berkurang satu, tanpa perlu menekan Tandai semua dibaca.'],
    ['Bagaimana mematikan notifikasi?', 'Buka halaman Pengaturan dan matikan tombol Notifikasi aktif di kartu Notifikasi. Lencana angka di lonceng dan daftar aktivitas tidak ditampilkan. Bisa dinyalakan lagi kapan saja.'],
    ['Bagaimana melihat hanya barang masuk atau barang keluar di riwayat stok?', 'Di Manajemen Stok pakai filter jenis mutasi di atas tabel riwayat, lalu pilih jenis yang dicari, misalnya Barang masuk.'],
    ['Kenapa kotak Selisih dan Laba angkanya sama?', 'Laba dihitung dari pendapatan dikurangi pengeluaran (modal), sama dengan rumus Selisih. Kotak Selisih menambahkan keterangan Untung, Rugi, atau Impas.'],
    ['Notifikasi saya terlalu banyak.', 'Di halaman Notifikasi pilih filter (Belum dibaca, Penjualan, Stok, atau Tutup buku) atau ketik kata kunci di kotak Cari. Bila masih terlalu banyak, tekan Tandai semua dibaca atau Hapus semua. Data transaksi dan stok tidak ikut terhapus.'],
    ['Apakah data saya aman bila browser ditutup?', 'Data tersimpan di database Supabase, jadi tetap ada walau browser ditutup dan bisa dibuka dari perangkat lain. Aplikasi tidak menyimpan data toko di browser, jadi butuh koneksi internet untuk dibuka.'],
    ['Dari mana aplikasi mengambil data?', 'Data diambil langsung dari database Supabase. Status koneksi bisa dilihat di halaman Pengaturan pada kartu Basis Data: Terhubung berarti data terkirim ke server, sedangkan Ada masalah berarti penyimpanan terakhir gagal dan pesannya tampil di kartu itu.'],
  ];
  return `<div class="card"><div class="ch"><h4>Mulai dari mana?</h4></div><div class="cb gd">${langkah
    .map(([ic, t, d, h], i) => `<a class="gd-i" href="${h}"><span class="gd-n">${i + 1}</span><span class="nic">${ico(ic)}</span><span><b>${t}</b><small>${d}</small></span></a>`)
    .join('')}</div></div>
  <div class="card"><div class="ch"><h4>Arti istilah</h4></div><div class="cb"><dl class="gl">${istilah.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></div></div>
  <div class="card"><div class="ch"><h4>Pertanyaan umum</h4></div><div class="cb">${tanya
    .map(([q, a]) => `<details class="fq"><summary>${q}</summary><p>${a}</p></details>`)
    .join('')}</div></div>
  <div class="card"><div class="ch"><h4>Tips cepat</h4></div><div class="cb"><ul class="tips"><li>Tanda <span class="inf" style="position:static">?</span> kecil di samping judul angka berisi penjelasan singkat. Arahkan atau sentuh untuk membacanya.</li><li>Angka hijau dengan panah naik berarti lebih baik dari periode sebelumnya, merah berarti turun.</li><li>Di HP gunakan menu bawah. Menu lain ada di tombol <b>Lainnya</b>.</li></ul></div></div>`;
}

/** Halaman stok menipis: hanya produk dengan stok <= stok minimum. | param: - | return: string HTML */
export function stokMenipis() {
  const L = low().sort((a, b) => a.stok - b.stok);
  return `<div class="card"><div class="ch"><h4>Produk perlu diisi ulang (${L.length})</h4><div class="flt">${L.length ? btnXls('Stok Menipis') : ''}</div></div><div class="tw">${
    L.length
      ? `<table data-size="5"><tr><th>No</th><th>Produk</th><th>Kategori</th><th class="r">Stok</th><th class="r">Stok minimum</th><th>Status</th><th class="r">Aksi</th></tr>${L.map((p, i) => `<tr><td>${i + 1}</td><td><b>${esc(p.nama)}</b></td><td>${esc(kat(p.kategori_id)?.nama || '-')}</td><td class="r">${p.stok}</td><td class="r">${p.stok_minimum}</td><td><span class="b ${p.stok <= 0 ? 'r' : 'o'}">${p.stok <= 0 ? 'Habis' : 'Menipis'}</span></td><td class="r"><a class="btn sm bp" href="#barang-masuk?mpid=${p.id}">Isi ulang</a></td></tr>`).join('')}</table>`
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
      hbEl = $('#mhb'),
      hintEl = $('#mhint');
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
      if (hintEl) hintEl.textContent = p ? `Stok sekarang ${packTxt(p)} · minimum ${p.stok_minimum}` : '';
    };
    jenisEl.onchange = syncForm;
    syncForm();

    /* Produk: kotak cari dan pemilih jadi satu (combobox). Mengetik menyaring daftar;
       memilih produk mengisi id dan menyegarkan isian lain. */
    pasangProduk('mp', syncForm);
    $('#mform').onsubmit = (e) => {
      e.preventDefault();
      const p = prod(pidEl.value),
        j = jenisEl.value,
        q = +jmlEl.value,
        cat = catEl.value.trim();
      if (!p || !Number.isInteger(q)) return toast(p ? 'Isi data dengan benar' : 'Pilih produk dulu');
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
      simpanLaluTampilkan(p.id, 'Stok diperbarui');
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
  return `<div class="card"><div class="ch"><h4>Input Mutasi / Penyesuaian Stok</h4></div><div class="cb"><form id="mform"><div class="row"><div class="fg"><label for="mpcari">Produk</label>${kotakProduk('mp', S.mpid)}<small class="hint" id="mhint"></small></div><div class="fg"><label>Jenis Mutasi</label><select id="mjenis"><option value="masuk">Barang Masuk (+)</option><option value="keluar">Barang Keluar (-)</option><option value="penyesuaian">Penyesuaian (ubah stok langsung)</option></select></div></div><div class="row"><div class="fg"><label id="mjml-l" for="mjml">Jumlah</label><input id="mjml" type="number" min="1" step="1" required></div><div class="fg" id="mhb-w"><label for="mhb">Harga beli (Rp)</label><input id="mhb" type="number" min="0" step="any"></div></div><div class="fg"><label for="mcat">Catatan / alasan</label><input id="mcat" placeholder="Misal: rusak, hilang, bonus supplier"></div><button class="btn bp">Simpan</button></form></div></div>
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
   pengaturan() : profil toko, status database, notifikasi, logout
   ========================================================================== */

/** Hasil tutup buku (hanya tampilan): ringkasan dan riwayat per periode. Proses tutup buku dilakukan di aplikasi Desktop. | param: - | return: string HTML */
export function hasilTutupBuku() {
  const sel = (n) => (n === 0 ? ['g', 'Sesuai'] : n < 0 ? ['r', 'Kurang ' + rp(-n)] : ['o', 'Lebih ' + rp(n)]);
  const jn = { harian: 'Harian', bulanan: 'Bulanan', tahunan: 'Tahunan' };
  const rec = [...db.tutup].sort((a, b) => (a.waktu < b.waktu ? 1 : -1)),
    selisihHari = db.tutup.filter((x) => x.selisih !== 0).length,
    uangKurang = db.tutup.reduce((a, x) => a + (x.selisih < 0 ? -x.selisih : 0), 0),
    pendapatanAll = db.tutup.reduce((a, x) => a + (x.pendapatan ?? x.total_sistem ?? 0), 0),
    pengeluaranAll = db.tutup.reduce((a, x) => a + (x.pengeluaran ?? 0), 0),
    selisihUntung = pendapatanAll - pengeluaranAll;
  return `<div class="card"><div class="cb"><b>Apa itu tutup buku?</b><p>Tutup buku adalah proses akhir periode untuk mengunci catatan transaksi dan membandingkan total penjualan sistem dengan uang di laci. Prosesnya dilakukan di aplikasi Desktop; halaman ini hanya menampilkan hasilnya.</p></div></div>
  <div class="stats"><div class="st" style="background:#092C4C"><span>Periode sudah ditutup</span><h3>${db.tutup.length}</h3></div><div class="st" style="background:#B54708"><span>Periode ada selisih</span><h3>${selisihHari}</h3></div><div class="st" style="background:#B42318"><span>Total uang kurang</span><h3>${rp(uangKurang)}</h3></div><div class="st" style="background:${selisihUntung >= 0 ? '#175CD3' : '#B42318'}"><span>Selisih</span><h3>${rp(selisihUntung)}</h3><small>Pemasukan − pengeluaran · ${selisihUntung > 0 ? 'Untung' : selisihUntung < 0 ? 'Rugi' : 'Impas'}</small></div></div>
  <div class="card"><div class="ch"><h4>Riwayat tutup buku (${rec.length})</h4>${rec.length ? `<div class="flt">${btnXls('Tutup Buku')}</div>` : ''}</div><div class="tw">${
    rec.length
      ? `<table data-size="5"><tr><th>No</th><th>Periode</th><th class="r">Penjualan sistem</th><th class="r">Uang di laci</th><th>Selisih</th><th>Status</th></tr>${rec.map((x, i) => `<tr><td>${i + 1}</td><td><b>${esc(x.periode || tglId(x.tanggal))}</b> <span class="b g">${esc(jn[x.jenis] || 'Harian')}</span></td><td class="r">${rp(x.pendapatan ?? x.total_sistem ?? 0)}</td><td class="r">${rp(x.uang_fisik ?? x.total_sistem ?? 0)}</td><td><span class="b ${sel(x.selisih)[0]}">${sel(x.selisih)[1]}</span></td><td><span class="b ${x.selisih === 0 ? 'g' : 'o'}">${x.selisih === 0 ? 'Sesuai' : 'Ada selisih'}</span></td></tr>`).join('')}</table>`
      : empty('Belum ada hasil tutup buku', 'Hasil akan muncul di sini setelah tutup buku dilakukan di aplikasi Desktop.')
  }</div></div>`;
}

export function laporan() {
  /* --- Filter periode: menyaring SEMUA angka & tabel di halaman ini --- */
  const opsi = opsiPeriode(); // periode tetap + daftar bulan yang ada datanya
  // 'rentang' = mode datepicker (tanggal pilihan sendiri). Kunci lain = periode cepat.
  const tf = S.lp === 'rentang' ? 'rentang' : opsi.some(([k]) => k === S.lp) ? S.lp : 'semua';
  const pakaiRentang = tf === 'rentang',
    dari = S.lpDari || '',
    sampai = S.lpSampai || '';
  // Batas dipakai untuk label jumlah hari; penyaringan memakai dalamPeriode()
  const batas = pakaiRentang ? rentangTanggal(dari, sampai).awal : awalPeriode(tf);
  const labelTanggal = () => {
    const f = (s) => (s ? tglId(s.replace(/-/g, '-')) : '');
    if (dari && sampai && dari !== sampai) return f(dari) + ' s/d ' + f(sampai);
    if (dari || sampai) return f(dari || sampai);
    return 'tanggal pilihan';
  };
  const labelPeriode = pakaiRentang
    ? labelTanggal()
    : {
        semua: 'seluruh data',
        hari: 'hari ini',
        '7hari': '7 hari terakhir',
        '30hari': '30 hari terakhir',
        bulan: 'bulan ini',
        bulankmr: 'bulan kemarin',
        tahun: 'tahun ini'
      }[tf] || labelBulanKunci(tf);
  // transaksi yang lolos filter; idOk dipakai untuk menyaring detail.
  // Transaksi berstatus 'gagal' tidak dihitung: hanya yang sah yang masuk omzet, laba, dan tabel.
  const trxPeriode = dalamPeriode(db.transaksi, tf, dari, sampai),
    trx = trxPeriode.filter(sah),
    nGagal = trxPeriode.length - trx.length,
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
  const perTgl = new Map(),
    namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    perHari = namaHari.map(() => ({ c: 0, v: 0 }));
  trx.forEach((t) => {
    const k = dk(t.waktu),
      x = perTgl.get(k) || { c: 0, v: 0 };
    x.c++;
    x.v += t.total;
    perTgl.set(k, x);
    const h = perHari[new Date(t.waktu).getDay()];
    h.c++;
    h.v += t.total;
  });
  const ramai = [...perTgl.entries()].sort((a, b) => b[1].c - a[1].c || b[1].v - a[1].v).slice(0, 5),
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
        // begitu mode "Pilih tanggal" dipilih, langsung isi tanggal default (bulan ini) supaya tidak kosong
        if (S.lp === 'rentang' && !S.lpDari && !S.lpSampai) {
          S.lpDari = tglKunci(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
          S.lpSampai = hariIniKunci();
        }
        shellRef();
      };
  });
  // Datepicker: rentang tanggal pilihan sendiri
  pasangTanggal(
    'rd',
    (a, b) => {
      S.lp = 'rentang';
      S.lpDari = a;
      S.lpSampai = b;
    },
    () => {
      S.lp = 'semua';
      S.lpDari = '';
      S.lpSampai = '';
    },
    shellRef
  );
  // Dropdown: "Periode cepat" + "Pilih bulan" (hanya bulan yang ada datanya) + pintasan "Pilih tanggal".
  const opsiTetap = opsi.filter(([k]) => !String(k).startsWith('bl:')),
    opsiBulan = opsi.filter(([k]) => String(k).startsWith('bl:')),
    opsiHtml = ([k, v]) => `<option value="${k}"${k === tf ? ' selected' : ''}>${v}</option>`,
    fltBar = `<div class="flt"><select id="flp" aria-label="Filter periode laporan"><optgroup label="Periode cepat">${opsiTetap
      .map(opsiHtml)
      .join('')}</optgroup>${opsiBulan.length ? `<optgroup label="Pilih bulan">${opsiBulan.map(opsiHtml).join('')}</optgroup>` : ''}<option value="rentang"${pakaiRentang ? ' selected' : ''}>Pilih tanggal (dari–sampai)</option></select>${kotakTanggal(
      'rd',
      dari,
      sampai,
      pakaiRentang
    )}</div>`;
  const infoHari = pakaiRentang && dari && sampai ? ` (${Math.round((rentangTanggal(dari, sampai).akhir - rentangTanggal(dari, sampai).awal) / 864e5)} hari)` : '';
  return `<div class="card"><div class="ch"><h4>Ringkasan ${esc(labelPeriode)}</h4>${fltBar}</div><div class="cb"><p class="note">Angka dan tabel di halaman ini mengikuti periode yang dipilih. Periode sekarang: <b>${esc(labelPeriode)}</b>${infoHari} — ${trx.length} dari ${db.transaksi.length} transaksi.${nGagal ? ` <span class="b r">${nGagal} transaksi gagal tidak dihitung</span>` : ''}</p></div></div>
  <div class="stats"><div class="st lt" style="background:#3DB5FF"><span>Total Omzet</span><h3>${rp(totJual)}</h3></div><div class="st" style="background:#0E9384"><span>Estimasi Laba Kotor</span><h3>${rp(laba)}</h3></div><div class="st" style="background:#092C4C"><span>Total Transaksi</span><h3>${trx.length}</h3></div></div>
  <div class="card"><div class="ch"><h4>Transaksi terbanyak</h4>${ramai.length ? `<div class="flt">${btnXls('Laporan Transaksi Terbanyak')}</div>` : ''}</div><div class="tw">${
    ramai.length
      ? `<table data-size="5"><tr><th>No</th><th>Tanggal</th><th class="r">Transaksi</th><th class="r">Omzet</th></tr>${ramai.map(([k, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(tglId(k))}</b></td><td class="r">${x.c}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : kosongTrx(pakaiRentang && periodeMasaDepan(dari, sampai), 'Daftar muncul setelah ada transaksi.')
  }</div></div>
  <div class="card"><div class="ch"><h4>Transaksi terbanyak mingguan</h4>${hariTop && hariTop.c ? `<span class="b g">Tersibuk: ${hariTop.n} (${hariTop.c} transaksi)</span>` : ''}</div><div class="cb hr">${urutHari
    .map((h) => `<div class="hr-r"><span class="hr-n">${h.n}</span><span class="hr-b"><i style="width:${Math.round((h.c / maxHari) * 100)}%"></i></span><span class="hr-v">${h.c} <small>transaksi</small></span></div>`)
    .join('')}</div></div>
  <div class="card"><div class="ch"><h4>Produk terlaris</h4>${best.length ? `<div class="flt">${btnXls('Laporan Produk Terlaris')}</div>` : ''}</div><div class="tw">${
    best.length
      ? `<table data-size="5"><tr><th>No</th><th>Produk</th><th class="r">Terjual</th><th class="r">Omzet</th></tr>${best.map(([n, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(n)}</b></td><td class="r">${x.q}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : kosongTrx(pakaiRentang && periodeMasaDepan(dari, sampai), 'Produk terlaris muncul setelah ada transaksi.')
  }</div></div>
  <div class="card"><div class="ch"><h4>Belanja terbesar per pembeli</h4>${buyers.length ? `<div class="flt">${btnXls('Laporan Pembeli')}</div>` : ''}</div><div class="tw">${
    buyers.length
      ? `<table data-size="5"><tr><th>No</th><th>Pembeli</th><th class="r">Transaksi</th><th class="r">Total belanja</th></tr>${buyers.map(([nm, x], i) => `<tr><td>${i + 1}</td><td><b>${esc(nm)}</b></td><td class="r">${x.c}</td><td class="r">${rp(x.v)}</td></tr>`).join('')}</table>`
      : (() => {
          const depan = pakaiRentang && periodeMasaDepan(dari, sampai);
          return empty(depan ? 'Belum ada pembeli' : 'Tidak ada pembeli', depan ? 'Daftar muncul setelah ada transaksi.' : 'Tidak ada pembeli pada periode ini.');
        })()
  }</div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function transaksi() {
  const opsi = opsiPeriode(),
    tp = S.tp === 'rentang' ? 'rentang' : opsi.some(([k]) => k === S.tp) ? S.tp : 'semua',
    pakaiRentang = tp === 'rentang',
    dari = S.tpDari || '',
    sampai = S.tpSampai || '',
    tu = S.tu === 'total' ? 'total' : 'baru',
    // filter status: '' = semua, 'berhasil' / 'gagal'
    ts = ['berhasil', 'gagal'].includes(S.ts) ? S.ts : '',
    batas = pakaiRentang ? rentangTanggal(dari, sampai).awal : awalPeriode(tp),
    semua = [...db.transaksi].reverse(),
    recPeriode = dalamPeriode(semua, tp, dari, sampai),
    rec = (ts ? recPeriode.filter((t) => (ts === 'gagal' ? !sah(t) : sah(t))) : recPeriode).sort((a, b) => (tu === 'total' ? b.total - a.total : 0)),
    nGagal = recPeriode.filter((t) => !sah(t)).length,
    nKunci = rec.filter(terkunci).length,
    // Label periode: huruf kecil hanya untuk periode tetap ("bulan ini"),
    // sedangkan nama bulan dibiarkan apa adanya ("Okt 2026").
    label = (() => {
      if (pakaiRentang) {
        const f = (s) => (s ? tglId(s) : '');
        if (dari && sampai && dari !== sampai) return f(dari) + ' s/d ' + f(sampai);
        return f(dari || sampai) || 'tanggal pilihan';
      }
      const tetap = { semua: 'seluruh data', hari: 'hari ini', '7hari': '7 hari terakhir', '30hari': '30 hari terakhir', bulan: 'bulan ini', bulankmr: 'bulan kemarin', tahun: 'tahun ini' };
      return tetap[tp] || labelBulanKunci(tp) || 'semua data';
    })();
  const opsiTetap = opsi.filter(([k]) => !String(k).startsWith('bl:')),
    opsiBulan = opsi.filter(([k]) => String(k).startsWith('bl:')),
    opsiHtml = ([k, v]) => `<option value="${k}"${k === tp ? ' selected' : ''}>${v}</option>`;
  setTimeout(() => {
    const f = $('#ftp'),
      u = $('#ftu'),
      st = $('#fts');
    if (f)
      f.onchange = () => {
        S.tp = f.value;
        if (S.tp === 'rentang' && !S.tpDari && !S.tpSampai) {
          S.tpDari = tglKunci(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
          S.tpSampai = hariIniKunci();
        }
        shellRef();
      };
    if (u)
      u.onchange = () => {
        S.tu = u.value;
        shellRef();
      };
    if (st)
      st.onchange = () => {
        S.ts = st.value;
        shellRef();
      };
  }, 0);
  pasangTanggal(
    'td',
    (a, b) => {
      S.tp = 'rentang';
      S.tpDari = a;
      S.tpSampai = b;
    },
    () => {
      S.tp = 'semua';
      S.tpDari = '';
      S.tpSampai = '';
    },
    shellRef
  );
  return `<div class="card"><div class="ch"><h4>Riwayat Transaksi (${tp === 'semua' ? rec.length : rec.length + ' dari ' + semua.length})</h4><div class="flt"><select id="ftp" aria-label="Filter periode transaksi"><optgroup label="Periode cepat">${opsiTetap.map(opsiHtml).join('')}</optgroup>${opsiBulan.length ? `<optgroup label="Pilih bulan">${opsiBulan.map(opsiHtml).join('')}</optgroup>` : ''}<option value="rentang"${pakaiRentang ? ' selected' : ''}>Pilih tanggal (dari–sampai)</option></select>${kotakTanggal(
    'td',
    dari,
    sampai,
    pakaiRentang
  )}<select id="ftu" aria-label="Urutan transaksi"><option value="baru"${tu === 'baru' ? ' selected' : ''}>Terbaru</option><option value="total"${tu === 'total' ? ' selected' : ''}>Total terbesar</option></select><select id="fts" aria-label="Filter status transaksi"><option value=""${ts === '' ? ' selected' : ''}>Semua status</option><option value="berhasil"${ts === 'berhasil' ? ' selected' : ''}>Berhasil</option><option value="gagal"${ts === 'gagal' ? ' selected' : ''}>Gagal</option></select>${rec.length ? btnXls('Riwayat Transaksi') : ''}</div></div><div class="cb"><p class="note" style="margin:0">Menampilkan transaksi: <b>${esc(label)}</b>, urut <b>${tu === 'total' ? 'total terbesar' : 'terbaru'}</b>${ts ? `, status <b>${ts}</b>` : ''}. Transaksi <b>gagal</b> tidak dihitung sebagai penjualan.${nGagal ? ` <span class="b r">${nGagal} gagal</span>` : ''}${nKunci ? ` <span class="b r">${nKunci} terkunci tutup buku</span>` : ''}</p></div><div class="tw"><table data-size="5"><tr><th>No</th><th>Kode</th><th>Waktu</th><th class="r">Total</th><th>Status</th><th>Periode</th><th class="r">Aksi</th></tr>
  ${rec.map((t, i) => `<tr><td>${i + 1}</td><td><b>${t.kode}</b></td><td>${dt(t.waktu)}</td><td class="r">${rp(t.total)}</td><td>${stBadge(t)}</td><td>${terkunci(t) ? `<span class="b r">Terkunci</span>` : `<span class="b g">Terbuka</span>`}</td><td class="r"><button class="btn sm" data-act="det" data-id="${t.id}">Detail</button>${sah(t) ? `<button class="btn sm" data-act="stgagal" data-id="${t.id}" title="Tandai transaksi ini gagal/batal sehingga tidak dihitung sebagai penjualan">Batalkan</button>` : `<button class="btn sm" data-act="stberhasil" data-id="${t.id}" title="Kembalikan transaksi ini sebagai berhasil">Pulihkan</button>`}</td></tr>`).join('') || `<tr><td colspan="7">${pakaiRentang && periodeMasaDepan(dari, sampai) ? 'Belum ada transaksi' : 'Tidak ada transaksi'} pada periode ini.</td></tr>`}</table></div></div>`;
}

/** Render ulang target halaman ini. | param: - | return: string HTML */
export function pengaturan() {
  setTimeout(() => {
    bindSwitch('nsw2');
  }, 0);
  return `<div class="card"><div class="ch"><h4>Profil Toko</h4></div><div class="cb"><p>Pengguna Aktif: <b>${esc(me.nama)}</b> (${esc(me.email)})</p></div></div>
  <div class="card"><div class="ch"><h4>Basis Data</h4></div><div class="cb"><p style="margin:0 0 10px">Terhubung ke database Supabase. Semua perubahan langsung tersimpan ke server, jadi data sama di setiap perangkat. Aplikasi tidak menyimpan data toko di browser.</p><p class="note" style="margin:0">Status: <b>${dbGalat ? 'Ada masalah' : 'Terhubung'}</b>${dbGalat ? ` — ${esc(dbGalat)}` : ''}</p></div></div>
  <div class="card"><div class="ch"><h4>Notifikasi</h4></div><div class="cb"><p style="margin:0 0 10px">Sakelar notifikasi hanya ada di halaman ini. Bila aktif, aktivitas toko (penjualan, stok, tutup buku) tampil di halaman Notifikasi dan angka muncul pada lencana lonceng.</p>${notifSwitch('nsw2')}</div></div>`;
}

/** Menyimpan perubahan ke Supabase, memberi tahu hasilnya, lalu menampilkan ulang halaman dari isi database. | param: ok (pesan bila berhasil) | return: Promise<boolean> */
async function simpan(ok) {
  const r = await save();
  toast(r.ok ? ok : 'Gagal menyimpan ke database: ' + r.pesan);
  shellRef();
  return r.ok;
}

/* ==========================================================================
   BAGIAN 4 — FORM PRODUK & KATEGORI
   pform() : isi form (kosong untuk produk baru, terisi untuk ubah)
   saveP() : validasi barcode unik lalu simpan; produk baru juga mencatat
             stok awal lewat mut()
   kform() : form tambah/ubah kategori dengan validasi nama unik
   ========================================================================== */

export function pform(p = {}) {
  return `${p.id ? '<p class="note" style="margin:0 0 10px">Nama dan barcode produk tidak dapat diubah.</p>' : ''}<div class="fg"><label>Nama produk</label><input name="nama" required value="${esc(p.nama)}"${p.id ? ' readonly class="ro"' : ''}></div><div class="row"><div class="fg"><label>Barcode</label>${p.id ? `<input name="barcode" value="${esc(p.barcode)}" readonly class="ro">` : `<div class="scn"><input name="barcode" value="${esc(p.barcode)}" inputmode="numeric" autocomplete="off"><button type="button" class="btn scn-b" data-scan="#ov input[name=barcode]" aria-label="Scan barcode">${ico('scan')}Scan</button></div>`}</div><div class="fg"><label>Kategori</label><select name="kategori_id"><option value="">Tanpa Kategori</option>${opts(db.kategori, p.kategori_id)}</select></div></div><div class="row"><div class="fg"><label>Harga jual</label><input name="harga" type="number" min="0" required value="${p.harga ?? ''}"></div><div class="fg"><label>Harga beli</label><input name="harga_beli" type="number" min="0" required value="${p.harga_beli ?? ''}"></div></div><div class="row"><div class="fg"><label>${p.id ? 'Stok saat ini' : 'Stok awal'}</label><input name="stok" type="number" min="0" step="1" inputmode="numeric" required value="${p.id ? p.stok : 0}"></div><div class="fg"><label>Stok minimum</label><input name="stok_minimum" type="number" min="0" step="1" inputmode="numeric" required value="${p.stok_minimum ?? 5}"></div></div><div class="fg"><label>Isi per pack (pcs)</label><input name="isi_pack" type="number" min="1" step="1" inputmode="numeric" value="${p.isi_pack ?? 1}"><small>Isi 1 bila tidak dijual per pack. Stok di tabel tampil sebagai pack + pcs.</small></div>`;
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
  simpan('Produk disimpan');
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
      simpan('Kategori disimpan');
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
    `<div class="lg"><div class="lg-c"><div class="lg-brand"><img class="lg-img" src="assets/logo.png" alt="Toko Berkah"><span>Sistem manajemen toko</span></div><form class="lg-card" id="af" novalidate><h2 class="lg-t">Masuk</h2><p class="lg-s">Silakan masuk untuk melanjutkan</p><div class="lg-al" id="al" role="alert" hidden></div>
  <div class="lg-f"><label class="lg-l" for="em">${ico('mail')}Surel</label><div class="lg-w" id="w1"><span class="lg-i">${ico('mail')}</span><input id="em" name="email" type="email" autocomplete="username" placeholder="surel@contoh.com" value="berkah@gmail.com"></div></div>
  <div class="lg-f"><label class="lg-l" for="pw">${ico('lock')}Kata sandi</label><div class="lg-w" id="w2"><span class="lg-i">${ico('lock')}</span><input id="pw" name="pw" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" value="berkah123"><button type="button" class="lg-eye" id="eye" aria-label="Tampilkan kata sandi">${ico('eye')}</button></div></div>
  <button class="lg-b">Masuk</button></form><ul class="lg-chips"><li>${ico('box')}Stok</li><li>${ico('cart')}Penjualan</li><li>${ico('chart')}Laporan</li><li>${ico('book')}Tutup Buku</li></ul></div></div>`;
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
