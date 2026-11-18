/* Konfigurasi backend dari berkas .env (lihat .env.example). */
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ejohssqnhhtaveelmter.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_PGbNjr7ySv7Mvwh0hGn8Uw_lz7uAGLs';

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  SUPABASE_URL,
  // Kunci data: utamakan anon key (dibatasi RLS) — sama dengan yang dipakai web.
  DATA_KEY: ANON_KEY,
  // Kunci khusus login (membaca users.password_hash); boleh kosong.
  SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'toko-berkah-dev-secret'
};
