#!/usr/bin/env node
/**
 * Baixa imagens das centrais (listing_image_url no WordPress) e envia para GCS.
 * Atualiza centrals.image_url e raw_json.listing_image_url com a URL pública do bucket.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const axios = require('axios')
const { loadAllEnv } = require('./lib/load-env')
const { getPoolFromEnv } = require('./lib/pg-client')
const { mimeFromFilename } = require('./lib/media-mime')
const { reportPath } = require('./lib/media-paths')

const MIGRATION_FILE = path.resolve(
  __dirname,
  '..',
  '..',
  'api',
  'src',
  'db',
  'migrations',
  '006_central_image_url.sql'
)

const GCS_HOSTS = ['storage.googleapis.com']

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function isGcsUrl(url) {
  if (!url) return false
  const base = (process.env.GCS_PUBLIC_BASE || '').replace(/\/$/, '')
  if (base && url.startsWith(base)) return true
  return GCS_HOSTS.some((host) => url.includes(host))
}

function extFromUrl(url) {
  const clean = url.split('?')[0]
  const match = clean.match(/\.(jpe?g|png|gif|webp|avif)$/i)
  return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg'
}

function filenameFromUrl(url) {
  const clean = url.split('?')[0]
  const base = path.basename(clean)
  return base || `central-${Date.now()}.jpg`
}

async function runMigration(pool) {
  if (!fs.existsSync(MIGRATION_FILE)) throw new Error(`Migration nao encontrada: ${MIGRATION_FILE}`)
  await pool.query(fs.readFileSync(MIGRATION_FILE, 'utf8'))
  console.log('[ok] Migration 006_central_image_url.sql aplicada')
}

async function findMappingPublicUrl(pool, legacyUrl) {
  const { rows } = await pool.query(
    `SELECT ma.public_url
     FROM media_url_mappings m
     JOIN media_assets ma ON ma.id = m.media_asset_id
     WHERE m.legacy_url = $1
        OR m.legacy_url LIKE $2
     ORDER BY CASE WHEN m.legacy_url = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [legacyUrl, `${legacyUrl.split('?')[0]}%`]
  )
  return rows[0]?.public_url || null
}

async function findAssetBySha256(pool, sha256) {
  const { rows } = await pool.query(
    `SELECT id, public_url, storage_key FROM media_assets WHERE sha256 = $1 LIMIT 1`,
    [sha256]
  )
  return rows[0] || null
}

async function insertMediaAsset(pool, row) {
  const { rows } = await pool.query(
    `INSERT INTO media_assets
      (path, url, storage_key, public_url, sha256, source, original_name, mime_type, size_bytes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING id, public_url`,
    [
      row.storageKey,
      row.publicUrl,
      row.storageKey,
      row.publicUrl,
      row.sha256,
      'central-migration',
      row.originalName,
      row.mimeType,
      row.sizeBytes
    ]
  )
  return rows[0]
}

async function insertMapping(pool, { mediaAssetId, legacyUrl }) {
  await pool.query(
    `INSERT INTO media_url_mappings (media_asset_id, legacy_url, legacy_path, variant_type)
     VALUES ($1, $2, $3, 'central-listing')
     ON CONFLICT (legacy_url) DO NOTHING`,
    [mediaAssetId, legacyUrl, legacyUrl]
  )
}

async function updateCentralImage(pool, { id, rawJson, legacyUrl, publicUrl }) {
  const raw = typeof rawJson === 'string' ? JSON.parse(rawJson) : { ...(rawJson || {}) }
  raw.listing_image_wp_url = raw.listing_image_wp_url || legacyUrl
  raw.listing_image_url = publicUrl

  await pool.query(
    `UPDATE centrals
     SET image_url = $2,
         raw_json = $3::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [id, publicUrl, JSON.stringify(raw)]
  )
}

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxRedirects: 5,
    headers: { 'User-Agent': 'TerraOrganica-Media-Migration/1.0' }
  })
  return Buffer.from(response.data)
}

async function migrateOne(pool, uploadBuffer, row, report) {
  const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json || {}
  const legacyUrl = raw.listing_image_url || row.image_url

  if (!legacyUrl || typeof legacyUrl !== 'string') {
    report.skippedNoUrl += 1
    console.log(`  [skip] ${row.slug} — sem listing_image_url`)
    return
  }

  if (isGcsUrl(legacyUrl)) {
    if (!row.image_url) {
      await updateCentralImage(pool, { id: row.id, rawJson: raw, legacyUrl, publicUrl: legacyUrl })
    }
    report.skippedAlreadyGcs += 1
    console.log(`  [skip] ${row.slug} — ja no GCS`)
    return
  }

  const label = row.slug

  const existingMapped = await findMappingPublicUrl(pool, legacyUrl)
  if (existingMapped && isGcsUrl(existingMapped)) {
    await updateCentralImage(pool, { id: row.id, rawJson: raw, legacyUrl, publicUrl: existingMapped })
    report.reusedMapping += 1
    console.log(`  [map] ${label} → ${existingMapped}`)
    return
  }

  try {
    const buffer = await downloadImage(legacyUrl)
    const sha256 = sha256Buffer(buffer)
    const originalName = filenameFromUrl(legacyUrl)
    const mimeType = mimeFromFilename(originalName) || mimeFromFilename(`x${extFromUrl(legacyUrl)}`)
    const ext = extFromUrl(legacyUrl)
    const storageKey = `media/centrals/${row.slug}-${crypto.randomUUID()}${ext}`

    let asset = await findAssetBySha256(pool, sha256)
    let publicUrl

    if (asset) {
      publicUrl = asset.public_url
      report.reusedSha += 1
      console.log(`  [sha] ${label} — reutilizando asset id=${asset.id}`)
    } else {
      const uploaded = await uploadBuffer({
        key: storageKey,
        buffer,
        mimeType,
        metadata: {
          source: 'central-migration',
          centralSlug: row.slug,
          legacyUrl
        }
      })

      const inserted = await insertMediaAsset(pool, {
        storageKey: uploaded.storageKey,
        publicUrl: uploaded.publicUrl,
        sha256,
        originalName,
        mimeType,
        sizeBytes: buffer.length
      })

      asset = inserted
      publicUrl = inserted.public_url
      report.uploaded += 1
      console.log(`  [upload] ${label} → ${publicUrl}`)
    }

    await insertMapping(pool, { mediaAssetId: asset.id, legacyUrl })
    await updateCentralImage(pool, { id: row.id, rawJson: raw, legacyUrl, publicUrl })
    report.updated += 1
  } catch (error) {
    report.failed += 1
    report.errors.push({ slug: row.slug, url: legacyUrl, message: error.message })
    console.error(`  [erro] ${label}: ${error.message}`)
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
    uploaded: 0,
    reusedSha: 0,
    reusedMapping: 0,
    updated: 0,
    skippedNoUrl: 0,
    skippedAlreadyGcs: 0,
    failed: 0,
    errors: []
  }

  try {
    await runMigration(pool)

    const { rows } = await pool.query(
      `SELECT id, slug, image_url, raw_json
       FROM centrals
       ORDER BY name`
    )

    console.log(`\nMigrando imagens de ${rows.length} centrais para GCS...\n`)

    for (const row of rows) {
      await migrateOne(pool, uploadBuffer, row, report)
    }

    const out = reportPath('migrate-central-images-gcs')
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8')

    console.log('\n=== Migração imagens centrais → GCS ===')
    console.log(`Uploads novos:       ${report.uploaded}`)
    console.log(`Reuso sha256:        ${report.reusedSha}`)
    console.log(`Reuso mapping:       ${report.reusedMapping}`)
    console.log(`Centrais atualizadas: ${report.updated}`)
    console.log(`Ja no GCS:           ${report.skippedAlreadyGcs}`)
    console.log(`Sem URL:             ${report.skippedNoUrl}`)
    console.log(`Falhas:              ${report.failed}`)
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
