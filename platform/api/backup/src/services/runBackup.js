const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const { assertBucketAccessible, uploadFile } = require('../config/s3');
const { createSqlDump } = require('./sqlDump');
const { exportDatabaseJson } = require('./jsonExport');
const { pool } = require('../config/db');
const { createLogger } = require('../logger');

const log = createLogger(env.logLevel);

let running = false;

function formatDateFolder(date = new Date(), timeZone = env.cronTz) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value || '00';
  const day = `${get('year')}-${get('month')}-${get('day')}`;
  const time = `${get('hour')}${get('minute')}${get('second')}`;
  return `${day}_${time}`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

async function uploadLocalFile(localPath, s3Key, contentType) {
  const body = fs.readFileSync(localPath);
  return uploadFile({
    key: s3Key,
    body,
    contentType,
    metadata: { source: 'backup-api' }
  });
}

async function runBackup({ trigger = 'manual' } = {}) {
  if (running) {
    const err = new Error('Backup ja em andamento');
    err.code = 'BACKUP_IN_PROGRESS';
    throw err;
  }

  running = true;
  const startedAt = Date.now();
  const folder = formatDateFolder();
  const workDir = path.join(env.tmpDir, folder);
  const s3Prefix = `${env.s3BackupPrefix}/${folder}`;

  const report = {
    trigger,
    startedAt: new Date().toISOString(),
    folder,
    s3Bucket: env.s3Bucket,
    s3Prefix,
    uploads: [],
    tables: []
  };

  try {
    log.info('Backup iniciado', { trigger, folder, s3Prefix });
    await assertBucketAccessible();

    fs.mkdirSync(workDir, { recursive: true });

    const sqlPath = path.join(workDir, 'database.sql');
    const sql = await createSqlDump({
      postgresUrl: env.postgresUrl,
      outputPath: sqlPath,
      pool
    });
    log.info('Dump SQL gerado', { size: formatBytes(sql.sizeBytes), method: sql.method });

    const json = await exportDatabaseJson({ outputDir: workDir });
    report.tables = json.tableNames;
    log.info('Export JSON gerado', {
      tables: json.tableNames.length,
      fullSize: formatBytes(json.fullSizeBytes)
    });

    const sqlUpload = await uploadLocalFile(
      sqlPath,
      `${s3Prefix}/database.sql`,
      'application/sql'
    );
    report.uploads.push(sqlUpload);

    const fullJsonUpload = await uploadLocalFile(
      json.fullPath,
      `${s3Prefix}/database.json`,
      'application/json'
    );
    report.uploads.push(fullJsonUpload);

    for (const tableFile of json.tableFiles) {
      const uploaded = await uploadLocalFile(
        tableFile.path,
        `${s3Prefix}/tables/${tableFile.table}.json`,
        'application/json'
      );
      report.uploads.push(uploaded);
    }

    const manifest = {
      ...report,
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      uploadCount: report.uploads.length,
      totalUploadedBytes: report.uploads.reduce((sum, item) => sum + item.sizeBytes, 0)
    };
    const manifestPath = path.join(workDir, 'manifest.json');
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    const manifestUpload = await uploadLocalFile(
      manifestPath,
      `${s3Prefix}/manifest.json`,
      'application/json'
    );
    report.uploads.push(manifestUpload);

    if (!env.keepLocal) {
      fs.rmSync(workDir, { recursive: true, force: true });
    }

    log.info('Backup concluido', {
      folder,
      uploads: report.uploads.length,
      durationMs: Date.now() - startedAt,
      keepLocal: env.keepLocal
    });

    return {
      ok: true,
      folder,
      s3Bucket: env.s3Bucket,
      s3Prefix,
      uploads: report.uploads.map((u) => u.storageKey),
      tables: report.tables,
      durationMs: Date.now() - startedAt,
      localPath: env.keepLocal ? workDir : null
    };
  } catch (error) {
    log.error('Backup falhou', {
      message: error.message,
      folder,
      durationMs: Date.now() - startedAt
    });
    throw error;
  } finally {
    running = false;
  }
}

function isBackupRunning() {
  return running;
}

module.exports = {
  runBackup,
  isBackupRunning,
  formatDateFolder
};
