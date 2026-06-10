#!/usr/bin/env node
/**
 * Decodifica entidades HTML no banco (ex.: &#8211; → –).
 * Use --dry-run (padrão) para simular; --apply para gravar.
 */
const fs = require('fs')
const { loadAllEnv } = require('./lib/load-env')
const { getPoolFromEnv } = require('./lib/pg-client')
const { reportPath } = require('./lib/media-paths')
const {
  TEXT_TARGETS,
  JSON_TARGETS,
  decodeHtmlEntities,
  hasHtmlEntities,
  sanitizeJsonDeep,
  previewChange,
  targetKey
} = require('./lib/html-entities-db')

const DRY_RUN = !process.argv.includes('--apply')
const MAX_SAMPLES = 3

async function sanitizeTextColumns(pool, report) {
  for (const { table, idCol, columns } of TEXT_TARGETS) {
    const cols = [idCol, ...columns].join(', ')
    const { rows } = await pool.query(`SELECT ${cols} FROM ${table} ORDER BY ${idCol}`)

    for (const row of rows) {
      const updates = []
      const params = [row[idCol]]
      let paramIdx = 2
      const changedCols = []

      for (const col of columns) {
        const before = row[col]
        if (!hasHtmlEntities(before)) continue
        const after = decodeHtmlEntities(before)
        updates.push(`${col} = $${paramIdx}`)
        params.push(after)
        paramIdx += 1
        changedCols.push(col)
      }

      if (!updates.length) continue

      const key = targetKey(table)
      report.byTable[key] = report.byTable[key] || { rowsUpdated: 0, columns: {} }
      report.byTable[key].rowsUpdated += 1
      report.totals.rowsUpdated += 1

      for (const col of changedCols) {
        report.byTable[key].columns[col] = (report.byTable[key].columns[col] || 0) + 1
      }

      if (report.samples.length < MAX_SAMPLES) {
        const col = changedCols[0]
        report.samples.push({
          table,
          id: row[idCol],
          column: col,
          ...previewChange(row[col])
        })
      }

      if (!DRY_RUN) {
        const hasUpdatedAt = await tableHasColumn(pool, table, 'updated_at')
        if (hasUpdatedAt) updates.push('updated_at = NOW()')
        await pool.query(`UPDATE ${table} SET ${updates.join(', ')} WHERE ${idCol} = $1`, params)
      }
    }
  }
}

async function sanitizeJsonColumns(pool, report) {
  for (const { table, idCol, column, hasUpdatedAt } of JSON_TARGETS) {
    const { rows } = await pool.query(
      `SELECT ${idCol}, ${column} FROM ${table} ORDER BY ${idCol}`
    )

    for (const row of rows) {
      const before = row[column]
      if (before == null) continue
      const after = sanitizeJsonDeep(before)
      if (JSON.stringify(after) === JSON.stringify(before)) continue

      const key = targetKey(table)
      report.byTable[key] = report.byTable[key] || { rowsUpdated: 0, columns: {} }
      report.byTable[key].rowsUpdated += 1
      report.byTable[key].columns[column] = (report.byTable[key].columns[column] || 0) + 1
      report.totals.rowsUpdated += 1

      if (!DRY_RUN) {
        const sets = [`${column} = $2::jsonb`]
        if (hasUpdatedAt) sets.push('updated_at = NOW()')
        await pool.query(
          `UPDATE ${table} SET ${sets.join(', ')} WHERE ${idCol} = $1`,
          [row[idCol], JSON.stringify(after)]
        )
      }
    }
  }
}

const tableColumnCache = new Map()

async function tableHasColumn(pool, table, column) {
  const cacheKey = `${table}.${column}`
  if (tableColumnCache.has(cacheKey)) return tableColumnCache.get(cacheKey)

  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  )
  const exists = rows.length > 0
  tableColumnCache.set(cacheKey, exists)
  return exists
}

async function main() {
  loadAllEnv()
  const pool = getPoolFromEnv()

  const report = {
    generatedAt: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'apply',
    totals: { rowsUpdated: 0 },
    byTable: {},
    samples: []
  }

  try {
    console.log(DRY_RUN ? 'Modo dry-run (nenhuma alteração será gravada).' : 'Modo apply — gravando alterações.')
    console.log('Sanitizando colunas TEXT…')
    await sanitizeTextColumns(pool, report)
    console.log('Sanitizando colunas JSONB…')
    await sanitizeJsonColumns(pool, report)

    const out = reportPath('sanitize-html-entities')
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

    console.log('\n=== Sanitização de entidades HTML ===')
    console.log(`Modo:              ${report.mode}`)
    console.log(`Registros afetados: ${report.totals.rowsUpdated}`)
    for (const [table, data] of Object.entries(report.byTable)) {
      console.log(`  ${table}: ${data.rowsUpdated} registro(s)`)
      for (const [col, n] of Object.entries(data.columns)) {
        console.log(`    └ ${col}: ${n}`)
      }
    }
    if (report.samples.length) {
      console.log('\nAmostras:')
      for (const s of report.samples) {
        console.log(`  [${s.table}#${s.id}.${s.column}]`)
        console.log(`    antes: ${s.before}`)
        console.log(`    depois: ${s.after}`)
      }
    }
    console.log(`\nRelatório: ${out}`)
    if (DRY_RUN) {
      console.log('\nPara aplicar de verdade: node scripts/sanitize-html-entities.js --apply')
    }
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Erro:', err.message)
    process.exit(1)
  })
}

module.exports = { main }
