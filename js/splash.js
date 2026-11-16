/* ==========================================================================
   TOKO BERKAH — splash.js
   Layar sambutan saat web dibuka: tulisan "TOKO BERKAH" diketik huruf demi
   huruf di atas latar kaca beraurora, lalu memudar ke halaman login/beranda.
   Ketuk, klik, atau tekan tombol apa saja untuk melewati.
   ========================================================================== */
const JUDUL = 'TOKO BERKAH';
const SUB = 'Kelola stok dan transaksi toko dengan mudah';
const LOGO =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9l1.2-4.5A1 1 0 0 1 6.2 4h11.6a1 1 0 0 1 1 .5L20 9"/><path d="M4 9a2.67 2.67 0 0 0 5.33 0 2.67 2.67 0 0 0 5.34 0A2.67 2.67 0 0 0 20 9"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/><path d="M10 20v-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"/></svg>';

/** Tampilkan splash sekali per pemuatan halaman. | param: - | return: void */
export function splash() {
  if (document.getElementById('splash')) return;
  const kurang = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.id = 'splash';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Toko Berkah');
  el.innerHTML =
    '<i class="sp-o sp-o1"></i><i class="sp-o sp-o2"></i><i class="sp-o sp-o3"></i>' +
    `<div class="sp-card"><div class="sp-logo">${LOGO}</div>` +
    '<h1 class="sp-t" aria-hidden="true"><span id="spt"></span><b class="sp-caret"></b></h1>' +
    `<p class="sp-s">${SUB}</p><p class="sp-h">Ketuk untuk melanjutkan</p></div>`;
  document.body.appendChild(el);
  document.body.classList.add('sp-on');
  let selesai = false;
  const tutup = () => {
    if (selesai) return;
    selesai = true;
    el.classList.add('out');
    document.body.classList.remove('sp-on');
    setTimeout(() => el.remove(), 600);
    removeEventListener('keydown', tutup);
  };
  el.addEventListener('click', tutup);
  addEventListener('keydown', tutup);
  const t = el.querySelector('#spt');
  if (kurang) {
    t.textContent = JUDUL;
    el.classList.add('done');
    setTimeout(tutup, 1200);
    return;
  }
  let i = 0;
  const ketik = () => {
    if (selesai) return;
    t.textContent = JUDUL.slice(0, ++i);
    if (i < JUDUL.length) return setTimeout(ketik, i === 5 ? 220 : 120); // jeda kecil di antara dua kata
    el.classList.add('done');
    setTimeout(tutup, 1700);
  };
  setTimeout(ketik, 500);
}
