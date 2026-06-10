#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const {
  buildClientFromEnv,
  fetchPaginated,
  fetchJetRelMap
} = require('./lib/wp-client');
const {
  getPoolFromEnv,
  runMigrations,
  truncateAllTables,
  upsertUsers,
  upsertCentrals,
  upsertVolumeVerifications,
  upsertUserCentralRelations,
  upsertPosts
} = require('./lib/pg-client');
const {
  mapUser,
  mapCentral,
  mapVolumeVerification,
  mapRelationsFromJetRelMap
} = require('./lib/transformers');
const { buildValidationReport } = require('./lib/validators');
const { parseWordPressExportPosts } = require('./lib/wp-xml-parser');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  dotenv.config({ path: envPath });
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
  const outputPath = path.join(reportsDir, `migration-report-${timestamp}.json`);
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return outputPath;
}

function summarize(name, totalSource, totalMapped) {
  console.log(`${name}: origem=${totalSource} mapeados=${totalMapped}`);
}

function ensureReferencedCentrals(centrals, verifications, relations) {
  const existingCentralIds = new Set(centrals.map((c) => c.id));
  const requiredCentralIds = new Set();

  for (const item of verifications) {
    if (item.central_id) requiredCentralIds.add(item.central_id);
  }
  for (const item of relations) {
    if (item.central_id) requiredCentralIds.add(item.central_id);
  }

  const added = [];
  for (const centralId of requiredCentralIds) {
    if (existingCentralIds.has(centralId)) continue;
    const fallback = {
      id: centralId,
      slug: `legacy-central-${centralId}`,
      name: `Legacy Central ${centralId}`,
      raw_json: {
        generated: true,
        reason: 'Central ausente no endpoint de centrais, mas referenciada por verificacoes/relacoes.'
      }
    };
    centrals.push(fallback);
    existingCentralIds.add(centralId);
    added.push(centralId);
  }

  return added;
}

async function run() {
  loadEnv();

  const perPage = Number(process.env.MIGRATION_PAGE_SIZE || 100);
  const relationId = Number(process.env.LEGACY_RELATION_ID || 13);
  const migrationsDir = path.resolve(__dirname, '..', 'migrations');
  const xmlPath = process.env.WP_EXPORT_XML_PATH
    ? path.resolve(process.env.WP_EXPORT_XML_PATH)
    : path.resolve(__dirname, 'terraorgnica.WordPress.2026-05-07.xml');

  const { client, baseUrl, hasAuth } = buildClientFromEnv({ requireAuth: true });
  const pool = getPoolFromEnv();

  console.log(`Iniciando migracao. Fonte legado: ${baseUrl}`);

  try {
    await runMigrations(pool, migrationsDir);
    console.log('Migrations SQL aplicadas com sucesso.');
    await truncateAllTables(pool);
    console.log('Dados antigos removidos para migracao limpa.');

    const [centralsRaw, usersRaw, verificationsRaw] = await Promise.all([
      fetchPaginated(client, '/wp-json/wp/v2/central', perPage),
      fetchPaginated(client, '/wp-json/wp/v2/users', perPage, { context: 'edit' }),
      fetchPaginated(client, '/wp-json/wp/v2/verificacoes-de-volu', perPage)
    ]);
    const jetRelMap = await fetchJetRelMap(client, relationId);
    const xmlPostsResult = parseWordPressExportPosts(xmlPath);

    const centrals = centralsRaw.map(mapCentral).filter(Boolean);
    const users = usersRaw.map(mapUser).filter(Boolean);
    const verifications = verificationsRaw.map(mapVolumeVerification).filter(Boolean);
    const relations = mapRelationsFromJetRelMap(jetRelMap);
    const posts = xmlPostsResult.posts;

    summarize('centrals', centralsRaw.length, centrals.length);
    summarize('users', usersRaw.length, users.length);
    if (!hasAuth) {
      throw new Error('Migracao de usuarios requer credenciais validas (Basic Auth).');
    }
    const usersWithoutEmail = usersRaw.filter((u) => !Object.prototype.hasOwnProperty.call(u, 'email')).length;
    if (usersWithoutEmail > 0) {
      throw new Error(
        `Endpoint de usuarios retornou ${usersWithoutEmail} registros sem campo email. Verifique credenciais/permissoes para context=edit.`
      );
    }

    summarize('volume_verifications', verificationsRaw.length, verifications.length);
    summarize('user_central_relations', Object.keys(jetRelMap || {}).length, relations.length);
    summarize('posts', xmlPostsResult.totalItems, posts.length);
    const missingCentralIds = ensureReferencedCentrals(centrals, verifications, relations);
    if (missingCentralIds.length > 0) {
      console.log(`centrals: adicionadas ${missingCentralIds.length} centrais fallback para FKs: [${missingCentralIds.join(', ')}]`);
    }

    await upsertCentrals(pool, centrals);
    await upsertUsers(pool, users);
    await upsertVolumeVerifications(pool, verifications);
    await upsertUserCentralRelations(pool, relations);
    await upsertPosts(pool, posts);

    const sourceCounts = {
      centrals: centralsRaw.length,
      users: usersRaw.length,
      volume_verifications: verificationsRaw.length,
      user_central_relations: relations.length,
      posts: posts.length
    };
    const report = await buildValidationReport(pool, sourceCounts);
    const reportPath = writeReport(report);

    console.log('Migracao finalizada com sucesso.');
    console.log(
      `Resumo de carga: users ${users.length}->${report.dbCounts.users}, centrals ${centrals.length}->${report.dbCounts.centrals}, volume_verifications ${verifications.length}->${report.dbCounts.volume_verifications}, user_central_relations ${relations.length}->${report.dbCounts.user_central_relations}`
    );
    console.log(`Resumo de carga posts: posts ${posts.length}->${report.dbCounts.posts}`);
    console.log(
      `Integridade: missing_verification_centrals=${report.integrity.missing_verification_centrals}, duplicate_relations=${report.integrity.duplicate_relations}`
    );
    console.log(`Posts por status: ${JSON.stringify(report.postsByStatus)}`);
    console.log(`Relatorio: ${reportPath}`);
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Falha na migracao:', error.message);
  process.exit(1);
});
