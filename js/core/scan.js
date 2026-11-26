/* ==========================================================================
   TOKO BERKAH — core/scan.js
   Scan barcode memakai ALAT SCANNER FISIK (USB / Bluetooth). Alat seperti itu
   bekerja seperti keyboard: mengetik kode sangat cepat lalu menekan Enter.
   Tidak ada kamera dan tidak ada aplikasi lain yang dibutuhkan.
   ========================================================================== */
// ?v= HARUS sama dengan yang dipakai app.js & pages.js untuk './core/db.js'.
// Bila berbeda, browser memuat core/db.js DUA KALI sebagai modul terpisah:
// setDB() mengisi salinan A, sedangkan `db` di sini tetap undefined sehingga
// bukaScan() melempar galat dan tombol Scan seolah tidak berfungsi.
import { db } from './db.js?v=20261119a';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Bunyikan "tit" singkat saat barcode berhasil terbaca.
 *  Memakai Web Audio (tanpa berkas suara). Gagal senyap bila browser
 *  memblokir audio — bunyi hanya tambahan, bukan syarat. */
function bunyiTit() {
  try {
    if (localStorage.getItem('berkah_bunyi') === '0') return; // dimatikan di Pengaturan
  } catch (e) {}
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
  const contoh = (db?.produk || []).filter((p) => p.barcode).slice(0, 3);
  const w = document.createElement('div');
  w.id = 'scan';
  w.className = 'scn-ov';
  w.setAttribute('role', 'dialog');
  w.setAttribute('aria-modal', 'true');
  w.setAttribute('aria-label', 'Scan barcode');
  w.innerHTML = `<div class="scn-box"><div class="scn-h"><h3>Scan barcode</h3><button type="button" class="btn sm" data-sc="tutup">Tutup</button></div>
    <div class="scn-view"><span class="scn-c a"></span><span class="scn-c b"></span><span class="scn-c c"></span><span class="scn-c d"></span><span class="scn-line"></span></div>
    <p class="scn-st"><i class="scn-dot"></i><span id="scn-tx">Menunggu tembakan alat scanner…</span></p>
    <p class="scn-mode" id="scn-md">Sambungkan alat scanner (USB / Bluetooth), lalu arahkan ke barcode. Tidak perlu klik kolom apa pun. Kalau tidak ada alat, kode bisa diketik di bawah.</p>
    <p class="scn-usb" id="scn-usb" hidden><b>Alat scanner siap</b> — tembakkan laser ke barcode, kode langsung masuk.</p>
    <div class="scn-m"><label for="scn-in">Ketik atau tempel barcode</label><div class="scn-r"><input id="scn-in" inputmode="numeric" autocomplete="off" placeholder="Contoh: 8999999000011"><button type="button" class="btn bp" data-sc="kirim">Pakai</button></div><small class="hint">Alat scanner USB/Bluetooth juga bisa dipakai: arahkan kursor ke kolom ini lalu tembakkan laser ke barcode.</small></div>
    ${contoh.length ? `<div class="scn-s"><span>Contoh (tanpa alat):</span>${contoh.map((p) => `<button type="button" class="btn sm" data-sc="contoh" data-k="${esc(p.barcode)}">${esc(p.nama)}</button>`).join('')}<button type="button" class="btn sm" data-sc="contoh" data-k="${Date.now().toString().slice(-13)}">Barcode baru</button></div>` : ''}</div>`;
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
    // Beri tahu sekali bahwa alat terdeteksi; 
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
  inp.focus();
}

/** Tutup jendela scan dan hentikan penyambung. | param: - | return: void */
export function tutupScan() {
  const w = document.getElementById('scan');
  if (!w) return;
  try {
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
