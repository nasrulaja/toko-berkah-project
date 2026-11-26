/* ==========================================================================
   TOKO BERKAH — core/scan.js
   Fitur SCAN BARCODE di web. Kode barcode datang dari aplikasi Android.
   Karena aplikasi Android belum selesai, sekarang dipakai PENYAMBUNG SIMULASI
   (tombol contoh barcode + kolom ketik/tempel, juga cocok untuk scanner USB
   yang bekerja seperti keyboard). Antarmuka web-nya sudah final.
   --------------------------------------------------------------------------
   CARA MENYAMBUNGKAN KE ANDROID ASLI (nanti):
     1. Android mengirim hasil scan ke Supabase, misalnya tabel `scan_antrean`
        (kolom: id, kode, perangkat, waktu).
     2. Isi fungsi `penyambungAndroid()` di bawah: mulai() berlangganan/polling
        baris baru dengan waktu > saat mulai(), lalu memanggil onKode(kode);
        berhenti() menghentikannya.
     3. Ubah PAKAI_ANDROID menjadi true. Tidak ada kode lain yang perlu diubah.
   ========================================================================== */
// ?v= HARUS sama dengan yang dipakai app.js & pages.js untuk './core/db.js'.
// Bila berbeda, browser memuat core/db.js DUA KALI sebagai modul terpisah:
// setDB() mengisi salinan A, sedangkan `db` di sini tetap undefined sehingga
// bukaScan() melempar galat dan tombol Scan seolah tidak berfungsi.
import { db } from './db.js?v=20261119a';

/** Ubah ke true setelah aplikasi Android siap dan penyambungAndroid() diisi. */
export const PAKAI_ANDROID = false;

/** Penyambung ke Android (BELUM DIISI). | return: {mulai(onKode), berhenti()} */
function penyambungAndroid() {
  return {
    mulai() {
      throw new Error('Penyambung Android belum diisi');
    },
    berhenti() {}
  };
}

/* ---- KAMERA (scan langsung di web, tanpa aplikasi Android) ----
   Memakai BarcodeDetector bawaan browser bila tersedia. Bila tidak ada
   (Chrome/Edge di Windows tidak punya BarcodeDetector, juga iPhone/Firefox)
   dipakai pustaka ZXing yang disimpan lokal di js/vendor/zxing.min.js —
   tidak butuh internet/CDN, jadi tetap jalan saat jaringan lambat.
   Kamera butuh HTTPS atau localhost dan izin dari pengguna. */
const FORMAT = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'];
const ZXING = 'js/vendor/zxing.min.js?v=20261118e';

/** Muat ZXing (skrip biasa, bukan modul) sekali saja. | return: Promise<ZXing> */
let zxingSiap = null;
function muatZXing() {
  if (window.ZXing) return Promise.resolve(window.ZXing);
  if (zxingSiap) return zxingSiap;
  zxingSiap = new Promise((ok, gagal) => {
    const s = document.createElement('script');
    // URL ikut folder halaman (mis. di subfolder) agar berkas tetap ketemu.
    s.src = new URL(ZXING, document.baseURI).href;
    s.onload = () => (window.ZXing ? ok(window.ZXing) : gagal(new Error('ZXing kosong')));
    s.onerror = () => {
      zxingSiap = null; // biar bisa dicoba lagi nanti
      gagal(new Error('Gagal memuat pustaka barcode'));
    };
    document.head.append(s);
  });
  return zxingSiap;
}

