#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { loadPlatformApiEnv } = require('./lib/load-env');
const { getPoolFromEnv } = require('./lib/pg-client');

const SCRIPTS_DIR = __dirname;
const REPORTS_DIR = path.join(SCRIPTS_DIR, 'reports');
const LITERS_PER_KG = 0.55;

function parseArgs(argv) {
  const args = { dryRun: false, force: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') {
      args.dryRun = true;
    } else if (argv[i] === '--force') {
      args.force = true;
    }
  }
  return args;
}

function litersToKg(liters) {
  return Math.round(Number(liters) * LITERS_PER_KG * 100) / 100;
}

async function main() {
  const { dryRun, force } = parseArgs(process.argv);
  loadPlatformApiEnv();
  const pool = getPoolFromEnv();

  const report = {
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    force,
    updated: [],
    skipped_zero_liters: 0
  };

  try {
    const whereSql = force
      ? 'WHERE volume_liters > 0'
      : `WHERE volume_liters > 0
         AND (volume_kg IS NULL OR volume_kg = 0)`;

    const pending = await pool.query(
      `SELECT id, volume_liters, volume_kg
       FROM volume_verifications
       ${whereSql}
       ORDER BY id`
    );

    for (const row of pending.rows) {
      const liters = Number(row.volume_liters);
      if (!Number.isFinite(liters) || liters <= 0) {
        report.skipped_zero_liters += 1;
        continue;
      }

      const volumeKg = litersToKg(liters);
      const previousKg = row.volume_kg == null ? null : Number(row.volume_kg);

      if (!force && previousKg === volumeKg) {
        continue;
      }

      report.updated.push({
        id: Number(row.id),
        volume_liters: liters,
        previous_volume_kg: previousKg,
        volume_kg: volumeKg
      });
    }

    if (!dryRun && report.updated.length > 0) {
      const result = await pool.query(
        `UPDATE volume_verifications
         SET volume_kg = ROUND(volume_liters * $1, 2),
             updated_at = NOW()
         ${whereSql}`,
        [LITERS_PER_KG]
      );
      report.rows_updated = result.rowCount;
    }

    const stats = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE volume_kg IS NULL)::int AS null_kg,
         COUNT(*) FILTER (WHERE volume_kg = 0)::int AS zero_kg,
         COUNT(*) FILTER (WHERE volume_kg > 0)::int AS positive_kg
       FROM volume_verifications`
    );
    report.after = stats.rows[0];

    if (!fs.existsSync(REPORTS_DIR)) {
      fs.mkdirSync(REPORTS_DIR, { recursive: true });
    }

    const reportPath = path.join(
      REPORTS_DIR,
      `backfill-volume-kg-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    console.log(`Dry run: ${dryRun ? 'sim' : 'nao'}`);
    console.log(`Force (recalcular todos com litros > 0): ${force ? 'sim' : 'nao'}`);
    console.log(`Atualizadas: ${report.updated.length}`);
    if (report.rows_updated != null) {
      console.log(`Linhas gravadas no banco: ${report.rows_updated}`);
    }
    console.log(`Ignoradas (litros zero): ${report.skipped_zero_liters}`);
    console.log(`Estado apos execucao:`, report.after);
    console.log(`Relatorio: ${reportPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Erro no backfill:', err.message);
  process.exit(1);
});
