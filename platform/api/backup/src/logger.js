const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function createLogger(level = 'info') {
  const min = LEVELS[level] ?? LEVELS.info;

  function write(lvl, message, meta) {
    if ((LEVELS[lvl] ?? 99) < min) return;
    const line = {
      ts: new Date().toISOString(),
      level: lvl,
      service: 'backup-api',
      message,
      ...(meta && Object.keys(meta).length ? { meta } : {})
    };
    const out = JSON.stringify(line);
    if (lvl === 'error') console.error(out);
    else console.log(out);
  }

  return {
    debug: (message, meta) => write('debug', message, meta),
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta)
  };
}

module.exports = { createLogger };
