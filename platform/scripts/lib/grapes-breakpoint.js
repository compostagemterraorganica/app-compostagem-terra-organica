const LEGACY_MOBILE_MEDIA = '(max-width: 480px)'
const TARGET_MOBILE_MEDIA = '(max-width: 767px)'

const CSS_MEDIA_480_REGEX = /@media\s*\(\s*max-width\s*:\s*480px\s*\)/gi
const JSON_MEDIA_480 = '(max-width: 480px)'

function normalizeSelector(selector) {
  if (!selector) return ''
  if (selector.startsWith('#') || selector.startsWith('.')) return selector
  return `.${selector}`
}

function migrateCssSnapshot(css) {
  if (!css || typeof css !== 'string') {
    return { css: css || '', changed: false, replacements: 0 }
  }

  const matches = css.match(CSS_MEDIA_480_REGEX)
  if (!matches?.length) {
    return { css, changed: false, replacements: 0 }
  }

  const migrated = css.replace(
    CSS_MEDIA_480_REGEX,
    `@media ${TARGET_MOBILE_MEDIA}`
  )

  return {
    css: migrated,
    changed: migrated !== css,
    replacements: matches.length
  }
}

function migrateGrapesProjectJson(json) {
  const base = json && typeof json === 'object' ? json : {}
  const styles = Array.isArray(base.styles) ? base.styles : []
  let replacements = 0

  const migratedStyles = styles.map((rule) => {
    if (!rule || rule.mediaText !== JSON_MEDIA_480) return rule
    replacements += 1
    return { ...rule, mediaText: TARGET_MOBILE_MEDIA }
  })

  if (!replacements) {
    return { json: base, changed: false, replacements: 0 }
  }

  return {
    json: { ...base, styles: migratedStyles },
    changed: true,
    replacements
  }
}

function extractCssMediaBreakpoints(css) {
  if (!css) return []
  return [...css.matchAll(/@media\s*\(([^)]+)\)/gi)].map((match) => match[1].trim())
}

function extractJsonMediaBreakpoints(json) {
  const styles = json?.styles
  if (!Array.isArray(styles)) return []
  return [...new Set(styles.filter((rule) => rule?.mediaText).map((rule) => rule.mediaText.trim()))]
}

function mediaTextToNeedle(mediaText) {
  if (!mediaText) return ''
  return mediaText.replace(/^\(|\)$/g, '').trim()
}

function extractMediaBlocks(css) {
  if (!css) return []
  const blocks = []
  const re = /@media\s*\([^)]+\)\s*\{/gi
  let match

  while ((match = re.exec(css)) !== null) {
    let depth = 1
    let i = re.lastIndex
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1
      if (css[i] === '}') depth -= 1
      i += 1
    }
    blocks.push({
      header: match[0],
      body: css.slice(re.lastIndex, i - 1)
    })
    re.lastIndex = i
  }

  return blocks
}

function ruleExistsInCss(css, rule) {
  if (!css || !rule?.selectors?.length || !rule.style) return true

  const mediaNeedle = mediaTextToNeedle(rule.mediaText)
  const blocks = extractMediaBlocks(css)
  const relevantBlocks = mediaNeedle
    ? blocks.filter((block) => block.header.includes(mediaNeedle))
    : blocks

  if (mediaNeedle && !relevantBlocks.length) return false

  const selector = normalizeSelector(rule.selectors[0])
  const rawSelector = rule.selectors[0]
  const firstProp = Object.entries(rule.style)[0]
  if (!firstProp) return true
  const [prop, value] = firstProp

  return relevantBlocks.some((block) => {
    const selectorInBody = block.body.includes(selector) || block.body.includes(rawSelector)
    if (!selectorInBody) return false
    return block.body.includes(`${prop}:${value}`) || block.body.includes(`${prop}: ${value}`)
  })
}

function validateCssExport({ cssSnapshot, grapesProjectJson }) {
  const styles = grapesProjectJson?.styles
  if (!Array.isArray(styles) || !styles.length) {
    return {
      ok: true,
      missingRules: [],
      cssBreakpoints: extractCssMediaBreakpoints(cssSnapshot),
      jsonBreakpoints: extractJsonMediaBreakpoints(grapesProjectJson),
      legacy480InCss: Boolean(cssSnapshot?.includes('480px')),
      legacy480InJson: extractJsonMediaBreakpoints(grapesProjectJson).some((media) =>
        media.includes('480px')
      )
    }
  }

  const mediaRules = styles.filter(
    (rule) => rule?.mediaText && rule.style && Object.keys(rule.style).length
  )
  const missingRules = mediaRules
    .filter((rule) => !ruleExistsInCss(cssSnapshot, rule))
    .map((rule) => ({
      mediaText: rule.mediaText,
      selectors: rule.selectors,
      style: rule.style
    }))

  const cssBreakpoints = extractCssMediaBreakpoints(cssSnapshot)
  const jsonBreakpoints = extractJsonMediaBreakpoints(grapesProjectJson)

  return {
    ok: missingRules.length === 0 && !cssBreakpoints.some((bp) => bp.includes('480px')),
    missingRules,
    cssBreakpoints: [...new Set(cssBreakpoints)],
    jsonBreakpoints,
    legacy480InCss: cssBreakpoints.some((bp) => bp.includes('480px')),
    legacy480InJson: jsonBreakpoints.some((media) => media.includes('480px'))
  }
}

module.exports = {
  LEGACY_MOBILE_MEDIA,
  TARGET_MOBILE_MEDIA,
  CSS_MEDIA_480_REGEX,
  JSON_MEDIA_480,
  migrateCssSnapshot,
  migrateGrapesProjectJson,
  validateCssExport,
  extractCssMediaBreakpoints,
  extractJsonMediaBreakpoints
}
