const { z } = require('zod');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');
const { decodeHtmlEntities } = require('../../utils/htmlEntities');
const { mapPublicCentral } = require('./centrals.mapper');
const { EMPTY_CENTRAL_META, normalizeCentralMeta } = require('./central-meta');
const {
  pickStoredListingImage,
  resolveCentralImageUrl
} = require('./centrals-images.service');

const nullableString = z.union([z.string(), z.null()]).optional();

const centralMetaSchema = z.object({
  central_info: z
    .object({
      published: nullableString,
      central_text: nullableString,
      responsible: nullableString
    })
    .optional(),
  location: z
    .object({
      city_name: nullableString,
      city_slug: nullableString,
      state_name: nullableString,
      state_uf: nullableString,
      address: nullableString
    })
    .optional(),
  contact: z
    .object({
      email: nullableString,
      phone: nullableString
    })
    .optional(),
  social: z
    .object({
      instagram: nullableString,
      facebook: nullableString
    })
    .optional()
});

const centralSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().min(1).optional(),
  name: z.string().min(1),
  is_active: z.boolean().optional(),
  meta: centralMetaSchema.optional()
});

const PUBLIC_CENTRALS_BASE_QUERY = `
  SELECT c.id, c.slug, c.name, c.image_url, c.raw_json, c.meta,
         COALESCE(SUM(v.volume_liters), 0) AS total_volume_liters,
         COALESCE(AVG(v.volume_liters), 0) AS avg_volume_liters,
         COUNT(v.id)::int AS verification_count
  FROM centrals c
  LEFT JOIN volume_verifications v ON v.central_id = c.id
`;

async function listPublicCentrals() {
  const result = await pool.query(
    `${PUBLIC_CENTRALS_BASE_QUERY}
     GROUP BY c.id, c.slug, c.name, c.image_url, c.raw_json, c.meta
     ORDER BY total_volume_liters DESC, verification_count DESC, c.name ASC`
  );

  return Promise.all(
    result.rows.map(async (row) => {
      const listingImageUrl = await resolveCentralImageUrl(row);
      return mapPublicCentral(row, { listingImageUrl });
    })
  );
}

