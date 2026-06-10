#!/usr/bin/env node
/**
 * Varredura de entidades HTML no banco (ex.: &#8211; → –).
 * Gera relatório JSON para aprovação antes da sanitização.
 */
const fs = require('fs')
const { loadAllEnv } = require('./lib/load-env')
const { getPoolFromEnv } = require('./lib/pg-client')
const { reportPath } = require('./lib/media-paths')
const {
  TEXT_TARGETS,
  JSON_TARGETS,
  hasHtmlEntities,
  extractEntityTokens,
  previewChange,
  targetKey
} = require('./lib/html-entities-db')

const MAX_SAMPLES_PER_TARGET = 5

async function analyzeTextColumns(pool, report) {
  for (const { table, idCol, columns } of TEXT_TARGETS) {
    const cols = [idCol, ...columns].join(', ')
    const { rows } = await pool.query(`SELECT ${cols} FROM ${table} ORDER BY ${idCol}`)

    for (const row of rows) {
      for (const col of columns) {
        const value = row[col]
        if (!hasHtmlEntities(value)) continue

        const key = targetKey(table, col)
        if (!report.byTarget[key]) {
          report.byTarget[key] = { table, column: col, kind: 'text', affectedRows: 0, entities: {}, samples: [] }
        }

        const entry = report.byTarget[key]
        entry.affectedRows += 1
        report.totals.affectedRows += 1

        for (const token of extractEntityTokens(value)) {
          entry.entities[token] = (entry.entities[token] || 0) + 1
          report.totals.entities[token] = (report.totals.entities[token] || 0) + 1
        }

        if (entry.samples.length < MAX_SAMPLES_PER_TARGET) {
          entry.samples.push({
            id: row[idCol],
            ...previewChange(value)
          })
        }
      }
    }
  }
}

async function analyzeJsonColumns(pool, report) {
  for (const { table, idCol, column } of JSON_TARGETS) {
    const { rows } = await pool.query(
      `SELECT ${idCol}, ${column} FROM ${table} ORDER BY ${idCol}`
    )

    for (const row of rows) {
      const raw = row[column]
      if (raw == null) continue
      const serialized = JSON.stringify(raw)
      if (!hasHtmlEntities(serialized)) continue

      const key = targetKey(table, column)
      if (!report.byTarget[key]) {
        report.byTarget[key] = { table, column, kind: 'jsonb', affectedRows: 0, entities: {}, samples: [] }
      }

      const entry = report.byTarget[key]
      entry.affectedRows += 1
      report.totals.affectedRows += 1

      for (const token of extractEntityTokens(serialized)) {
        entry.entities[token] = (entry.entities[token] || 0) + 1
        report.totals.entities[token] = (report.totals.entities[token] || 0) + 1
      }

      if (entry.samples.length < MAX_SAMPLES_PER_TARGET) {
        const idx = serialized.search(/&(?:#\d{1,7}|#x[0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]*);/)
        const start = Math.max(0, idx - 40)
        const end = Math.min(serialized.length, idx + 120)
        entry.samples.push({
          id: row[idCol],
          before: `${serialized.slice(start, end)}…`,
          note: 'Trecho do JSON serializado com entidade HTML'
        })
      }
    }
  }
}

function sortEntities(entities) {
  return Object.entries(entities)
    .sort((a, b) => b[1] - a[1])
    .map(([entity, count]) => ({ entity, count }))
}

async function main() {
  loadAllEnv()
  const pool = getPoolFromEnv()

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'analyze',
    totals: { affectedRows: 0, entities: {} },
    byTarget: {}
  }

  try {
    console.log('Analisando colunas TEXT…')
    await analyzeTextColumns(pool, report)
    console.log('Analisando colunas JSONB…')
    await analyzeJsonColumns(pool, report)

    const summary = Object.values(report.byTarget)
      .map((t) => ({
        target: targetKey(t.table, t.column),
        kind: t.kind,
        affectedRows: t.affectedRows,
        topEntities: sortEntities(t.entities).slice(0, 8)
      }))
      .sort((a, b) => b.affectedRows - a.affectedRows)

    report.summary = summary
    report.totals.uniqueEntities = sortEntities(report.totals.entities)

    const out = reportPath('analyze-html-entities')
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

    console.log('\n=== Análise de entidades HTML ===')
    console.log(`Registros afetados (total): ${report.totals.affectedRows}`)
    console.log(`Alvos com ocorrências:      ${summary.length}`)
    console.log('\nEntidades encontradas (global):')
    for (const { entity, count } of report.totals.uniqueEntities) {
      console.log(`  ${entity.padEnd(14)} ${count}`)
    }
    console.log('\nPor tabela/coluna:')
    for (const item of summary) {
      console.log(`  ${item.target.padEnd(40)} ${item.affectedRows} registro(s)`)
      for (const e of item.topEntities.slice(0, 3)) {
        console.log(`    └ ${e.entity} (${e.count}x)`)
      }
    }
    console.log(`\nRelatório completo: ${out}`)
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
