const path = require('path')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'])
const WP_VARIANT_SUFFIX_RE = /-(\d+x\d+|scaled|rotated)$/i
const WP_DIM_SUFFIX_RE = /-(\d+)x(\d+)$/i

const WP_UPLOADS_BASE = 'https://compostagemterraorganica.com.br/wp-content/uploads/'

function isImageFile(filePath) {
  return IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase())
}

/** Remove sufixos WordPress (-1024x768, -scaled, -rotated) do nome antes da extensão. */
function wpBaseKey(filename) {
  const base = path.basename(filename)
  const ext = path.extname(base)
  const stem = base.slice(0, -ext.length).replace(WP_VARIANT_SUFFIX_RE, '')
  return `${stem}${ext}`.toLowerCase()
}

/** Chave de agrupamento: pasta relativa + nome canônico (variantes WP no mesmo mês). */
function groupKey(relativePath) {
  const dir = path.dirname(relativePath).replace(/\\/g, '/')
  const base = wpBaseKey(path.basename(relativePath))
  return dir === '.' ? base : `${dir}/${base}`
}

function getVariantType(filename) {
  const base = path.basename(filename)
  const stem = base.slice(0, -path.extname(base).length)
  if (/-scaled$/i.test(stem)) return 'scaled'
  if (/-rotated$/i.test(stem)) return 'rotated'
  const dim = stem.match(WP_DIM_SUFFIX_RE)
  if (dim) {
    const w = Number(dim[1])
    const h = Number(dim[2])
    const area = w * h
    if (area <= 150 * 150) return 'thumbnail'
    return 'large'
  }
  return 'original'
}

function parseDimensions(filename) {
  const stem = path.basename(filename).slice(0, -path.extname(filename).length)
  const match = stem.match(WP_DIM_SUFFIX_RE)
  if (!match) return null
  const width = Number(match[1])
  const height = Number(match[2])
  if (!width || !height) return null
  return { width, height, area: width * height }
}

function canonicalScore(file) {
  const variant = getVariantType(file.filename)
  const dims = parseDimensions(file.filename)
  const variantScore =
    variant === 'original' ? 1_000_000 : variant === 'scaled' ? 500_000 : variant === 'large' ? 100_000 : 10_000
  const areaScore = dims?.area || 0
  const byteScore = file.sizeBytes || 0
  return variantScore * 1e12 + areaScore * 1e6 + byteScore
}

/** Escolhe 1 arquivo canônico por grupo de variantes WP. */
function pickCanonical(files) {
  if (!files?.length) return null
  const sorted = [...files].sort((a, b) => canonicalScore(b) - canonicalScore(a))
  return sorted[0]
}

function groupFilesByWpKey(files) {
  const groups = new Map()
  for (const file of files) {
    const key = groupKey(file.relativePath)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(file)
  }
  return groups
}

function buildLocalInventory(files) {
  const groups = groupFilesByWpKey(files)
  const groupList = []
  let variantCount = 0

  for (const [key, members] of groups) {
    const canonical = pickCanonical(members)
    const variants = members.filter((f) => f.relativePath !== canonical.relativePath)
    variantCount += variants.length
    groupList.push({
      groupKey: key,
      canonical: {
        relativePath: canonical.relativePath,
        absolutePath: canonical.absolutePath,
        filename: canonical.filename,
        variantType: getVariantType(canonical.filename),
        sizeBytes: canonical.sizeBytes
      },
      variants: variants.map((f) => ({
        relativePath: f.relativePath,
        variantType: getVariantType(f.filename),
        sizeBytes: f.sizeBytes
      })),
      memberCount: members.length
    })
  }

  groupList.sort((a, b) => a.groupKey.localeCompare(b.groupKey))

  return {
    totalFiles: files.length,
    imageFiles: files.length,
    groupCount: groupList.length,
    variantFilesToDiscard: variantCount,
    canonicalCount: groupList.length,
    groups: groupList,
    canonicalByRelativePath: Object.fromEntries(
      groupList.map((g) => [g.canonical.relativePath, g.groupKey])
    ),
    canonicalByLegacyPath: Object.fromEntries(
      groupList.flatMap((g) => {
        const entries = [[g.canonical.relativePath, g.canonical.relativePath]]
        for (const v of g.variants) {
          entries.push([v.relativePath, g.canonical.relativePath])
        }
        return entries
      })
    )
  }
}

function extractLegacyPath(urlOrPath) {
  if (!urlOrPath) return null
  const raw = String(urlOrPath).trim()
  if (!raw) return null

  if (raw.startsWith(WP_UPLOADS_BASE)) {
    return raw.slice(WP_UPLOADS_BASE.length).replace(/^\//, '').split('?')[0]
  }
  if (raw.includes('/wp-content/uploads/')) {
    const idx = raw.indexOf('/wp-content/uploads/')
    return raw.slice(idx + '/wp-content/uploads/'.length).split('?')[0]
  }
  if (raw.startsWith('/uploads/')) {
    return raw.slice('/uploads/'.length).split('?')[0]
  }
  if (/^\d{4}\/\d{2}\//.test(raw)) {
    return raw.split('?')[0]
  }
  return null
}

function toWpUrl(legacyPath) {
  if (!legacyPath) return null
  return `${WP_UPLOADS_BASE}${legacyPath.replace(/^\//, '')}`
}

function extractMediaUrlsFromText(text) {
  if (!text) return []
  const found = new Set()
  const str = String(text)

  const patterns = [
    /https:\/\/compostagemterraorganica\.com\.br\/wp-content\/uploads\/[^\s"'<>)\]]+/gi,
    /\/uploads\/\d{4}\/\d{2}\/[^\s"'<>)\]]+/gi
  ]

  for (const re of patterns) {
    const matches = str.match(re) || []
    for (const m of matches) found.add(m.split('?')[0])
  }

  return [...found]
}

module.exports = {
  IMAGE_EXTENSIONS,
  WP_UPLOADS_BASE,
  isImageFile,
  wpBaseKey,
  groupKey,
  getVariantType,
  parseDimensions,
  pickCanonical,
  groupFilesByWpKey,
  buildLocalInventory,
  extractLegacyPath,
  toWpUrl,
  extractMediaUrlsFromText
}
