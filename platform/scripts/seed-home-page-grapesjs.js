#!/usr/bin/env node
const path = require('path')
const dotenv = require('dotenv')
const { getPoolFromEnv } = require('./lib/pg-client')
const { htmlSnapshot, cssSnapshot, grapesProjectJson } = require('./lib/home-page-content')

function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
}

async function seedHomePage(pool) {
  const existing = await pool.query('SELECT id FROM pages WHERE slug = $1', ['home'])
  let pageId

  if (existing.rows[0]) {
    pageId = existing.rows[0].id
    await pool.query(
      `UPDATE pages SET title = $2, status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1`,
      [pageId, 'Home - Terra Orgânica']
    )
    console.log(`Pagina home existente (id=${pageId}), atualizando versao...`)
  } else {
    const inserted = await pool.query(
      `INSERT INTO pages (slug, title, status, published_at, created_at, updated_at)
       VALUES ('home', 'Home - Terra Orgânica', 'published', NOW(), NOW(), NOW())
       RETURNING id`,
      []
    )
    pageId = inserted.rows[0].id
    console.log(`Pagina home criada (id=${pageId})`)
  }

  await pool.query('UPDATE page_versions SET is_published = false WHERE page_id = $1', [pageId])

  const next = await pool.query(
    'SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM page_versions WHERE page_id = $1',
    [pageId]
  )
  const versionNumber = next.rows[0].next

  await pool.query(
    `INSERT INTO page_versions
      (page_id, version_number, grapes_project_json, html_snapshot, css_snapshot, is_published, created_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, true, NOW())`,
    [pageId, versionNumber, JSON.stringify(grapesProjectJson), htmlSnapshot, cssSnapshot]
  )

  console.log(`Versao ${versionNumber} inserida e publicada para slug=home`)
  return pageId
}

async function main() {
  loadEnv()

  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL nao configurado. Defina em platform/.env e execute:')
    console.error('  cd platform && npm run seed:home-page')
    process.exit(1)
  }

  const pool = getPoolFromEnv()
  try {
    const pageId = await seedHomePage(pool)
    console.log(`Seed concluido. Pagina home id=${pageId}, slug=home, rota publica=/`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Erro no seed:', err.message)
  process.exit(1)
})
