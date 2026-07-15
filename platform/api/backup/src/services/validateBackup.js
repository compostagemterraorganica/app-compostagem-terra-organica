const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { assertBucketAccessible, listObjectKeys, downloadObject } = require('../config/s3');
const {
  listPublicTables,
  exportTableRows
} = require('./jsonExport');
const { createLogger } = require('../logger');

const log = createLogger(env.logLevel);

const REQUIRED_ROOT_FILES = ['database.sql', 'database.json', 'manifest.json'];

function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function rowFingerprint(row) {
  return crypto.createHash('sha256').update(stableStringify(row)).digest('hex');
}

function fingerprintSet(rows) {
  const counts = new Map();
  for (const row of rows) {
    const fp = rowFingerprint(row);
    counts.set(fp, (counts.get(fp) || 0) + 1);
  }
  return counts;
}

function compareRowSets(backupRows, liveRows) {
  const backup = fingerprintSet(backupRows);
  const live = fingerprintSet(liveRows);
  let missingInDb = 0;
  let missingInBackup = 0;

  for (const [fp, count] of backup.entries()) {
    const liveCount = live.get(fp) || 0;
    if (liveCount < count) missingInDb += count - liveCount;
  }
  for (const [fp, count] of live.entries()) {
    const backupCount = backup.get(fp) || 0;
    if (backupCount < count) missingInBackup += count - backupCount;
  }

  return {
    equal: missingInDb === 0 && missingInBackup === 0 && backupRows.length === liveRows.length,
    backupRowCount: backupRows.length,
    liveRowCount: liveRows.length,
    missingInDb,
    missingInBackup
  };
}

function parseArgs(argv) {
  const args = {
    folder: null,
    keepLocal: false,
    listOnly: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--folder') {
      args.folder = argv[i + 1];
      if (!args.folder) throw new Error('Use --folder <YYYY-MM-DD_HHmmss>');
      i += 1;
    } else if (arg === '--keep-local') {
      args.keepLocal = true;
    } else if (arg === '--list') {
      args.listOnly = true;
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Argumento desconhecido: ${arg}`);
    }
  }

  return args;
}

function folderFromKey(key, prefix) {
  const normalizedPrefix = `${prefix.replace(/\/$/, '')}/`;
  if (!key.startsWith(normalizedPrefix)) return null;
  const rest = key.slice(normalizedPrefix.length);
  const folder = rest.split('/')[0];
  return folder || null;
}

async function listBackupFolders() {
  const keys = await listObjectKeys(`${env.s3BackupPrefix}/`);
  const folders = new Set();
  for (const key of keys) {
    const folder = folderFromKey(key, env.s3BackupPrefix);
    if (folder) folders.add(folder);
  }
  return [...folders].sort();
}

async function resolveBackupFolder(folderArg) {
  const folders = await listBackupFolders();
  if (!folders.length) {
    throw new Error(`Nenhum backup encontrado em s3://${env.s3Bucket}/${env.s3BackupPrefix}/`);
  }

  if (folderArg) {
    const exact = folders.find((name) => name === folderArg);
    if (!exact) {
      throw new Error(
        `Pasta nao encontrada: ${folderArg}. Disponiveis: ${folders.slice(-5).join(', ')}`
      );
    }
    return exact;
  }

  return folders[folders.length - 1];
}

async function downloadBackupFolder(folder, downloadDir) {
  const prefix = `${env.s3BackupPrefix}/${folder}/`;
  const keys = await listObjectKeys(prefix);
  if (!keys.length) {
    throw new Error(`Nenhum objeto em s3://${env.s3Bucket}/${prefix}`);
  }

  fs.mkdirSync(downloadDir, { recursive: true });
  const downloaded = [];

  for (const key of keys) {
    const relative = key.slice(prefix.length);
    if (!relative || relative.endsWith('/')) continue;
    const localPath = path.join(downloadDir, relative);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    const object = await downloadObject(key);
    fs.writeFileSync(localPath, object.body);
    downloaded.push({
      key,
      relative,
      localPath,
      sizeBytes: object.sizeBytes
    });
  }

  return downloaded;
}

