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
import { db } from './db.js?v=20261117m';

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

/** Penyambung simulasi: tidak menerima apa-apa sendiri; kode dikirim lewat tombol contoh / kolom ketik. */
function penyambungSimulasi() {
  return { mulai() {}, berhenti() {} };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Buka jendela scan; onKode(kode) dipanggil sekali bila kode diterima. | param: onKode (fungsi) | return: void */
export function bukaScan(onKode) {
  tutupScan();
  const pny = PAKAI_ANDROID ? penyambungAndroid() : penyambungSimulasi();
  const contoh = db.produk.filter((p) => p.barcode).slice(0, 3);
  const w = document.createElement('div');
  w.id = 'scan';
  w.className = 'scn-ov';
  w.setAttribute('role', 'dialog');
  w.setAttribute('aria-modal', 'true');
  w.setAttribute('aria-label', 'Scan barcode');
  w.innerHTML = `<div class="scn-box"><div class="scn-h"><h3>Scan barcode</h3><button type="button" class="btn sm" data-sc="tutup">Tutup</button></div>
    <div class="scn-view" aria-hidden="true"><span class="scn-c a"></span><span class="scn-c b"></span><span class="scn-c c"></span><span class="scn-c d"></span><span class="scn-line"></span></div>
    <p class="scn-st"><i class="scn-dot"></i>${PAKAI_ANDROID ? 'Menunggu scan dari aplikasi Android…' : 'Menunggu scan dari aplikasi Android…'}</p>
    <p class="scn-mode"><span class="b o">Mode simulasi</span> Aplikasi Android belum tersambung, jadi scan dicoba lewat cara di bawah.</p>
    <div class="scn-m"><label for="scn-in">Ketik atau tempel barcode</label><div class="scn-r"><input id="scn-in" inputmode="numeric" autocomplete="off" placeholder="Contoh: 8999999000011"><button type="button" class="btn bp" data-sc="kirim">Pakai</button></div><small class="hint">Scanner USB juga bisa dipakai: arahkan kursor ke kolom ini lalu scan.</small></div>
    ${contoh.length ? `<div class="scn-s"><span>Simulasi scan:</span>${contoh.map((p) => `<button type="button" class="btn sm" data-sc="contoh" data-k="${esc(p.barcode)}">${esc(p.nama)}</button>`).join('')}<button type="button" class="btn sm" data-sc="contoh" data-k="${Date.now().toString().slice(-13)}">Barcode baru</button></div>` : ''}</div>`;
  document.body.append(w);
  document.body.classList.add('scn-on');
  const inp = w.querySelector('#scn-in');
  const selesai = (kode) => {
    kode = String(kode || '').trim();
    if (!kode) return inp.focus();
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
  if (innerWidth >= 992) inp.focus();
}

/** Tutup jendela scan dan hentikan penyambung. | param: - | return: void */
export function tutupScan() {
  const w = document.getElementById('scan');
  if (!w) return;
  try {
    w._pny?.berhenti();
  } catch (e) {}
  removeEventListener('keydown', w._esc);
  w.remove();
  document.body.classList.remove('scn-on');
}
