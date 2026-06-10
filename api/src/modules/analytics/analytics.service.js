const { pool } = require('../../config/db');
const { decodeHtmlEntities } = require('../../utils/htmlEntities');

function buildPeriodFilter(fromDate, toDate, bindStartIndex = 1) {
  const clauses = [];
  const values = [];
  if (fromDate) {
    clauses.push(`measurement_date >= $${bindStartIndex + values.length}`);
    values.push(fromDate);
  }
  if (toDate) {
    clauses.push(`measurement_date <= $${bindStartIndex + values.length}`);
    values.push(toDate);
  }
  return {
    whereClause: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values
  };
}

async function getKpis({ fromDate, toDate }) {
  const filter = buildPeriodFilter(fromDate, toDate);
  const kpiResult = await pool.query(
    `SELECT
      COALESCE(SUM(volume_liters), 0) AS total_volume_liters,
      COUNT(*)::int AS verification_count
     FROM volume_verifications
     ${filter.whereClause}`,
    filter.values
  );
  const centralResult = await pool.query('SELECT COUNT(*)::int AS total_centrals FROM centrals');
  return {
    ...kpiResult.rows[0],
    ...centralResult.rows[0]
  };
}

async function getVolumeByCentral({ fromDate, toDate }) {
  const filter = buildPeriodFilter(fromDate, toDate);
  const result = await pool.query(
    `SELECT c.id, c.name,
            COALESCE(SUM(v.volume_liters), 0) AS total_volume_liters,
            COUNT(v.id)::int AS verification_count
     FROM centrals c
     LEFT JOIN volume_verifications v ON v.central_id = c.id
     ${filter.whereClause ? filter.whereClause.replaceAll('measurement_date', 'v.measurement_date') : ''}
     GROUP BY c.id, c.name
     ORDER BY total_volume_liters DESC`,
    filter.values
  );
  return result.rows;
}

async function getVolumeTimeSeries({ fromDate, toDate }) {
  const filter = buildPeriodFilter(fromDate, toDate);
  const result = await pool.query(
    `SELECT measurement_date::date AS date, COALESCE(SUM(volume_liters), 0) AS total_volume_liters
     FROM volume_verifications
     ${filter.whereClause}
     GROUP BY measurement_date::date
     ORDER BY measurement_date::date ASC`,
    filter.values
  );
  return result.rows;
}

const REPORT_HEADER = ['Data da postagem', 'Central', 'Volume', 'Link do vídeo'];

function buildVerificationExportFilter(fromDate, toDate, bindStart = 1) {
  const clauses = [];
  const values = [];
  if (fromDate) {
    clauses.push(`COALESCE(v.measurement_date::date, v.published_at::date) >= $${bindStart + values.length}`);
    values.push(fromDate);
  }
  if (toDate) {
    clauses.push(`COALESCE(v.measurement_date::date, v.published_at::date) <= $${bindStart + values.length}`);
    values.push(toDate);
  }
  return {
    whereSql: clauses.length ? `AND ${clauses.join(' AND ')}` : '',
    values
  };
}

function formatDateBR(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Relatório completo (uma folha): todas as verificações, colunas alinhadas ao export WordPress,
 * ordenadas por data de postagem/medida crescente.
 */
async function getVolumeExportReport({ fromDate, toDate }) {
  const { whereSql, values } = buildVerificationExportFilter(fromDate, toDate);
  const result = await pool.query(
    `SELECT v.id,
            v.measurement_date,
            v.published_at,
            c.name AS central_name,
            v.volume_liters,
            COALESCE(NULLIF(TRIM(v.video_link), ''), NULLIF(TRIM(v.post_link), ''), '') AS link_video
     FROM volume_verifications v
     JOIN centrals c ON c.id = v.central_id
     WHERE 1 = 1
     ${whereSql}
     ORDER BY COALESCE(v.measurement_date, v.published_at) ASC NULLS LAST, v.id ASC`,
    values
  );

  const data = result.rows.map((row) => {
    const dateVal = row.measurement_date || row.published_at;
    const vol = Number(row.volume_liters);
    return {
      dataPostagem: formatDateBR(dateVal),
      central: decodeHtmlEntities(row.central_name || ''),
      volume: Number.isFinite(vol) ? vol : 0,
      linkVideo: decodeHtmlEntities(row.link_video || '')
    };
  });

  const sheet = [[...REPORT_HEADER], ...data.map((r) => [r.dataPostagem, r.central, r.volume, r.linkVideo])];

  return {
    sheet,
    data,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  getKpis,
  getVolumeByCentral,
  getVolumeTimeSeries,
  getVolumeExportReport
};