function validateBackupFiles(downloadDir, downloaded) {
  const issues = [];
  const relativeSet = new Set(downloaded.map((item) => item.relative));

  for (const required of REQUIRED_ROOT_FILES) {
    if (!relativeSet.has(required)) {
      issues.push(`Arquivo obrigatorio ausente: ${required}`);
      continue;
    }
    const localPath = path.join(downloadDir, required);
    const size = fs.statSync(localPath).size;
    if (size <= 0) issues.push(`Arquivo vazio: ${required}`);
  }

  const sqlPath = path.join(downloadDir, 'database.sql');
  if (fs.existsSync(sqlPath)) {
    const sqlHead = fs.readFileSync(sqlPath, 'utf8').slice(0, 2000);
    if (!/BEGIN;|CREATE TABLE|INSERT INTO|pg_dump|--/i.test(sqlHead)) {
      issues.push('database.sql nao parece um dump SQL valido');
    }
  }

  let manifest = null;
  const manifestPath = path.join(downloadDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      issues.push(`manifest.json invalido: ${error.message}`);
    }
  }

  let databaseJson = null;
  const databaseJsonPath = path.join(downloadDir, 'database.json');
  if (fs.existsSync(databaseJsonPath)) {
    try {
      databaseJson = JSON.parse(fs.readFileSync(databaseJsonPath, 'utf8'));
      if (!databaseJson.tables || typeof databaseJson.tables !== 'object') {
        issues.push('database.json sem objeto tables');
      }
    } catch (error) {
      issues.push(`database.json invalido: ${error.message}`);
    }
  }

  const tableFiles = downloaded.filter((item) => item.relative.startsWith('tables/'));
  if (!tableFiles.length) {
    issues.push('Nenhum arquivo em tables/*.json');
  }

  for (const tableFile of tableFiles) {
    try {
      const parsed = JSON.parse(fs.readFileSync(tableFile.localPath, 'utf8'));
      if (!Array.isArray(parsed)) {
        issues.push(`${tableFile.relative} nao e um array JSON`);
      }
    } catch (error) {
      issues.push(`${tableFile.relative} JSON invalido: ${error.message}`);
    }
  }

  if (manifest?.uploads?.length) {
    const expected = new Set(
      manifest.uploads
        .map((item) => String(item.storageKey || '').split(`${env.s3BackupPrefix}/`).pop())
        .map((rel) => {
          const parts = String(rel || '').split('/');
          return parts.slice(1).join('/');
        })
        .filter(Boolean)
    );
    for (const relative of expected) {
      if (!relativeSet.has(relative)) {
        issues.push(`Manifest referencia arquivo ausente no download: ${relative}`);
      }
    }
  }

  if (databaseJson?.tables) {
    for (const tableName of Object.keys(databaseJson.tables)) {
      const tableRelative = `tables/${tableName}.json`;
      if (!relativeSet.has(tableRelative)) {
        issues.push(`database.json referencia tabela sem arquivo: ${tableRelative}`);
        continue;
      }
      const fileRows = JSON.parse(fs.readFileSync(path.join(downloadDir, tableRelative), 'utf8'));
      const bundled = databaseJson.tables[tableName];
      const bundledRows = Array.isArray(bundled?.rows) ? bundled.rows : [];
      if (fileRows.length !== bundledRows.length) {
        issues.push(
          `Divergencia ${tableName}: tables/${tableName}.json=${fileRows.length} vs database.json=${bundledRows.length}`
        );
      } else {
        const internal = compareRowSets(fileRows, bundledRows);
        if (!internal.equal) {
          issues.push(
            `Conteudo divergente entre database.json e tables/${tableName}.json`
          );
        }
      }
    }
  }

  return { issues, manifest, databaseJson, tableFiles };
}

async function validateAgainstDatabase(databaseJson) {
  const liveTables = await listPublicTables();
  const backupTables = Object.keys(databaseJson.tables || {}).sort();
  const report = {
    tableCountBackup: backupTables.length,
    tableCountLive: liveTables.length,
    missingTablesInDb: backupTables.filter((name) => !liveTables.includes(name)),
    extraTablesInDb: liveTables.filter((name) => !backupTables.includes(name)),
    tables: []
  };

  let allEqual = true;

  for (const tableName of backupTables) {
    if (!liveTables.includes(tableName)) {
      allEqual = false;
      report.tables.push({
        table: tableName,
        equal: false,
        reason: 'tabela ausente no banco'
      });
      continue;
    }

    const backupRows = Array.isArray(databaseJson.tables[tableName]?.rows)
      ? databaseJson.tables[tableName].rows
      : [];
    const liveRows = await exportTableRows(tableName);
    const comparison = compareRowSets(backupRows, liveRows);
    if (!comparison.equal) allEqual = false;

    report.tables.push({
      table: tableName,
      ...comparison
    });
  }

  for (const tableName of report.extraTablesInDb) {
    allEqual = false;
    report.tables.push({
      table: tableName,
      equal: false,
      reason: 'tabela existe no banco mas nao no backup'
    });
  }

  report.consistent = allEqual
    && report.missingTablesInDb.length === 0
    && report.extraTablesInDb.length === 0;

  return report;
}

async function validateBackup({ folder = null, keepLocal = false } = {}) {
  await assertBucketAccessible();
  const selectedFolder = await resolveBackupFolder(folder);
  const downloadDir = path.join(env.tmpDir, 'validate', selectedFolder);

  log.info('Baixando backup do S3', {
    folder: selectedFolder,
    prefix: `${env.s3BackupPrefix}/${selectedFolder}/`
  });

  if (fs.existsSync(downloadDir)) {
    fs.rmSync(downloadDir, { recursive: true, force: true });
  }

  const downloaded = await downloadBackupFolder(selectedFolder, downloadDir);
  const fileValidation = validateBackupFiles(downloadDir, downloaded);

  let dataValidation = null;
  if (fileValidation.databaseJson && !fileValidation.issues.length) {
    dataValidation = await validateAgainstDatabase(fileValidation.databaseJson);
  } else if (fileValidation.databaseJson) {
    dataValidation = await validateAgainstDatabase(fileValidation.databaseJson);
  }

  const ok =
    fileValidation.issues.length === 0
    && Boolean(dataValidation?.consistent);

  const result = {
    ok,
    folder: selectedFolder,
    s3Prefix: `${env.s3BackupPrefix}/${selectedFolder}`,
    downloadedCount: downloaded.length,
    localPath: downloadDir,
    fileIssues: fileValidation.issues,
    data: dataValidation
  };

  if (!keepLocal) {
    fs.rmSync(downloadDir, { recursive: true, force: true });
    result.localPath = null;
  }

  return result;
}

module.exports = {
  parseArgs,
  listBackupFolders,
  validateBackup,
  compareRowSets
};
