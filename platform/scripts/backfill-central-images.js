#!/usr/bin/env node
const path = require('path')
const axios = require('axios')
const dotenv = require('dotenv')
const { getPoolFromEnv } = require('./lib/pg-client')

const WP_LISTING_URL = 'https://compostagemterraorganica.com.br/pontos-de-entrega/'
const LOGO_PATTERN = /LOGO_CTO|cropped-LOGO/i

function parseListingImagesFromHtml(html) {
  const results = {}
  const patterns = [
    /href="https:\/\/compostagemterraorganica\.com\.br\/central\/([^"/]+)\/?"/g,
    /href="\/central\/([^"/]+)\/?"/g
  ]

  for (const pattern of patterns) {
    let match = pattern.exec(html)
    while (match) {
      const slug = match[1]
      const start = Math.max(0, match.index - 5000)
      const chunk = html.slice(start, match.index)
      const imgs = [...chunk.matchAll(/src="(https:\/\/[^"]+wp-content\/uploads\/[^"]+)"/g)].map((m) => m[1])
      const filtered = imgs.filter((url) => !LOGO_PATTERN.test(url))
      if (filtered.length && !results[slug]) {
        results[slug] = filtered[filtered.length - 1]
      }
      match = pattern.exec(html)
    }
  }

  return results
}

async function main() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
  const pool = getPoolFromEnv()

  try {
    const { data: html } = await axios.get(WP_LISTING_URL, { timeout: 15000 })
    const imageMap = parseListingImagesFromHtml(html)
    console.log(`Imagens encontradas na listagem WP: ${Object.keys(imageMap).length}`)

    const centrals = await pool.query('SELECT id, slug, raw_json FROM centrals')
    let updated = 0

    for (const row of centrals.rows) {
      const imageUrl = imageMap[row.slug]
      if (!imageUrl) {
        console.log(`  [skip] ${row.slug} — sem imagem na listagem`)
        continue
      }

      const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json || {}
      raw.listing_image_url = imageUrl

      await pool.query(
        'UPDATE centrals SET raw_json = $2::jsonb, updated_at = NOW() WHERE id = $1',
        [row.id, JSON.stringify(raw)]
      )
      updated += 1
      console.log(`  [ok] ${row.slug}`)
    }

    console.log(`Backfill concluido: ${updated} centrais atualizadas.`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Erro no backfill:', err.message)
  process.exit(1)
})