/** Nyalakan kamera di elemen <video>. | param: video, onKode | return: Promise<fungsi berhenti> */
async function mulaiKamera(video, onKode) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser ini tidak mendukung kamera');
  if (!isSecureContext) throw new Error('Kamera hanya bisa dipakai lewat HTTPS');
  // Resolusi tinggi (Full HD) supaya barcode kecil/QR tetap tajam saat dibaca.
  // 'ideal' = usulan, bukan paksa: kamera yang tidak sanggup 1080p akan memberi
  // resolusi terdekat, jadi tidak gagal hanya karena perangkatnya terbatas.
  const kamera = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      // Minta kamera terus fokus otomatis; tanpa ini gambar sering blur dan
      // barcode tidak terbaca sampai pengguna menjauhkan/mendekatkan HP manual.
      focusMode: 'continuous'
    },
    audio: false
  };
  let aktif = true;
  // QR & barcode bisa terbaca berulang tiap frame. Tanpa penjaga ini onKode
  // dipanggil berkali-kali dalam sekejap (bunyi "tit" dobel, jendela ditutup
  // lalu dibuka lagi oleh pemanggil).
  let sudah = false;
  const terima = (kode) => {
    if (!aktif || sudah || !kode) return;
    sudah = true;
    onKode(kode);
  };
  if ('BarcodeDetector' in window) {
    let fmt = FORMAT;
    try {
      const ada = await BarcodeDetector.getSupportedFormats();
      fmt = FORMAT.filter((f) => ada.includes(f));
    } catch (e) {}
    const det = new BarcodeDetector({ formats: fmt.length ? fmt : undefined });
    const stream = await navigator.mediaDevices.getUserMedia(kamera);
    video.srcObject = stream;
    await video.play().catch(() => {});
    const t = setInterval(async () => {
      if (!aktif || video.readyState < 2) return;
      try {
        const h = await det.detect(video);
        if (h.length && h[0].rawValue) terima(h[0].rawValue);
      } catch (e) {}
    }, 250);
    return () => {
      aktif = false;
      clearInterval(t);
      stream.getTracks().forEach((x) => x.stop());
      video.srcObject = null;
    };
  }

  // Cadangan ZXing: kamera dinyalakan di sini, lalu frame dibaca berulang.
  const Z = await muatZXing();
  const stream = await navigator.mediaDevices.getUserMedia(kamera);
  video.srcObject = stream;
  await video.play().catch(() => {});
  // Tanpa hints, ZXing memakai mode cepat yang sering GAGAL untuk QR (terutama
  // QR kecil / sudut miring / cahaya kurang). TRY_HARDER membuatnya memeriksa
  // lebih banyak kemungkinan; POSSIBLE_FORMATS membatasi ke format yang dipakai
  // toko supaya tetap tidak terlalu lambat.
  const Hints = Z.DecodeHintType;
  const hints = new Map();
  if (Hints) {
    hints.set(Hints.TRY_HARDER, true);
    if (Z.BarcodeFormat) {
      hints.set(Hints.POSSIBLE_FORMATS, [
        Z.BarcodeFormat.QR_CODE,
        Z.BarcodeFormat.EAN_13,
        Z.BarcodeFormat.EAN_8,
        Z.BarcodeFormat.UPC_A,
        Z.BarcodeFormat.UPC_E,
        Z.BarcodeFormat.CODE_128,
        Z.BarcodeFormat.CODE_39,
        Z.BarcodeFormat.ITF
      ]);
    }
  }
  const rd = new Z.BrowserMultiFormatReader(hints);
  // decodeContinuously = baca terus sampai berhenti. (decodeFromConstraints
  // hanya membaca sekali lalu berhenti, jadi barcode sering tidak terdeteksi.)
  rd.decodeContinuously(video, (hasil) => {
    if (hasil?.getText) terima(hasil.getText());
  });
  return () => {
    aktif = false;
    try {
      rd.stopContinuousDecode();
    } catch (e) {}
    stream.getTracks().forEach((x) => x.stop());
    video.srcObject = null;
  };
}

/** Penyambung simulasi: tidak menerima apa-apa sendiri; kode dikirim lewat tombol contoh / kolom ketik. */
function penyambungSimulasi() {
  return { mulai() {}, berhenti() {} };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Bunyikan "tit" singkat saat barcode berhasil terbaca.
 *  Memakai Web Audio (tanpa berkas suara). Gagal senyap bila browser
 *  memblokir audio — bunyi hanya tambahan, bukan syarat. */
function bunyiTit() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    // Satu AudioContext dipakai ulang; membuat baru tiap scan lama-lama dibatasi browser.
    const ac = (bunyiTit._ac ||= new AC());
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const vol = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, t0); // "tit" agak tinggi biar jelas
    // Volume naik-turun cepat supaya terdengar "tit", bukan "tuuut".
    vol.gain.setValueAtTime(0.0001, t0);
    vol.gain.exponentialRampToValueAtTime(0.22, t0 + 0.012);
    vol.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.15);
    osc.connect(vol).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.16);
    osc.onended = () => {
      try {
        osc.disconnect();
        vol.disconnect();
      } catch (e) {}
    };
  } catch (e) {}
}

