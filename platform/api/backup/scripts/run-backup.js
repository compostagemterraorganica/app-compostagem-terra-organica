#!/usr/bin/env node
/**
 * Executa um backup sob demanda (sem subir o servidor HTTP).
 *
 *   cd platform/api/backup
 *   cp .env.example .env
 *   npm install
 *   npm run backup
 */

const { runBackup } = require('../src/services/runBackup');
const env = require('../src/config/env');
const { createLogger } = require('../src/logger');

const log = createLogger(env.logLevel);

async function main() {
  console.log('=== Backup Postgres → S3 ===\n');
  const result = await runBackup({ trigger: 'cli' });
  console.log('\n=== Backup concluido ===');
  console.log(`Pasta S3: s3://${result.s3Bucket}/${result.s3Prefix}/`);
  console.log(`Arquivos: ${result.uploads.length}`);
  console.log(`Tabelas:  ${result.tables.length}`);
  console.log(`Duracao:  ${result.durationMs} ms`);
  if (result.localPath) console.log(`Local:    ${result.localPath}`);
}

main().catch((error) => {
  log.error('Backup CLI falhou', { message: error.message });
  console.error(`\nFalha: ${error.message}`);
  process.exit(1);
});
