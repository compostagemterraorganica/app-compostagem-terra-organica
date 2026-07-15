const env = require('../config/env');

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

function normalizeLevel(level) {
  const key = String(level || 'info').toLowerCase();
  return LEVELS[key] != null ? key : 'info';
}

function shouldLog(level) {
  return LEVELS[level] >= LEVELS[normalizeLevel(env.logLevel)];
}

function write(level, message, meta) {
  if (!shouldLog(level)) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...meta
  };

  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

function logger(level, message, meta = {}) {
  write(level, message, meta);
}

logger.debug = (message, meta) => write('debug', message, meta);
logger.info = (message, meta) => write('info', message, meta);
logger.warn = (message, meta) => write('warn', message, meta);
logger.error = (message, meta) => write('error', message, meta);

module.exports = logger;
