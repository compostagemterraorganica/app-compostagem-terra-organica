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

function parsePostMeta(item) {
  const map = {};
  for (const meta of toArray(item['wp:postmeta'])) {
    const key = normalizeText(meta['wp:meta_key']).trim();
    const val = normalizeText(meta['wp:meta_value']).trim();
    if (key) map[key] = val;
  }
  return map;
}

/**
 * Extrai mapa postId -> URL da imagem destacada (featured) do export WordPress XML.
 */
function parseWordPressFeaturedImages(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: false,
    parseTagValue: false
  });
  const parsed = parser.parse(xml);
  const items = toArray(parsed?.rss?.channel?.item);

  const attachmentsById = new Map();
  const thumbnailIdByPostId = new Map();

  for (const item of items) {
    const idRaw = normalizeText(item['wp:post_id']).trim();
    const id = Number(idRaw);
    if (!Number.isFinite(id)) continue;

    const postType = normalizeText(item['wp:post_type']).trim();

    if (postType === 'attachment') {
      const url = normalizeText(item['wp:attachment_url']).trim();
      if (url) attachmentsById.set(id, url);
      continue;
    }

    if (postType !== 'post') continue;

    const thumbRaw = parsePostMeta(item)['_thumbnail_id'];
    const thumbId = Number(thumbRaw);
    if (Number.isFinite(thumbId) && thumbId > 0) {
      thumbnailIdByPostId.set(id, thumbId);
    }
  }

  const featuredUrlByPostId = new Map();
  for (const [postId, attachmentId] of thumbnailIdByPostId) {
    const url = attachmentsById.get(attachmentId);
    if (url) featuredUrlByPostId.set(postId, url);
  }

  return {
    totalItems: items.length,
    attachmentCount: attachmentsById.size,
    postsWithThumbnail: thumbnailIdByPostId.size,
    postsWithResolvedUrl: featuredUrlByPostId.size,
    attachmentsById,
    thumbnailIdByPostId,
    featuredUrlByPostId
  };
}

module.exports = {
  parseWordPressFeaturedImages
};
