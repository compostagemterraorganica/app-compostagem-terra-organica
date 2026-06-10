#!/usr/bin/env node
const path = require('path')
const dotenv = require('dotenv')
const { getPoolFromEnv } = require('./lib/pg-client')
const {
  normalizePostContent,
  extractFirstParagraph,
  extractFirstImageUrl,
  isAlreadyNormalized
} = require('./lib/normalize-post-content')

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
  const report = { total: 0, contentUpdated: 0, excerptFilled: 0, featuredFilled: 0, skipped: 0, samples: [] }

  try {
    const { rows } = await pool.query(
      `SELECT id, slug, title, excerpt, content_html, featured_image_url
       FROM posts
       ORDER BY id`
    )
    report.total = rows.length

    for (const row of rows) {
      const before = row.content_html || ''
      const normalized = normalizePostContent(before)
      const contentChanged = normalized !== before

      const updates = []
      const params = [row.id]
      let paramIdx = 2

      if (contentChanged || !isAlreadyNormalized(before)) {
        updates.push(`content_html = $${paramIdx}`)
        params.push(normalized)
        paramIdx += 1
        report.contentUpdated += 1
        if (report.samples.length < 2) {
          report.samples.push({
            slug: row.slug,
            before: before.slice(0, 200),
            after: normalized.slice(0, 200)
          })
        }
      } else {
        report.skipped += 1
      }

      if (!row.excerpt || !String(row.excerpt).trim()) {
        const excerpt = extractFirstParagraph(normalized)
        if (excerpt) {
          updates.push(`excerpt = $${paramIdx}`)
          params.push(excerpt)
          paramIdx += 1
          report.excerptFilled += 1
        }
      }

      if (!row.featured_image_url || !String(row.featured_image_url).trim()) {
        const img = extractFirstImageUrl(normalized)
        if (img) {
          updates.push(`featured_image_url = $${paramIdx}`)
          params.push(img)
          paramIdx += 1
          report.featuredFilled += 1
        }
      }

      if (updates.length) {
        updates.push('updated_at = NOW()')
        await pool.query(`UPDATE posts SET ${updates.join(', ')} WHERE id = $1`, params)
      }
    }

    console.log('Normalizacao de content_html concluida:')
    console.log(JSON.stringify(report, null, 2))
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
