#!/usr/bin/env node
/**
 * Valida se css_snapshot exporta regras media presentes em grapes_project_json.
 */
const fs = require('fs')
const { loadAllEnv } = require('./lib/load-env')
const { getPoolFromEnv } = require('./lib/pg-client')
const { reportPath } = require('./lib/media-paths')
const { validateCssExport } = require('./lib/grapes-breakpoint')

async function main() {
  loadAllEnv()
  const pool = getPoolFromEnv()

  const report = {
    scanned: 0,
    ok: 0,
    issues: 0,
    pages: []
  }

  try {
    const { rows } = await pool.query(`
      SELECT p.slug, v.version_number, v.is_published,
             v.css_snapshot, v.grapes_project_json
      FROM page_versions v
      JOIN pages p ON p.id = v.page_id
      WHERE v.grapes_project_json IS NOT NULL
        AND v.grapes_project_json::text <> '{}'
      ORDER BY p.slug, v.version_number DESC
    `)

    const latestBySlug = new Map()
    for (const row of rows) {
      if (!latestBySlug.has(row.slug)) latestBySlug.set(row.slug, row)
    }

    for (const row of latestBySlug.values()) {
      report.scanned += 1
      const validation = validateCssExport({
        cssSnapshot: row.css_snapshot,
        grapesProjectJson: row.grapes_project_json
      })

      const entry = {
        slug: row.slug,
        versionNumber: row.version_number,
        isPublished: row.is_published,
        ok: validation.ok,
        cssBreakpoints: validation.cssBreakpoints,
        jsonBreakpoints: validation.jsonBreakpoints,
        legacy480InCss: validation.legacy480InCss,
        legacy480InJson: validation.legacy480InJson,
        missingRulesCount: validation.missingRules.length,
        missingRulesSample: validation.missingRules.slice(0, 5)
      }

      report.pages.push(entry)
      if (validation.ok) report.ok += 1
      else report.issues += 1
    }

    const out = reportPath('validate-grapes-css-export')
    fs.writeFileSync(out, JSON.stringify(report, null, 2))

    console.log(`Paginas analisadas: ${report.scanned}`)
    console.log(`OK: ${report.ok}`)
    console.log(`Com problemas: ${report.issues}`)
    console.log(`Relatorio: ${out}`)

    for (const page of report.pages.filter((p) => !p.ok)) {
      console.log(
        `- ${page.slug} v${page.versionNumber}: missing=${page.missingRulesCount}, legacy480 css=${page.legacy480InCss}, json=${page.legacy480InJson}`
      )
    }

    if (report.issues > 0) process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
