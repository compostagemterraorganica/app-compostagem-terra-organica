const crypto = require('crypto');
const logger = require('../utils/logger');
const env = require('../config/env');

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordConfirm',
  'sessionToken',
  'csrfToken',
  'code',
  'refresh_token',
  'access_token',
  'authorization'
]);

const SKIP_BODY_PATHS = new Set(['/youtube/upload', '/media/upload']);

function sanitize(value, depth = 0) {
  if (depth > 6) return '[MAX_DEPTH]';
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (typeof value !== 'object') return value;

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    out[key] = sanitize(item, depth + 1);
  }
  return out;
}

function describeBody(req) {
  const path = req.path || req.url;
  if (SKIP_BODY_PATHS.has(path)) {
    return {
      kind: 'multipart',
      contentType: req.headers['content-type'] || null,
      contentLength: req.headers['content-length'] || null
    };
  }

  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    return {
      kind: 'json',
      body: sanitize(req.body)
    };
  }

  return null;
}

function requestLogger(req, res, next) {
  const requestId = crypto.randomBytes(8).toString('hex');
  req.requestId = requestId;
  req.requestStartedAt = Date.now();

  const path = req.originalUrl || req.url;
  const authHeader = req.headers.authorization;
  const authKind = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? 'bearer'
    : req.cookies?.[env.sessionCookieName]
      ? 'cookie'
      : 'none';

  const startMeta = {
    requestId,
    method: req.method,
    path,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null,
    origin: req.headers.origin || null,
    contentType: req.headers['content-type'] || null,
    contentLength: req.headers['content-length'] || null,
    authKind,
    hasCsrfHeader: Boolean(req.headers['x-csrf-token']),
    query: Object.keys(req.query || {}).length ? req.query : undefined
  };

  if (env.requestLogBody) {
    const body = describeBody(req);
    if (body) startMeta.body = body;
  }

  logger.info('request.start', startMeta);

  res.on('finish', () => {
    const finishMeta = {
      requestId,
      method: req.method,
      path,
      status: res.statusCode,
      durationMs: Date.now() - req.requestStartedAt,
      userId: req.auth?.user?.id,
      userEmail: req.auth?.user?.email,
      contentLength: res.getHeader('content-length') || null
    };

    if (res.statusCode >= 500) logger.error('request.finish', finishMeta);
    else if (res.statusCode >= 400) logger.warn('request.finish', finishMeta);
    else logger.info('request.finish', finishMeta);
  });

  next();
}

module.exports = { requestLogger };
