const { z } = require('zod');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');
const { hashPassword } = require('../../utils/password');
const { sendUserInvitation } = require('../email/email.service');
const { isAdministrator } = require('../../utils/userRoles');

function formatUser(row) {
  if (!row) return row;
  const { roles_json, ...rest } = row;
  return {
    ...rest,
    roles: roles_json || [],
    isAdministrator: isAdministrator(roles_json)
  };
}

const createUserSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  description: z.string().optional(),
  centralIds: z.array(z.coerce.number().int().positive()).optional().default([])
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  description: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  isAdministrator: z.boolean().optional()
});

async function listUsers() {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.description, u.registered_at, u.roles_json,
            COALESCE(
              (
                SELECT json_agg(json_build_object('id', x.id, 'name', x.name) ORDER BY x.name)
                FROM (
                  SELECT DISTINCT c.id, c.name
                  FROM user_central_relations r
                  INNER JOIN centrals c ON c.id = r.central_id
                  WHERE r.user_id = u.id
                ) x
              ),
              '[]'::json
            ) AS centrals
     FROM users u
     ORDER BY u.id`
  );
  return result.rows.map(formatUser);
}

async function getUserById(id) {
  const result = await pool.query(
    'SELECT id, name, email, avatar_url, description, registered_at, roles_json FROM users WHERE id = $1',
    [id]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Usuario nao encontrado');
  return formatUser(row);
}

async function createUser(payload) {
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());

  const { name, email, description, centralIds } = parsed.data;

  const existing = await pool.query(
    'SELECT id FROM users WHERE lower(email) = lower($1) LIMIT 1',
    [email]
  );
  if (existing.rows[0]) {
    throw new HttpError(409, 'Email ja cadastrado');
  }

  const client = await pool.connect();
  let user;
  let centralNames = [];

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (id, name, email, description, password, roles_json, registered_at, raw_json, created_at, updated_at)
       VALUES (
        COALESCE($1, (SELECT COALESCE(MAX(id), 0) + 1 FROM users)),
        $2, $3, $4, NULL, '[]'::jsonb, NOW(), '{}'::jsonb, NOW(), NOW()
       )
       RETURNING id, name, email, description, registered_at, roles_json`,
      [parsed.data.id || null, name, email, description || null]
    );
    user = userResult.rows[0];

    for (const centralId of centralIds) {
      const centralResult = await client.query(
        'SELECT id, name FROM centrals WHERE id = $1',
        [centralId]
      );
      const central = centralResult.rows[0];
      if (!central) {
        throw new HttpError(400, `Central ${centralId} nao encontrada`);
      }

      await client.query(
        `INSERT INTO user_central_relations
         (relation_type, central_id, user_id, source, raw_json, created_at, updated_at)
         VALUES ('manual', $1, $2, 'invite', '{}'::jsonb, NOW(), NOW())
         ON CONFLICT (central_id, user_id, relation_type) DO UPDATE SET updated_at = NOW()`,
        [centralId, user.id]
      );
      centralNames.push(central.name);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  try {
    await sendUserInvitation({
      to: user.email,
      name: user.name,
      email: user.email,
      centrals: centralNames,
      downloadUrl: env.appDownloadUrl
    });
  } catch {
    throw new HttpError(
      502,
      'Usuario criado, mas falha ao enviar email de convite. Verifique a configuracao de email.'
    );
  }

  return {
    ...formatUser(user),
    centralIds,
    invitationSent: true
  };
}

async function updateUser(id, payload) {
  const parsed = updateUserSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;

  let rolesJson;
  if (data.isAdministrator === true) {
    rolesJson = JSON.stringify(['administrator']);
  } else if (data.isAdministrator === false) {
    rolesJson = JSON.stringify([]);
  }

  const result = await pool.query(
    `UPDATE users
     SET name = COALESCE($2, name),
         email = COALESCE($3, email),
         description = COALESCE($4, description),
         avatar_url = COALESCE(NULLIF($5, ''), avatar_url),
         roles_json = COALESCE($6::jsonb, roles_json),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, email, avatar_url, description, registered_at, roles_json`,
    [
      id,
      data.name,
      data.email,
      data.description,
      data.avatar_url,
      rolesJson ? rolesJson : null
    ]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Usuario nao encontrado');
  return formatUser(row);
}

async function updatePassword(id, password) {
  if (!password || String(password).length < 6) throw new HttpError(400, 'Senha deve ter no minimo 6 caracteres');
  const hash = await hashPassword(password);
  const result = await pool.query(
    `UPDATE users
     SET password = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [id, hash]
  );
  if (!result.rows[0]) throw new HttpError(404, 'Usuario nao encontrado');
}

async function deleteUser(id) {
  const existing = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
  if (!existing.rows[0]) throw new HttpError(404, 'Usuario nao encontrado');

  await pool.query('DELETE FROM user_central_relations WHERE user_id = $1', [id]);
  await pool.query('UPDATE pages SET created_by = NULL WHERE created_by = $1', [id]);
  await pool.query('UPDATE page_versions SET created_by = NULL WHERE created_by = $1', [id]);
  await pool.query('UPDATE posts SET author_id = NULL WHERE author_id = $1', [id]);
  await pool.query('UPDATE media_assets SET uploaded_by = NULL WHERE uploaded_by = $1', [id]);

  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  if (!result.rows[0]) throw new HttpError(404, 'Usuario nao encontrado');
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  updatePassword,
  deleteUser
};
