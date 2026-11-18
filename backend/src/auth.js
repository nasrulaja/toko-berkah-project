/* Login & token — hash sandi mengikuti format desktop (Toko-Berkah-Dekstop):
   "base64(garam):base64(hash)" PBKDF2-SHA256, 100.000 iterasi, 32 byte.
   Token: JWT sederhana (HMAC-SHA256) tanpa pustaka tambahan. */
const crypto = require('crypto');
const { JWT_SECRET, SERVICE_KEY } = require('./config');
const { get, ApiError } = require('./supabase');

const PBKDF2_ITER = 100000;
const PBKDF2_LEN = 32;
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 jam

/** Cocokkan sandi dengan hash "garam:hash" (PBKDF2-SHA256). */
function verifyPassword(sandi, stored) {
  const bagian = String(stored || '').split(':');
  if (bagian.length !== 2) return false;
  let garam, benar;
  try {
    garam = Buffer.from(bagian[0], 'base64');
    benar = Buffer.from(bagian[1], 'base64');
  } catch {
    return false;
  }
  const coba = crypto.pbkdf2Sync(String(sandi), garam, PBKDF2_ITER, PBKDF2_LEN, 'sha256');
  return coba.length === benar.length && crypto.timingSafeEqual(coba, benar);
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/** Buat token JWT sederhana untuk user. */
function signToken(user) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    sub: user.id,
    nama: user.nama,
    exp: Date.now() + TOKEN_TTL_MS
  }));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

/** Verifikasi token; kembalikan payload atau null. */
function verifyToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expect = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Verifikasi sandi terhadap tabel users Supabase.
 * Membaca kolom password_hash butuh service role key (anon key ditolak RLS).
 * @return {Promise<object>} baris user + role
 * @throws {ApiError} 503 bila service key belum diatur, 401 bila sandi salah
 */
async function login(email, sandi) {
  if (!SERVICE_KEY) {
    throw new ApiError(503, 'Login belum dikonfigurasi: isi SUPABASE_SERVICE_ROLE_KEY di berkas .env');
  }
  const key = SERVICE_KEY;
  // email bisa berupa email atau username (username = bagian sebelum @)
  const rows = await get(
    'users',
    'select=id,nama,email,role_id,password_hash',
    key
  );
  const target = rows.find((u) => {
    const mail = String(u.email || '').toLowerCase();
    const username = mail.split('@')[0];
    return mail === String(email || '').toLowerCase() || username === String(email || '').toLowerCase();
  });
  if (!target || !verifyPassword(sandi, target.password_hash)) {
    throw new ApiError(401, 'Surel atau kata sandi salah');
  }
  const roles = await get('roles', 'select=*', key);
  const role = roles.find((r) => r.id === target.role_id) || {};
  return {
    id: target.id,
    nama: target.nama,
    email: target.email,
    role_id: target.role_id,
    bisa_kelola_barang: !!role.bisa_kelola_barang,
    bisa_transaksi: !!role.bisa_transaksi
  };
}

/** Middleware Express: wajibkan token valid di header Authorization. */
function requireAuth(req, res, next) {
  const raw = req.headers.authorization || '';
  const payload = verifyToken(raw.replace(/^Bearer\s+/i, ''));
  if (!payload) return res.status(401).json({ error: 'Token tidak valid atau kedaluwarsa' });
  req.user = payload;
  next();
}

module.exports = { login, signToken, verifyToken, requireAuth };
