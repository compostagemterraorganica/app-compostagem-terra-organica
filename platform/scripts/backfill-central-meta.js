#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { loadPlatformApiEnv } = require('./lib/load-env');
const { getPoolFromEnv } = require('./lib/pg-client');
const { buildCentralMetaFromExport } = require('./lib/central-meta');

const SCRIPTS_DIR = __dirname;
const REPORTS_DIR = path.join(SCRIPTS_DIR, 'reports');
const DEFAULT_INPUT = path.join(REPORTS_DIR, 'centrals-from-wordpress.json');

function parseArgs(argv) {
  const args = { input: DEFAULT_INPUT, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--input' && argv[i + 1]) {
      args.input = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

function loadExport(inputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Arquivo nao encontrado: ${inputPath}`);
  }
  const payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const centrals = Array.isArray(payload) ? payload : payload.centrals;
  if (!Array.isArray(centrals)) {
    throw new Error('JSON invalido: esperado array em "centrals" ou na raiz.');
  }
  return centrals;
}

async function main() {
  const { input, dryRun } = parseArgs(process.argv);
  loadPlatformApiEnv();
  const pool = getPoolFromEnv();

  const centrals = loadExport(input);
  const dbResult = await pool.query('SELECT id FROM centrals ORDER BY id');
  const dbIds = new Set(dbResult.rows.map((row) => Number(row.id)));

  const report = {
    generated_at: new Date().toISOString(),
    input,
    dry_run: dryRun,
    updated: [],
    not_found_in_db: [],
    skipped_empty: [],
    db_without_export: []
  };

  try {
    for (const record of centrals) {
      const id = Number(record.id);
      if (!Number.isFinite(id)) {
        report.skipped_empty.push({ reason: 'missing_id', record });
        continue;
      }

      if (!dbIds.has(id)) {
        report.not_found_in_db.push({ id, slug: record.slug || null, name: record.name || null });
        continue;
      }

      const meta = buildCentralMetaFromExport(record);
      report.updated.push({ id, slug: record.slug || null, name: record.name || null });

      if (!dryRun) {
        await pool.query(
          'UPDATE centrals SET meta = $2::jsonb, updated_at = NOW() WHERE id = $1',
          [id, JSON.stringify(meta)]
        );
      }
    }

    const exportIds = new Set(centrals.map((record) => Number(record.id)).filter(Number.isFinite));
    for (const dbId of dbIds) {
      if (!exportIds.has(dbId)) {
        report.db_without_export.push({ id: dbId });
      }
    }

    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const reportPath = path.join(
      REPORTS_DIR,
      `backfill-central-meta-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(`Input: ${input}`);
    console.log(`Dry run: ${dryRun ? 'sim' : 'nao'}`);
    console.log(`Atualizadas: ${report.updated.length}`);
    console.log(`Nao encontradas no DB: ${report.not_found_in_db.length}`);
    console.log(`Centrais no DB sem export: ${report.db_without_export.length}`);
    console.log(`Relatorio: ${reportPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Erro no backfill:', err.message);
  process.exit(1);
});
