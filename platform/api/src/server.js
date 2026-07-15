const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { runMigrations } = require('./db/runMigrations');
const { pool } = require('./config/db');

async function bootstrap() {
  await runMigrations();
  app.listen(env.port, () => {
    logger.info('server.start', {
      port: env.port,
      nodeEnv: env.nodeEnv,
      logLevel: env.logLevel,
      requestLogBody: env.requestLogBody
    });
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('process.unhandledRejection', {
    message: reason?.message || String(reason),
    stack: reason?.stack
  });
});

process.on('uncaughtException', (err) => {
  logger.error('process.uncaughtException', {
    message: err.message,
    stack: err.stack
  });
});

bootstrap().catch(async (err) => {
  logger.error('server.bootstrap_failed', {
    message: err.message,
    stack: err.stack
  });
  await pool.end();
  process.exit(1);
});
