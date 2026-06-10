const { pool } = require('../../config/db');

const WP_UPLOADS_BASE = 'https://compostagemterraorganica.com.br/wp-content/uploads/';

function extractLegacyPath(urlOrPath) {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath).trim();
  if (raw.startsWith(WP_UPLOADS_BASE)) {
    return raw.slice(WP_UPLOADS_BASE.length).replace(/^\//, '').split('?')[0];
  }
  if (raw.includes('/wp-content/uploads/')) {
    const idx = raw.indexOf('/wp-content/uploads/');
    return raw.slice(idx + '/wp-content/uploads/'.length).split('?')[0];
  }
  if (raw.startsWith('/uploads/')) {
    return raw.slice('/uploads/'.length).split('?')[0];
  }
  return null;
}

async function resolveLegacyUrl(urlOrPath) {
  if (!urlOrPath) return null;
  const raw = String(urlOrPath).trim();

  const byUrl = await pool.query(
    `SELECT a.public_url
     FROM media_url_mappings m
     JOIN media_assets a ON a.id = m.media_asset_id
     WHERE m.legacy_url = $1
     LIMIT 1`,
    [raw]
  );
  if (byUrl.rows[0]?.public_url) return byUrl.rows[0].public_url;

  const legacyPath = extractLegacyPath(raw);
  if (!legacyPath) return null;

  const byPath = await pool.query(
    `SELECT a.public_url
     FROM media_url_mappings m
     JOIN media_assets a ON a.id = m.media_asset_id
     WHERE m.legacy_path = $1
     LIMIT 1`,
    [legacyPath]
  );
  return byPath.rows[0]?.public_url || null;
}

module.exports = {
  extractLegacyPath,
  resolveLegacyUrl
};
