#!/usr/bin/env node
/**
 * Fase 2 — Upload de arquivos canônicos (api/uploads) para GCS + media_assets + media_url_mappings.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { loadAllEnv } = require('./lib/load-env')
const { getPoolFromEnv } = require('./lib/pg-client')
const { isImageFile, buildLocalInventory, toWpUrl, getVariantType } = require('./lib/wp-media-dedupe')
const { walkUploadFiles, UPLOADS_DIR, reportPath } = require('./lib/media-paths')
const { mimeFromFilename } = require('./lib/media-mime')

const MIGRATIONS_DIR = path.resolve(__dirname, '..', '..', 'api', 'src', 'db', 'migrations')
const MIGRATION_FILES = ['003_media_gcs_mappings.sql', '004_media_mappings_drop_path_unique.sql']

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function uploadsLegacyUrl(relativePath) {
  return `/uploads/${relativePath.replace(/^\//, '')}`
}

async function runMigrations(pool) {
  for (const file of MIGRATION_FILES) {
    const abs = path.join(MIGRATIONS_DIR, file)
    if (!fs.existsSync(abs)) throw new Error(`Migration nao encontrada: ${abs}`)
    await pool.query(fs.readFileSync(abs, 'utf8'))
    console.log(`[ok] Migration ${file} aplicada`)
  }
}

async function findAssetBySha256(pool, sha256) {
  const { rows } = await pool.query(
    `SELECT id, storage_key, public_url, sha256 FROM media_assets WHERE sha256 = $1 LIMIT 1`,
    [sha256]
  )
  return rows[0] || null
}

async function insertMediaAsset(pool, row) {
  const { rows } = await pool.query(
    `INSERT INTO media_assets
      (path, url, storage_key, public_url, sha256, source, original_name, mime_type, size_bytes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING id, storage_key, public_url`,
    [
      row.storageKey,
      row.publicUrl,
      row.storageKey,
      row.publicUrl,
      row.sha256,
      'local-migration',
      row.originalName,
      row.mimeType,
      row.sizeBytes
    ]
  )
  return rows[0]
}

async function insertMapping(pool, { mediaAssetId, legacyUrl, legacyPath, variantType }) {
  await pool.query(
    `INSERT INTO media_url_mappings (media_asset_id, legacy_url, legacy_path, variant_type)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (legacy_url) DO NOTHING`,
    [mediaAssetId, legacyUrl, legacyPath, variantType]
  )
}

async function registerMappings(pool, mediaAssetId, group) {
  const paths = [
    { legacyPath: group.canonical.relativePath, variantType: getVariantType(group.canonical.filename) },
    ...group.variants.map((v) => ({
      legacyPath: v.relativePath,
      variantType: v.variantType || getVariantType(path.basename(v.relativePath))
    }))
  ]

  for (const item of paths) {
    const legacyPath = item.legacyPath
    const urls = [toWpUrl(legacyPath), uploadsLegacyUrl(legacyPath)].filter(Boolean)
    for (const legacyUrl of urls) {
      await insertMapping(pool, {
        mediaAssetId,
        legacyUrl,
        legacyPath,
        variantType: item.variantType
      })
    }
  }
}

async function main() {
  loadAllEnv()

  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL ausente (platform/.env)')
    process.exit(1)
  }
  if (!process.env.GCS_BUCKET || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('GCS_BUCKET / GOOGLE_APPLICATION_CREDENTIALS ausentes (api/.env)')
    process.exit(1)
  }

  const { uploadBuffer } = require('../../api/src/config/gcs')

  const pool = getPoolFromEnv()
  const report = {
    generatedAt: new Date().toISOString(),
    uploadsDir: UPLOADS_DIR,
    uploaded: 0,
    skippedExistingSha: 0,
    mappingsCreated: 0,
    failed: 0,
    errors: []
  }

  try {
    await runMigrations(pool)

    const allFiles = walkUploadFiles()
    const imageFiles = allFiles.filter((f) => isImageFile(f.relativePath))
    const inventory = buildLocalInventory(imageFiles)

    console.log(`\nMigrando ${inventory.groupCount} arquivos canônicos para GCS...\n`)

    for (let i = 0; i < inventory.groups.length; i++) {
      const group = inventory.groups[i]
      const canonical = group.canonical
      const label = `[${i + 1}/${inventory.groups.length}] ${canonical.relativePath}`

      try {
        const buffer = fs.readFileSync(canonical.absolutePath)
        const sha256 = sha256Buffer(buffer)
        const mimeType = mimeFromFilename(canonical.filename)
        const ext = path.extname(canonical.filename).toLowerCase() || '.bin'
        const storageKey = `media/${crypto.randomUUID()}${ext}`

        let asset = await findAssetBySha256(pool, sha256)
        let mediaAssetId
        let publicUrl

        if (asset) {
          mediaAssetId = asset.id
          publicUrl = asset.public_url
          report.skippedExistingSha += 1
          process.stdout.write(`${label} — sha256 existente (id=${mediaAssetId})\n`)
        } else {
          const uploaded = await uploadBuffer({
            key: storageKey,
            buffer,
            mimeType,
            metadata: {
              source: 'local-migration',
              legacyPath: canonical.relativePath
            }
          })

          const inserted = await insertMediaAsset(pool, {
            storageKey: uploaded.storageKey,
            publicUrl: uploaded.publicUrl,
            sha256,
            originalName: canonical.filename,
            mimeType,
            sizeBytes: buffer.length
          })

          mediaAssetId = inserted.id
          publicUrl = inserted.public_url
          report.uploaded += 1
          process.stdout.write(`${label} — uploaded → ${publicUrl}\n`)
        }

        try {
          const beforeMappings = await pool.query(
            `SELECT COUNT(*)::int AS c FROM media_url_mappings WHERE media_asset_id = $1`,
            [mediaAssetId]
          )
          await registerMappings(pool, mediaAssetId, group)
          const afterMappings = await pool.query(
            `SELECT COUNT(*)::int AS c FROM media_url_mappings WHERE media_asset_id = $1`,
            [mediaAssetId]
          )
          report.mappingsCreated += afterMappings.rows[0].c - beforeMappings.rows[0].c
        } catch (mappingError) {
          report.failed += 1
          report.errors.push({
            path: canonical.relativePath,
            message: `mapping: ${mappingError.message}`,
            mediaAssetId
          })
          console.error(`${label} — ERRO mapping: ${mappingError.message}`)
        }
      } catch (error) {
        report.failed += 1
        report.errors.push({ path: canonical.relativePath, message: error.message })
        console.error(`${label} — ERRO: ${error.message}`)
      }
    }

    const summary = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM media_assets WHERE source = 'local-migration') AS assets,
        (SELECT COUNT(*)::int FROM media_url_mappings) AS mappings
    `)

    report.summary = {
      ...report,
      dbAssetsLocalMigration: summary.rows[0].assets,
      dbMappingsTotal: summary.rows[0].mappings
    }

    const out = reportPath('migrate-gcs')
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

    console.log('\n=== Migração GCS concluída ===')
    console.log(`Uploads novos:        ${report.uploaded}`)
    console.log(`Reuso por sha256:     ${report.skippedExistingSha}`)
    console.log(`Mappings adicionados: ${report.mappingsCreated}`)
    console.log(`Falhas:               ${report.failed}`)
    console.log(`media_assets (local): ${summary.rows[0].assets}`)
    console.log(`media_url_mappings:   ${summary.rows[0].mappings}`)
    console.log(`Relatório: ${out}`)

    if (report.failed > 0) process.exit(1)
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
