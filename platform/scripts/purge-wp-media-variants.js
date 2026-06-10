#!/usr/bin/env node
/**
 * Fase 5 — Remove variantes WordPress do disco (mantém só canônicos).
 * Uso: node scripts/purge-wp-media-variants.js [--apply]
 */
const fs = require('fs')
const path = require('path')
const { isImageFile, buildLocalInventory } = require('./lib/wp-media-dedupe')
const { walkUploadFiles, UPLOADS_DIR, reportPath } = require('./lib/media-paths')

function archiveNonImages(nonImages, apply) {
  const archiveDir = path.join(UPLOADS_DIR, '_archive')
  const moved = []

  for (const file of nonImages) {
    const target = path.join(archiveDir, file.relativePath)
    if (apply) {
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.renameSync(file.absolutePath, target)
    }
    moved.push(file.relativePath)
  }

  return moved
}

function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) removeEmptyDirs(abs)
  }
  if (dir === UPLOADS_DIR || dir === path.join(UPLOADS_DIR, '_archive')) return
  if (fs.readdirSync(dir).length === 0) fs.rmdirSync(dir)
}

function main() {
  const apply = process.argv.includes('--apply')
  const allFiles = walkUploadFiles()
  const imageFiles = allFiles.filter((f) => isImageFile(f.relativePath))
  const nonImages = allFiles.filter((f) => !isImageFile(f.relativePath))
  const inventory = buildLocalInventory(imageFiles)

  const toDelete = []
  for (const group of inventory.groups) {
    for (const variant of group.variants) {
      const abs = path.join(UPLOADS_DIR, variant.relativePath)
      if (fs.existsSync(abs)) {
        toDelete.push({
          relativePath: variant.relativePath,
          absolutePath: abs,
          sizeBytes: variant.sizeBytes,
          groupKey: group.groupKey
        })
      }
    }
  }

  let deletedBytes = 0
  if (apply) {
    for (const item of toDelete) {
      fs.unlinkSync(item.absolutePath)
      deletedBytes += item.sizeBytes || 0
    }
    archiveNonImages(nonImages, true)
    removeEmptyDirs(UPLOADS_DIR)
  } else {
    deletedBytes = toDelete.reduce((s, f) => s + (f.sizeBytes || 0), 0)
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    uploadsDir: UPLOADS_DIR,
    summary: {
      variantFiles: toDelete.length,
      bytesFreed: deletedBytes,
      nonImagesArchived: nonImages.length,
      canonicalKept: inventory.groupCount
    },
    sample: toDelete.slice(0, 20)
  }

  const out = reportPath(apply ? 'purge-variants-applied' : 'purge-variants-dry-run')
  fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

  console.log(`\n=== Purge variantes WP (${report.mode}) ===`)
  console.log(`Variantes a remover: ${report.summary.variantFiles}`)
  console.log(`Espaço liberado:     ${(report.summary.bytesFreed / 1024 / 1024).toFixed(1)} MB`)
  console.log(`Não-imagens:         ${report.summary.nonImagesArchived} → _archive/`)
  console.log(`Canônicos mantidos:  ${report.summary.canonicalKept}`)
  console.log(`Relatório: ${out}`)

  if (!apply) {
    console.log('\nExecute com --apply para apagar arquivos.')
  }
}

if (require.main === module) main()

module.exports = { main }
