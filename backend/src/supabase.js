/* Klien REST Supabase (PostgREST) — pola yang sama dengan js/core/api.js,
   jadi nama tabel & kolom di sini 100% konsisten dengan web & desktop. */
const { SUPABASE_URL, DATA_KEY } = require('./config');

const BASE = `${SUPABASE_URL}/rest/v1`;

function headers(extra = {}, key = DATA_KEY) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

/** Galat API: membawa status HTTP Supabase agar bisa diteruskan ke klien. */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** GET satu tabel. | param: tabel, query string opsional, kunci opsional */
async function get(tabel, q = 'select=*', key) {
  const res = await fetch(`${BASE}/${tabel}?${q}`, { headers: headers({}, key) });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new ApiError(res.status, `${tabel}: ${res.status} ${t.slice(0, 200)}`);
  }
  return res.json();
}

/** Tulis ke Supabase (POST/PATCH/DELETE). | balik=true -> kembalikan baris tersimpan */
async function write(metode, path, body, balik = false, key) {
  const res = await fetch(`${BASE}/${path}`, {
    method: metode,
    headers: headers({ Prefer: balik ? 'return=representation' : 'return=minimal' }, key),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new ApiError(res.status, `${path.split('?')[0]}: ${res.status} ${t.slice(0, 300)}`);
  }
  if (!balik) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

/** Uji koneksi ke Supabase (dipakai GET /api/health). */
async function ping() {
  const rows = await get('produk', 'select=id&limit=1');
  return rows.length >= 0;
}

module.exports = { get, write, ping, ApiError };
