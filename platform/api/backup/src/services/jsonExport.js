const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function listPublicTables() {
  const { rows } = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return rows.map((row) => row.table_name);
}

function serializeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      out[key] = value.toISOString();
    } else if (typeof value === 'bigint') {
      out[key] = value.toString();
    } else if (Buffer.isBuffer(value)) {
      out[key] = value.toString('base64');
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function exportTableRows(tableName) {
  const quoted = `"${String(tableName).replace(/"/g, '""')}"`;
  const { rows } = await pool.query(`SELECT * FROM ${quoted}`);
  return rows.map(serializeRow);
}

/**
 * Gera database.json completo e um JSON por tabela em tables/.
 */
async function exportDatabaseJson({ outputDir }) {
  fs.mkdirSync(outputDir, { recursive: true });
  const tablesDir = path.join(outputDir, 'tables');
  fs.mkdirSync(tablesDir, { recursive: true });

  const tableNames = await listPublicTables();
  const tables = {};
  const tableFiles = [];

  for (const tableName of tableNames) {
    const rows = await exportTableRows(tableName);
    tables[tableName] = {
      rowCount: rows.length,
      rows
    };

    const tablePath = path.join(tablesDir, `${tableName}.json`);
    fs.writeFileSync(tablePath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    tableFiles.push({
      table: tableName,
      path: tablePath,
      rowCount: rows.length,
      sizeBytes: fs.statSync(tablePath).size
    });
  }

  const fullPath = path.join(outputDir, 'database.json');
  const payload = {
    exportedAt: new Date().toISOString(),
    schema: 'public',
    tableCount: tableNames.length,
    tables
  };
  fs.writeFileSync(fullPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  return {
    fullPath,
    fullSizeBytes: fs.statSync(fullPath).size,
    tableFiles,
    tableNames
  };
}

module.exports = {
  listPublicTables,
  exportDatabaseJson,
  exportTableRows,
  serializeRow
};
