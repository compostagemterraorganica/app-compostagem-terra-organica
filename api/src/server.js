const app = require('./app');
const env = require('./config/env');
const { runMigrations } = require('./db/runMigrations');
const { pool } = require('./config/db');

async function bootstrap() {
  await runMigrations();
  app.listen(env.port, () => {
    console.log(`Nova API Postgres rodando na porta ${env.port}`);
  });
}

bootstrap().catch(async (err) => {
  console.error('Falha ao iniciar API:', err);
  await pool.end();
  process.exit(1);
});
