/** Ambil satu elemen. | param: s (selector), r (root) | return: Element */
export const $ = (s, r = document) => r.querySelector(s);
/** Ambil semua elemen sebagai array. | param: s (selector), r (root) | return: Element[] */
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
/** Escape karakter HTML. | param: s | return: string aman */
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/** Format angka jadi Rupiah. | param: n | return: string 'Rp...' */
export const rp = n => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
/** Ubah ISO jadi tanggal YYYY-MM-DD. | param: iso | return: string tanggal */
export const dk = iso => new Date(iso).toLocaleDateString('en-CA');
/** Format ISO jadi tanggal+waktu lokal Indonesia. | param: iso | return: string */
export const dt = iso => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Kumpulan path SVG icon. | param: - | return: objek {nama: path} */
export const IC = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  tag: 'M3 12V3h9l9 9-9 9zM7.5 7.5h.01',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  in: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v4h16v-4',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  recv: 'M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6',
  out: 'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  menu: 'M3 6h18M3 12h18M3 18h18',
  moon: 'M21 13A9 9 0 1111 3a7 7 0 0010 10z',
  mail: 'M3 5h18v14H3zM3 7l9 6 9-6',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6',
  sun: 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M6.343 6.343L4.929 4.929m12.728 0l-1.414 1.414M6.343 17.657l-1.414 1.414M12 7a5 5 0 100 10 5 5 0 000-10z'
};

/** Bikin markup SVG icon berdasarkan nama. | param: n (nama icon) | return: string SVG */
export const ico = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[n]}"/></svg>`;

/** Tampilkan toast singkat. | param: m (pesan) | return: void */
export function toast(m) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = m;
  document.body.append(t);
  setTimeout(() => t.remove(), 2400)
}

export function modal(title, body, label, fn) {
  $('#ov').innerHTML = `<div class="ov"><form class="md"><div class="ch"><h3>${title}</h3><button type="button" class="btn sm" data-act="x">Tutup</button></div><div class="cb">${body}<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">${label ? `<button type="button" class="btn" data-act="x">Batal</button><button class="btn bp">${label}</button>` : ''}</div></div></form></div>`;
  const f = $('#ov form'); f.onsubmit = e => { e.preventDefault(); if (fn && fn(Object.fromEntries(new FormData(f))) !== false) $('#ov').innerHTML = '' }; const i = $('input,select', f); i && i.focus()
}

export const ask = (m, fn) => modal('Konfirmasi', `<p>${m}</p>`, 'Ya, lanjutkan', () => { fn() });

export const el = (tag, attr = {}, child = '') => {
  const e = document.createElement(tag);
  Object.entries(attr).forEach(([k, v]) => e[k] = v);
  if (typeof child === 'string') e.innerHTML = child; else e.append(child);
  return e
};

export function themeIcon() { return document.documentElement.dataset.theme === 'dark' ? ico('sun') : ico('moon') }

export const opts = (arr, sel, k = 'nama') => arr.map(x => `<option value="${x.id}" ${x.id == sel ? 'selected' : ''}>${esc(x[k])}</option>`).join('');
export const popt = (db, sel) => db.produk.map(p => `<option value="${p.id}" ${p.id == sel ? 'selected' : ''}>${esc(p.nama)} (stok ${p.stok})</option>`).join('');
export const today = () => dk(new Date().toISOString());
export const empty = (t, s) => `<div class="em"><h4>${t}</h4><p>${s}</p></div>`;
