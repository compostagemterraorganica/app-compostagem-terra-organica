#!/usr/bin/env node
/**
 * Importa verificacoes de volume novas do WordPress (mais recentes primeiro).
 * Para ao encontrar o primeiro ID ja cadastrado no Postgres.
 *
 * Dry-run por padrao. Use --apply para gravar.
 */
const path = require('path');
const fs = require('fs');

const { loadAllEnv } = require('./lib/load-env');
const { buildClientFromEnv } = require('./lib/wp-client');
const {
  getPoolFromEnv,
  runSqlFile,
  upsertVolumeVerifications,
  replaceVerificationTagNames
} = require('./lib/pg-client');
const { mapVolumeVerification } = require('./lib/transformers');
const { decodeHtmlEntities } = require('../api/src/utils/htmlEntities');

const ENDPOINT = '/wp-json/wp/v2/verificacoes-de-volu';
const MIGRATION_013 = path.resolve(
  __dirname,
  '..',
  'api',
  'src',
  'db',
  'migrations',
  '013_volume_kg_waste_tags.sql'
);

function parseArgs(argv) {
  const args = { apply: false, perPage: Number(process.env.MIGRATION_PAGE_SIZE || 50) };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--dry-run') {
      args.apply = false;
    } else if (arg.startsWith('--per-page=')) {
      args.perPage = Number(arg.split('=')[1]) || args.perPage;
    }
  }
  return args;
}

function ensureDir(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    fs.mkdirSync(absolutePath, { recursive: true });
  }
}

