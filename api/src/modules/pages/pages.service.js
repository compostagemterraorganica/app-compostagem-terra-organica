const { z } = require('zod');
const { pool } = require('../../config/db');
const { extractFirstImageUrl } = require('../../utils/extractImageUrl');
const { HttpError } = require('../../utils/httpError');

const pageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['draft', 'published']).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional()
});

const versionSchema = z.object({
  grapesProjectJson: z.any().optional(),
  htmlSnapshot: z.string().optional(),
  cssSnapshot: z.string().optional()
});

async function listPages() {
  const result = await pool.query(
    `SELECT p.id, p.slug, p.title, p.status, p.published_at, p.created_at, p.updated_at,
            COALESCE(MAX(v.version_number), 0) AS latest_version,
            (
              SELECT html_snapshot
              FROM page_versions
              WHERE page_id = p.id
              ORDER BY version_number DESC
              LIMIT 1
            ) AS latest_html_snapshot
     FROM pages p
     LEFT JOIN page_versions v ON v.page_id = p.id
     GROUP BY p.id
     ORDER BY p.updated_at DESC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    latest_version: row.latest_version,
    thumbnail_url: extractFirstImageUrl(row.latest_html_snapshot)
  }));
}

async function getPageById(id) {
  const result = await pool.query('SELECT * FROM pages WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Pagina nao encontrada');
  return row;
}

async function createPage(payload, userId) {
  const parsed = pageSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const d = parsed.data;
  const result = await pool.query(
    `INSERT INTO pages (slug, title, status, seo_title, seo_description, created_by, created_at, updated_at)
     VALUES ($1, $2, COALESCE($3, 'draft'), $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [d.slug, d.title, d.status || null, d.seoTitle || null, d.seoDescription || null, userId || null]
  );
  return result.rows[0];
}

async function updatePage(id, payload) {
  const parsed = pageSchema.partial().safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const d = parsed.data;
  const result = await pool.query(
    `UPDATE pages
     SET slug = COALESCE($2, slug),
         title = COALESCE($3, title),
         status = COALESCE($4, status),
         seo_title = COALESCE($5, seo_title),
         seo_description = COALESCE($6, seo_description),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, d.slug, d.title, d.status, d.seoTitle, d.seoDescription]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Pagina nao encontrada');
  return row;
}

async function deletePage(id) {
  const result = await pool.query('DELETE FROM pages WHERE id = $1 RETURNING id', [id]);
  if (!result.rows[0]) throw new HttpError(404, 'Pagina nao encontrada');
  return { deleted: true };
}

async function createVersion(pageId, payload, userId) {
  const parsed = versionSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const next = await pool.query(
    'SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM page_versions WHERE page_id = $1',
    [pageId]
  );
  const versionNumber = next.rows[0].next;
  const d = parsed.data;
  const result = await pool.query(
    `INSERT INTO page_versions
      (page_id, version_number, grapes_project_json, html_snapshot, css_snapshot, is_published, created_by, created_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, false, $6, NOW())
     RETURNING *`,
    [pageId, versionNumber, JSON.stringify(d.grapesProjectJson || {}), d.htmlSnapshot || '', d.cssSnapshot || '', userId || null]
  );
  return result.rows[0];
}

async function listVersions(pageId) {
  const result = await pool.query(
    `SELECT id, page_id, version_number, grapes_project_json, html_snapshot, css_snapshot, is_published, created_at
     FROM page_versions
     WHERE page_id = $1
     ORDER BY version_number DESC`,
    [pageId]
  );
  return result.rows;
}

async function getLatestVersion(pageId) {
  await getPageById(pageId);
  const result = await pool.query(
    `SELECT id, page_id, version_number, grapes_project_json, html_snapshot, css_snapshot, is_published, created_at
     FROM page_versions
     WHERE page_id = $1
     ORDER BY version_number DESC
     LIMIT 1`,
    [pageId]
  );
  return result.rows[0] || null;
}

async function publishPage(pageId) {
  const versionResult = await pool.query(
    'SELECT id, version_number FROM page_versions WHERE page_id = $1 ORDER BY version_number DESC LIMIT 1',
    [pageId]
  );
  const version = versionResult.rows[0];
  if (!version) throw new HttpError(400, 'Pagina sem versao para publicar');
  await pool.query('UPDATE page_versions SET is_published = false WHERE page_id = $1', [pageId]);
  await pool.query('UPDATE page_versions SET is_published = true WHERE id = $1', [version.id]);
  const result = await pool.query(
    `UPDATE pages
     SET status = 'published', published_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [pageId]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Pagina nao encontrada');
  return row;
}

async function getPublicPageBySlug(slug) {
  const result = await pool.query(
    `SELECT p.id, p.slug, p.title, p.seo_title, p.seo_description, v.html_snapshot, v.css_snapshot
     FROM pages p
     LEFT JOIN page_versions v ON v.page_id = p.id AND v.is_published = true
     WHERE p.slug = $1 AND p.status = 'published'`,
    [slug]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Pagina nao encontrada');
  return row;
}

async function getPublicPageById(id) {
  const result = await pool.query(
    `SELECT p.id, p.slug, p.title, p.seo_title, p.seo_description,
            v.html_snapshot, v.css_snapshot, v.grapes_project_json
     FROM pages p
     LEFT JOIN page_versions v ON v.page_id = p.id AND v.is_published = true
     WHERE p.id = $1 AND p.status = 'published'`,
    [id]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Pagina nao encontrada');
  return row;
}

module.exports = {
  listPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  createVersion,
  listVersions,
  getLatestVersion,
  publishPage,
  getPublicPageBySlug,
  getPublicPageById
};
