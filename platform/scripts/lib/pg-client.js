const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

function getPoolFromEnv() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('POSTGRES_URL nao configurado no ambiente.');
  }
  return new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
}

async function runSqlFile(pool, absolutePath) {
  const sql = fs.readFileSync(absolutePath, 'utf8');
  await pool.query(sql);
}

async function runMigrations(pool, migrationsDir) {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const absolutePath = path.join(migrationsDir, file);
    await runSqlFile(pool, absolutePath);
  }
}

async function truncateAllTables(pool) {
  await pool.query(`
    TRUNCATE TABLE
      posts,
      user_central_relations,
      volume_verifications,
      users,
      centrals
    RESTART IDENTITY CASCADE
  `);
}

async function upsertUsers(pool, users) {
  const query = `
    INSERT INTO users (
      id, name, email, avatar_url, description, registered_at,
      roles_json, capabilities_json, raw_json, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7::jsonb, $8::jsonb, $9::jsonb, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      avatar_url = EXCLUDED.avatar_url,
      description = EXCLUDED.description,
      registered_at = EXCLUDED.registered_at,
      roles_json = EXCLUDED.roles_json,
      capabilities_json = EXCLUDED.capabilities_json,
      raw_json = EXCLUDED.raw_json,
      updated_at = NOW()
  `;

  for (const row of users) {
    await pool.query(query, [
      row.id,
      row.name,
      row.email,
      row.avatar_url,
      row.description,
      row.registered_at,
      JSON.stringify(row.roles_json || []),
      JSON.stringify(row.capabilities_json || {}),
      JSON.stringify(row.raw_json || {})
    ]);
  }
}

async function upsertCentrals(pool, centrals) {
  const query = `
    INSERT INTO centrals (id, slug, name, raw_json, updated_at)
    VALUES ($1, $2, $3, $4::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      raw_json = EXCLUDED.raw_json,
      updated_at = NOW()
  `;

  for (const row of centrals) {
    await pool.query(query, [row.id, row.slug, row.name, JSON.stringify(row.raw_json || {})]);
  }
}

async function upsertVolumeVerifications(pool, verifications) {
  const query = `
    INSERT INTO volume_verifications (
      id, title, published_at, measurement_date, central_id, volume_liters,
      video_link, post_link, status, raw_json, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10::jsonb, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      published_at = EXCLUDED.published_at,
      measurement_date = EXCLUDED.measurement_date,
      central_id = EXCLUDED.central_id,
      volume_liters = EXCLUDED.volume_liters,
      video_link = EXCLUDED.video_link,
      post_link = EXCLUDED.post_link,
      status = EXCLUDED.status,
      raw_json = EXCLUDED.raw_json,
      updated_at = NOW()
  `;

  for (const row of verifications) {
    await pool.query(query, [
      row.id,
      row.title,
      row.published_at,
      row.measurement_date,
      row.central_id,
      row.volume_liters,
      row.video_link,
      row.post_link,
      row.status,
      JSON.stringify(row.raw_json || {})
    ]);
  }
}

async function upsertUserCentralRelations(pool, relations) {
  const query = `
    INSERT INTO user_central_relations (
      relation_type, central_id, user_id, source, raw_json, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5::jsonb, NOW()
    )
    ON CONFLICT (central_id, user_id, relation_type) DO UPDATE SET
      source = EXCLUDED.source,
      raw_json = EXCLUDED.raw_json,
      updated_at = NOW()
  `;

  for (const row of relations) {
    await pool.query(query, [
      row.relation_type,
      row.central_id,
      row.user_id,
      row.source,
      JSON.stringify(row.raw_json || {})
    ]);
  }
}

async function upsertPosts(pool, posts) {
  const query = `
    INSERT INTO posts (
      id, title, slug, link, author_login, status, published_at, post_type,
      excerpt, content_html, categories_json, tags_json, raw_json, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11::jsonb, $12::jsonb, $13::jsonb, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      slug = EXCLUDED.slug,
      link = EXCLUDED.link,
      author_login = EXCLUDED.author_login,
      status = EXCLUDED.status,
      published_at = EXCLUDED.published_at,
      post_type = EXCLUDED.post_type,
      excerpt = EXCLUDED.excerpt,
      content_html = EXCLUDED.content_html,
      categories_json = EXCLUDED.categories_json,
      tags_json = EXCLUDED.tags_json,
      raw_json = EXCLUDED.raw_json,
      updated_at = NOW()
  `;

  for (const row of posts) {
    await pool.query(query, [
      row.id,
      row.title,
      row.slug,
      row.link,
      row.author_login,
      row.status,
      row.published_at,
      row.post_type,
      row.excerpt,
      row.content_html,
      JSON.stringify(row.categories_json || []),
      JSON.stringify(row.tags_json || []),
      JSON.stringify(row.raw_json || {})
    ]);
  }
}

module.exports = {
  getPoolFromEnv,
  runMigrations,
  truncateAllTables,
  upsertUsers,
  upsertCentrals,
  upsertVolumeVerifications,
  upsertUserCentralRelations,
  upsertPosts
};
