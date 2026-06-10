const ALLOWED_TAGS = new Set([
  'p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'figure', 'img', 'a',
  'strong', 'em', 'blockquote', 'br', 'div', 'span'
])

function stripGutenbergComments(html) {
  if (!html) return ''
  return html.replace(/<!--\s*\/?wp:[^>]*-->/gi, '')
}

function stripWpClasses(html) {
  if (!html) return ''
  return html
    .replace(/\sclass="[^"]*wp-block[^"]*"/gi, '')
    .replace(/\sclass="[^"]*has-[^"]*"/gi, '')
    .replace(/\sclass="[^"]*align(left|right|center|wide|full)[^"]*"/gi, '')
    .replace(/\sclass="[^"]*size-[^"]*"/gi, '')
    .replace(/\sclass=""/gi, '')
    .replace(/\sstyle="[^"]*"/gi, '')
}

function normalizeFigures(html) {
  if (!html) return ''
  let out = html
  out = out.replace(/<figure[^>]*>/gi, '<figure class="to-post-figure">')
  out = out.replace(/<img([^>]*?)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/\ssrc="([^"]+)"/i)
    const altMatch = attrs.match(/\salt="([^"]*)"/i)
    const src = srcMatch ? srcMatch[1] : ''
    const alt = altMatch ? altMatch[1] : ''
    if (!src) return ''
    return `<img src="${src}" alt="${alt}" />`
  })
  return out
}

function normalizeHeadings(html) {
  if (!html) return ''
  return html
    .replace(/<h([1-6])[^>]*>/gi, (_, n) => {
      const level = Math.min(Math.max(Number(n), 2), 3)
      return `<h${level}>`
    })
    .replace(/<\/h[1-6]>/gi, (tag) => {
      const n = tag.match(/h([1-6])/i)?.[1] || '2'
      const level = Math.min(Math.max(Number(n), 2), 3)
      return `</h${level}>`
    })
}

function unwrapPostBody(html) {
  if (!html) return ''
  const trimmed = html.trim()
  const match = trimmed.match(/^<div class="to-post-body">([\s\S]*)<\/div>$/i)
  return match ? match[1].trim() : trimmed
}

function wrapPostBody(html) {
  const inner = unwrapPostBody(html).trim()
  if (!inner) return '<div class="to-post-body"></div>'
  return `<div class="to-post-body">\n${inner}\n</div>`
}

function collapseWhitespace(html) {
  return html
    .replace(/\n{3,}/g, '\n\n')
    .replace(/>\s+</g, '>\n<')
    .trim()
}

function normalizePostContent(html) {
  if (!html || !String(html).trim()) {
    return '<div class="to-post-body"></div>'
  }
  let out = String(html)
  out = stripGutenbergComments(out)
  out = stripWpClasses(out)
  out = normalizeHeadings(out)
  out = normalizeFigures(out)
  out = unwrapPostBody(out)
  out = collapseWhitespace(out)
  return wrapPostBody(out)
}

function stripHtmlTags(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractFirstParagraph(html, maxLen = 160) {
  const normalized = normalizePostContent(html)
  const inner = unwrapPostBody(normalized)
  const match = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i)
  if (!match) return ''
  const text = stripHtmlTags(match[1])
  if (!text) return ''
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen).trim()}…`
}

function extractFirstImageUrl(html) {
  const normalized = normalizePostContent(html)
  const match = normalized.match(/<img[^>]+src="([^"]+)"/i)
  return match ? match[1] : null
}

function isAlreadyNormalized(html) {
  if (!html) return false
  const hasWpComments = /<!--\s*\/?wp:/i.test(html)
  const hasWpClasses = /wp-block|has-medium-font-size|has-large-font-size/i.test(html)
  const hasWrapper = /<div class="to-post-body">/i.test(html)
  return hasWrapper && !hasWpComments && !hasWpClasses
}

module.exports = {
  normalizePostContent,
  stripGutenbergComments,
  stripWpClasses,
  normalizeHeadings,
  normalizeFigures,
  wrapPostBody,
  unwrapPostBody,
  extractFirstParagraph,
  extractFirstImageUrl,
  isAlreadyNormalized,
  stripHtmlTags
}