function writeReport(report) {
  const reportsDir = path.resolve(__dirname, 'reports');
  ensureDir(reportsDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputPath = path.join(reportsDir, `import-volume-verifications-${timestamp}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

async function loadExistingIds(pool) {
  const result = await pool.query('SELECT id FROM volume_verifications');
  return new Set(result.rows.map((row) => Number(row.id)));
}

async function fetchPendingFromWordpress(client, existingIds, perPage) {
  const pendingRaw = [];
  let page = 1;
  let pagesFetched = 0;
  let itemsFetched = 0;
  let stopAt = null;

  while (true) {
    const response = await client.get(ENDPOINT, {
      params: {
        per_page: perPage,
        page,
        orderby: 'date',
        order: 'desc',
        status: 'any'
      }
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    pagesFetched += 1;
    itemsFetched += rows.length;

    if (!rows.length) break;

    let shouldStop = false;
    for (const raw of rows) {
      const id = Number(raw.id);
      if (existingIds.has(id)) {
        stopAt = {
          id,
          published_at: raw.date || null,
          title: decodeHtmlEntities(raw.title?.rendered || raw.title || '')
        };
        shouldStop = true;
        break;
      }
      pendingRaw.push(raw);
    }

    if (shouldStop || rows.length < perPage) break;
    page += 1;
  }

  return { pendingRaw, pagesFetched, itemsFetched, stopAt };
}

async function ensureVolumeKgSchema(pool) {
  if (!fs.existsSync(MIGRATION_013)) {
    throw new Error(`Migration 013 nao encontrada em ${MIGRATION_013}`);
  }
  await runSqlFile(pool, MIGRATION_013);
}

function summarizePending(verifications) {
  return verifications.map((row) => ({
    id: row.id,
    title: decodeHtmlEntities(row.title || ''),
    published_at: row.published_at,
    measurement_date: row.measurement_date,
    central_id: row.central_id,
    volume_liters: row.volume_liters,
    volume_kg: row.volume_kg,
    waste_type: row.waste_type,
    tag_names: row.tag_names || [],
    video_link: row.video_link,
    status: row.status
  }));
}

async function main() {
  const { apply, perPage } = parseArgs(process.argv);
  const dryRun = !apply;

  loadAllEnv();

  const { client, baseUrl } = buildClientFromEnv({ requireAuth: true });
  const pool = getPoolFromEnv();

  const report = {
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    source: baseUrl,
    per_page: perPage,
    stop_at: null,
    pages_fetched: 0,
    items_fetched: 0,
    pending_count: 0,
    skipped_invalid: 0,
    missing_centrals: [],
    pending: [],
    applied: null
  };

  try {
    await ensureVolumeKgSchema(pool);

    const existingIds = await loadExistingIds(pool);
    const { pendingRaw, pagesFetched, itemsFetched, stopAt } = await fetchPendingFromWordpress(
      client,
      existingIds,
      perPage
    );

    report.pages_fetched = pagesFetched;
    report.items_fetched = itemsFetched;
    report.stop_at = stopAt;

    const mapped = [];
    for (const raw of pendingRaw) {
      const row = mapVolumeVerification(raw);
      if (!row) {
        report.skipped_invalid += 1;
        continue;
      }
      row.title = decodeHtmlEntities(row.title || '');
      mapped.push(row);
    }

    const centralIds = [...new Set(mapped.map((row) => row.central_id))];
    const centralsResult = await pool.query(
      'SELECT id FROM centrals WHERE id = ANY($1::bigint[])',
      [centralIds]
    );
    const existingCentrals = new Set(centralsResult.rows.map((row) => Number(row.id)));
    report.missing_centrals = centralIds.filter((id) => !existingCentrals.has(id));

    const importable = mapped.filter((row) => existingCentrals.has(row.central_id));
    report.pending = summarizePending(importable);
    report.pending_count = importable.length;
    report.blocked_missing_central = mapped
      .filter((row) => !existingCentrals.has(row.central_id))
      .map((row) => ({ id: row.id, central_id: row.central_id, title: row.title }));

    if (!dryRun) {
      if (report.missing_centrals.length) {
        throw new Error(
          `Nao e possivel aplicar: centrais ausentes [${report.missing_centrals.join(', ')}]`
        );
      }

      await upsertVolumeVerifications(pool, importable);

      let tagsAttached = 0;
      for (const row of importable) {
        const tagIds = await replaceVerificationTagNames(
          pool,
          row.id,
          row.central_id,
          row.tag_names || []
        );
        tagsAttached += tagIds.length;
      }

      report.applied = {
        inserted_or_updated: importable.length,
        tags_attached: tagsAttached
      };
    }

    const reportPath = writeReport(report);

    console.log(`Fonte WordPress: ${baseUrl}`);
    console.log(`Modo: ${dryRun ? 'dry-run (nada sera gravado)' : 'APPLY (gravando no banco)'}`);
    console.log(`Paginas lidas: ${pagesFetched} | itens inspecionados: ${itemsFetched}`);
    if (stopAt) {
      console.log(`Parou em volume ja cadastrado: id=${stopAt.id} (${stopAt.published_at}) — ${stopAt.title}`);
    } else {
      console.log('Nenhum volume ja cadastrado encontrado no caminho; todos os retornados sao novos.');
    }
    console.log(`Pendentes para importar: ${report.pending_count}`);
    console.log(`Invalidos (sem id/central): ${report.skipped_invalid}`);
    if (report.missing_centrals.length) {
      console.log(`Centrais ausentes no Postgres: [${report.missing_centrals.join(', ')}]`);
    }
    if (report.applied) {
      console.log(
        `Aplicado: ${report.applied.inserted_or_updated} volumes, ${report.applied.tags_attached} tags vinculadas`
      );
    }

    const preview = report.pending.slice(0, 15);
    if (preview.length) {
      console.log('\nPrevistos (mais recentes primeiro):');
      for (const row of preview) {
        const tagsLabel = row.tag_names.length ? row.tag_names.join(', ') : '(sem tags no WP)';
        console.log(
          `  - #${row.id} | ${row.measurement_date || row.published_at || '?'} | central ${row.central_id} | ${row.volume_liters} L / ${row.volume_kg} kg | ${row.waste_type} | tags: ${tagsLabel} | ${row.title}`
        );
      }
      if (report.pending.length > preview.length) {
        console.log(`  ... e mais ${report.pending.length - preview.length}`);
      }
    }

    console.log(`\nRelatorio: ${reportPath}`);
    if (dryRun) {
      console.log('Para gravar de verdade: npm run import:volume-verifications -- --apply');
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha na importacao de volumes:', error.message);
  process.exit(1);
});
