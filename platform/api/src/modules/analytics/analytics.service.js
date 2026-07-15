const { pool } = require('../../config/db');
const { parseMeta } = require('../centrals/central-meta');
const { decodeHtmlEntities } = require('../../utils/htmlEntities');

const LAB_CENTRAL_ID = 4757;
const LAB_CENTRAL_MIN_TIME = Date.UTC(2020, 0, 1);

function round2(value) {
  return Math.round(value * 100) / 100;
}

/** Data de postagem do registro; fallback para created_at. Não usa measurement_date (data da coleta). */
function parsePostingDate(row) {
  const val = row.published_at || row.created_at;
  if (!val) return null;
  const date = val instanceof Date ? val : new Date(val);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getMonthKey(date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  return `${year}-${month.toString().padStart(2, '0')}`;
}

function getYearKey(date) {
  return String(date.getUTCFullYear());
}

function pickStateFromMeta(meta) {
  const parsed = parseMeta(meta);
  const stateUf = parsed.location?.state_uf || null;
  const stateName = parsed.location?.state_name || null;
  return { state_uf: stateUf, state_name: stateName };
}

function getStateKey(stateUf, stateName) {
  return stateUf || stateName || 'Sem UF';
}

function getStateLabel(stateUf, stateName) {
  if (stateUf && stateName) return `${stateName} (${stateUf})`;
  return stateUf || stateName || 'Sem UF';
}

function buildCentralInfo(central) {
  return {
    id: central.id,
    name: central.name,
    slug: central.slug,
    state_uf: central.state_uf || null,
    state_name: central.state_name || null
  };
}

function buildByState(results) {
  const volumeMap = new Map();
  const countMap = new Map();

  for (const item of results) {
    const { state_uf: stateUf, state_name: stateName } = item.central;
    const state = getStateKey(stateUf, stateName);
    const stateLabel = getStateLabel(stateUf, stateName);

    const volumeEntry = volumeMap.get(state) || { state, stateLabel, volume: 0 };
    volumeEntry.volume += item.metrics.totalVolume;
    volumeMap.set(state, volumeEntry);

    const countEntry = countMap.get(state) || { state, stateLabel, count: 0 };
    countEntry.count += 1;
    countMap.set(state, countEntry);
  }

  return {
    volume: [...volumeMap.values()]
      .sort((a, b) => b.volume - a.volume)
      .map((row) => ({ ...row, volume: Math.round(row.volume) })),
    centralsCount: [...countMap.values()].sort((a, b) => b.count - a.count)
  };
}

function normalizeVerificationRows(rows) {
  return rows
    .map((row) => {
      const date = parsePostingDate(row);
      const volume = Number(row.volume_liters);
      if (!date || !Number.isFinite(volume) || volume <= 0) return null;
      return { date, volume };
    })
    .filter(Boolean);
}

function calculateCentralMetrics(central, verificationRows) {
  let entries = normalizeVerificationRows(verificationRows);

  if (central.id === LAB_CENTRAL_ID) {
    entries = entries.filter((entry) => entry.date.getTime() >= LAB_CENTRAL_MIN_TIME);
  }

  const volumes = entries.map((entry) => entry.volume);
  const totalVolume = volumes.reduce((sum, volume) => sum + volume, 0);
  const postCount = volumes.length;
  const averageVolume = postCount > 0 ? totalVolume / postCount : 0;

  const monthlyVolumes = {};
  const monthlyPosts = {};

  const allDates = entries.map((entry) => entry.date).sort((a, b) => a - b);

  if (allDates.length === 0) {
    return {
      central: buildCentralInfo(central),
      metrics: {
        totalVolume: 0,
        averageVolume: 0,
        postCount: 0,
        annualVolume: 0,
        averageMonthlyVolume: 0,
        averageMonthlyPosts: 0,
        averageVolumePerMonthlyCollection: 0,
        monthlyVolumes: [],
        yearlyVolumes: [],
        quarterlyVolumes: [],
        semesterlyVolumes: []
      }
    };
  }

  const startDate = new Date(Date.UTC(allDates[0].getUTCFullYear(), allDates[0].getUTCMonth(), 1));
  const endDate = new Date(
    Date.UTC(allDates[allDates.length - 1].getUTCFullYear(), allDates[allDates.length - 1].getUTCMonth(), 1)
  );
  const allMonths = [];

  for (let date = new Date(startDate); date <= endDate; date.setUTCMonth(date.getUTCMonth() + 1)) {
    const monthKey = getMonthKey(date);
    allMonths.push(monthKey);
    monthlyVolumes[monthKey] = 0;
    monthlyPosts[monthKey] = 0;
  }

  const quarterlyVolumes = {};
  const semesterlyVolumes = {};
  const yearlyVolumes = {};
  const startYear = allDates[0].getUTCFullYear();
  const endYear = allDates[allDates.length - 1].getUTCFullYear();
  const allYears = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const yearKey = String(year);
    allYears.push(yearKey);
    yearlyVolumes[yearKey] = 0;
  }

  entries.forEach(({ date, volume }) => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const quarter = Math.ceil(month / 3);
    const semester = month <= 6 ? 1 : 2;

    const monthKey = getMonthKey(date);
    monthlyVolumes[monthKey] = (monthlyVolumes[monthKey] || 0) + volume;
    monthlyPosts[monthKey] = (monthlyPosts[monthKey] || 0) + 1;

    const yearKey = getYearKey(date);
    yearlyVolumes[yearKey] = (yearlyVolumes[yearKey] || 0) + volume;

    const quarterKey = `${year}-Q${quarter}`;
    quarterlyVolumes[quarterKey] = (quarterlyVolumes[quarterKey] || 0) + volume;

    const semesterKey = `${year}-S${semester}`;
    semesterlyVolumes[semesterKey] = (semesterlyVolumes[semesterKey] || 0) + volume;
  });

  const monthlyValues = Object.values(monthlyVolumes);
  const averageMonthlyVolume =
    monthlyValues.length > 0 ? monthlyValues.reduce((sum, vol) => sum + vol, 0) / monthlyValues.length : 0;
  const averageMonthlyPosts = allMonths.length > 0 ? postCount / allMonths.length : 0;

  const monthlyCollectionAverages = allMonths
    .map((month) => {
      const posts = monthlyPosts[month] || 0;
      if (posts <= 0) return null;
      return (monthlyVolumes[month] || 0) / posts;
    })
    .filter((value) => value !== null);
  const averageVolumePerMonthlyCollection =
    monthlyCollectionAverages.length > 0
      ? monthlyCollectionAverages.reduce((sum, value) => sum + value, 0) / monthlyCollectionAverages.length
      : 0;

  const currentYear = String(new Date().getUTCFullYear());
  const annualVolume = yearlyVolumes[currentYear] || 0;

  return {
    central: buildCentralInfo(central),
    metrics: {
      totalVolume: round2(totalVolume),
      averageVolume: round2(averageVolume),
      postCount,
      annualVolume: Math.round(annualVolume),
      averageMonthlyVolume: round2(averageMonthlyVolume),
      averageMonthlyPosts: round2(averageMonthlyPosts),
      averageVolumePerMonthlyCollection: round2(averageVolumePerMonthlyCollection),
      monthlyPosts: allMonths.map((month) => ({ month, count: monthlyPosts[month] || 0 })),
      monthlyVolumes: allMonths.map((month) => ({
        month,
        volume: Math.round(monthlyVolumes[month] || 0)
      })),
      yearlyVolumes: allYears.map((year) => ({
        year,
        volume: Math.round(yearlyVolumes[year] || 0)
      })),
      quarterlyVolumes: Object.entries(quarterlyVolumes)
        .map(([quarter, volume]) => ({ quarter, volume: round2(volume) }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter)),
      semesterlyVolumes: Object.entries(semesterlyVolumes)
        .map(([semester, volume]) => ({ semester, volume: round2(volume) }))
        .sort((a, b) => a.semester.localeCompare(b.semester))
    }
  };
}

