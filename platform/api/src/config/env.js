const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '..', '..', '.env'),
  override: true
});

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel obrigatoria ausente: ${name}`);
  return value;
}

function requiredPostgresUrl() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('Variavel obrigatoria ausente: POSTGRES_URL ou DATABASE_URL');
  }
  return url;
}

function validateSesFrom(from) {
  const trimmed = String(from || '').trim();
  if (!trimmed) return trimmed;

  const named = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  const email = (named ? named[2] : trimmed).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      `SES_FROM invalido: "${from}". Use email@dominio ou Nome <email@dominio> (dominio verificado no SES).`
    );
  }

  return trimmed;
}

const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase(),
  requestLogBody: String(process.env.REQUEST_LOG_BODY ?? 'true') !== 'false',
  postgresUrl: requiredPostgresUrl(),
  appOrigins: (process.env.APP_ORIGIN || 'http://localhost:5173,http://localhost:19006')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSecure: String(process.env.COOKIE_SECURE || 'false') === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 168),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'terra_session',
  csrfCookieName: process.env.CSRF_COOKIE_NAME || 'terra_csrf',
  sessionSecret: required('SESSION_SECRET'),
  passwordHashKey: required('PASSWORD_HASH_KEY'),
  appDownloadUrl:
    process.env.APP_DOWNLOAD_URL || 'https://compostagemterraorganica.com.br/app/download',
  adminPanelUrl:
    process.env.ADMIN_PANEL_URL ||
    `${(process.env.APP_ORIGIN || 'http://localhost:5173').split(',')[0].trim()}/admin/entrar`,
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/youtube/oauth/callback',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || ''
  },
  s3: {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.AWS_REGION || '',
    publicBase: (process.env.S3_PUBLIC_BASE || '').replace(/\/$/, ''),
    mediaPrefix: (process.env.S3_MEDIA_PREFIX || 'media').replace(/^\/|\/$/g, ''),
    enabled: Boolean(process.env.S3_BUCKET?.trim() && process.env.AWS_REGION?.trim())
  },
  ses: {
    region: process.env.AWS_REGION || '',
    from: validateSesFrom(process.env.SES_FROM || ''),
    codeTtlMinutes: Number(process.env.AUTH_CODE_TTL_MINUTES || 15),
    codeMaxAttempts: Number(process.env.AUTH_CODE_MAX_ATTEMPTS || 5),
    enabled: Boolean(process.env.AWS_REGION?.trim() && process.env.SES_FROM?.trim())
  },
  formNotificationEmail: String(process.env.FORM_NOTIFICATION_EMAIL || '').trim()
};

module.exports = env;
