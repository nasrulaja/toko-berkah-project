/* ==========================================================================
   TOKO BERKAH — splash.js
   Layar sambutan saat web dibuka: tulisan "TOKO BERKAH" diketik huruf demi
   huruf di atas latar kaca beraurora, lalu memudar ke halaman login/beranda.
   Ketuk, klik, atau tekan tombol apa saja untuk melewati.
   ========================================================================== */
const JUDUL = 'TOKO BERKAH';
const SUB = 'Kelola stok dan transaksi toko dengan mudah';

/** Tampilkan splash sekali per pemuatan halaman. | param: - | return: void */
export function splash() {
  if (document.getElementById('splash')) return;
  const kurang = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.id = 'splash';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Toko Berkah');
  el.innerHTML =
    '<div class="sp-card"><div class="sp-logo">TB</div>' +
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
