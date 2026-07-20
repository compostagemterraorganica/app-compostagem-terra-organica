const { pool } = require('../../config/db');
const { parseMeta } = require('../centrals/central-meta');
const { decodeHtmlEntities } = require('../../utils/htmlEntities');

const LAB_CENTRAL_ID = 4757;
const LAB_CENTRAL_MIN_TIME = Date.UTC(2020, 0, 1);

function round2(value) {
  return Math.round(value * 100) / 100;
}

/**
 * Data da postagem (dia da coleta mostrado no título, ex.: "… – 16/05/2026").
 * Nunca usa created_at (criação/import no banco).
 * published_at só como fallback quando o título não traz data BR válida.
 */
function parseTitleDateBR(title) {
  if (!title) return null;
  const match = String(title).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 2019 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parsePostingDate(row) {
  const fromTitle = parseTitleDateBR(row.title);
  if (fromTitle) return fromTitle;

  const val = row.published_at;
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
  const postsMap = new Map();
  const avgMonthlyPostsMap = new Map();

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

    const postsEntry = postsMap.get(state) || { state, stateLabel, posts: 0 };
    postsEntry.posts += item.metrics.postCount;
    postsMap.set(state, postsEntry);

    const avgEntry = avgMonthlyPostsMap.get(state) || {
      state,
      stateLabel,
      sum: 0,
      centrals: 0
    };
    avgEntry.sum += item.metrics.averageMonthlyPosts || 0;
    avgEntry.centrals += 1;
    avgMonthlyPostsMap.set(state, avgEntry);
  }

  return {
    volume: [...volumeMap.values()]
      .sort((a, b) => b.volume - a.volume)
      .map((row) => ({ ...row, volume: Math.round(row.volume) })),
    centralsCount: [...countMap.values()].sort((a, b) => b.count - a.count),
    posts: [...postsMap.values()].sort((a, b) => b.posts - a.posts),
    averageMonthlyPosts: [...avgMonthlyPostsMap.values()]
      .map((row) => ({
        state: row.state,
        stateLabel: row.stateLabel,
        averageMonthlyPosts: row.centrals > 0 ? round2(row.sum / row.centrals) : 0
      }))
      .sort((a, b) => b.averageMonthlyPosts - a.averageMonthlyPosts)
  };
}

function parseIdList(value) {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const ids = [];
  for (const item of raw) {
    const n = Number(String(item).trim());
    if (Number.isInteger(n) && n > 0) ids.push(n);
  }
  return [...new Set(ids)];
}

function parseNameList(value) {
  if (value == null || value === '') return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return [...new Set(raw.map((item) => String(item).trim()).filter(Boolean))];
}

function normalizeWasteType(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'alimentares' || normalized === 'verdes') return normalized;
  return null;
}

/**
 * Filtros compartilhados entre análise e exportação (data de postagem).
 * @returns {{ clauses: string[], values: any[] }}
 */
