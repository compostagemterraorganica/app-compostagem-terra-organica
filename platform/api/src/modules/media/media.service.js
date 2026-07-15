const crypto = require('crypto');
const path = require('path');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');
const { uploadBuffer, deleteObject, isS3Configured } = require('../../config/s3');

function mapAsset(row) {
  const publicUrl = row.public_url || row.url;
  return {
    id: row.id,
    path: row.path,
    url: publicUrl,
    publicUrl,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    altText: row.alt_text,
    createdAt: row.created_at
  };
}

async function findAssetBySha256(sha256) {
  const result = await pool.query(
    `SELECT * FROM media_assets WHERE sha256 = $1 LIMIT 1`,
    [sha256]
  );
  return result.rows[0] || null;
}

async function createMedia(file, userId) {
  if (!file) throw new HttpError(400, 'Arquivo de imagem obrigatorio');
  if (!isS3Configured()) {
    throw new HttpError(500, 'S3 nao configurado para upload de midia');
  }

  const buffer = file.buffer;
  if (!buffer?.length) throw new HttpError(400, 'Arquivo de imagem vazio');

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const existing = await findAssetBySha256(sha256);
  if (existing) return mapAsset(existing);

  const ext = path.extname(file.originalname).toLowerCase() || '.bin';
  const storageKey = `media/${crypto.randomUUID()}${ext}`;

  const uploaded = await uploadBuffer({
    key: storageKey,
    buffer,
    mimeType: file.mimetype,
    metadata: { source: 'upload', originalName: file.originalname }
  });

  const result = await pool.query(
    `INSERT INTO media_assets
      (path, url, storage_key, public_url, sha256, source, original_name, mime_type, size_bytes, uploaded_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     RETURNING *`,
    [
      uploaded.storageKey,
      uploaded.publicUrl,
      uploaded.storageKey,
      uploaded.publicUrl,
      sha256,
      'upload',
      file.originalname,
      file.mimetype,
      buffer.length,
      userId || null
    ]
  );

  return mapAsset(result.rows[0]);
}

async function listMedia() {
  const result = await pool.query(
    `SELECT id, path, url, storage_key, public_url, mime_type, size_bytes, alt_text, created_at
     FROM media_assets
     ORDER BY id DESC`
  );
  return result.rows.map(mapAsset);
}

async function countAssetUsage(publicUrl) {
  if (!publicUrl) return 0;
  const posts = await pool.query(
    `SELECT COUNT(*)::int AS c FROM posts
     WHERE content_html LIKE $1 OR featured_image_url = $2`,
    [`%${publicUrl}%`, publicUrl]
  );
  const pages = await pool.query(
    `SELECT COUNT(*)::int AS c FROM page_versions
     WHERE html_snapshot LIKE $1 OR css_snapshot LIKE $1 OR grapes_project_json::text LIKE $1`,
    [`%${publicUrl}%`]
  );
  return posts.rows[0].c + pages.rows[0].c;
}

async function deleteMedia(id) {
  const result = await pool.query(`SELECT * FROM media_assets WHERE id = $1`, [id]);
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Midia nao encontrada');

  const usage = await countAssetUsage(row.public_url || row.url);
  if (usage > 0) {
    throw new HttpError(409, `Midia em uso em ${usage} registro(s) de conteudo`);
  }

  if (row.storage_key && isS3Configured()) {
    await deleteObject(row.storage_key);
  }

  await pool.query(`DELETE FROM media_assets WHERE id = $1`, [id]);
  return { deleted: true };
}

module.exports = {
  createMedia,
  listMedia,
  deleteMedia,
  mapAsset
};
