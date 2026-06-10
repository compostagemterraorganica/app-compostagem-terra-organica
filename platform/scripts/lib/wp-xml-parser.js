const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

function toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

function mapCategory(categoryNode) {
  const value = normalizeText(categoryNode['#text'] ?? categoryNode).trim();
  return {
    domain: categoryNode['@_domain'] || '',
    nicename: categoryNode['@_nicename'] || '',
    value
  };
}

function mapPostItem(item) {
  const postType = normalizeText(item['wp:post_type']).trim();
  if (postType !== 'post') return null;

  const idRaw = normalizeText(item['wp:post_id']).trim();
  const id = Number(idRaw);
  if (!Number.isFinite(id)) return null;

  const categories = toArray(item.category)
    .map(mapCategory)
    .filter((c) => c.domain === 'category' && c.value);
  const tags = toArray(item.category)
    .map(mapCategory)
    .filter((c) => c.domain === 'post_tag' && c.value);

  return {
    id,
    title: normalizeText(item.title).trim() || null,
    slug: normalizeText(item['wp:post_name']).trim() || null,
    link: normalizeText(item.link).trim() || null,
    author_login: normalizeText(item['dc:creator']).trim() || null,
    status: normalizeText(item['wp:status']).trim() || null,
    published_at: parseDateOrNull(item['wp:post_date_gmt']) || parseDateOrNull(item.pubDate),
    post_type: 'post',
    excerpt: normalizeText(item['excerpt:encoded']) || null,
    content_html: normalizeText(item['content:encoded']) || null,
    categories_json: categories,
    tags_json: tags,
    raw_json: item
  };
}

function parseWordPressExportPosts(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: false,
    parseTagValue: false
  });
  const parsed = parser.parse(xml);
  const items = toArray(parsed?.rss?.channel?.item);
  const mapped = items.map(mapPostItem).filter(Boolean);
  return {
    totalItems: items.length,
    posts: mapped
  };
}

module.exports = {
  parseWordPressExportPosts
};
