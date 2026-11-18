/* Rute autentikasi: POST /api/auth/login, GET /api/auth/me */
const express = require('express');
const { login, signToken, requireAuth } = require('../auth');

const router = express.Router();

/** POST /api/auth/login — { email, password } -> { token, user } */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email dan password wajib diisi' });
    const user = await login(email, password);
    res.json({ token: signToken(user), user });
  } catch (e) {
    next(e);
  }
});

/** GET /api/auth/me — profil dari token yang sedang dipakai */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.sub,
    nama: req.user.nama,
    exp: new Date(req.user.exp).toISOString()
  });
});

module.exports = router;
