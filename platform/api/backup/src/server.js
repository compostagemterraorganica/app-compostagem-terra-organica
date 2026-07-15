const express = require('express');
const cron = require('node-cron');
const env = require('./config/env');
const { runBackup, isBackupRunning } = require('./services/runBackup');
const { createLogger } = require('./logger');

const log = createLogger(env.logLevel);
const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'backup-api',
    cronEnabled: env.cronEnabled,
    cronSchedule: env.cronSchedule,
    cronTz: env.cronTz,
    backupRunning: isBackupRunning()
  });
});

function authorizeTrigger(req, res, next) {
  if (!env.triggerToken) {
    if (env.nodeEnv === 'production') {
      return res.status(403).json({
        ok: false,
        error: 'BACKUP_TRIGGER_TOKEN nao configurado'
      });
    }
    return next();
  }

  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token !== env.triggerToken) {
    return res.status(401).json({ ok: false, error: 'Nao autorizado' });
  }
  return next();
}

app.post('/backup', authorizeTrigger, async (_req, res) => {
  if (isBackupRunning()) {
    return res.status(409).json({ ok: false, error: 'Backup ja em andamento' });
  }

  try {
    const result = await runBackup({ trigger: 'http' });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || 'Falha no backup'
    });
  }
});

function startCron() {
  if (!env.cronEnabled) {
    log.info('Cron desabilitado (BACKUP_CRON_ENABLED=false)');
    return;
  }

  if (!cron.validate(env.cronSchedule)) {
    throw new Error(`BACKUP_CRON_SCHEDULE invalido: ${env.cronSchedule}`);
  }

  cron.schedule(
    env.cronSchedule,
    async () => {
      if (isBackupRunning()) {
        log.warn('Cron ignorado: backup ja em andamento');
        return;
      }
      try {
        await runBackup({ trigger: 'cron' });
      } catch (error) {
        log.error('Falha no backup agendado', { message: error.message });
      }
    },
    { timezone: env.cronTz }
  );

  log.info('Cron agendado', {
    schedule: env.cronSchedule,
    timezone: env.cronTz
  });
}

function start() {
  startCron();

  app.listen(env.port, () => {
    log.info('Backup API ouvindo', {
      port: env.port,
      nodeEnv: env.nodeEnv,
      s3Bucket: env.s3Bucket,
      s3Prefix: env.s3BackupPrefix
    });
  });
}

if (require.main === module) {
  start();
}

module.exports = { app, start };
