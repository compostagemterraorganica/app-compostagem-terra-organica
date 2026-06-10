const { z } = require('zod');
const { pool } = require('../../config/db');
const { extractFirstImageUrl } = require('../../utils/extractImageUrl');
const { HttpError } = require('../../utils/httpError');

const postSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  status: z.enum(['draft', 'published']).optional(),
  excerpt: z.string().optional(),
  contentHtml: z.string().optional(),
  featuredImageUrl: z.string().optional(),
  categoryIds: z.array(z.number().int().positive()).optional()
});

const PUBLIC_STATUSES = "('publish', 'published')";

function mapPostSummary(row) {
  const categories = row.categories_json || [];
  const primary = Array.isArray(categories) && categories[0] ? categories[0] : null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    featuredImageUrl: row.featured_image_url,
    publishedAt: row.published_at,
    authorLogin: row.author_login,
    primaryCategory: primary ? primary.value : null,
    primaryCategorySlug: primary ? primary.nicename : null
  };
}

function mapPublicPost(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    contentHtml: row.content_html,
    featuredImageUrl: row.featured_image_url,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorLogin: row.author_login,
    categoriesJson: row.categories_json || []
  };
}

async function listPosts(includeDraft = true) {
  const statusFilter = includeDraft ? '' : "WHERE p.status IN ('publish', 'published')";
  const result = await pool.query(
    `SELECT p.id, p.title, p.slug, p.status, p.excerpt, p.featured_image_url, p.content_html,
            p.published_at, p.created_at, p.updated_at
     FROM posts p
     ${statusFilter}
     ORDER BY p.updated_at DESC`
  );
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    excerpt: row.excerpt,
    featured_image_url: row.featured_image_url,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    thumbnail_url: row.featured_image_url || extractFirstImageUrl(row.content_html)
  }));
}

async function listPublicPosts({ page = 1, limit = 12, excludeCategory = 'central' } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
  const offset = (safePage - 1) * safeLimit;

  const conditions = [
    `p.status IN ${PUBLIC_STATUSES}`,
    `(p.post_type IS NULL OR p.post_type = 'post')`
  ];
  const params = [];

  if (excludeCategory) {
    params.push(excludeCategory);
    conditions.push(
      `NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(COALESCE(p.categories_json, '[]'::jsonb)) AS cat
        WHERE cat->>'nicename' = $${params.length}
      )`
    );
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM posts p ${where}`,
    params
  );
  const total = countResult.rows[0]?.total || 0;

  const listParams = [...params, safeLimit, offset];
  const result = await pool.query(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image_url, p.published_at,
            p.author_login, p.categories_json
     FROM posts p
     ${where}
     ORDER BY p.published_at DESC NULLS LAST, p.id DESC
     LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
    listParams
  );

  return {
    data: result.rows.map(mapPostSummary),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit))
    }
  };
}

async function listRecentPublicPosts({ limit = 5, excludeSlug = null } = {}) {
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 5));
  const params = [];
  const conditions = [
    `p.status IN ${PUBLIC_STATUSES}`,
    `(p.post_type IS NULL OR p.post_type = 'post')`
  ];

  if (excludeSlug) {
    params.push(excludeSlug);
    conditions.push(`p.slug <> $${params.length}`);
  }

  params.push(safeLimit);
  const where = `WHERE ${conditions.join(' AND ')}`;

  const result = await pool.query(
    `SELECT p.id, p.title, p.slug, p.excerpt, p.featured_image_url, p.published_at,
            p.author_login, p.categories_json
     FROM posts p
     ${where}
     ORDER BY p.published_at DESC NULLS LAST, p.id DESC
     LIMIT $${params.length}`,
    params
  );

  return result.rows.map(mapPostSummary);
}

async function getPostById(id) {
  const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Post nao encontrado');
  return row;
}

async function createPost(payload, userId) {
  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const d = parsed.data;
  const result = await pool.query(
    `INSERT INTO posts
      (title, slug, status, excerpt, content_html, featured_image_url, author_id, published_at, created_at, updated_at)
     VALUES
      ($1, $2, COALESCE($3, 'draft'), $4, $5, $6, $7, CASE WHEN $3 = 'published' THEN NOW() ELSE NULL END, NOW(), NOW())
     RETURNING *`,
    [d.title, d.slug, d.status || null, d.excerpt || null, d.contentHtml || null, d.featuredImageUrl || null, userId || null]
  );
  const post = result.rows[0];
  if (d.categoryIds?.length) await replacePostCategories(post.id, d.categoryIds);
  return post;
}

async function updatePost(id, payload) {
  const parsed = postSchema.partial().safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const d = parsed.data;
  const result = await pool.query(
    `UPDATE posts
     SET title = COALESCE($2, title),
         slug = COALESCE($3, slug),
         status = COALESCE($4, status),
         excerpt = COALESCE($5, excerpt),
         content_html = COALESCE($6, content_html),
         featured_image_url = COALESCE($7, featured_image_url),
         published_at = CASE WHEN COALESCE($4, status) = 'published' THEN COALESCE(published_at, NOW()) ELSE published_at END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, d.title, d.slug, d.status, d.excerpt, d.contentHtml, d.featuredImageUrl]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Post nao encontrado');
  if (d.categoryIds) await replacePostCategories(id, d.categoryIds);
  return row;
}

async function deletePost(id) {
  const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING id', [id]);
  if (!result.rows[0]) throw new HttpError(404, 'Post nao encontrado');
  return { deleted: true };
}

async function getPublicPostBySlug(slug) {
  const result = await pool.query(
    `SELECT id, title, slug, excerpt, content_html, featured_image_url, published_at,
            created_at, updated_at, author_login, categories_json
     FROM posts
     WHERE slug = $1 AND status IN ${PUBLIC_STATUSES}`,
    [slug]
  );
  const row = result.rows[0];
  if (!row) throw new HttpError(404, 'Post nao encontrado');
  return mapPublicPost(row);
}

async function replacePostCategories(postId, categoryIds) {
  await pool.query('DELETE FROM post_category_relations WHERE post_id = $1', [postId]);
  for (const categoryId of categoryIds) {
    await pool.query(
      'INSERT INTO post_category_relations (post_id, category_id, created_at) VALUES ($1, $2, NOW()) ON CONFLICT DO NOTHING',
      [postId, categoryId]
    );
  }
}

module.exports = {
  listPosts,
  listPublicPosts,
  listRecentPublicPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  getPublicPostBySlug
};
