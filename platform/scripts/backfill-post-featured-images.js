#!/usr/bin/env node
const path = require('path')
const dotenv = require('dotenv')
const { getPoolFromEnv } = require('./lib/pg-client')
const { extractFirstImageUrl } = require('./lib/normalize-post-content')

function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
}

async function main() {
  loadEnv()
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL nao configurado em platform/.env')
    process.exit(1)
  }

  const pool = getPoolFromEnv()
  let updated = 0

  try {
    const { rows } = await pool.query(
      `SELECT id, slug, content_html, featured_image_url
       FROM posts
       WHERE featured_image_url IS NULL OR TRIM(featured_image_url) = ''`
    )

    for (const row of rows) {
      const url = extractFirstImageUrl(row.content_html)
      if (!url) continue
      await pool.query(
        `UPDATE posts SET featured_image_url = $2, updated_at = NOW() WHERE id = $1`,
        [row.id, url]
      )
      updated += 1
    }

    console.log(`Featured images preenchidas: ${updated} de ${rows.length} candidatos`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
