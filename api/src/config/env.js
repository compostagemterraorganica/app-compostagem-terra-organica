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

function validateResendFrom(from) {
  const trimmed = String(from || '').trim();
  if (!trimmed) return trimmed;

  const named = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  const email = (named ? named[2] : trimmed).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      `RESEND_FROM invalido: "${from}". Use email@dominio ou Nome <email@dominio> (dominio verificado no Resend).`
    );
  }

  return trimmed;
}

const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  postgresUrl: required('POSTGRES_URL'),
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
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/youtube/oauth/callback',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || ''
  },
  gcs: {
    bucket: process.env.GCS_BUCKET || '',
    publicBase: (process.env.GCS_PUBLIC_BASE || '').replace(/\/$/, ''),
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    mediaPrefix: (process.env.GCS_MEDIA_PREFIX || 'media').replace(/^\/|\/$/g, ''),
    enabled: Boolean(process.env.GCS_BUCKET && process.env.GOOGLE_APPLICATION_CREDENTIALS)
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY || '',
    from: validateResendFrom(process.env.RESEND_FROM || ''),
    codeTtlMinutes: Number(process.env.AUTH_CODE_TTL_MINUTES || 15),
    codeMaxAttempts: Number(process.env.AUTH_CODE_MAX_ATTEMPTS || 5)
  }
};

module.exports = env;
