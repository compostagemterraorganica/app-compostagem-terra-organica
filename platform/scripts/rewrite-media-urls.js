#!/usr/bin/env node
/**
 * Fase 3 — Reescreve URLs legadas WP/uploads para public_url do storage.
 */
const fs = require('fs')
const path = require('path')
const { loadAllEnv } = require('./lib/load-env')
const { getPoolFromEnv } = require('./lib/pg-client')
const { loadUrlMap, rewriteText } = require('./lib/rewrite-media-text')
const { reportPath } = require('./lib/media-paths')

const FILES_TO_REWRITE = [
  path.resolve(__dirname, 'lib', 'home-page-content.js'),
  path.resolve(__dirname, '..', 'web', 'src', 'components', 'SiteFooter.jsx')
]

async function rewritePosts(pool, map, report) {
  const { rows } = await pool.query(
    `SELECT id, slug, content_html, featured_image_url FROM posts ORDER BY id`
  )

  for (const row of rows) {
    let changed = false

    if (row.content_html) {
      const r = rewriteText(row.content_html, map)
      if (r.text !== row.content_html) {
        await pool.query(`UPDATE posts SET content_html = $2, updated_at = NOW() WHERE id = $1`, [
          row.id,
          r.text
        ])
        report.posts.contentUpdated += 1
        report.totals.replacements += r.replacements
        r.unresolved.forEach((u) => report.unresolved.add(u))
        changed = true
      }
    }

    if (row.featured_image_url) {
      const r = rewriteText(row.featured_image_url, map)
      if (r.text !== row.featured_image_url) {
        await pool.query(
          `UPDATE posts SET featured_image_url = $2, updated_at = NOW() WHERE id = $1`,
          [row.id, r.text]
        )
        report.posts.featuredUpdated += 1
        report.totals.replacements += r.replacements
        changed = true
      }
    }

    if (changed) report.posts.rowsUpdated += 1
  }
}

async function rewritePageVersions(pool, map, report) {
  const { rows } = await pool.query(
    `SELECT id, page_id, html_snapshot, css_snapshot, grapes_project_json
     FROM page_versions
     ORDER BY page_id, version_number DESC`
  )

  const seen = new Set()
  for (const row of rows) {
    if (seen.has(row.page_id)) continue
    seen.add(row.page_id)

    const html = rewriteText(row.html_snapshot, map)
    const css = rewriteText(row.css_snapshot, map)
    const grapesRaw = JSON.stringify(row.grapes_project_json || {})
    const grapes = rewriteText(grapesRaw, map)

    const needsUpdate =
      html.text !== row.html_snapshot ||
      css.text !== row.css_snapshot ||
      grapes.text !== grapesRaw

    if (!needsUpdate) continue

    await pool.query(
      `UPDATE page_versions
       SET html_snapshot = $2, css_snapshot = $3, grapes_project_json = $4::jsonb
       WHERE id = $1`,
      [row.id, html.text, css.text, grapes.text]
    )

    report.pages.updated += 1
    report.totals.replacements += html.replacements + css.replacements + grapes.replacements
    ;[...html.unresolved, ...css.unresolved, ...grapes.unresolved].forEach((u) =>
      report.unresolved.add(u)
    )
  }
}

function rewriteFiles(map, report) {
  for (const filePath of FILES_TO_REWRITE) {
    if (!fs.existsSync(filePath)) continue
    const original = fs.readFileSync(filePath, 'utf8')
    const r = rewriteText(original, map)
    if (r.text === original) continue

    fs.writeFileSync(filePath, r.text, 'utf8')
    report.files.push({ file: filePath, replacements: r.replacements })
    report.totals.replacements += r.replacements
    r.unresolved.forEach((u) => report.unresolved.add(u))
  }
}

async function countRemainingWpRefs(pool) {
  const posts = await pool.query(`
    SELECT COUNT(*)::int AS c FROM posts
    WHERE content_html LIKE '%wp-content/uploads%'
       OR featured_image_url LIKE '%wp-content/uploads%'
  `)
  const pages = await pool.query(`
    SELECT COUNT(*)::int AS c FROM page_versions
    WHERE html_snapshot LIKE '%wp-content/uploads%'
       OR css_snapshot LIKE '%wp-content/uploads%'
       OR grapes_project_json::text LIKE '%wp-content/uploads%'
  `)
  return { posts: posts.rows[0].c, pageVersions: pages.rows[0].c }
}

async function main() {
  loadAllEnv()
  const pool = getPoolFromEnv()
  const report = {
    generatedAt: new Date().toISOString(),
    posts: { rowsUpdated: 0, contentUpdated: 0, featuredUpdated: 0 },
    pages: { updated: 0 },
    files: [],
    totals: { replacements: 0 },
    unresolved: new Set()
  }

  try {
    const map = await loadUrlMap(pool)
    console.log(`Mapa de URLs carregado: ${map.byUrl.size} entradas`)

    await rewritePosts(pool, map, report)
    await rewritePageVersions(pool, map, report)
    rewriteFiles(map, report)

    const remaining = await countRemainingWpRefs(pool)
    report.remainingWpRefs = remaining
    report.unresolved = [...report.unresolved]

    const out = reportPath('rewrite-media-urls')
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

    console.log('\n=== Reescrita de URLs concluída ===')
    console.log(`Posts atualizados:       ${report.posts.rowsUpdated}`)
    console.log(`Páginas atualizadas:     ${report.pages.updated}`)
    console.log(`Arquivos fonte:          ${report.files.length}`)
    console.log(`Substituições totais:    ${report.totals.replacements}`)
    console.log(`WP refs restantes posts: ${remaining.posts}`)
    console.log(`WP refs restantes pages: ${remaining.pageVersions}`)
    console.log(`URLs não resolvidas:     ${report.unresolved.length}`)
    console.log(`Relatório: ${out}`)
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
