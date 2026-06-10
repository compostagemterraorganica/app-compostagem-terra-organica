#!/usr/bin/env node
/**
 * Fase 0.2 — Inventário de api/uploads com deduplicação de variantes WordPress.
 */
const fs = require('fs')
const { isImageFile, buildLocalInventory } = require('./lib/wp-media-dedupe')
const { UPLOADS_DIR, reportPath, walkUploadFiles } = require('./lib/media-paths')

function main() {
  console.log(`Escaneando imagens em: ${UPLOADS_DIR}`)

  const allFiles = walkUploadFiles()
  const imageFiles = allFiles.filter((f) => isImageFile(f.relativePath))
  const nonImages = allFiles.filter((f) => !isImageFile(f.relativePath))

  const inventory = buildLocalInventory(imageFiles)

  const report = {
    generatedAt: new Date().toISOString(),
    uploadsDir: UPLOADS_DIR,
    summary: {
      totalFilesOnDisk: allFiles.length,
      imageFiles: imageFiles.length,
      nonImageFiles: nonImages.length,
      canonicalGroups: inventory.groupCount,
      variantFilesToDiscard: inventory.variantFilesToDiscard,
      bytesImages: imageFiles.reduce((s, f) => s + f.sizeBytes, 0),
      bytesDiscardable: inventory.groups.reduce(
        (s, g) => s + g.variants.reduce((vs, v) => vs + v.sizeBytes, 0),
        0
      )
    },
    nonImageFiles: nonImages.map((f) => ({
      relativePath: f.relativePath,
      sizeBytes: f.sizeBytes
    })),
    inventory
  }

  const out = reportPath('scan-local-uploads')
  fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

  console.log('\n=== Scan local (api/uploads) ===')
  console.log(`Arquivos no disco:     ${report.summary.totalFilesOnDisk}`)
  console.log(`Imagens:               ${report.summary.imageFiles}`)
  console.log(`Não-imagens (CSV etc): ${report.summary.nonImageFiles}`)
  console.log(`Grupos canônicos:      ${report.summary.canonicalGroups}`)
  console.log(`Variantes a descartar: ${report.summary.variantFilesToDiscard}`)
  console.log(`Relatório: ${out}`)

  return report
}

if (require.main === module) {
  main()
}

module.exports = { main }
