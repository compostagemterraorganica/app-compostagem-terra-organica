const crypto = require('crypto');
const { z } = require('zod');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');
const { hashToken } = require('../../middlewares/require-auth');
const { hashCsrf } = require('../../middlewares/require-csrf');
const { hashPassword, comparePassword } = require('../../utils/password');

const { isAdministrator } = require('../../utils/userRoles');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  admin: z.boolean().optional()
});

const setPasswordSchema = z.object({
  userId: z.number().int().positive().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6)
}).refine((data) => data.userId || data.email, {
  message: 'Informe userId ou email para definir a senha',
  path: ['userId']
});

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    domain: env.cookieDomain,
    path: '/',
    maxAge: env.sessionTtlHours * 60 * 60 * 1000
  };
}

function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    domain: env.cookieDomain,
    path: '/',
    maxAge: env.sessionTtlHours * 60 * 60 * 1000
  };
}

function generateToken() {
  return crypto.randomBytes(48).toString('hex');
}

async function login({ email, password, admin, userAgent, ip }) {
  const parsed = loginSchema.safeParse({ email, password, admin });
  if (!parsed.success) throw new HttpError(400, 'Payload de login invalido', parsed.error.flatten());

  const userResult = await pool.query(
    `SELECT id, name, email, password, roles_json
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [parsed.data.email]
  );
  const user = userResult.rows[0];
  if (!user) throw new HttpError(401, 'Credenciais invalidas');
  if (!user.password) throw new HttpError(401, 'Senha nao configurada para este usuario');
  const ok = await comparePassword(parsed.data.password, user.password);
  if (!ok) throw new HttpError(401, 'Credenciais invalidas');

  const userIsAdmin = isAdministrator(user.roles_json);
  if (parsed.data.admin && !userIsAdmin) {
    throw new HttpError(403, 'Este usuario nao tem permissao para acessar o painel administrativo');
  }

  const sessionToken = generateToken();
  const csrfToken = generateToken();
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO user_sessions
      (user_id, session_token_hash, csrf_token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [user.id, hashToken(sessionToken), hashCsrf(csrfToken), expiresAt, userAgent || null, ip || null]
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles_json || [],
      isAdministrator: userIsAdmin
    },
    sessionToken,
    csrfToken
  };
}

async function refresh(sessionId) {
  const sessionToken = generateToken();
  const csrfToken = generateToken();
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 60 * 60 * 1000);

  await pool.query(
    `UPDATE user_sessions
     SET session_token_hash = $1,
         csrf_token_hash = $2,
         expires_at = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [hashToken(sessionToken), hashCsrf(csrfToken), expiresAt, sessionId]
  );

  return { sessionToken, csrfToken };
}

async function logout(sessionId) {
  await pool.query('UPDATE user_sessions SET revoked_at = NOW(), updated_at = NOW() WHERE id = $1', [sessionId]);
}

async function resolveCsrfForSession(sessionId, csrfFromCookie) {
  if (csrfFromCookie) {
    const valid = await pool.query(
      `SELECT id FROM user_sessions
       WHERE id = $1 AND csrf_token_hash = $2 AND revoked_at IS NULL
       LIMIT 1`,
      [sessionId, hashCsrf(csrfFromCookie)]
    );
    if (valid.rows[0]) return csrfFromCookie;
  }

  const csrfToken = generateToken();
  await pool.query(
    `UPDATE user_sessions
     SET csrf_token_hash = $1, updated_at = NOW()
     WHERE id = $2 AND revoked_at IS NULL`,
    [hashCsrf(csrfToken), sessionId]
  );
  return csrfToken;
}

async function setPassword(payload) {
  const parsed = setPasswordSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());

  const { userId, email, password } = parsed.data;
  const hash = await hashPassword(password);
  const result = await pool.query(
    `UPDATE users
     SET password = $1, updated_at = NOW()
     WHERE ($2::BIGINT IS NOT NULL AND id = $2::BIGINT)
        OR ($3::TEXT IS NOT NULL AND lower(email) = lower($3::TEXT))
     RETURNING id, email, name`,
    [hash, userId || null, email || null]
  );
  const user = result.rows[0];
  if (!user) throw new HttpError(404, 'Usuario nao encontrado');
  return user;
}

module.exports = {
  login,
  refresh,
  logout,
  resolveCsrfForSession,
  setPassword,
  cookieOptions,
  csrfCookieOptions
};
