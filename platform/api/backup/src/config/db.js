const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.postgresUrl,
  ssl: { rejectUnauthorized: false }
});

module.exports = { pool };
