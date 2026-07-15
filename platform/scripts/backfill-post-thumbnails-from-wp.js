#!/usr/bin/env node
/**
 * Corrige featured_image_url dos posts usando _thumbnail_id do export WordPress.
 * Resolve URLs legadas (wp-content/uploads) para public_url do bucket via media_url_mappings.
 */
const fs = require('fs');
const path = require('path');
const { loadAllEnv } = require('./lib/load-env');
const { getPoolFromEnv } = require('./lib/pg-client');
const { parseWordPressFeaturedImages } = require('./lib/wp-xml-featured-images');
const { loadUrlMap } = require('./lib/rewrite-media-text');
const { resolveToPublicUrl, resolveToPublicUrlWithDb } = require('./lib/resolve-legacy-media-url');
const { reportPath } = require('./lib/media-paths');

function defaultXmlPath() {
  return process.env.WP_EXPORT_XML_PATH
    ? path.resolve(process.env.WP_EXPORT_XML_PATH)
    : path.resolve(__dirname, 'terraorgnica.WordPress.2026-05-07.xml');
}

function urlsEquivalent(a, b) {
  if (!a || !b) return false;
  return String(a).trim() === String(b).trim();
}

async function main() {
  loadAllEnv();

  const dryRun = process.argv.includes('--dry-run');
  const xmlPath = defaultXmlPath();

  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL nao configurado em platform/api/.env');
    process.exit(1);
  }
  console.log(`Banco: ${process.env.POSTGRES_URL.replace(/:[^:@/]+@/, ':***@').slice(0, 80)}...`);
  if (!fs.existsSync(xmlPath)) {
    console.error(`XML nao encontrado: ${xmlPath}`);
    process.exit(1);
  }

  const wpData = parseWordPressFeaturedImages(xmlPath);
  const pool = getPoolFromEnv();
  const urlMap = await loadUrlMap(pool);

  const report = {
    dryRun,
    xmlPath,
    wp: {
      attachments: wpData.attachmentCount,
      postsWithThumbnail: wpData.postsWithThumbnail,
      postsWithResolvedUrl: wpData.postsWithResolvedUrl
    },
    db: {
      totalPosts: 0,
      updated: 0,
      alreadyCorrect: 0,
      noWpThumbnail: 0,
      unresolvedMapping: 0,
      skipped: 0
    },
    samples: {
      updated: [],
      unresolved: []
    }
  };

  try {
    const { rows } = await pool.query(
      `SELECT id, slug, title, featured_image_url
       FROM posts
       ORDER BY id`
    );
    report.db.totalPosts = rows.length;

    for (const row of rows) {
      const postId = Number(row.id);
      const wpLegacyUrl = wpData.featuredUrlByPostId.get(postId);
      if (!wpLegacyUrl) {
        report.db.noWpThumbnail += 1;
        continue;
      }

      let publicUrl = resolveToPublicUrl(wpLegacyUrl, urlMap);
      if (!publicUrl) {
        publicUrl = await resolveToPublicUrlWithDb(pool, wpLegacyUrl, urlMap);
      }

      if (!publicUrl) {
        report.db.unresolvedMapping += 1;
        if (report.samples.unresolved.length < 8) {
          report.samples.unresolved.push({
            id: postId,
            slug: row.slug,
            wpLegacyUrl,
            current: row.featured_image_url
          });
        }
        continue;
      }

      if (urlsEquivalent(row.featured_image_url, publicUrl)) {
        report.db.alreadyCorrect += 1;
        continue;
      }

      if (!dryRun) {
        await pool.query(
          `UPDATE posts SET featured_image_url = $2, updated_at = NOW() WHERE id = $1`,
          [row.id, publicUrl]
        );
      }

      report.db.updated += 1;
      if (report.samples.updated.length < 8) {
        report.samples.updated.push({
          id: postId,
          slug: row.slug,
          before: row.featured_image_url,
          after: publicUrl,
          wpLegacyUrl
        });
      }
    }

    const outPath = reportPath('backfill-post-thumbnails');
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(dryRun ? '[dry-run] Nenhuma alteracao gravada.' : 'Backfill concluido.');
    console.log(`XML: ${xmlPath}`);
    console.log(`Posts no WP com thumbnail: ${wpData.postsWithResolvedUrl}`);
    console.log(`Posts no banco: ${report.db.totalPosts}`);
    console.log(`Atualizados: ${report.db.updated}`);
    console.log(`Ja corretos: ${report.db.alreadyCorrect}`);
    console.log(`Sem thumbnail no WP: ${report.db.noWpThumbnail}`);
    console.log(`Sem mapeamento no bucket: ${report.db.unresolvedMapping}`);
    console.log(`Relatorio: ${outPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