/** Buka jendela scan; onKode(kode) dipanggil sekali bila kode diterima. | param: onKode (fungsi) | return: void */
export function bukaScan(onKode) {
  tutupScan();
  const pny = PAKAI_ANDROID ? penyambungAndroid() : penyambungSimulasi();
  const contoh = (db?.produk || []).filter((p) => p.barcode).slice(0, 3);
  const w = document.createElement('div');
  w.id = 'scan';
  w.className = 'scn-ov';
  w.setAttribute('role', 'dialog');
  w.setAttribute('aria-modal', 'true');
  w.setAttribute('aria-label', 'Scan barcode');
  w.innerHTML = `<div class="scn-box"><div class="scn-h"><h3>Scan barcode</h3><button type="button" class="btn sm" data-sc="tutup">Tutup</button></div>
    <div class="scn-view"><video class="scn-vid" muted playsinline hidden></video><span class="scn-c a"></span><span class="scn-c b"></span><span class="scn-c c"></span><span class="scn-c d"></span><span class="scn-line"></span></div>
    <p class="scn-st"><i class="scn-dot"></i><span id="scn-tx">Menyalakan kamera…</span></p>
    <p class="scn-mode" id="scn-md">Arahkan kamera ke barcode. Bisa juga ketik atau tempel kodenya di bawah.</p>
    <p class="scn-usb" id="scn-usb" hidden><b>Alat scanner siap</b> — tembakkan laser ke barcode, kode langsung masuk.</p>
    <div class="scn-m"><label for="scn-in">Ketik atau tempel barcode</label><div class="scn-r"><input id="scn-in" inputmode="numeric" autocomplete="off" placeholder="Contoh: 8999999000011"><button type="button" class="btn bp" data-sc="kirim">Pakai</button></div><small class="hint">Alat scanner USB/Bluetooth juga bisa dipakai: arahkan kursor ke kolom ini lalu tembakkan laser ke barcode.</small></div>
    ${contoh.length ? `<div class="scn-s"><span>Contoh (tanpa kamera):</span>${contoh.map((p) => `<button type="button" class="btn sm" data-sc="contoh" data-k="${esc(p.barcode)}">${esc(p.nama)}</button>`).join('')}<button type="button" class="btn sm" data-sc="contoh" data-k="${Date.now().toString().slice(-13)}">Barcode baru</button></div>` : ''}</div>`;
  document.body.append(w);
  document.body.classList.add('scn-on');
  const inp = w.querySelector('#scn-in');
  const selesai = (kode) => {
    kode = String(kode || '').trim();
    if (!kode) return inp.focus();
    bunyiTit(); // tanda berhasil terbaca
    tutupScan();
    onKode(kode);
  };
  w.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sc]');
    if (e.target === w || b?.dataset.sc === 'tutup') return tutupScan();
    if (!b) return;
    if (b.dataset.sc === 'kirim') selesai(inp.value);
    else if (b.dataset.sc === 'contoh') selesai(b.dataset.k);
  });
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      selesai(inp.value);
    }
  });
  w._esc = (e) => e.key === 'Escape' && tutupScan();
  addEventListener('keydown', w._esc);
  w._pny = pny;
  try {
    pny.mulai(selesai);
  } catch (e) {
    w.querySelector('.scn-st').textContent = 'Tidak dapat tersambung ke Android: ' + e.message;
  }
  /* ---- ALAT SCANNER FISIK (USB / Bluetooth) ----
     Alat scanner tidak butuh izin atau API khusus: ia bekerja seperti keyboard
     yang mengetik sangat cepat lalu menekan Enter. Karena itu caranya cukup
     "dengar" ketikan yang masuk dalam waktu singkat, tanpa harus fokus ke
     kolom tertentu — jadi pengguna bisa langsung menembak walaupun kursor
     ada di mana saja di jendela ini.
     Bedanya dengan orang mengetik: jeda antar karakter sangat kecil
     (< AMBANG_BERUNTUN ms). Itu yang dipakai untuk membedakan keduanya,
     supaya ketikan manual tidak salah dianggap hasil scan. */
  const AMBANG_BERUNTUN = 45; // ms antar karakter; scanner asli jauh lebih cepat
  const JEDA_SELESAI = 120; // ms tanpa ketikan -> rangkaian dianggap selesai
  let buf = '',
    waktuTerakhir = 0,
    timerSelesai = 0;
  const usb = w.querySelector('#scn-usb');
  const tandaiUsb = () => {
    if (!usb.hidden) return;
    usb.hidden = false;
    // Beri tahu sekali bahwa alat terdeteksi; tidak mengganggu status kamera.
    w.querySelector('#scn-tx').textContent = 'Alat scanner terdeteksi — siap menerima hasil tembakan';
    w.querySelector('.scn-dot').style.background = '#0E9384';
  };
  w._usb = (e) => {
    // Abaikan bila pengguna sedang mengetik manual: biarkan kolom teks bekerja normal.
    // (Ketikan manual tetap masuk ke kolom, lalu ditekan Enter / tombol Pakai.)
    const diKolom = e.target === inp;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') {
      if (timerSelesai) clearTimeout(timerSelesai);
      timerSelesai = 0;
      const kode = buf.trim();
      buf = '';
      waktuTerakhir = 0;
      // Enter dari scanner datang setelah rangkaian cepat; Enter manual di kolom
      // sudah ditangani pendengar di atas, jadi jangan diproses dua kali.
      if (diKolom) return;
      if (kode.length >= 4) return selesai(kode);
      return;
    }
    if (e.key === 'Escape' || e.key === 'Tab' || e.key.length !== 1) return;
    if (diKolom) return; // kolom teks: pakai alur normal
    const kini = Date.now();
    const cepat = kini - waktuTerakhir <= AMBANG_BERUNTUN;
    waktuTerakhir = kini;
    buf = cepat ? buf + e.key : e.key;
    if (buf.length >= 4) tandaiUsb();
    if (timerSelesai) clearTimeout(timerSelesai);
    timerSelesai = setTimeout(() => {
      // Rangkaian berhenti tanpa Enter: alat scanner yang tidak mengirim Enter,
      // atau ketikan manual. Simpan hanya bila memang cepat & cukup panjang.
      const kode = buf.trim();
      buf = '';
      waktuTerakhir = 0;
      timerSelesai = 0;
      if (kode.length >= 6) selesai(kode);
    }, JEDA_SELESAI);
    w._timer = timerSelesai;
  };
  addEventListener('keydown', w._usb);
  const tx = w.querySelector('#scn-tx');
  const vid = w.querySelector('.scn-vid');
  if (PAKAI_ANDROID) tx.textContent = 'Menunggu scan dari aplikasi Android…';
  else {
    w.classList.add('kam-tunggu');
    mulaiKamera(vid, selesai).then(
      (stop) => {
        if (!document.body.contains(w)) return stop();
        w._kam = stop;
        vid.hidden = false;
        w.classList.add('kam-on');
        tx.textContent = 'Kamera aktif — arahkan ke barcode';
      },
      (e) => {
        const ditolak = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
        tx.textContent = ditolak ? 'Izin kamera ditolak' : 'Kamera tidak tersedia';
        w.querySelector('#scn-md').innerHTML = (ditolak ? 'Izinkan kamera di pengaturan browser, atau' : esc(e?.message || 'Kamera tidak bisa dibuka') + '. Coba') + ' ketik / tempel kode barcode di bawah.';
        w.querySelector('.scn-dot').style.background = '#ef4444';
      }
    );
  }
  if (innerWidth >= 992 || PAKAI_ANDROID) inp.focus();
}