async function getPublicCentralBySlug(slug) {
  const result = await pool.query(
    `${PUBLIC_CENTRALS_BASE_QUERY}
     WHERE c.slug = $1
     GROUP BY c.id, c.slug, c.name, c.image_url, c.raw_json, c.meta`,
    [slug]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Central nao encontrada');

  const verifications = await pool.query(
    `SELECT id, title, volume_liters,
            COALESCE(
              NULLIF(volume_kg, 0),
              CASE WHEN volume_liters > 0 THEN ROUND(volume_liters * 0.55, 2) ELSE NULL END
            ) AS volume_kg,
            measurement_date, video_link
     FROM volume_verifications
     WHERE central_id = $1
     ORDER BY measurement_date DESC NULLS LAST, id DESC
     LIMIT 20`,
    [row.id]
  );

  const listingImageUrl = await resolveCentralImageUrl(row);
  return mapPublicCentral(row, { verifications: verifications.rows, listingImageUrl });
}

async function listCentrals() {
  const result = await pool.query(
    'SELECT id, slug, name, image_url, raw_json, meta, is_active, created_at, updated_at FROM centrals ORDER BY id'
  );
  return result.rows.map((row) => {
    const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json || {};
    const imageUrl = row.image_url || pickStoredListingImage(raw);
    return {
      id: row.id,
      slug: row.slug,
      name: decodeHtmlEntities(row.name || ''),
      image_url: imageUrl,
      is_active: row.is_active,
      meta: normalizeCentralMeta(row.meta),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  });
}

async function getCentralById(id) {
  const result = await pool.query(
    'SELECT id, slug, name, meta, is_active, created_at, updated_at FROM centrals WHERE id = $1',
    [id]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Central nao encontrada');
  return {
    ...row,
    name: decodeHtmlEntities(row.name || ''),
    meta: normalizeCentralMeta(row.meta)
  };
}

async function createCentral(payload) {
  const parsed = centralSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;
  const meta = normalizeCentralMeta(data.meta || EMPTY_CENTRAL_META);
  const result = await pool.query(
    `INSERT INTO centrals (id, slug, name, is_active, raw_json, meta, created_at, updated_at)
     VALUES (COALESCE($1, (SELECT COALESCE(MAX(id), 0) + 1 FROM centrals)), $2, $3, COALESCE($4, true), '{}'::jsonb, $5::jsonb, NOW(), NOW())
     RETURNING id, slug, name, is_active, meta, created_at, updated_at`,
    [data.id || null, data.slug || null, data.name, data.is_active ?? true, JSON.stringify(meta)]
  );
  const row = result.rows[0];
  return { ...row, meta: normalizeCentralMeta(row.meta) };
}

async function updateCentral(id, payload) {
  const parsed = centralSchema.partial().safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;
  const meta = data.meta !== undefined ? normalizeCentralMeta(data.meta) : null;
  const result = await pool.query(
    `UPDATE centrals
     SET slug = COALESCE($2, slug),
         name = COALESCE($3, name),
         is_active = COALESCE($4, is_active),
         meta = COALESCE($5::jsonb, meta),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, slug, name, is_active, meta, created_at, updated_at`,
    [id, data.slug, data.name, data.is_active, meta ? JSON.stringify(meta) : null]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Central nao encontrada');
  return { ...row, meta: normalizeCentralMeta(row.meta) };
}

async function listCentralUsers(centralId) {
  const result = await pool.query(
    `SELECT u.id, u.name, u.email
     FROM user_central_relations r
     JOIN users u ON u.id = r.user_id
     WHERE r.central_id = $1
     ORDER BY u.id`,
    [centralId]
  );
  return result.rows;
}

async function replaceCentralUsers(centralId, userIds) {
  await pool.query('DELETE FROM user_central_relations WHERE central_id = $1', [centralId]);
  for (const userId of userIds) {
    await addCentralUser(centralId, userId);
  }
}

async function addCentralUser(centralId, userId) {
  const central = await pool.query('SELECT id FROM centrals WHERE id = $1', [centralId]);
  if (!central.rows[0]) throw new HttpError(404, 'Central nao encontrada');

  const user = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (!user.rows[0]) throw new HttpError(404, 'Usuario nao encontrado');

  await pool.query(
    `INSERT INTO user_central_relations
     (relation_type, central_id, user_id, source, raw_json, created_at, updated_at)
     VALUES ('manual', $1, $2, 'api', '{}'::jsonb, NOW(), NOW())
     ON CONFLICT (central_id, user_id, relation_type) DO UPDATE SET updated_at = NOW()`,
    [centralId, userId]
  );
}

async function removeCentralUser(centralId, userId) {
  const result = await pool.query(
    'DELETE FROM user_central_relations WHERE central_id = $1 AND user_id = $2 RETURNING id',
    [centralId, userId]
  );
  if (!result.rows[0]) throw new HttpError(404, 'Vinculo nao encontrado');
}

async function deleteCentral(id) {
  const existing = await pool.query('SELECT id FROM centrals WHERE id = $1', [id]);
  if (!existing.rows[0]) throw new HttpError(404, 'Central nao encontrada');

  await pool.query('DELETE FROM user_central_relations WHERE central_id = $1', [id]);
  await pool.query('DELETE FROM volume_verifications WHERE central_id = $1', [id]);
  await pool.query('DELETE FROM centrals WHERE id = $1', [id]);
}

module.exports = {
  listPublicCentrals,
  getPublicCentralBySlug,
  listCentrals,
  getCentralById,
  createCentral,
  updateCentral,
  deleteCentral,
  listCentralUsers,
  replaceCentralUsers,
  addCentralUser,
  removeCentralUser
};
