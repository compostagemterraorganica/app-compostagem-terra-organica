const axios = require('axios');
const { pool } = require('../../config/db');

const WP_LISTING_URL = 'https://compostagemterraorganica.com.br/pontos-de-entrega/';
const LOGO_PATTERN = /LOGO_CTO|cropped-LOGO/i;
const CACHE_TTL_MS = 60 * 60 * 1000;

let listingImageCache = { map: null, fetchedAt: 0 };

function parseListingImagesFromHtml(html) {
  const results = {};
  const patterns = [
    /href="https:\/\/compostagemterraorganica\.com\.br\/central\/([^"/]+)\/?"/g,
    /href="\/central\/([^"/]+)\/?"/g
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(html);
    while (match) {
      const slug = match[1];
      const start = Math.max(0, match.index - 5000);
      const chunk = html.slice(start, match.index);
      const imgs = [...chunk.matchAll(/src="(https:\/\/[^"]+wp-content\/uploads\/[^"]+)"/g)].map((m) => m[1]);
      const filtered = imgs.filter((url) => !LOGO_PATTERN.test(url));
      if (filtered.length && !results[slug]) {
        results[slug] = filtered[filtered.length - 1];
      }
      match = pattern.exec(html);
    }
  }

  return results;
}

async function fetchListingImageMap() {
  const now = Date.now();
  if (listingImageCache.map && now - listingImageCache.fetchedAt < CACHE_TTL_MS) {
    return listingImageCache.map;
  }

  const { data: html } = await axios.get(WP_LISTING_URL, { timeout: 15000 });
  const map = parseListingImagesFromHtml(html);
  listingImageCache = { map, fetchedAt: now };
  return map;
}

async function resolvePublicUrl(url) {
  if (!url) return null;
  const result = await pool.query(
    `SELECT ma.public_url
     FROM media_url_mappings m
     JOIN media_assets ma ON ma.id = m.media_asset_id
     WHERE m.legacy_url = $1 OR m.legacy_url LIKE $2
     ORDER BY CASE WHEN m.legacy_url = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [url, `${url.split('?')[0]}%`]
  );
  return result.rows[0]?.public_url || url;
}

async function getListingImageForSlug(slug) {
  if (!slug) return null;
  const map = await fetchListingImageMap();
  const url = map[slug];
  if (!url) return null;
  return resolvePublicUrl(url);
}

function pickStoredListingImage(raw) {
  const stored = raw?.listing_image_url || raw?.image_url;
  if (typeof stored === 'string' && stored.startsWith('http') && !LOGO_PATTERN.test(stored)) {
    return stored;
  }
  return null;
}

function isLogoUrl(url) {
  return LOGO_PATTERN.test(url || '');
}

module.exports = {
  parseListingImagesFromHtml,
  fetchListingImageMap,
  getListingImageForSlug,
  pickStoredListingImage,
  isLogoUrl,
  resolvePublicUrl
};
