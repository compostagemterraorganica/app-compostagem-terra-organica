#!/usr/bin/env node
/**
 * Fase 0.4 — Extrai URLs de mídia legadas em posts, páginas CMS e home-page-content.js.
 */
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { getPoolFromEnv } = require('./lib/pg-client')
const {
  extractLegacyPath,
  extractMediaUrlsFromText,
  toWpUrl
} = require('./lib/wp-media-dedupe')
const { reportPath } = require('./lib/media-paths')

function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
}

function addRef(map, url, ref) {
  if (!map.has(url)) map.set(url, [])
  map.get(url).push(ref)
}

async function scanPosts(pool) {
  const { rows } = await pool.query(
    `SELECT id, slug, content_html, featured_image_url FROM posts ORDER BY id`
  )
  const urlRefs = new Map()

  for (const row of rows) {
    const fields = [
      { field: 'content_html', value: row.content_html },
      { field: 'featured_image_url', value: row.featured_image_url }
    ]
    for (const { field, value } of fields) {
      for (const url of extractMediaUrlsFromText(value)) {
        addRef(urlRefs, url, { source: 'post', id: row.id, slug: row.slug, field })
      }
    }
  }

  return { postCount: rows.length, urlRefs }
}

async function scanPages(pool) {
  const { rows } = await pool.query(
    `SELECT pv.id, pv.page_id, p.slug, pv.html_snapshot, pv.css_snapshot, pv.grapes_project_json
     FROM page_versions pv
     JOIN pages p ON p.id = pv.page_id
     WHERE pv.is_published = true
     ORDER BY pv.page_id, pv.version_number DESC`
  )

  const seenPages = new Set()
  const urlRefs = new Map()

  for (const row of rows) {
    if (seenPages.has(row.page_id)) continue
    seenPages.add(row.page_id)

    const blobs = [
      { field: 'html_snapshot', value: row.html_snapshot },
      { field: 'css_snapshot', value: row.css_snapshot },
      { field: 'grapes_project_json', value: JSON.stringify(row.grapes_project_json || {}) }
    ]

    for (const { field, value } of blobs) {
      for (const url of extractMediaUrlsFromText(value)) {
        addRef(urlRefs, url, {
          source: 'page_version',
          pageId: row.page_id,
          slug: row.slug,
          versionId: row.id,
          field
        })
      }
    }
  }

  return { publishedPageCount: seenPages.size, urlRefs }
}

function scanHomePageContent() {
  const homePath = path.resolve(__dirname, 'lib', 'home-page-content.js')
  const content = fs.readFileSync(homePath, 'utf8')
  const urlRefs = new Map()

  for (const url of extractMediaUrlsFromText(content)) {
    addRef(urlRefs, url, { source: 'home-page-content.js', field: 'template' })
  }

  // ${WP}/2025/09/foo.jpg patterns
  const wpTemplateRe = /\$\{WP\}\/([^\s"'`]+)/g
  let match
  while ((match = wpTemplateRe.exec(content)) !== null) {
    const legacyPath = match[1]
    const url = toWpUrl(legacyPath)
    addRef(urlRefs, url, { source: 'home-page-content.js', field: 'WP template', legacyPath })
  }

  return { urlRefs }
}

async function main() {
  loadEnv()
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL nao configurado em platform/.env')
    process.exit(1)
  }

  const pool = getPoolFromEnv()
  const merged = new Map()

  try {
    const posts = await scanPosts(pool)
    const pages = await scanPages(pool)
    const home = scanHomePageContent()

    for (const [url, refs] of posts.urlRefs) {
      for (const ref of refs) addRef(merged, url, ref)
    }
    for (const [url, refs] of pages.urlRefs) {
      for (const ref of refs) addRef(merged, url, ref)
    }
    for (const [url, refs] of home.urlRefs) {
      for (const ref of refs) addRef(merged, url, ref)
    }

    const entries = [...merged.entries()].map(([url, refs]) => {
      const legacyPath = extractLegacyPath(url)
      return { url, legacyPath, refs, refCount: refs.length }
    })

    entries.sort((a, b) => (a.legacyPath || a.url).localeCompare(b.legacyPath || b.url))

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        uniqueUrls: entries.length,
        postsScanned: posts.postCount,
        publishedPagesScanned: pages.publishedPageCount,
        homeTemplateIncluded: true
      },
      entries
    }

    const out = reportPath('scan-content-urls')
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

    console.log('\n=== Scan URLs no conteúdo ===')
    console.log(`Posts escaneados:        ${report.summary.postsScanned}`)
    console.log(`Páginas publicadas:      ${report.summary.publishedPagesScanned}`)
    console.log(`URLs únicas encontradas: ${report.summary.uniqueUrls}`)
    console.log(`Relatório: ${out}`)

    return report
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { main }
