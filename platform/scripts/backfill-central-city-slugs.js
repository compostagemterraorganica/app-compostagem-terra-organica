#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { loadPlatformApiEnv } = require('./lib/load-env');
const { getPoolFromEnv } = require('./lib/pg-client');
const { normalizeCentralMeta, slugifyCity, parseMeta } = require('../api/src/modules/centrals/central-meta');

const REPORTS_DIR = path.join(__dirname, 'reports');

function parseArgs(argv) {
  return { dryRun: argv.includes('--dry-run') };
}

async function main() {
  const { dryRun } = parseArgs(process.argv);
  loadPlatformApiEnv();
  const pool = getPoolFromEnv();

  const report = {
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    updated: [],
    skipped_no_city: [],
    already_ok: []
  };

  try {
    const result = await pool.query('SELECT id, slug, name, meta FROM centrals ORDER BY id');

    for (const row of result.rows) {
      const rawMeta = parseMeta(row.meta);
      const cityName = rawMeta.location?.city_name?.trim() || null;
      const currentSlug = rawMeta.location?.city_slug || null;
      const expectedSlug = cityName ? slugifyCity(cityName) : null;

      if (!cityName) {
        report.skipped_no_city.push({ id: Number(row.id), slug: row.slug, name: row.name });
        continue;
      }

      if (currentSlug === expectedSlug) {
        report.already_ok.push({
          id: Number(row.id),
          slug: row.slug,
          city_name: cityName,
          city_slug: expectedSlug
        });
        continue;
      }

      const nextMeta = normalizeCentralMeta(rawMeta);

      report.updated.push({
        id: Number(row.id),
        slug: row.slug,
        city_name: cityName,
        previous_city_slug: currentSlug,
        city_slug: nextMeta.location.city_slug
      });

      if (!dryRun) {
        await pool.query('UPDATE centrals SET meta = $2::jsonb, updated_at = NOW() WHERE id = $1', [
          row.id,
          JSON.stringify(nextMeta)
        ]);
      }
    }

    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const reportPath = path.join(
      REPORTS_DIR,
      `backfill-central-city-slugs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(`Dry run: ${dryRun ? 'sim' : 'nao'}`);
    console.log(`Atualizadas: ${report.updated.length}`);
    console.log(`Ja corretas: ${report.already_ok.length}`);
    console.log(`Sem cidade: ${report.skipped_no_city.length}`);
    console.log(`Relatorio: ${reportPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Erro no backfill:', err.message);
  process.exit(1);
});
