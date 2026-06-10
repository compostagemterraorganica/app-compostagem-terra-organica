const crypto = require('crypto');
const { z } = require('zod');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');
const { hashPassword } = require('../../utils/password');
const { validatePasswordPair } = require('../../utils/passwordPolicy');
const { sendVerificationCode } = require('../email/email.service');

const PURPOSES = ['setup', 'reset'];

const checkEmailSchema = z.object({
  email: z.string().email()
});

const sendCodeSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['setup', 'reset'])
});

const confirmPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(1),
  passwordConfirm: z.string().min(1),
  purpose: z.enum(['setup', 'reset'])
});

function hashVerificationCode(code) {
  return crypto.createHmac('sha256', env.sessionSecret).update(`email-code:${code}`).digest('hex');
}

function generateNumericCode() {
  return String(crypto.randomInt(100000, 1000000));
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT id, name, email, password
     FROM users
     WHERE lower(email) = lower($1)
     LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

async function checkEmail(email) {
  const parsed = checkEmailSchema.safeParse({ email });
  if (!parsed.success) throw new HttpError(400, 'Email invalido', parsed.error.flatten());

  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    return { exists: false, needsPasswordSetup: false };
  }

  return {
    exists: true,
    needsPasswordSetup: !user.password
  };
}

async function invalidateActiveCodes(userId, purpose) {
  await pool.query(
    `UPDATE auth_email_codes
     SET used_at = NOW()
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL`,
    [userId, purpose]
  );
}

async function sendCode({ email, purpose }) {
  const parsed = sendCodeSchema.safeParse({ email, purpose });
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());

  const user = await findUserByEmail(parsed.data.email);
  const genericMessage = 'Se o email existir, enviamos um codigo de verificacao.';

  if (!user) {
    return { success: true, message: genericMessage };
  }

  const hasPassword = Boolean(user.password);

  if (parsed.data.purpose === 'setup' && hasPassword) {
    throw new HttpError(400, 'Este email ja possui senha. Faca login ou use redefinir senha.');
  }

  if (parsed.data.purpose === 'reset' && !hasPassword) {
    return { success: true, message: genericMessage };
  }

  const code = generateNumericCode();
  const expiresAt = new Date(Date.now() + env.resend.codeTtlMinutes * 60 * 1000);

  await invalidateActiveCodes(user.id, parsed.data.purpose);

  await pool.query(
    `INSERT INTO auth_email_codes (user_id, purpose, code_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [user.id, parsed.data.purpose, hashVerificationCode(code), expiresAt]
  );

  await sendVerificationCode({
    to: user.email,
    name: user.name,
    code,
    purpose: parsed.data.purpose
  });

  return { success: true, message: genericMessage };
}

async function verifyAndConsumeCode(userId, purpose, code) {
  const result = await pool.query(
    `SELECT id, code_hash, expires_at, attempts, used_at
     FROM auth_email_codes
     WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, purpose]
  );

  const row = result.rows[0];
  if (!row) throw new HttpError(400, 'Codigo invalido ou expirado. Solicite um novo codigo.');

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    throw new HttpError(400, 'Codigo expirado. Solicite um novo codigo.');
  }

  if (row.attempts >= env.resend.codeMaxAttempts) {
    throw new HttpError(429, 'Numero maximo de tentativas excedido. Solicite um novo codigo.');
  }

  const codeHash = hashVerificationCode(code);
  if (codeHash !== row.code_hash) {
    await pool.query(
      `UPDATE auth_email_codes SET attempts = attempts + 1 WHERE id = $1`,
      [row.id]
    );
    throw new HttpError(400, 'Codigo invalido.');
  }

  await pool.query(
    `UPDATE auth_email_codes SET used_at = NOW() WHERE id = $1`,
    [row.id]
  );

  return row.id;
}

async function revokeUserSessions(userId) {
  await pool.query(
    `UPDATE user_sessions SET revoked_at = NOW(), updated_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

async function confirmPassword(payload) {
  const parsed = confirmPasswordSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());

  const { email, code, password, passwordConfirm, purpose } = parsed.data;

  const passwordCheck = validatePasswordPair(password, passwordConfirm);
  if (!passwordCheck.valid) throw new HttpError(400, passwordCheck.message);

  const user = await findUserByEmail(email);
  if (!user) throw new HttpError(400, 'Codigo invalido ou expirado.');

  await verifyAndConsumeCode(user.id, purpose, code);

  const hash = await hashPassword(password);

  if (purpose === 'setup') {
    const result = await pool.query(
      `UPDATE users SET password = $1, updated_at = NOW()
       WHERE id = $2 AND password IS NULL
       RETURNING id, email, name`,
      [hash, user.id]
    );
    if (!result.rows[0]) {
      throw new HttpError(400, 'Senha ja configurada para este usuario. Faca login.');
    }
  } else {
    await pool.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
      [hash, user.id]
    );
    await revokeUserSessions(user.id);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name
  };
}

async function listUserCentrals(userId) {
  const result = await pool.query(
    `SELECT c.id, c.slug, c.name
     FROM centrals c
     INNER JOIN user_central_relations r ON r.central_id = c.id
     WHERE r.user_id = $1::bigint
     ORDER BY c.name ASC`,
    [userId]
  );
  return result.rows;
}

async function userHasCentralAccess(userId, centralId) {
  const result = await pool.query(
    `SELECT 1 FROM user_central_relations
     WHERE user_id = $1::bigint AND central_id = $2::bigint
     LIMIT 1`,
    [userId, centralId]
  );
  return Boolean(result.rows[0]);
}

module.exports = {
  checkEmail,
  sendCode,
  confirmPassword,
  listUserCentrals,
  userHasCentralAccess,
  PURPOSES
};
