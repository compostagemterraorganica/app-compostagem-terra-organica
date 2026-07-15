const logger = require('../utils/logger');
const env = require('../config/env');

function normalizeError(err) {
  if (err.type === 'entity.too.large') {
    return {
      status: 413,
      message: 'Payload excede o limite permitido',
      details: { limit: err.limit, length: err.length, expected: err.expected }
    };
  }

  if (err.type === 'entity.parse.failed') {
    return {
      status: 400,
      message: 'JSON invalido no corpo da requisicao',
      details: { body: err.body }
    };
  }

  return {
    status: err.status || 500,
    message: err.message || 'Erro interno',
    details: err.details
  };
}

function errorHandler(err, req, res, next) {
  const normalized = normalizeError(err);
  const requestId = req.requestId || 'unknown';
  const path = req.originalUrl || req.url;

  const logMeta = {
    requestId,
    method: req.method,
    path,
    status: normalized.status,
    message: normalized.message,
    details: normalized.details,
    userId: req.auth?.user?.id,
    userEmail: req.auth?.user?.email,
    ip: req.ip,
    userAgent: req.headers['user-agent'] || null,
    authKind: req.headers.authorization ? 'bearer' : req.cookies?.[env.sessionCookieName] ? 'cookie' : 'none',
    hasCsrfHeader: Boolean(req.headers['x-csrf-token'])
  };

  if (normalized.status >= 500 || env.logLevel === 'debug') {
    logMeta.stack = err.stack;
    logMeta.errorName = err.name;
    logMeta.errorCode = err.code;
  }

  if (normalized.status >= 500) logger.error('request.error', logMeta);
  else if (normalized.status >= 400) logger.warn('request.error', logMeta);
  else logger.info('request.error', logMeta);

  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(normalized.status).json({
    success: false,
    error: normalized.message,
    details: normalized.details || undefined,
    requestId
  });
}

module.exports = { errorHandler };
