#!/usr/bin/env node
/**
 * Backup completo de POSTGRES_URL e restauracao em NEW_POSTGRES_URL.
 *
 * Requer client tools PostgreSQL no PATH: pg_dump, pg_restore.
 *
 * Uso:
 *   cd platform/api
 *   # Defina POSTGRES_URL e NEW_POSTGRES_URL no .env
 *   npm run db:backup-restore
 *
 * Opcoes:
 *   --backup-only          Apenas gera o dump (nao restaura)
 *   --restore-only <arquivo>  Restaura um dump existente em NEW_POSTGRES_URL
 *   --output <caminho>     Caminho do arquivo .dump (padrao: scripts/backups/...)
 *   --yes, -y              Pula confirmacao interativa
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const BACKUP_DIR = process.env.POSTGRES_BACKUP_DIR
  ? path.resolve(process.env.POSTGRES_BACKUP_DIR)
  : path.resolve(__dirname, 'backups');

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

function fail(message, detail) {
  console.error(`\nFalha: ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function maskDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '****';
    return parsed.toString();
  } catch {
    return '(URL invalida)';
  }
}

function parseArgs(argv) {
  const args = {
    backupOnly: false,
    restoreOnly: null,
    output: null,
    yes: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--backup-only') {
      args.backupOnly = true;
    } else if (arg === '--restore-only') {
      args.restoreOnly = argv[i + 1];
      if (!args.restoreOnly) fail('Use --restore-only <arquivo.dump>');
      i += 1;
    } else if (arg === '--output') {
      args.output = argv[i + 1];
      if (!args.output) fail('Use --output <caminho>');
      i += 1;
    } else if (arg === '--yes' || arg === '-y') {
      args.yes = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`Uso: node scripts/backup-restore-postgres.js [opcoes]

Opcoes:
  --backup-only              Apenas gera o dump
  --restore-only <arquivo>   Restaura dump em NEW_POSTGRES_URL
  --output <caminho>         Caminho do arquivo .dump
  --yes, -y                  Pula confirmacao
  --help, -h                 Mostra esta ajuda
`);
      process.exit(0);
    } else {
      fail(`Argumento desconhecido: ${arg}`, 'Use --help para ver as opcoes.');
    }
  }

  return args;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`Variavel ausente: ${name}`, `Defina em platform/api/.env`);
  return value;
}

function assertPgTool(binary) {
  const result = spawnSync('which', [binary], { encoding: 'utf8' });
  if (result.status !== 0) {
    fail(
      `${binary} nao encontrado no PATH`,
      'Instale o cliente PostgreSQL (ex: sudo apt install postgresql-client)'
    );
  }
}

function defaultDumpPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(BACKUP_DIR, `postgres-backup-${stamp}.dump`);
}

function runCommand(binary, commandArgs, label) {
  log(label, `${binary} ${commandArgs.map(shellQuote).join(' ')}`);

  const result = spawnSync(binary, commandArgs, {
    stdio: 'inherit',
    env: process.env
  });

  if (result.error) {
    fail(`Erro ao executar ${binary}`, result.error.message);
  }

  if (result.status !== 0) {
    fail(`${binary} terminou com codigo ${result.status}`);
  }
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(value)) return value;
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function confirmOrExit(sourceUrl, targetUrl, dumpPath, skipConfirm) {
  if (skipConfirm) return;

  console.log('\n=== Confirmacao ===');
  console.log(`Origem:  ${maskDatabaseUrl(sourceUrl)}`);
  if (targetUrl) console.log(`Destino: ${maskDatabaseUrl(targetUrl)}`);
  console.log(`Dump:    ${dumpPath}`);
  console.log(
    '\nA restauracao usa pg_restore --clean --if-exists e substitui objetos existentes no destino.'
  );
  console.log('Execute novamente com --yes para prosseguir.\n');
  process.exit(1);
}

function ensureBackupDir() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function backupDatabase(sourceUrl, dumpPath) {
  ensureBackupDir();

  runCommand(
    'pg_dump',
    [
      '--format=custom',
      '--no-owner',
      '--no-acl',
      '--verbose',
      `--file=${dumpPath}`,
      `--dbname=${sourceUrl}`
    ],
    'backup'
  );

  const stats = fs.statSync(dumpPath);
  log('ok', `Backup salvo (${formatBytes(stats.size)}): ${dumpPath}`);
  return dumpPath;
}

function restoreDatabase(targetUrl, dumpPath) {
  if (!fs.existsSync(dumpPath)) {
    fail(`Arquivo de dump nao encontrado: ${dumpPath}`);
  }

  runCommand(
    'pg_restore',
    [
      '--verbose',
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-acl',
      '--exit-on-error',
      `--dbname=${targetUrl}`,
      dumpPath
    ],
    'restore'
  );

  log('ok', 'Restauracao concluida no destino');
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  assertPgTool('pg_dump');
  assertPgTool('pg_restore');

  console.log('=== Backup e instalacao Postgres ===\n');

  if (args.restoreOnly) {
    const targetUrl = requireEnv('NEW_POSTGRES_URL');
    const dumpPath = path.resolve(args.restoreOnly);
    confirmOrExit('(dump existente)', targetUrl, dumpPath, args.yes);
    restoreDatabase(targetUrl, dumpPath);
    console.log('\n=== Restauracao concluida ===');
    return;
  }

  const sourceUrl = requireEnv('POSTGRES_URL');
  const dumpPath = path.resolve(args.output || defaultDumpPath());

  if (args.backupOnly) {
    confirmOrExit(sourceUrl, null, dumpPath, args.yes);
    backupDatabase(sourceUrl, dumpPath);
    console.log('\n=== Backup concluido ===');
    return;
  }

  const targetUrl = requireEnv('NEW_POSTGRES_URL');

  if (sourceUrl === targetUrl) {
    fail('POSTGRES_URL e NEW_POSTGRES_URL sao iguais', 'Use URLs diferentes para origem e destino.');
  }

  confirmOrExit(sourceUrl, targetUrl, dumpPath, args.yes);

  backupDatabase(sourceUrl, dumpPath);
  restoreDatabase(targetUrl, dumpPath);

  console.log('\n=== Backup e instalacao concluidos ===');
  console.log(`Arquivo local mantido em: ${dumpPath}`);
}

main();