/** Tutup jendela scan dan hentikan penyambung. | param: - | return: void */
export function tutupScan() {
  const w = document.getElementById('scan');
  if (!w) return;
  try {
    w._pny?.berhenti();
    w._kam?.();
  } catch (e) {}
  clearTimeout(w._timer);
  removeEventListener('keydown', w._esc);
  removeEventListener('keydown', w._usb);
  w.remove();
  document.body.classList.remove('scn-on');
}

/** Dengarkan alat scanner fisik (USB/Bluetooth) di seluruh aplikasi, tanpa membuka jendela scan.
 *  Hanya bereaksi bila fokus TIDAK di kolom ketik (di kolom, scanner mengetik sendiri seperti biasa)
 *  dan jendela scan tidak sedang terbuka (jendela itu punya pendengar sendiri).
 *  param: onKode(kode) | return: void */
export function dengarScanner(onKode) {
  let buf = '',
    last = 0;
  addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey || document.getElementById('scan')) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === 'Enter') {
      const kode = buf.trim();
      buf = '';
      if (kode.length >= 4) {
        e.preventDefault();
        onKode(kode);
      }
      return;
    }
    if (e.key.length !== 1) return;
    const kini = Date.now();
    buf = kini - last <= 45 ? buf + e.key : e.key;
    last = kini;
  });
}
