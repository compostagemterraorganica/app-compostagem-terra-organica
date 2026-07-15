const { z } = require('zod');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');

const createTagSchema = z.object({
  central_id: z.coerce.number().int().positive(),
  name: z.string().min(1).transform((s) => s.trim())
});

const updateTagSchema = z.object({
  name: z.string().min(1).transform((s) => s.trim())
});

async function listTagsByCentral(centralId) {
  const result = await pool.query(
    `SELECT id, central_id, name, created_at, updated_at
     FROM tags
     WHERE central_id = $1
     ORDER BY name ASC`,
    [centralId]
  );
  return result.rows;
}

async function getTagById(id) {
  const result = await pool.query(
    `SELECT id, central_id, name, created_at, updated_at
     FROM tags WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Tag nao encontrada');
  return row;
}

async function createTag(payload) {
  const parsed = createTagSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());

  try {
    const result = await pool.query(
      `INSERT INTO tags (central_id, name, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, central_id, name, created_at, updated_at`,
      [parsed.data.central_id, parsed.data.name]
    );
    return result.rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError(409, 'Ja existe uma tag com este nome nesta central');
    }
    throw err;
  }
}

async function updateTag(id, payload) {
  const parsed = updateTagSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());

  try {
    const result = await pool.query(
      `UPDATE tags SET name = $2, updated_at = NOW() WHERE id = $1
       RETURNING id, central_id, name, created_at, updated_at`,
      [id, parsed.data.name]
    );
    const row = result.rows[0];
    if (!row) throw new HttpError(404, 'Tag nao encontrada');
    return row;
  } catch (err) {
    if (err.code === '23505') {
      throw new HttpError(409, 'Ja existe uma tag com este nome nesta central');
    }
    throw err;
  }
}

async function deleteTag(id) {
  const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING id', [id]);
  if (!result.rows[0]) throw new HttpError(404, 'Tag nao encontrada');
}

async function assertTagsBelongToCentral(tagIds, centralId) {
  if (!tagIds || tagIds.length === 0) return;

  const result = await pool.query(
    'SELECT id FROM tags WHERE id = ANY($1::bigint[]) AND central_id = $2',
    [tagIds, centralId]
  );

  if (result.rows.length !== tagIds.length) {
    throw new HttpError(400, 'Uma ou mais tags nao pertencem a esta central');
  }
}

async function attachTagsToVerification(verificationId, tagIds) {
  if (!tagIds || tagIds.length === 0) return;

  const values = tagIds.map((tagId, i) => `($1, $${i + 2})`).join(', ');
  await pool.query(
    `INSERT INTO volume_verification_tags (volume_verification_id, tag_id) VALUES ${values}
     ON CONFLICT DO NOTHING`,
    [verificationId, ...tagIds]
  );
}

async function replaceVerificationTags(verificationId, tagIds) {
  await pool.query('DELETE FROM volume_verification_tags WHERE volume_verification_id = $1', [verificationId]);
  await attachTagsToVerification(verificationId, tagIds || []);
}

async function getTagsForVerification(verificationId) {
  const result = await pool.query(
    `SELECT t.id, t.name
     FROM volume_verification_tags vt
     JOIN tags t ON t.id = vt.tag_id
     WHERE vt.volume_verification_id = $1
     ORDER BY t.name ASC`,
    [verificationId]
  );
  return result.rows;
}

module.exports = {
  listTagsByCentral,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  assertTagsBelongToCentral,
  attachTagsToVerification,
  replaceVerificationTags,
  getTagsForVerification
};
