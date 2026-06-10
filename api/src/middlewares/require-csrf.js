const crypto = require('crypto');
const env = require('../config/env');
const { pool } = require('../config/db');
const { HttpError } = require('../utils/httpError');
const { hashToken } = require('./require-auth');

function hashCsrf(value) {
  return crypto.createHmac('sha256', env.sessionSecret).update(`csrf:${value}`).digest('hex');
}

async function requireCsrf(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const sessionToken = req.cookies?.[env.sessionCookieName];
  const csrfCookie = req.cookies?.[env.csrfCookieName];
  const csrfHeader = req.headers['x-csrf-token'];
  if (!sessionToken || !csrfCookie || !csrfHeader) {
    return next(new HttpError(403, 'CSRF token ausente'));
  }
  if (csrfCookie !== csrfHeader) return next(new HttpError(403, 'CSRF token invalido'));

  const sessionHash = hashToken(sessionToken);
  const csrfHash = hashCsrf(csrfCookie);
  const result = await pool.query(
    `SELECT id FROM user_sessions
     WHERE session_token_hash = $1 AND csrf_token_hash = $2 AND revoked_at IS NULL
     LIMIT 1`,
    [sessionHash, csrfHash]
  );
  if (!result.rows[0]) return next(new HttpError(403, 'CSRF token rejeitado'));
  next();
}

module.exports = { requireCsrf, hashCsrf };
