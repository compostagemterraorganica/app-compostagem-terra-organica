const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

function toArray(value) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  return String(value);
}

function toIntOrNull(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
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

function pickAttachmentUrl(item) {
  const attachmentUrl = normalizeText(item['wp:attachment_url']).trim();
  if (attachmentUrl.startsWith('http')) return attachmentUrl;

  const guid = normalizeText(item.guid).trim();
  if (guid.startsWith('http') && /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(guid)) {
    return guid;
  }

  return null;
}

/**
 * Resolve foto-da-capa (attachment ID) → URL canônica do WordPress (wp:attachment_url).
 */
function parseCentralCoverImagesFromXml(xmlPath) {
  const items = parseXmlItems(xmlPath);
  const attachmentsById = new Map();

  for (const item of items) {
    if (normalizeText(item['wp:post_type']).trim() !== 'attachment') continue;
    const id = toIntOrNull(item['wp:post_id']);
    const url = pickAttachmentUrl(item);
    if (id && url) attachmentsById.set(id, url);
  }

  const entries = [];

  for (const item of items) {
    if (normalizeText(item['wp:post_type']).trim() !== 'central') continue;

    const wpId = toIntOrNull(item['wp:post_id']);
    const slug = normalizeText(item['wp:post_name']).trim();
    if (!wpId || !slug) continue;

    const meta = extractMetaMap(item);
    const fotoDaCapaId = toIntOrNull(meta['foto-da-capa']);
    if (!fotoDaCapaId) continue;

    const coverUrl = attachmentsById.get(fotoDaCapaId) || null;
    entries.push({
      wpId,
      slug,
      name: normalizeText(item.title).trim() || null,
      fotoDaCapaId,
      coverUrl,
      unresolvedAttachment: !coverUrl
    });
  }

  entries.sort((a, b) => a.wpId - b.wpId);

  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const byWpId = new Map(entries.map((entry) => [entry.wpId, entry]));

  return {
    xmlPath,
    attachmentCount: attachmentsById.size,
    centralCoverCount: entries.length,
    unresolvedCount: entries.filter((entry) => entry.unresolvedAttachment).length,
    attachmentsById,
    bySlug,
    byWpId,
    entries
  };
}

module.exports = {
  parseCentralCoverImagesFromXml,
  pickAttachmentUrl
};
