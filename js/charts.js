/* ==========================================================================
   TOKO BERKAH — charts.js
   Pembuat grafik SVG murni (tanpa library). Semua fungsi hanya MENGEMBALIKAN
   string SVG; warna diambil dari kelas CSS di css/dashboard.css sehingga
   otomatis mengikuti tema terang/gelap.
   --------------------------------------------------------------------------
   PETA FILE — cari teks "BAGIAN n":
     BAGIAN 1  PEMBANTU          short(), niceMax(), attr()
     BAGIAN 2  BAR BERKELOMPOK   barChart()   (penjualan vs laba, jam tersibuk)
     BAGIAN 3  DONAT             donut()
     BAGIAN 4  SPARKLINE         spark()
   ========================================================================== */

/* ==========================================================================
   BAGIAN 1 — PEMBANTU
   ========================================================================== */

/** Singkat angka rupiah untuk sumbu grafik. | param: n (angka) | return: string, mis. "1,2jt" */
export const short = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'M';
  if (a >= 1e6) return (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'jt';
  if (a >= 1e3) return Math.round(n / 1e3).toLocaleString('id-ID') + 'rb';
  return String(Math.round(n));
};

/** Bulatkan batas atas sumbu ke angka "enak" (1, 2, 5 x 10^n). | param: v (nilai maks) | return: angka */
export const niceMax = (v) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v))),
    f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
};

/** Escape teks untuk dipakai di atribut HTML. | param: s (teks) | return: string aman */
const attr = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ==========================================================================
   BAGIAN 2 — BAR BERKELOMPOK
   labels  : label sumbu X (satu per kelompok)
   series  : [{ name, cls, values[] }]  (cls = kelas warna: s1, s2, ...)
   fmt     : fungsi format nilai untuk tooltip
   Tiap kelompok punya area hover (data-tip = "judul|baris1|baris2") yang
   dibaca oleh dashboard() untuk menampilkan tooltip.
   ========================================================================== */

/** Grafik batang berkelompok. | param: { labels, series, fmt, every, yfmt, w, h, left } | return: string SVG */
export function barChart({ labels, series, fmt = (v) => v, yfmt = short, every = 1, w = 640, h = 270, left = 46 }) {
  const W = w,
    H = h,
    L = left,
    R = 8,
    T = 14,
    B = 30;
  const pw = W - L - R,
    ph = H - T - B,
    n = labels.length;
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 1));
  const ticks = 4;
  const grid = [...Array(ticks + 1)]
    .map((_, i) => {
      const v = (max / ticks) * i,
        y = T + ph - (v / max) * ph;
      return `<line class="cg" x1="${L}" x2="${W - R}" y1="${y}" y2="${y}"/><text class="ca" x="${L - 8}" y="${y + 4}" text-anchor="end">${yfmt(v)}</text>`;
    })
    .join('');
  const gw = pw / n,
    k = series.length,
    bw = Math.max(3, Math.min(22, (gw * 0.7) / k)),
    gap = k > 1 ? 3 : 0;
  const groups = labels
    .map((lb, i) => {
      const cx = L + gw * i + gw / 2,
        total = k * bw + (k - 1) * gap;
      const bars = series
        .map((s, j) => {
          const v = s.values[i] || 0,
            h = Math.max(v > 0 ? 2 : 0, (v / max) * ph),
            x = cx - total / 2 + j * (bw + gap);
          if (!h) return '';
          const r = Math.min(5, bw / 2, h);
          // batang dengan sudut atas membulat
          return `<path class="${s.cls}" d="M${x},${T + ph} V${T + ph - h + r} Q${x},${T + ph - h} ${x + r},${T + ph - h} H${x + bw - r} Q${x + bw},${T + ph - h} ${x + bw},${T + ph - h + r} V${T + ph} Z"/>`;
        })
        .join('');
      const tip = [lb, ...series.map((s) => `${s.name}: ${fmt(s.values[i] || 0)}|${s.cls}`)].join('|');
      const show = i % every === 0;
      return `<g class="grp"><rect class="band" x="${L + gw * i + 1}" y="${T}" width="${gw - 2}" height="${ph}" rx="6"/>${bars}${show ? `<text class="ca" x="${cx}" y="${H - 9}" text-anchor="middle">${attr(lb)}</text>` : ''}<rect class="hit" x="${L + gw * i}" y="${T}" width="${gw}" height="${ph}" data-tip="${attr(tip)}"/></g>`;
    })
    .join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Grafik batang">${grid}${groups}</svg>`;
}

/* ==========================================================================
   BAGIAN 3 — DONAT
   items : [{ label, value }]  (maks 6 irisan; sisanya digabung "Lainnya")
   center: { top, bottom } teks di tengah donat
   ========================================================================== */

/** Grafik donat. | param: { items, center } | return: { svg, legend } (string HTML) */
export function donut({ items, center = {}, fmt = (v) => v }) {
  const list = [...items].sort((a, b) => b.value - a.value);
  const top = list.slice(0, 5),
    rest = list.slice(5).reduce((a, x) => a + x.value, 0);
  if (rest > 0) top.push({ label: 'Lainnya', value: rest });
  const total = top.reduce((a, x) => a + x.value, 0);
  const r = 70,
    C = 2 * Math.PI * r;
  let off = 0;
  const segs = total
    ? top
        .map((x, i) => {
          const len = (x.value / total) * C,
            seg = `<circle class="dn d${i}" cx="100" cy="100" r="${r}" stroke-dasharray="${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}" stroke-dashoffset="${-off}" data-tip="${attr(`${x.label}|${fmt(x.value)} (${Math.round((x.value / total) * 100)}%)|d${i}`)}"/>`;
          off += len;
          return seg;
        })
        .join('')
    : '';
  const svg = `<svg class="donut" viewBox="0 0 200 200" width="100%" role="img" aria-label="Grafik donat"><circle class="dn-bg" cx="100" cy="100" r="${r}"/><g transform="rotate(-90 100 100)">${segs}</g><text class="dc1" x="100" y="96" text-anchor="middle">${attr(center.top ?? '')}</text><text class="dc2" x="100" y="118" text-anchor="middle">${attr(center.bottom ?? '')}</text></svg>`;
  const legend = top
    .map(
      (x, i) =>
        `<li><i class="dot d${i}"></i><span>${attr(x.label)}</span><b>${total ? Math.round((x.value / total) * 100) : 0}%</b></li>`
    )
    .join('');
  return { svg, legend };
}

/* ==========================================================================
   BAGIAN 4 — SPARKLINE
   Garis mini + area di kartu KPI. Warna mengikuti `color` elemen induk.
   ========================================================================== */

/** Grafik garis mini. | param: values (array angka) | return: string SVG */
export function spark(values) {
  const W = 100,
    H = 34,
    n = values.length;
  const max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const span = max - min || 1;
  const pts = values.map((v, i) => [n > 1 ? (i / (n - 1)) * W : W / 2, H - 3 - ((v - min) / span) * (H - 8)]);
  if (!pts.length) return '';
  // kurva halus (titik tengah antar titik)
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1],
      [x1, y1] = pts[i],
      mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="spa" d="${d} L${W},${H} L0,${H} Z"/><path class="spl" d="${d}"/></svg>`;
}