async function getCentralsAnalysis() {
  const [centralsResult, verificationsResult] = await Promise.all([
    pool.query('SELECT id, slug, name, meta FROM centrals ORDER BY id'),
    pool.query(
      `SELECT central_id, volume_liters, published_at, created_at
       FROM volume_verifications
       WHERE volume_liters > 0
       ORDER BY central_id, COALESCE(published_at, created_at) ASC NULLS LAST, id ASC`
    )
  ]);

  const verificationsByCentral = new Map();
  for (const row of verificationsResult.rows) {
    const list = verificationsByCentral.get(row.central_id) || [];
    list.push(row);
    verificationsByCentral.set(row.central_id, list);
  }

  const results = centralsResult.rows.map((row) => {
    const { state_uf, state_name } = pickStateFromMeta(row.meta);
    return calculateCentralMetrics(
      {
        id: row.id,
        slug: row.slug,
        name: decodeHtmlEntities(row.name || ''),
        state_uf,
        state_name
      },
      verificationsByCentral.get(row.id) || []
    );
  });

  results.sort((a, b) => b.metrics.postCount - a.metrics.postCount);

  const totalVolume = results.reduce((sum, item) => sum + item.metrics.totalVolume, 0);
  const totalPosts = results.reduce((sum, item) => sum + item.metrics.postCount, 0);

  return {
    centrals: results,
    summary: {
      totalCentrals: results.length,
      totalVolume: round2(totalVolume),
      totalPosts,
      byState: buildByState(results)
    },
    generatedAt: new Date().toISOString()
  };
}

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
    clauses.push(`COALESCE(v.published_at::date, v.created_at::date) >= $${bindStart + values.length}`);
    values.push(fromDate);
  }
  if (toDate) {
    clauses.push(`COALESCE(v.published_at::date, v.created_at::date) <= $${bindStart + values.length}`);
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
 * Relatório completo (uma folha): todas as verificações, ordenadas por data de postagem crescente.
 */
async function getVolumeExportReport({ fromDate, toDate }) {
  const { whereSql, values } = buildVerificationExportFilter(fromDate, toDate);
  const result = await pool.query(
    `SELECT v.id,
            v.published_at,
            v.created_at,
            c.name AS central_name,
            v.volume_liters,
            COALESCE(NULLIF(TRIM(v.video_link), ''), NULLIF(TRIM(v.post_link), ''), '') AS link_video
     FROM volume_verifications v
     JOIN centrals c ON c.id = v.central_id
     WHERE 1 = 1
     ${whereSql}
     ORDER BY COALESCE(v.published_at, v.created_at) ASC NULLS LAST, v.id ASC`,
    values
  );

  const data = result.rows.map((row) => {
    const dateVal = row.published_at || row.created_at;
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
  getVolumeExportReport,
  getCentralsAnalysis
};
