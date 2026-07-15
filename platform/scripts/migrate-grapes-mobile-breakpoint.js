#!/usr/bin/env node
/**
 * Migra regras mobile legadas de 480px para 767px em page_versions.
 * Use --apply para gravar; padrao e dry-run.
 */
const fs = require('fs')
const { loadAllEnv } = require('./lib/load-env')
const { getPoolFromEnv } = require('./lib/pg-client')
const { reportPath } = require('./lib/media-paths')
const {
  migrateCssSnapshot,
  migrateGrapesProjectJson
} = require('./lib/grapes-breakpoint')

const DRY_RUN = !process.argv.includes('--apply')

async function main() {
  loadAllEnv()
  const pool = getPoolFromEnv()

  const report = {
    mode: DRY_RUN ? 'dry-run' : 'apply',
    scanned: 0,
    updated: 0,
    cssReplacements: 0,
    jsonReplacements: 0,
    rows: []
  }

  try {
    const { rows } = await pool.query(`
      SELECT v.id, v.page_id, v.version_number, p.slug,
             v.css_snapshot, v.grapes_project_json
      FROM page_versions v
      JOIN pages p ON p.id = v.page_id
      WHERE v.grapes_project_json IS NOT NULL
        AND v.grapes_project_json::text <> '{}'
      ORDER BY p.slug, v.version_number
    `)

    for (const row of rows) {
      report.scanned += 1

      const cssResult = migrateCssSnapshot(row.css_snapshot)
      const jsonResult = migrateGrapesProjectJson(row.grapes_project_json)
      const changed = cssResult.changed || jsonResult.changed

      if (!changed) continue

      report.updated += 1
      report.cssReplacements += cssResult.replacements
      report.jsonReplacements += jsonResult.replacements
      report.rows.push({
        versionId: row.id,
        pageId: row.page_id,
        slug: row.slug,
        versionNumber: row.version_number,
        cssReplacements: cssResult.replacements,
        jsonReplacements: jsonResult.replacements
      })

      if (!DRY_RUN) {
        await pool.query(
          `UPDATE page_versions
           SET css_snapshot = $2,
               grapes_project_json = $3::jsonb
           WHERE id = $1`,
          [row.id, cssResult.css, JSON.stringify(jsonResult.json)]
        )
      }
    }

    const out = reportPath('migrate-grapes-mobile-breakpoint')
    fs.writeFileSync(out, JSON.stringify(report, null, 2))

    console.log(`Modo: ${report.mode}`)
    console.log(`Versoes analisadas: ${report.scanned}`)
    console.log(`Versoes ${DRY_RUN ? 'a atualizar' : 'atualizadas'}: ${report.updated}`)
    console.log(`Substituicoes CSS: ${report.cssReplacements}`)
    console.log(`Substituicoes JSON: ${report.jsonReplacements}`)
    console.log(`Relatorio: ${out}`)

    if (DRY_RUN && report.updated > 0) {
      console.log('\nExecute com --apply para gravar as alteracoes.')
    }
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
