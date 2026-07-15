const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const STATE_UF_BY_NORMALIZED_NAME = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  goias: 'GO',
  maranhao: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  paraiba: 'PB',
  parana: 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO'
};

const INTERNAL_META_PREFIXES = ['_', 'ast-', 'theme-', 'adv-header', 'stick-header', 'footer-sml', 'site-'];
const INTERNAL_META_KEYS = new Set([
  'astra-migrate-meta-layouts',
  'site-post-title',
  'ast-breadcrumbs-content',
  'ast-featured-img',
  'ast-global-header-display',
  'ast-banner-title-visibility',
  'ast-main-header-display',
  'ast-hfb-above-header-display',
  'ast-hfb-below-header-display',
  'ast-hfb-mobile-header-display',
  'header-above-stick-meta',
  'header-main-stick-meta',
  'header-below-stick-meta',
  'ast-page-background-enabled',
  'ast-page-background-meta',
  'ast-content-background-meta'
]);

function toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

function stripHtml(html) {
  return normalizeText(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeLookupKey(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function stateNameToUf(stateName) {
  if (!stateName) return null;
  return STATE_UF_BY_NORMALIZED_NAME[normalizeLookupKey(stateName)] || null;
}

function parseDateOrNull(value) {
  if (!value) return null;
  const raw = normalizeText(value).trim();
  if (!raw || raw.startsWith('0000-00-00')) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString();
}

function parseXmlItems(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: false,
    parseTagValue: false
  });
  const parsed = parser.parse(xml);
  return toArray(parsed?.rss?.channel?.item);
}

function extractMetaMap(item) {
  const meta = {};
  for (const row of toArray(item['wp:postmeta'])) {
    const key = normalizeText(row['wp:meta_key']).trim();
    if (!key) continue;
    meta[key] = normalizeText(row['wp:meta_value']);
  }
  return meta;
}

function isInternalMetaKey(key) {
  if (INTERNAL_META_KEYS.has(key)) return true;
  if (key.startsWith('_yoast_')) return true;
  if (key.startsWith('_elementor')) return true;
  return INTERNAL_META_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function pickBusinessMeta(meta) {
  const business = {};
  for (const [key, value] of Object.entries(meta)) {
    if (isInternalMetaKey(key)) continue;
    business[key] = value;
  }
  return business;
}

function toIntOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function mapLocationRecord(item, postType) {
  const id = toIntOrNull(item['wp:post_id']);
  if (!id) return null;
  const meta = extractMetaMap(item);
  return {
    id,
    name: normalizeText(item.title).trim() || null,
    slug: normalizeText(item['wp:post_name']).trim() || null,
    status: normalizeText(item['wp:status']).trim() || null,
    link: normalizeText(item.link).trim() || null,
    estado_id: toIntOrNull(meta.estado),
    meta
  };
}

function buildLocationLookups(estadoXmlPath, cidadeXmlPath) {
  const estados = new Map();
  for (const item of parseXmlItems(estadoXmlPath)) {
    if (normalizeText(item['wp:post_type']).trim() !== 'estado') continue;
    const row = mapLocationRecord(item, 'estado');
    if (!row) continue;
    estados.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      link: row.link,
      uf: stateNameToUf(row.name)
    });
  }

  const cidades = new Map();
  for (const item of parseXmlItems(cidadeXmlPath)) {
    if (normalizeText(item['wp:post_type']).trim() !== 'cidade') continue;
    const row = mapLocationRecord(item, 'cidade');
    if (!row) continue;
    const estado = row.estado_id ? estados.get(row.estado_id) : null;
    cidades.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      link: row.link,
      estado_id: row.estado_id,
      estado_name: estado?.name || null,
      estado_uf: estado?.uf || null
    });
  }

  return { estados, cidades };
}

function resolveEstado(estadoId, estados) {
  if (!estadoId) return { estado_id: null, estado_name: null, estado_uf: null };
  const estado = estados.get(estadoId);
  return {
    estado_id: estadoId,
    estado_name: estado?.name || null,
    estado_uf: estado?.uf || stateNameToUf(estado?.name) || null
  };
}

function mapCentralItem(item, { estados, cidades }) {
  if (normalizeText(item['wp:post_type']).trim() !== 'central') return null;

  const id = toIntOrNull(item['wp:post_id']);
  if (!id) return null;

  const meta = extractMetaMap(item);
  const businessMeta = pickBusinessMeta(meta);

  const cidadeId = toIntOrNull(meta.cidade);
  const estadoId = toIntOrNull(meta.estado);
  const cidade = cidadeId ? cidades.get(cidadeId) : null;
  const estadoFromCentral = resolveEstado(estadoId, estados);
  const estadoFromCidade = cidade
    ? resolveEstado(cidade.estado_id, estados)
    : { estado_id: null, estado_name: null, estado_uf: null };

  const estado_name = estadoFromCentral.estado_name || estadoFromCidade.estado_name || cidade?.estado_name || null;
  const estado_uf = estadoFromCentral.estado_uf || estadoFromCidade.estado_uf || cidade?.estado_uf || null;

  return {
    id,
    name: normalizeText(item.title).trim() || null,
    slug: normalizeText(item['wp:post_name']).trim() || null,
    status: normalizeText(item['wp:status']).trim() || null,
    link: normalizeText(item.link).trim() || null,
    published_at: parseDateOrNull(item['wp:post_date_gmt']) || parseDateOrNull(item.pubDate),
    modified_at: parseDateOrNull(item['wp:post_modified_gmt']) || parseDateOrNull(item['wp:post_modified']),
    excerpt: stripHtml(item['excerpt:encoded']) || null,
    content_html: normalizeText(item['content:encoded']) || null,
    cidade_id: cidadeId,
    cidade_name: cidade?.name || null,
    cidade_slug: cidade?.slug || null,
    estado_id: estadoId || cidade?.estado_id || null,
    estado_name,
    estado_uf,
    endereco: businessMeta.endereco || null,
    email: businessMeta.email || null,
    telefone: businessMeta.telefone || null,
    responsavel: businessMeta.responsavel || null,
    site: businessMeta.site || null,
    instagram: businessMeta.instagram || null,
    facebook: businessMeta.facebook || null,
    foto_da_capa_id: toIntOrNull(businessMeta['foto-da-capa']),
    fotos: businessMeta.fotos || null,
    volume_medio: toIntOrNull(businessMeta['volume-medio']),
    volume_total: toIntOrNull(businessMeta['volume-total']),
    volume_mensal: toIntOrNull(businessMeta['volume-mensal']),
    meta: businessMeta
  };
}

function exportCentralsFromWordPressXml({
  centralsXmlPath,
  estadoXmlPath,
  cidadeXmlPath
}) {
  const lookups = buildLocationLookups(estadoXmlPath, cidadeXmlPath);
  const centrals = parseXmlItems(centralsXmlPath)
    .map((item) => mapCentralItem(item, lookups))
    .filter(Boolean)
    .sort((a, b) => a.id - b.id);

  return {
    generated_at: new Date().toISOString(),
    source_files: {
      centrals: centralsXmlPath,
      estados: estadoXmlPath,
      cidades: cidadeXmlPath
    },
    counts: {
      centrals: centrals.length,
      estados: lookups.estados.size,
      cidades: lookups.cidades.size
    },
    centrals
  };
}

module.exports = {
  exportCentralsFromWordPressXml,
  stateNameToUf,
  normalizeLookupKey
};
