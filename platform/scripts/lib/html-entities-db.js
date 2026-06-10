const path = require('path')
const { decodeHtmlEntities } = require('../../../api/src/utils/htmlEntities')

const TEXT_TARGETS = [
  { table: 'posts', idCol: 'id', columns: ['title', 'slug', 'excerpt', 'content_html', 'featured_image_url', 'link', 'author_login'] },
  { table: 'centrals', idCol: 'id', columns: ['name', 'slug', 'image_url'] },
  { table: 'volume_verifications', idCol: 'id', columns: ['title', 'video_link', 'post_link', 'status'] },
  { table: 'pages', idCol: 'id', columns: ['title', 'slug', 'seo_title', 'seo_description', 'status'] },
  { table: 'page_versions', idCol: 'id', columns: ['html_snapshot', 'css_snapshot'] },
  { table: 'users', idCol: 'id', columns: ['name', 'email', 'description', 'avatar_url'] },
  { table: 'post_categories', idCol: 'id', columns: ['name', 'slug'] },
  { table: 'media_assets', idCol: 'id', columns: ['path', 'url', 'alt_text', 'original_name'] },
  { table: 'form_submissions', idCol: 'id', columns: ['form_type', 'name', 'email', 'phone', 'message', 'status'] },
  { table: 'media_url_mappings', idCol: 'id', columns: ['legacy_url', 'legacy_path', 'variant_type'] }
]

const JSON_TARGETS = [
  { table: 'centrals', idCol: 'id', column: 'raw_json', hasUpdatedAt: true },
  { table: 'posts', idCol: 'id', column: 'raw_json', hasUpdatedAt: true },
  { table: 'posts', idCol: 'id', column: 'categories_json', hasUpdatedAt: true },
  { table: 'posts', idCol: 'id', column: 'tags_json', hasUpdatedAt: true },
  { table: 'users', idCol: 'id', column: 'raw_json', hasUpdatedAt: true },
  { table: 'users', idCol: 'id', column: 'roles_json', hasUpdatedAt: true },
  { table: 'users', idCol: 'id', column: 'capabilities_json', hasUpdatedAt: true },
  { table: 'volume_verifications', idCol: 'id', column: 'raw_json', hasUpdatedAt: true },
  { table: 'user_central_relations', idCol: 'id', column: 'raw_json', hasUpdatedAt: false },
  { table: 'page_versions', idCol: 'id', column: 'grapes_project_json', hasUpdatedAt: false },
  { table: 'form_submissions', idCol: 'id', column: 'payload_json', hasUpdatedAt: false }
]

const ENTITY_PATTERN = /&(?:#\d{1,7}|#x[0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]*);/g

function hasHtmlEntities(value) {
  if (value == null) return false
  const s = String(value)
  if (!s.includes('&')) return false
  return decodeHtmlEntities(s) !== s
}

function extractEntityTokens(text) {
  if (!text) return []
  const matches = String(text).match(ENTITY_PATTERN)
  return matches ? [...new Set(matches)] : []
}

function sanitizeJsonDeep(value) {
  if (typeof value === 'string') return decodeHtmlEntities(value)
  if (Array.isArray(value)) return value.map(sanitizeJsonDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeJsonDeep(v)]))
  }
  return value
}

function previewChange(before, maxLen = 160) {
  const after = decodeHtmlEntities(before)
  const slice = (s) => (s.length > maxLen ? `${s.slice(0, maxLen)}…` : s)
  return { before: slice(String(before)), after: slice(after) }
}

function targetKey(table, column) {
  return column ? `${table}.${column}` : table
}

module.exports = {
  TEXT_TARGETS,
  JSON_TARGETS,
  ENTITY_PATTERN,
  decodeHtmlEntities,
  hasHtmlEntities,
  extractEntityTokens,
  sanitizeJsonDeep,
  previewChange,
  targetKey
}
