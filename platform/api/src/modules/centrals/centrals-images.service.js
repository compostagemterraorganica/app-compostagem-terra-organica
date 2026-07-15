const { pool } = require('../../config/db');

const LOGO_PATTERN = /LOGO_CTO|cropped-LOGO/i;

function isS3PublicUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('.s3.') && url.includes('amazonaws.com');
}

async function resolvePublicUrl(url) {
  if (!url) return null;
  if (isS3PublicUrl(url)) return url;

  const result = await pool.query(
    `SELECT ma.public_url
     FROM media_url_mappings m
     JOIN media_assets ma ON ma.id = m.media_asset_id
     WHERE m.legacy_url = $1 OR m.legacy_url LIKE $2
     ORDER BY CASE WHEN m.legacy_url = $1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [url, `${url.split('?')[0]}%`]
  );
  return result.rows[0]?.public_url || null;
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

async function resolveCentralImageUrl(row) {
  if (row.image_url) {
    const resolved = await resolvePublicUrl(row.image_url);
    if (resolved) return resolved;
  }

  const raw = typeof row.raw_json === 'string' ? JSON.parse(row.raw_json) : row.raw_json || {};
  const stored = pickStoredListingImage(raw);
  if (stored) {
    const resolved = await resolvePublicUrl(stored);
    if (resolved) return resolved;
  }

  return null;
}

module.exports = {
  pickStoredListingImage,
  isLogoUrl,
  resolvePublicUrl,
  resolveCentralImageUrl
};
