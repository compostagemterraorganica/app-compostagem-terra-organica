const { z } = require('zod');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');
const { resolveVolumePair } = require('../../utils/volumeConversion');
const {
  assertTagsBelongToCentral,
  getTagsForVerification
} = require('../central-tags/central-tags.service');

const verificationSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  title: z.string().min(1),
  central_id: z.coerce.number().int().positive(),
  measurement_date: z.string().optional(),
  volume_liters: z.coerce.number().nonnegative().optional(),
  volume_kg: z.coerce.number().nonnegative().optional(),
  waste_type: z.enum(['alimentares', 'verdes']).default('alimentares'),
  video_link: z.string().url().optional().or(z.literal('')),
  status: z.string().optional(),
  tag_ids: z.array(z.coerce.number().int().positive()).optional()
});

const VERIFICATION_COLUMNS = `
  v.id, v.title, v.published_at, v.measurement_date, v.central_id,
  v.volume_liters,
  COALESCE(
    NULLIF(v.volume_kg, 0),
    CASE WHEN v.volume_liters > 0 THEN ROUND(v.volume_liters * 0.55, 2) ELSE NULL END
  ) AS volume_kg,
  v.waste_type,
  v.video_link, v.post_link, v.status, v.created_at, v.updated_at
`;

const VERIFICATION_COLUMNS_BY_ID = `
  id, title, published_at, measurement_date, central_id,
  volume_liters,
  COALESCE(
    NULLIF(volume_kg, 0),
    CASE WHEN volume_liters > 0 THEN ROUND(volume_liters * 0.55, 2) ELSE NULL END
  ) AS volume_kg,
  waste_type,
  video_link, post_link, status, created_at, updated_at
`;

async function enrichWithTags(rows) {
  if (!rows.length) return rows;

  const ids = rows.map((row) => row.id);
  const result = await pool.query(
    `SELECT vt.volume_verification_id, t.id, t.name
     FROM volume_verification_tags vt
     JOIN tags t ON t.id = vt.tag_id
     WHERE vt.volume_verification_id = ANY($1::bigint[])
     ORDER BY t.name ASC`,
    [ids]
  );

  const tagsByVerification = new Map();
  for (const row of result.rows) {
    if (!tagsByVerification.has(row.volume_verification_id)) {
      tagsByVerification.set(row.volume_verification_id, []);
    }
    tagsByVerification.get(row.volume_verification_id).push({ id: row.id, name: row.name });
  }

  return rows.map((row) => ({
    ...row,
    tags: tagsByVerification.get(row.id) || []
  }));
}

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
    `SELECT ${VERIFICATION_COLUMNS}, c.name AS central_name
     FROM volume_verifications v
     JOIN centrals c ON c.id = v.central_id
     ${whereSql}
     ORDER BY v.measurement_date DESC NULLS LAST, v.id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return enrichWithTags(result.rows);
}

async function getVerificationById(id) {
  const result = await pool.query(
    `SELECT ${VERIFICATION_COLUMNS_BY_ID}
     FROM volume_verifications WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Verificacao nao encontrada');
  const [enriched] = await enrichWithTags([row]);
  return enriched;
}

async function createVerification(payload) {
  const parsed = verificationSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;

  const volumes = resolveVolumePair(data);
  if (volumes.volume_liters <= 0 && volumes.volume_kg <= 0) {
    throw new HttpError(400, 'Informe volume em litros ou quilos');
  }

  const tagIds = data.tag_ids || [];
  await assertTagsBelongToCentral(tagIds, data.central_id);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO volume_verifications
        (id, title, published_at, measurement_date, central_id, volume_liters, volume_kg,
         waste_type, video_link, post_link, status, raw_json, created_at, updated_at)
       VALUES (
        COALESCE($1, (SELECT COALESCE(MAX(id), 0) + 1 FROM volume_verifications)),
        $2, NOW(), $3, $4, $5, $6, $7, NULLIF($8, ''), NULL, COALESCE($9, 'publish'),
        '{}'::jsonb, NOW(), NOW()
       )
       RETURNING id, title, published_at, measurement_date, central_id, volume_liters, volume_kg,
                 waste_type, video_link, status`,
      [
        data.id || null,
        data.title,
        data.measurement_date || null,
        data.central_id,
        volumes.volume_liters,
        volumes.volume_kg,
        data.waste_type,
        data.video_link || null,
        data.status
      ]
    );

    const row = result.rows[0];
    if (tagIds.length) {
      const values = tagIds.map((_, i) => `($1, $${i + 2})`).join(', ');
      await client.query(
        `INSERT INTO volume_verification_tags (volume_verification_id, tag_id) VALUES ${values}`,
        [row.id, ...tagIds]
      );
    }

    await client.query('COMMIT');

    const tags = await getTagsForVerification(row.id);
    return { ...row, tags };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateVerification(id, payload) {
  const parsed = verificationSchema.partial().safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;

  const existing = await pool.query(
    'SELECT central_id, volume_liters, volume_kg FROM volume_verifications WHERE id = $1',
    [id]
  );
  const current = existing.rows[0];
  if (!current) throw new HttpError(404, 'Verificacao nao encontrada');

  const centralId = data.central_id || current.central_id;
  const volumes = resolveVolumePair({
    volume_liters: data.volume_liters !== undefined ? data.volume_liters : current.volume_liters,
    volume_kg: data.volume_kg !== undefined ? data.volume_kg : current.volume_kg
  });

  if (data.tag_ids !== undefined) {
    await assertTagsBelongToCentral(data.tag_ids, centralId);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE volume_verifications
       SET title = COALESCE($2, title),
           measurement_date = COALESCE($3, measurement_date),
           central_id = COALESCE($4, central_id),
           volume_liters = $5,
           volume_kg = $6,
           waste_type = COALESCE($7, waste_type),
           video_link = COALESCE(NULLIF($8, ''), video_link),
           status = COALESCE($9, status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, published_at, measurement_date, central_id, volume_liters, volume_kg,
                 waste_type, video_link, status, updated_at`,
      [
        id,
        data.title,
        data.measurement_date,
        data.central_id,
        volumes.volume_liters,
        volumes.volume_kg,
        data.waste_type,
        data.video_link,
        data.status
      ]
    );

    if (data.tag_ids !== undefined) {
      await client.query('DELETE FROM volume_verification_tags WHERE volume_verification_id = $1', [id]);
      if (data.tag_ids.length) {
        const values = data.tag_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO volume_verification_tags (volume_verification_id, tag_id) VALUES ${values}`,
          [id, ...data.tag_ids]
        );
      }
    }

    await client.query('COMMIT');

    const row = result.rows[0];
    const tags = await getTagsForVerification(row.id);
    return { ...row, tags };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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
