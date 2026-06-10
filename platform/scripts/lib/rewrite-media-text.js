const WP_UPLOADS_BASE = 'https://compostagemterraorganica.com.br/wp-content/uploads/'

async function loadUrlMap(pool) {
  const { rows } = await pool.query(`
    SELECT m.legacy_url, m.legacy_path, a.public_url
    FROM media_url_mappings m
    JOIN media_assets a ON a.id = m.media_asset_id
    WHERE a.public_url IS NOT NULL AND TRIM(a.public_url) <> ''
  `)

  const byUrl = new Map()
  const byPath = new Map()

  for (const row of rows) {
    byUrl.set(row.legacy_url, row.public_url)
    if (row.legacy_path) byPath.set(row.legacy_path, row.public_url)
  }

  return { byUrl, byPath }
}

function resolveLegacyReference(ref, map) {
  if (!ref) return null
  const raw = String(ref).trim()
  if (map.byUrl.has(raw)) return map.byUrl.get(raw)

  let legacyPath = null
  if (raw.startsWith(WP_UPLOADS_BASE)) {
    legacyPath = raw.slice(WP_UPLOADS_BASE.length).replace(/^\//, '')
  } else if (raw.startsWith('/uploads/')) {
    legacyPath = raw.slice('/uploads/'.length)
  } else if (/^\d{4}\/\d{2}\//.test(raw)) {
    legacyPath = raw
  }

  if (legacyPath && map.byPath.has(legacyPath)) {
    return map.byPath.get(legacyPath)
  }

  return null
}

function rewriteText(text, map) {
  if (!text) return { text: text || '', replacements: 0, unresolved: [] }

  let out = String(text)
  let replacements = 0
  const unresolved = new Set()

  const legacyUrls = [...map.byUrl.keys()].sort((a, b) => b.length - a.length)
  for (const legacy of legacyUrls) {
    if (!out.includes(legacy)) continue
    const pub = map.byUrl.get(legacy)
    const parts = out.split(legacy)
    replacements += parts.length - 1
    out = parts.join(pub)
  }

  out = out.replace(/\$\{WP\}\/([^\s"'`\)]+)/g, (match, relPath) => {
    const resolved = resolveLegacyReference(`${WP_UPLOADS_BASE}${relPath}`, map)
    if (resolved) {
      replacements += 1
      return resolved
    }
    unresolved.add(match)
    return match
  })

  const wpRe = /https:\/\/compostagemterraorganica\.com\.br\/wp-content\/uploads\/[^\s"'<>)]+/gi
  out = out.replace(wpRe, (match) => {
    const resolved = resolveLegacyReference(match, map)
    if (resolved) {
      replacements += 1
      return resolved
    }
    unresolved.add(match)
    return match
  })

  const uploadsRe = /\/uploads\/\d{4}\/\d{2}\/[^\s"'<>)]+/gi
  out = out.replace(uploadsRe, (match) => {
    const resolved = resolveLegacyReference(match, map)
    if (resolved) {
      replacements += 1
      return resolved
    }
    unresolved.add(match)
    return match
  })

  return { text: out, replacements, unresolved: [...unresolved] }
}

module.exports = {
  WP_UPLOADS_BASE,
  loadUrlMap,
  resolveLegacyReference,
  rewriteText
}
