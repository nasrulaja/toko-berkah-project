/* ==========================================================================
   TOKO BERKAH — splash.js
   Layar sambutan saat web dibuka: tulisan "TOKO BERKAH" diketik huruf demi
   huruf di atas latar kaca beraurora, lalu memudar ke halaman login/beranda.
   Ketuk, klik, atau tekan tombol apa saja untuk melewati.
   ========================================================================== */
const JUDUL = 'TOKO BERKAH';
const SUB = 'Kelola stok dan transaksi toko dengan mudah';

/* Logo digambar ulang sebagai SVG agar bagian-bagiannya bisa dianimasikan:
   keranjang tumbuh dari bawah, daun mekar lalu bergoyang, kilau melintas. */
const LOGO = `
<svg class="sp-svg" viewBox="0 0 120 112" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="spG" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#0d6efd"/><stop offset=".55" stop-color="#1495f5"/><stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
    <linearGradient id="spSheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="spMask"><g fill="#fff">
      <path d="M14 26h92a8 8 0 0 1 0 16H14a8 8 0 0 1 0-16Z"/>
      <path d="M20 42h15v30H20Z"/><path d="M42 42h13v30H42Z"/><path d="M63 42h13v30H63Z"/><path d="M84 42h15v30H84Z"/>
      <path d="M17 60h86l-8 30a18 18 0 0 1-17 13H42a18 18 0 0 1-17-13Z"/>
    </g></mask>
    <clipPath id="spClip"><path d="M17 60h86l-8 30a18 18 0 0 1-17 13H42a18 18 0 0 1-17-13Z"/></clipPath>
  </defs>
  <g class="sp-basket" fill="url(#spG)">
    <path d="M52 18 84 6a7 7 0 0 1 5 13L57 31a7 7 0 0 1-5-13Z"/>
    <g mask="url(#spMask)">
      <path d="M10 22h100v95H10Z"/>
      <path d="M17 60h86v5H17Z" fill="#fff" opacity=".3"/>
    </g>
    <path d="M17 60h86" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
  </g>
  <g class="sp-leaf">
    <path d="M4 50c0 0 12-9 29-9 19 0 32 13 32 32 0 9-3 17-9 22 2-16-7-29-22-34C20 56 12 53 4 50Z" fill="url(#spG)"/>
    <path d="M4 50c11 5 24 13 33 23 7 8 10 17 11 25" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".8"/>
  </g>
  <g clip-path="url(#spClip)">
    <rect class="sp-sheen" x="-60" y="50" width="34" height="76" fill="url(#spSheen)" opacity=".9"/>
  </g>
</svg>`;

/** Tampilkan splash sekali per pemuatan halaman. | param: - | return: void */
export function splash() {
  if (document.getElementById('splash')) return;
  const kurang = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.createElement('div');
  el.id = 'splash';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Toko Berkah');
  el.innerHTML =
    `<div class="sp-card">${LOGO}` +
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