function buildVerificationFilterClauses(filters = {}, bindStart = 1) {
  const {
    fromDate = null,
    toDate = null,
    centralIds = [],
    tagIds = [],
    tagNames = [],
    wasteType = null
  } = filters;

  const clauses = [];
  const values = [];

  if (fromDate) {
    clauses.push(`v.published_at::date >= $${bindStart + values.length}`);
    values.push(fromDate);
  }
  if (toDate) {
    clauses.push(`v.published_at::date <= $${bindStart + values.length}`);
    values.push(toDate);
  }
  if (centralIds.length > 0) {
    clauses.push(`v.central_id = ANY($${bindStart + values.length}::bigint[])`);
    values.push(centralIds);
  }
  if (wasteType) {
    clauses.push(`v.waste_type = $${bindStart + values.length}`);
    values.push(wasteType);
  }
  if (tagIds.length > 0) {
    clauses.push(`EXISTS (
      SELECT 1 FROM volume_verification_tags vt
      WHERE vt.volume_verification_id = v.id
        AND vt.tag_id = ANY($${bindStart + values.length}::bigint[])
    )`);
    values.push(tagIds);
  } else if (tagNames.length > 0) {
    clauses.push(`EXISTS (
      SELECT 1 FROM volume_verification_tags vt
      JOIN tags t ON t.id = vt.tag_id
      WHERE vt.volume_verification_id = v.id
        AND t.name = ANY($${bindStart + values.length}::text[])
    )`);
    values.push(tagNames);
  }

  return { clauses, values };
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
      monthlyVolumes: allMonths.map((month) => {
        const volume = Math.round(monthlyVolumes[month] || 0);
        const posts = monthlyPosts[month] || 0;
        return {
          month,
          volume,
          posts,
          averagePerCollection: posts > 0 ? Math.round(volume / posts) : 0
        };
      }),
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

async function loadFilterOptions() {
  const [centralsResult, tagsResult] = await Promise.all([
    pool.query('SELECT id, name FROM centrals ORDER BY name ASC'),
    pool.query(
      `SELECT id, name
       FROM tags
       WHERE TRIM(name) <> ''
       ORDER BY LOWER(TRIM(name)) ASC, id ASC`
    )
  ]);

  const tagsByName = new Map();
  for (const row of tagsResult.rows) {
    const name = decodeHtmlEntities(String(row.name || '').trim());
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = tagsByName.get(key) || { name, ids: [] };
    entry.ids.push(row.id);
    tagsByName.set(key, entry);
  }

  return {
    centrals: centralsResult.rows.map((row) => ({
      id: row.id,
      name: decodeHtmlEntities(row.name || '')
    })),
    tags: [...tagsByName.values()].map((tag) => ({
      name: tag.name,
      ids: tag.ids
    })),
    categories: [
      { value: 'alimentares', label: 'Resíduos alimentares' },
      { value: 'verdes', label: 'Resíduos verdes' }
    ]
  };
}

async function getCentralsAnalysis(filters = {}) {
  const centralIds = filters.centralIds || [];
  const { clauses, values } = buildVerificationFilterClauses(filters, 1);
  const verificationWhere = ['v.volume_liters > 0', ...clauses];

  const centralsSql =
    centralIds.length > 0
      ? 'SELECT id, slug, name, meta FROM centrals WHERE id = ANY($1::bigint[]) ORDER BY id'
      : 'SELECT id, slug, name, meta FROM centrals ORDER BY id';
  const centralsParams = centralIds.length > 0 ? [centralIds] : [];

  const [centralsResult, verificationsResult, filterOptions] = await Promise.all([
    pool.query(centralsSql, centralsParams),
    pool.query(
      `SELECT v.central_id, v.volume_liters, v.published_at, v.title
       FROM volume_verifications v
       WHERE ${verificationWhere.join(' AND ')}
         AND (v.published_at IS NOT NULL OR v.title IS NOT NULL)
       ORDER BY v.central_id, v.published_at ASC NULLS LAST, v.id ASC`,
      values
    ),
    loadFilterOptions()
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
    filterOptions,
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

const REPORT_HEADER = ['Data da postagem', 'Central', 'Volume', 'Categoria', 'Tags', 'Link do vídeo'];

function buildVerificationExportFilter(filters = {}, bindStart = 1) {
  const { clauses, values } = buildVerificationFilterClauses(filters, bindStart);
  return {
    whereSql: clauses.length ? `AND ${clauses.join(' AND ')}` : '',
    values
  };
}

function formatDateBR(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatWasteTypeLabel(value) {
  if (value === 'verdes') return 'Resíduos verdes';
  if (value === 'alimentares') return 'Resíduos alimentares';
  return value || '';
}

/**
 * Relatório completo (uma folha): verificações filtradas, ordenadas por data de postagem crescente.
 */
async function getVolumeExportReport(filters = {}) {
  const { whereSql, values } = buildVerificationExportFilter(filters);
  const result = await pool.query(
    `SELECT v.id,
            v.title,
            v.published_at,
            v.waste_type,
            c.name AS central_name,
            v.volume_liters,
            COALESCE(NULLIF(TRIM(v.video_link), ''), NULLIF(TRIM(v.post_link), ''), '') AS link_video,
            COALESCE((
              SELECT string_agg(t.name, '; ' ORDER BY t.name)
              FROM volume_verification_tags vt
              JOIN tags t ON t.id = vt.tag_id
              WHERE vt.volume_verification_id = v.id
            ), '') AS tags
     FROM volume_verifications v
     JOIN centrals c ON c.id = v.central_id
     WHERE (v.published_at IS NOT NULL OR COALESCE(v.title, '') <> '')
     ${whereSql}
     ORDER BY v.published_at ASC NULLS LAST, v.id ASC`,
    values
  );

  const data = result.rows
    .map((row) => {
      const dateVal = parsePostingDate(row);
      if (!dateVal) return null;
      const vol = Number(row.volume_liters);
      return {
        dataPostagem: formatDateBR(dateVal),
        _sort: dateVal.getTime(),
        central: decodeHtmlEntities(row.central_name || ''),
        volume: Number.isFinite(vol) ? vol : 0,
        categoria: formatWasteTypeLabel(row.waste_type),
        tags: decodeHtmlEntities(row.tags || ''),
        linkVideo: decodeHtmlEntities(row.link_video || '')
      };
    })
    .filter(Boolean)
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort, ...row }) => row);

  const sheet = [
    [...REPORT_HEADER],
    ...data.map((r) => [r.dataPostagem, r.central, r.volume, r.categoria, r.tags, r.linkVideo])
  ];

  return {
    sheet,
    data,
    generatedAt: new Date().toISOString()
  };
}

async function getCentralVerifications(centralId, filters = {}, { page = 1, limit = 50 } = {}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 50;
  const offset = (safePage - 1) * safeLimit;

  const scopedFilters = {
    ...filters,
    centralIds: [centralId]
  };
  const { clauses, values } = buildVerificationFilterClauses(scopedFilters, 1);
  const where = [
    'v.volume_liters > 0',
    '(v.published_at IS NOT NULL OR v.title IS NOT NULL)',
    ...clauses
  ];
  const whereSql = `WHERE ${where.join(' AND ')}`;

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM volume_verifications v
     ${whereSql}`,
    values
  );
  const total = countResult.rows[0]?.total || 0;

  const listValues = [...values, safeLimit, offset];
  const result = await pool.query(
    `SELECT v.id,
            v.title,
            v.published_at,
            v.measurement_date,
            v.central_id,
            v.volume_liters,
            COALESCE(
              NULLIF(v.volume_kg, 0),
              CASE WHEN v.volume_liters > 0 THEN ROUND(v.volume_liters * 0.55, 2) ELSE NULL END
            ) AS volume_kg,
            v.waste_type,
            COALESCE(NULLIF(TRIM(v.video_link), ''), NULLIF(TRIM(v.post_link), ''), '') AS video_link
     FROM volume_verifications v
     ${whereSql}
     ORDER BY v.published_at DESC NULLS LAST, v.id DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    listValues
  );

  const ids = result.rows.map((row) => row.id);
  const tagsByVerification = new Map();
  if (ids.length > 0) {
    const tagsResult = await pool.query(
      `SELECT vt.volume_verification_id, t.id, t.name
       FROM volume_verification_tags vt
       JOIN tags t ON t.id = vt.tag_id
       WHERE vt.volume_verification_id = ANY($1::bigint[])
       ORDER BY t.name ASC`,
      [ids]
    );
    for (const row of tagsResult.rows) {
      const list = tagsByVerification.get(row.volume_verification_id) || [];
      list.push({ id: row.id, name: decodeHtmlEntities(row.name || '') });
      tagsByVerification.set(row.volume_verification_id, list);
    }
  }

  const items = result.rows.map((row) => {
    const postingDate = parsePostingDate(row);
    return {
      id: row.id,
      title: decodeHtmlEntities(row.title || ''),
      published_at: row.published_at,
      measurement_date: row.measurement_date,
      posting_date: postingDate ? postingDate.toISOString() : null,
      central_id: row.central_id,
      volume_liters: row.volume_liters,
      volume_kg: row.volume_kg,
      waste_type: row.waste_type,
      video_link: decodeHtmlEntities(row.video_link || ''),
      tags: tagsByVerification.get(row.id) || []
    };
  });

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: total > 0 ? Math.ceil(total / safeLimit) : 0
    }
  };
}

module.exports = {
  getKpis,
  getVolumeByCentral,
  getVolumeTimeSeries,
  getVolumeExportReport,
  getCentralsAnalysis,
  getCentralVerifications,
  parseIdList,
  parseNameList,
  normalizeWasteType
};
