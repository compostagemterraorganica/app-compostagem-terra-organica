#!/usr/bin/env node
/**
 * Exporta CSV com e-mails de usuarios que possuem ao menos uma central relacionada.
 *
 * Uso:
 *   npm run export:users-with-centrals
 *   node scripts/export-users-with-centrals-emails.js --out=/caminho/arquivo.csv
 */
const path = require('path');
const fs = require('fs');
const { loadAllEnv } = require('./lib/load-env');
const { getPoolFromEnv } = require('./lib/pg-client');

function parseArgs(argv) {
  const args = { out: null };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--out=')) {
      args.out = path.resolve(arg.slice('--out='.length));
    } else if (arg === '--out') {
      args.out = path.resolve(argv[i + 1] || '');
      i += 1;
    }
  }
  return args;
}

function escapeCsvCell(value) {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows) {
  const header = ['email'];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push([escapeCsvCell(row.email)].join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

async function main() {
  const { out } = parseArgs(process.argv);
  loadAllEnv();

  const pool = getPoolFromEnv();
  try {
    const result = await pool.query(
      `SELECT DISTINCT LOWER(TRIM(u.email)) AS email
       FROM users u
       INNER JOIN user_central_relations r ON r.user_id = u.id
       WHERE u.email IS NOT NULL
         AND TRIM(u.email) <> ''
       ORDER BY email ASC`
    );

    const rows = result.rows.filter((row) => row.email);
    const csv = toCsv(rows);

    const reportsDir = path.resolve(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const outputPath =
      out ||
      path.join(
        reportsDir,
        `users-with-centrals-emails-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`
      );

    fs.writeFileSync(outputPath, csv, 'utf8');

    console.log(`Usuarios com central e e-mail: ${rows.length}`);
    console.log(`CSV: ${outputPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Falha ao exportar e-mails:', error.message);
  process.exit(1);
});
