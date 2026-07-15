#!/usr/bin/env node
/**
 * Resolve foto-da-capa do export WordPress → wp:attachment_url e envia para S3.
 * Atualiza centrals.image_url com a mesma variante usada no single do site legado.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const { loadAllEnv } = require('./lib/load-env');
const { getPoolFromEnv } = require('./lib/pg-client');
const { mimeFromFilename } = require('./lib/media-mime');
const { reportPath } = require('./lib/media-paths');
const { parseCentralCoverImagesFromXml } = require('./lib/wp-xml-central-cover-images');

const DEFAULT_XML = path.join(__dirname, 'terraorgnica.WordPress.2026-06-19).xml');

function parseArgs(argv) {
  const args = {
    xml: DEFAULT_XML,
    dryRun: false,
    force: false,
    slug: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--xml' && argv[i + 1]) {
      args.xml = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--slug' && argv[i + 1]) {
      args.slug = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function sha256Buffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function extFromUrl(url) {
  const clean = url.split('?')[0];
  const match = clean.match(/\.(jpe?g|png|gif|webp|avif)$/i);
  return match ? `.${match[1].toLowerCase().replace('jpeg', 'jpg')}` : '.jpg';
}

function filenameFromUrl(url) {
  const clean = url.split('?')[0];
  return path.basename(clean) || `central-${Date.now()}.jpg`;
}

function normalizeUrl(url) {
  return String(url || '').split('?')[0].trim();
}

function urlsEquivalent(a, b) {
  if (!a || !b) return false;
  return normalizeUrl(a) === normalizeUrl(b);
}

function isManagedStorageUrl(url) {
  if (!url) return false;
  const s3Base = (process.env.S3_PUBLIC_BASE || '').replace(/\/$/, '');
  if (s3Base && url.startsWith(s3Base)) return true;
  return url.includes('.s3.') && url.includes('amazonaws.com');
}

async function findMappingPublicUrl(pool, legacyUrl) {
  const { rows } = await pool.query(
    `SELECT ma.public_url, ma.sha256
     FROM media_url_mappings m
     JOIN media_assets ma ON ma.id = m.media_asset_id
     WHERE m.legacy_url = $1
        OR m.legacy_url LIKE $2
     ORDER BY CASE WHEN m.legacy_url = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [legacyUrl, `${normalizeUrl(legacyUrl)}%`]
  );
  return rows[0] || null;
}

async function findAssetBySha256(pool, sha256) {
  const { rows } = await pool.query(
    `SELECT id, public_url, storage_key FROM media_assets WHERE sha256 = $1 LIMIT 1`,
    [sha256]
  );
  return rows[0] || null;
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
      'central-cover-wp-xml',
      row.originalName,
      row.mimeType,
      row.sizeBytes
    ]
  );
  return rows[0];
}

async function insertMapping(pool, { mediaAssetId, legacyUrl }) {
  await pool.query(
    `INSERT INTO media_url_mappings (media_asset_id, legacy_url, legacy_path, variant_type)
     VALUES ($1, $2, $3, 'central-cover')
     ON CONFLICT (legacy_url) DO NOTHING`,
    [mediaAssetId, legacyUrl, legacyUrl]
  );
}

async function updateCentralImage(pool, { id, rawJson, coverWpUrl, publicUrl }) {
  const raw = typeof rawJson === 'string' ? JSON.parse(rawJson) : { ...(rawJson || {}) };
  raw.cover_image_wp_url = coverWpUrl;
  raw.listing_image_wp_url = coverWpUrl;
  raw.listing_image_url = publicUrl;

  await pool.query(
    `UPDATE centrals
     SET image_url = $2,
         raw_json = $3::jsonb,
         updated_at = NOW()
     WHERE id = $1`,
    [id, publicUrl, JSON.stringify(raw)]
  );
}

async function downloadImage(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    maxRedirects: 5,
    headers: { 'User-Agent': 'TerraOrganica-Central-Cover-Backfill/1.0' }
  });
  return Buffer.from(response.data);
}

async function backfillOne(pool, uploadBuffer, row, coverEntry, options, report) {
  const { dryRun, force } = options;
  const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json || {};
  const coverWpUrl = coverEntry.coverUrl;
  const label = row.slug;

  if (!coverWpUrl) {
    report.skippedUnresolved += 1;
    report.skipped.push({ slug: label, reason: 'attachment_url_missing', fotoDaCapaId: coverEntry.fotoDaCapaId });
    console.log(`  [skip] ${label} — attachment ${coverEntry.fotoDaCapaId} sem URL no XML`);
    return;
  }

  const previousCoverWpUrl = raw.cover_image_wp_url || raw.listing_image_wp_url || null;
  const alreadyMapped = await findMappingPublicUrl(pool, coverWpUrl);

  if (
    !force &&
    urlsEquivalent(previousCoverWpUrl, coverWpUrl) &&
    row.image_url &&
    (urlsEquivalent(row.image_url, alreadyMapped?.public_url) || isManagedStorageUrl(row.image_url))
  ) {
    report.skippedAlreadyCorrect += 1;
    report.skipped.push({ slug: label, reason: 'already_correct', coverWpUrl, imageUrl: row.image_url });
    console.log(`  [skip] ${label} — capa já aponta para variante correta`);
    return;
  }

  if (dryRun) {
    report.wouldUpdate += 1;
    report.planned.push({
      slug: label,
      wpId: row.id,
      fotoDaCapaId: coverEntry.fotoDaCapaId,
      coverWpUrl,
      previousImageUrl: row.image_url || null,
      previousCoverWpUrl
    });
    console.log(`  [dry-run] ${label}`);
    console.log(`            WP capa: ${coverWpUrl}`);
    console.log(`            Atual:   ${row.image_url || '(vazio)'}`);
    return;
  }

  try {
    let publicUrl = alreadyMapped?.public_url || null;
    let assetId = null;

    if (!publicUrl || force) {
      const buffer = await downloadImage(coverWpUrl);
      const sha256 = sha256Buffer(buffer);
      const originalName = filenameFromUrl(coverWpUrl);
      const mimeType = mimeFromFilename(originalName) || mimeFromFilename(`x${extFromUrl(coverWpUrl)}`);
      const ext = extFromUrl(coverWpUrl);
      const storageKey = `media/centrals/${row.slug}-${crypto.randomUUID()}${ext}`;

      let asset = !force ? await findAssetBySha256(pool, sha256) : null;

      if (asset) {
        publicUrl = asset.public_url;
        assetId = asset.id;
        report.reusedSha += 1;
        console.log(`  [sha] ${label} — reutilizando asset id=${asset.id}`);
      } else {
        const uploaded = await uploadBuffer({
          key: storageKey,
          buffer,
          mimeType,
          metadata: {
            source: 'central-cover-wp-xml',
            centralSlug: row.slug,
            legacyUrl: coverWpUrl,
            fotoDaCapaId: String(coverEntry.fotoDaCapaId)
          }
        });

        const inserted = await insertMediaAsset(pool, {
          storageKey: uploaded.storageKey,
          publicUrl: uploaded.publicUrl,
          sha256,
          originalName,
          mimeType,
          sizeBytes: buffer.length
        });

        assetId = inserted.id;
        publicUrl = inserted.public_url;
        report.uploaded += 1;
        console.log(`  [upload] ${label} → ${publicUrl}`);
      }

      if (assetId) await insertMapping(pool, { mediaAssetId: assetId, legacyUrl: coverWpUrl });
    } else {
      report.reusedMapping += 1;
      console.log(`  [map] ${label} → ${publicUrl}`);
    }

    await updateCentralImage(pool, {
      id: row.id,
      rawJson: raw,
      coverWpUrl,
      publicUrl
    });

    report.updated += 1;
    report.updatedRows.push({
      slug: label,
      coverWpUrl,
      publicUrl,
      previousImageUrl: row.image_url || null
    });
  } catch (error) {
    report.failed += 1;
    report.errors.push({ slug: label, coverWpUrl, message: error.message });
    console.error(`  [erro] ${label}: ${error.message}`);
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (!fs.existsSync(args.xml)) {
    console.error(`XML não encontrado: ${args.xml}`);
    process.exit(1);
  }

  loadAllEnv();

  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL ausente (platform/.env)');
    process.exit(1);
  }

  const parsed = parseCentralCoverImagesFromXml(args.xml);
  console.log(
    `Capas no XML: ${parsed.centralCoverCount} centrais, ${parsed.attachmentCount} attachments (${parsed.unresolvedCount} sem URL)`
  );

  let entries = parsed.entries.filter((entry) => entry.coverUrl);
  if (args.slug) {
    entries = entries.filter((entry) => entry.slug === args.slug);
    if (!entries.length) {
      console.error(`Central não encontrada no XML: ${args.slug}`);
      process.exit(1);
    }
  }

  const useS3 = Boolean(process.env.S3_BUCKET?.trim() && process.env.AWS_REGION?.trim());

  if (!args.dryRun && !useS3) {
    console.error('Configure S3_BUCKET/AWS_REGION (api/.env)');
    process.exit(1);
  }

  const uploadBuffer = require('../api/src/config/s3').uploadBuffer;

  const pool = getPoolFromEnv();
  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: args.dryRun,
    force: args.force,
    xml: args.xml,
    storage: 's3',
    uploaded: 0,
    reusedSha: 0,
    reusedMapping: 0,
    updated: 0,
    wouldUpdate: 0,
    skippedAlreadyCorrect: 0,
    skippedUnresolved: 0,
    skippedNotInDb: 0,
    failed: 0,
    planned: [],
    updatedRows: [],
    skipped: [],
    notInDb: [],
    errors: []
  };

  try {
    const { rows } = await pool.query(
      `SELECT id, slug, image_url, raw_json
       FROM centrals
       ORDER BY name`
    );

    const dbBySlug = new Map(rows.map((row) => [row.slug, row]));
    const dbById = new Map(rows.map((row) => [row.id, row]));

    console.log(`\nProcessando ${entries.length} capa(s) do XML contra ${rows.length} central(is) no banco...\n`);

    for (const coverEntry of entries) {
      const row = dbBySlug.get(coverEntry.slug) || dbById.get(coverEntry.wpId);
      if (!row) {
        report.skippedNotInDb += 1;
        report.notInDb.push({ slug: coverEntry.slug, wpId: coverEntry.wpId });
        console.log(`  [skip] ${coverEntry.slug} — central ausente no banco`);
        continue;
      }

      await backfillOne(pool, uploadBuffer, row, coverEntry, args, report);
    }

    const out = reportPath('backfill-central-cover-images');
    fs.writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');

    console.log('\n=== Backfill capas centrais (foto-da-capa → S3) ===');
    if (args.dryRun) console.log('(modo dry-run — nenhuma alteração aplicada)');
    console.log(`Atualizadas:          ${report.updated}`);
    console.log(`Seriam atualizadas:   ${report.wouldUpdate}`);
    console.log(`Uploads novos:        ${report.uploaded}`);
    console.log(`Reuso sha256:         ${report.reusedSha}`);
    console.log(`Reuso mapping:        ${report.reusedMapping}`);
    console.log(`Já corretas:          ${report.skippedAlreadyCorrect}`);
    console.log(`Sem attachment URL:   ${report.skippedUnresolved}`);
    console.log(`Ausentes no banco:    ${report.skippedNotInDb}`);
    console.log(`Falhas:               ${report.failed}`);
    console.log(`Relatório: ${out}`);

    if (report.failed > 0) process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
