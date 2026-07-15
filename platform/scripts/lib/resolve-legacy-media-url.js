const path = require('path');
const { resolveLegacyReference } = require('./rewrite-media-text');
const { extractLegacyPath, toWpUrl, wpBaseKey, WP_UPLOADS_BASE } = require('./wp-media-dedupe');

function buildLegacyCandidates(legacyUrl) {
  const raw = String(legacyUrl || '').trim().split('?')[0];
  if (!raw) return [];

  const candidates = new Set([raw]);
  const legacyPath = extractLegacyPath(raw);

  if (legacyPath) {
    candidates.add(toWpUrl(legacyPath));
    candidates.add(`/uploads/${legacyPath}`);

    const withoutScaled = legacyPath.replace(/-scaled(?=\.)/i, '');
    if (withoutScaled !== legacyPath) {
      candidates.add(toWpUrl(withoutScaled));
      candidates.add(`/uploads/${withoutScaled}`);
    }

    const dir = path.dirname(legacyPath);
    const canonicalName = wpBaseKey(path.basename(legacyPath));
    const canonicalPath = dir === '.' ? canonicalName : `${dir}/${canonicalName}`;
    if (canonicalPath !== legacyPath) {
      candidates.add(toWpUrl(canonicalPath));
      candidates.add(`/uploads/${canonicalPath}`);
    }
  }

  return [...candidates];
}

function resolveToPublicUrl(legacyUrl, urlMap) {
  for (const candidate of buildLegacyCandidates(legacyUrl)) {
    const resolved = resolveLegacyReference(candidate, urlMap);
    if (resolved) return resolved;
  }

  const legacyPath = extractLegacyPath(legacyUrl);
  if (!legacyPath || !urlMap?.byPath) return null;

  const dir = path.dirname(legacyPath);
  const stem = wpBaseKey(path.basename(legacyPath)).replace(/\.[^.]+$/, '');

  const pathVariants = [
    legacyPath,
    legacyPath.replace(/-scaled(?=\.)/i, ''),
    dir === '.' ? wpBaseKey(path.basename(legacyPath)) : `${dir}/${wpBaseKey(path.basename(legacyPath))}`
  ];

  for (const variant of pathVariants) {
    if (urlMap.byPath.has(variant)) return urlMap.byPath.get(variant);
  }

  for (const [mappedPath, publicUrl] of urlMap.byPath) {
    if (!mappedPath.startsWith(`${dir}/`)) continue;
    const mappedStem = path.basename(mappedPath).replace(/-scaled$/i, '').replace(/-\d+x\d+$/i, '');
    if (mappedStem === stem || mappedPath.includes(stem)) return publicUrl;
  }

  return null;
}

async function resolveToPublicUrlWithDb(pool, legacyUrl, urlMap) {
  const fromMap = resolveToPublicUrl(legacyUrl, urlMap);
  if (fromMap) return fromMap;

  const legacyPath = extractLegacyPath(legacyUrl);
  if (!legacyPath) return null;

  const dir = path.dirname(legacyPath);
  const stem = path.basename(legacyPath, path.extname(legacyPath))
    .replace(/-scaled$/i, '')
    .replace(/-\d+x\d+$/i, '');

  const { rows } = await pool.query(
    `SELECT ma.public_url
     FROM media_url_mappings m
     JOIN media_assets ma ON ma.id = m.media_asset_id
     WHERE m.legacy_path = $1
        OR m.legacy_url = $2
        OR m.legacy_path LIKE $3
        OR m.legacy_url LIKE $4
     ORDER BY
       CASE WHEN m.legacy_path = $1 THEN 0
            WHEN m.legacy_url = $2 THEN 1
            ELSE 2 END,
       length(m.legacy_path)
     LIMIT 1`,
    [
      legacyPath,
      `${WP_UPLOADS_BASE}${legacyPath}`,
      `${dir}/${stem}%`,
      `${WP_UPLOADS_BASE}${dir}/${stem}%`
    ]
  );

  return rows[0]?.public_url || null;
}

module.exports = {
  buildLegacyCandidates,
  resolveToPublicUrl,
  resolveToPublicUrlWithDb
};
