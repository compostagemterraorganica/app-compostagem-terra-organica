#!/usr/bin/env node
/**
 * Fase 0.5 — Cruza inventário local com URLs do conteúdo.
 * Executa scan-local + scan-content e gera relatório consolidado.
 */
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
const { main: scanLocal } = require('./scan-local-uploads')
const { main: scanContent } = require('./scan-content-media-urls')
const {
  extractLegacyPath,
  getVariantType,
  buildLocalInventory,
  isImageFile
} = require('./lib/wp-media-dedupe')
const { reportPath, walkUploadFiles, UPLOADS_DIR } = require('./lib/media-paths')

function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
}

function crossReference(localReport, contentReport) {
  const canonicalByLegacyPath = localReport.inventory.canonicalByLegacyPath
  const canonicalPathsSet = new Set(
    localReport.inventory.groups.map((g) => g.canonical.relativePath)
  )

  const matched = []
  const missingLocal = []
  const variantOnly = []

  for (const entry of contentReport.entries) {
    const legacyPath = entry.legacyPath
    if (!legacyPath) {
      missingLocal.push({ ...entry, reason: 'path_nao_extraido' })
      continue
    }

    if (canonicalPathsSet.has(legacyPath)) {
      matched.push({
        url: entry.url,
        legacyPath,
        canonicalPath: legacyPath,
        variantType: 'original',
        refs: entry.refs
      })
      continue
    }

    if (canonicalByLegacyPath[legacyPath]) {
      const canonicalPath = canonicalByLegacyPath[legacyPath]
      const isVariant = canonicalPath !== legacyPath
      const item = {
        url: entry.url,
        legacyPath,
        canonicalPath,
        variantType: getVariantType(path.basename(legacyPath)),
        refs: entry.refs
      }
      if (isVariant) variantOnly.push(item)
      else matched.push(item)
      continue
    }

    missingLocal.push({
      url: entry.url,
      legacyPath,
      refs: entry.refs,
      reason: 'arquivo_ausente_em_api_uploads'
    })
  }

  const localOnly = localReport.inventory.groups
    .map((g) => g.canonical.relativePath)
    .filter((p) => !contentReport.entries.some((e) => {
      const lp = e.legacyPath
      if (!lp) return false
      return lp === p || canonicalByLegacyPath[lp] === p
    }))

  return {
    matched,
    missingLocal,
    variantOnly,
    localOnlyCanonical: localOnly
  }
}

async function main() {
  loadEnv()
  console.log('=== Fase 0: Inventário de mídia ===\n')

  const localReport = scanLocal()
  const contentReport = await scanContent()

  const cross = crossReference(localReport, contentReport)

  const report = {
    generatedAt: new Date().toISOString(),
    uploadsDir: UPLOADS_DIR,
    summary: {
      local: localReport.summary,
      content: contentReport.summary,
      crossRef: {
        matched: cross.matched.length,
        missingLocal: cross.missingLocal.length,
        contentUsesVariantFile: cross.variantOnly.length,
        localCanonicalNotReferenced: cross.localOnlyCanonical.length
      }
    },
    local: {
      summary: localReport.summary,
      groupsSample: localReport.inventory.groups.slice(0, 5)
    },
    content: {
      summary: contentReport.summary
    },
    crossRef: cross
  }

  const out = reportPath('media-inventory')
  fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

  console.log('\n=== Cruzamento conteúdo × local ===')
  console.log(`Matched (tem arquivo local):     ${report.summary.crossRef.matched}`)
  console.log(`Missing local (só WP/remoto):    ${report.summary.crossRef.missingLocal}`)
  console.log(`Conteúdo usa variante WP:        ${report.summary.crossRef.contentUsesVariantFile}`)
  console.log(`Canônicos locais sem referência: ${report.summary.crossRef.localCanonicalNotReferenced}`)
  console.log(`\nRelatório consolidado: ${out}`)

  if (cross.missingLocal.length > 0) {
    console.log('\nAmostra missing_local (até 10):')
    cross.missingLocal.slice(0, 10).forEach((m) => {
      console.log(`  - ${m.legacyPath || m.url}`)
    })
  }

  return report
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { main, crossReference }
