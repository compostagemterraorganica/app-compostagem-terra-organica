const { z } = require('zod');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');

const verificationSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  title: z.string().min(1),
  central_id: z.coerce.number().int().positive(),
  measurement_date: z.string().optional(),
  volume_liters: z.coerce.number().nonnegative(),
  video_link: z.string().url().optional().or(z.literal('')),
  status: z.string().optional()
});

async function listVerifications({ page = 1, limit = 100, centralId, userId, fromDate, toDate }) {
  const params = [];
  const where = [];

  if (centralId) {
    params.push(centralId);
    where.push(`v.central_id = $${params.length}`);
  } else if (userId) {
    params.push(userId);
    where.push(`EXISTS (
      SELECT 1 FROM user_central_relations r
      WHERE r.central_id = v.central_id AND r.user_id = $${params.length}
    )`);
  }

  if (fromDate) {
    params.push(fromDate);
    where.push(`v.measurement_date >= $${params.length}`);
  }
  if (toDate) {
    params.push(toDate);
    where.push(`v.measurement_date <= $${params.length}`);
  }
  const offset = (page - 1) * limit;
  params.push(limit);
  params.push(offset);
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT v.id, v.title, v.published_at, v.measurement_date, v.central_id, c.name AS central_name,
            v.volume_liters, v.video_link, v.post_link, v.status, v.created_at, v.updated_at
     FROM volume_verifications v
     JOIN centrals c ON c.id = v.central_id
     ${whereSql}
     ORDER BY v.measurement_date DESC NULLS LAST, v.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
}

async function getVerificationById(id) {
  const result = await pool.query(
    `SELECT id, title, published_at, measurement_date, central_id, volume_liters, video_link, post_link, status, created_at, updated_at
     FROM volume_verifications WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Verificacao nao encontrada');
  return row;
}

async function createVerification(payload) {
  const parsed = verificationSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;
  const result = await pool.query(
    `INSERT INTO volume_verifications
      (id, title, published_at, measurement_date, central_id, volume_liters, video_link, post_link, status, raw_json, created_at, updated_at)
     VALUES (
      COALESCE($1, (SELECT COALESCE(MAX(id), 0) + 1 FROM volume_verifications)),
      $2, NOW(), $3, $4, $5, NULLIF($6, ''), NULL, COALESCE($7, 'publish'), '{}'::jsonb, NOW(), NOW()
     )
     RETURNING id, title, published_at, measurement_date, central_id, volume_liters, video_link, status`,
    [data.id || null, data.title, data.measurement_date || null, data.central_id, data.volume_liters, data.video_link || null, data.status]
  );
  return result.rows[0];
}

async function updateVerification(id, payload) {
  const parsed = verificationSchema.partial().safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;
  const result = await pool.query(
    `UPDATE volume_verifications
     SET title = COALESCE($2, title),
         measurement_date = COALESCE($3, measurement_date),
         central_id = COALESCE($4, central_id),
         volume_liters = COALESCE($5, volume_liters),
         video_link = COALESCE(NULLIF($6, ''), video_link),
         status = COALESCE($7, status),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, title, published_at, measurement_date, central_id, volume_liters, video_link, status, updated_at`,
    [id, data.title, data.measurement_date, data.central_id, data.volume_liters, data.video_link, data.status]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Verificacao nao encontrada');
  return row;
}

async function deleteVerification(id) {
  const result = await pool.query('DELETE FROM volume_verifications WHERE id = $1 RETURNING id', [id]);
  if (!result.rows[0]) throw new HttpError(404, 'Verificacao nao encontrada');
}

module.exports = {
  listVerifications,
  getVerificationById,
  createVerification,
  updateVerification,
  deleteVerification
};
