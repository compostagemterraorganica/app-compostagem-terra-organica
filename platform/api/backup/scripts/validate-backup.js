#!/usr/bin/env node
/**
 * Baixa um backup do S3, valida arquivos e compara dados com o Postgres atual.
 *
 * Uso:
 *   cd platform/api/backup
 *   npm run backup:validate
 *   npm run backup:validate -- --folder 2026-07-15_151921
 *   npm run backup:validate -- --list
 *   npm run backup:validate -- --keep-local
 */

const path = require('path');
const fs = require('fs');
const {
  parseArgs,
  listBackupFolders,
  validateBackup
} = require('../src/services/validateBackup');
const env = require('../src/config/env');
const { createLogger } = require('../src/logger');

const log = createLogger(env.logLevel);

function printHelp() {
  console.log(`Uso: node scripts/validate-backup.js [opcoes]

Opcoes:
  --folder <nome>   Pasta do backup (padrao: mais recente)
  --list            Lista pastas de backup no S3 e sai
  --keep-local      Mantem download em tmp/validate/
  --help, -h        Mostra esta ajuda
`);
}

function printReport(result) {
  console.log('\n=== Validacao de backup ===');
  console.log(`Pasta:     ${result.folder}`);
  console.log(`S3:        s3://${env.s3Bucket}/${result.s3Prefix}/`);
  console.log(`Arquivos:  ${result.downloadedCount}`);
  if (result.localPath) console.log(`Local:     ${result.localPath}`);

  if (result.fileIssues.length) {
    console.log('\nProblemas de arquivo:');
    for (const issue of result.fileIssues) console.log(`  - ${issue}`);
  } else {
    console.log('\nArquivos: OK (sql, json completo, tabelas e manifest)');
  }

  if (!result.data) {
    console.log('\nComparacao com banco: nao executada (falha nos arquivos)');
    return;
  }

  console.log('\nConsistencia com o banco atual:');
  console.log(`  Tabelas backup: ${result.data.tableCountBackup}`);
  console.log(`  Tabelas banco:  ${result.data.tableCountLive}`);
  console.log(`  Resultado:      ${result.data.consistent ? 'IGUAL' : 'DIVERGENTE'}`);

  if (result.data.missingTablesInDb.length) {
    console.log(`  Ausentes no DB: ${result.data.missingTablesInDb.join(', ')}`);
  }
  if (result.data.extraTablesInDb.length) {
    console.log(`  Extras no DB:   ${result.data.extraTablesInDb.join(', ')}`);
  }

  const divergentes = result.data.tables.filter((table) => !table.equal);
  if (divergentes.length) {
    console.log('\nTabelas divergentes:');
    for (const table of divergentes) {
      if (table.reason) {
        console.log(`  - ${table.table}: ${table.reason}`);
      } else {
        console.log(
          `  - ${table.table}: backup=${table.backupRowCount} db=${table.liveRowCount}`
          + ` missingInDb=${table.missingInDb} missingInBackup=${table.missingInBackup}`
        );
      }
    }
  } else {
    console.log('\nTodas as tabelas conferem com o banco.');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.listOnly) {
    const folders = await listBackupFolders();
    console.log(`Backups em s3://${env.s3Bucket}/${env.s3BackupPrefix}/`);
    if (!folders.length) {
      console.log('(nenhum)');
      process.exit(1);
    }
    for (const folder of folders) console.log(`  ${folder}`);
    process.exit(0);
  }

  console.log('=== Download + validacao de backup ===\n');
  const result = await validateBackup({
    folder: args.folder,
    keepLocal: args.keepLocal
  });

  printReport(result);

  const reportPath = path.join(
    env.tmpDir,
    `validate-report-${result.folder}.json`
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`\nRelatorio: ${reportPath}`);

  if (!result.ok) {
    console.error('\nVALIDACAO FALHOU: backup inconsistente ou incompleto.');
    process.exit(1);
  }

  console.log('\nVALIDACAO OK: arquivos corretos e dados iguais ao banco.');
}

main().catch((error) => {
  log.error('Validacao falhou', { message: error.message });
  console.error(`\nFalha: ${error.message}`);
  process.exit(1);
});
