#!/usr/bin/env node
const path = require('path')
const dotenv = require('dotenv')
const { getPoolFromEnv } = require('./lib/pg-client')

const pages = [
  require('./lib/quem-somos-content'),
  require('./lib/financiadores-content'),
  require('./lib/contato-content'),
  require('./lib/pontos-de-entrega-content'),
  require('./lib/politica-de-privacidade-content')
]

function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
}

async function seedPage(pool, { slug, title, htmlSnapshot, cssSnapshot, grapesProjectJson }) {
  const existing = await pool.query('SELECT id FROM pages WHERE slug = $1', [slug])
  let pageId

  if (existing.rows[0]) {
    pageId = existing.rows[0].id
    await pool.query(
      `UPDATE pages SET title = $2, status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1`,
      [pageId, title]
    )
    console.log(`Pagina ${slug} existente (id=${pageId}), atualizando versao...`)
  } else {
    const inserted = await pool.query(
      `INSERT INTO pages (slug, title, status, published_at, created_at, updated_at)
       VALUES ($1, $2, 'published', NOW(), NOW(), NOW())
       RETURNING id`,
      [slug, title]
    )
    pageId = inserted.rows[0].id
    console.log(`Pagina ${slug} criada (id=${pageId})`)
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

  console.log(`Versao ${versionNumber} publicada para slug=${slug}`)
  return pageId
}

async function main() {
  loadEnv()

  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL nao configurado. Defina em platform/.env')
    process.exit(1)
  }

  const pool = getPoolFromEnv()
  try {
    for (const page of pages) {
      await seedPage(pool, page)
    }
    console.log('Seed CMS pages concluido.')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Erro no seed:', err.message)
  process.exit(1)
})
