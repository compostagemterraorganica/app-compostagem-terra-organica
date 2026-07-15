const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  override: true
});

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}`);
  return value;
}

function optional(name, fallback = '') {
  const value = process.env[name];
  if (value == null || String(value).trim() === '') return fallback;
  return String(value).trim();
}

const env = {
  port: Number(process.env.PORT || 3010),
  nodeEnv: optional('NODE_ENV', 'development'),
  logLevel: optional('LOG_LEVEL', 'info').toLowerCase(),
  postgresUrl: required('POSTGRES_URL'),
  awsRegion: required('AWS_REGION'),
  s3Bucket: required('S3_BUCKET'),
  s3BackupPrefix: optional('S3_BACKUP_PREFIX', 'media/backups').replace(/^\/|\/$/g, ''),
  cronEnabled: String(process.env.BACKUP_CRON_ENABLED ?? 'true') !== 'false',
  cronSchedule: optional('BACKUP_CRON_SCHEDULE', '0 22 * * 5'),
  cronTz: optional('BACKUP_CRON_TZ', 'America/Sao_Paulo'),
  triggerToken: optional('BACKUP_TRIGGER_TOKEN', ''),
  keepLocal: String(process.env.BACKUP_KEEP_LOCAL ?? 'false') === 'true',
  tmpDir: path.resolve(__dirname, '..', '..', 'tmp')
};

module.exports = env;
