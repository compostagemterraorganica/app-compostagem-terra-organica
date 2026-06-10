const { z } = require('zod');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');
const { decodeHtmlEntities } = require('../../utils/htmlEntities');
const { mapPublicCentral } = require('./centrals.mapper');
const {
  fetchListingImageMap,
  getListingImageForSlug,
  pickStoredListingImage,
  resolvePublicUrl
} = require('./centrals-images.service');

const centralSchema = z.object({
  id: z.number().int().positive().optional(),
  slug: z.string().min(1).optional(),
  name: z.string().min(1)
});

const PUBLIC_CENTRALS_BASE_QUERY = `
  SELECT c.id, c.slug, c.name, c.image_url, c.raw_json,
         COALESCE(SUM(v.volume_liters), 0) AS total_volume_liters,
         COALESCE(AVG(v.volume_liters), 0) AS avg_volume_liters,
         COUNT(v.id)::int AS verification_count
  FROM centrals c
  LEFT JOIN volume_verifications v ON v.central_id = c.id
`;

async function resolveCentralImage(row, listingMap) {
  const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json || {};
  const stored = pickStoredListingImage(raw);
  if (stored) return resolvePublicUrl(stored);

  const fromListing = listingMap?.[row.slug];
  if (fromListing) return resolvePublicUrl(fromListing);

  return getListingImageForSlug(row.slug);
}

async function listPublicCentrals() {
  const result = await pool.query(
    `${PUBLIC_CENTRALS_BASE_QUERY}
     GROUP BY c.id, c.slug, c.name, c.image_url, c.raw_json
     ORDER BY c.name ASC`
  );

  let listingMap = {};
  try {
    listingMap = await fetchListingImageMap();
  } catch {
    listingMap = {};
  }

  return Promise.all(
    result.rows.map(async (row) => {
      const listingImageUrl = await resolveCentralImage(row, listingMap);
      return mapPublicCentral(row, { listingImageUrl });
    })
  );
}

async function getPublicCentralBySlug(slug) {
  const result = await pool.query(
    `${PUBLIC_CENTRALS_BASE_QUERY}
     WHERE c.slug = $1
     GROUP BY c.id, c.slug, c.name, c.image_url, c.raw_json`,
    [slug]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Central nao encontrada');

  const verifications = await pool.query(
    `SELECT id, title, volume_liters, measurement_date, video_link
     FROM volume_verifications
     WHERE central_id = $1
     ORDER BY measurement_date DESC NULLS LAST, id DESC
     LIMIT 20`,
    [row.id]
  );

  const listingImageUrl = await resolveCentralImage(row);
  return mapPublicCentral(row, { verifications: verifications.rows, listingImageUrl });
}

async function listCentrals() {
  const result = await pool.query(
    'SELECT id, slug, name, image_url, raw_json, created_at, updated_at FROM centrals ORDER BY id'
  );
  return result.rows.map((row) => {
    const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json || {};
    const imageUrl = row.image_url || pickStoredListingImage(raw);
    return {
      id: row.id,
      slug: row.slug,
      name: decodeHtmlEntities(row.name || ''),
      image_url: imageUrl,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  });
}

async function getCentralById(id) {
  const result = await pool.query('SELECT id, slug, name, created_at, updated_at FROM centrals WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Central nao encontrada');
  return { ...row, name: decodeHtmlEntities(row.name || '') };
}

async function createCentral(payload) {
  const parsed = centralSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;
  const result = await pool.query(
    `INSERT INTO centrals (id, slug, name, raw_json, created_at, updated_at)
     VALUES (COALESCE($1, (SELECT COALESCE(MAX(id), 0) + 1 FROM centrals)), $2, $3, '{}'::jsonb, NOW(), NOW())
     RETURNING id, slug, name, created_at, updated_at`,
    [data.id || null, data.slug || null, data.name]
  );
  return result.rows[0];
}

async function updateCentral(id, payload) {
  const parsed = centralSchema.partial().safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const data = parsed.data;
  const result = await pool.query(
    `UPDATE centrals
     SET slug = COALESCE($2, slug),
         name = COALESCE($3, name),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, slug, name, created_at, updated_at`,
    [id, data.slug, data.name]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Central nao encontrada');
  return row;
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
