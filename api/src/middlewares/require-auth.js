const crypto = require('crypto');
const env = require('../config/env');
const { pool } = require('../config/db');
const { HttpError } = require('../utils/httpError');
const { isAdministrator } = require('../utils/userRoles');

function hashToken(token) {
  return crypto.createHmac('sha256', env.sessionSecret).update(token).digest('hex');
}

async function requireAuth(req, res, next) {
  const sessionToken = req.cookies?.[env.sessionCookieName];
  if (!sessionToken) return next(new HttpError(401, 'Sessao nao autenticada'));

  const sessionTokenHash = hashToken(sessionToken);
  const result = await pool.query(
    `SELECT s.id, s.user_id, s.expires_at, s.revoked_at,
            u.id AS user_id_real, u.name, u.email, u.roles_json
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.session_token_hash = $1
     LIMIT 1`,
    [sessionTokenHash]
  );
  const session = result.rows[0];
  if (!session) return next(new HttpError(401, 'Sessao invalida'));
  if (session.revoked_at) return next(new HttpError(401, 'Sessao revogada'));
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return next(new HttpError(401, 'Sessao expirada'));
  }

  const admin = isAdministrator(session.roles_json);

  req.auth = {
    sessionId: session.id,
    isAdministrator: admin,
    user: {
      id: Number(session.user_id_real),
      name: session.name,
      email: session.email,
      roles: session.roles_json || [],
      isAdministrator: admin
    }
  };
  next();
}

module.exports = { requireAuth, hashToken };
