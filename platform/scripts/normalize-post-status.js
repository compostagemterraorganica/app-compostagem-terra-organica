#!/usr/bin/env node
const path = require('path')
const dotenv = require('dotenv')
const { getPoolFromEnv } = require('./lib/pg-client')

function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
}

async function main() {
  loadEnv()
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL nao configurado em platform/.env')
    process.exit(1)
  }

  const pool = getPoolFromEnv()
  try {
    const result = await pool.query(
      `UPDATE posts SET status = 'published', updated_at = NOW()
       WHERE status = 'publish'
       RETURNING id`
    )
    console.log(`Status normalizado: ${result.rowCount} posts publish → published`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})
