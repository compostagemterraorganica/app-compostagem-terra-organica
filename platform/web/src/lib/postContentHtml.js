/** Converte HTML do editor visual para o formato canônico `.to-post-body`. */

export function unwrapPostBody(html) {
  if (!html) return ''
  const trimmed = String(html).trim()
  const match = trimmed.match(/^<div class="to-post-body">([\s\S]*)<\/div>$/i)
  return match ? match[1].trim() : trimmed
}

export function wrapPostBody(html) {
  const inner = unwrapPostBody(html).trim()
  if (!inner) return '<div class="to-post-body"></div>'
  return `<div class="to-post-body">\n${inner}\n</div>`
}

/** Prepara HTML salvo no banco para edição no TipTap (sem wrapper, img soltas). */
export function htmlForEditor(storedHtml) {
  let inner = unwrapPostBody(storedHtml)
  inner = inner.replace(
    /<figure[^>]*class="to-post-figure"[^>]*>\s*(<img[^>]*>)\s*<\/figure>/gi,
    '$1'
  )
  inner = inner.replace(/<figure[^>]*>\s*(<img[^>]*>)\s*<\/figure>/gi, '$1')
  inner = inner.replace(/<img([^>]*?)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/\ssrc="([^"]+)"/i)
    if (!srcMatch) return match
    const resolved = resolveMediaUrl(srcMatch[1])
    return match.replace(srcMatch[1], resolved)
  })
  return inner
}

/** Serializa HTML do editor para `content_html` canônico. */
export function serializePostContent(editorHtml) {
  if (!editorHtml || !String(editorHtml).trim()) {
    return '<div class="to-post-body"></div>'
  }

  let html = String(editorHtml).trim()

  html = html.replace(/<h1([^>]*)>/gi, '<h2$1>').replace(/<\/h1>/gi, '</h2>')
  html = html.replace(/\sclass="[^"]*"/gi, '')
  html = html.replace(/\sstyle="[^"]*"/gi, '')

  html = html.replace(/<img([^>]*?)>/gi, (match, attrs) => {
    const srcMatch = attrs.match(/\ssrc="([^"]+)"/i)
    const altMatch = attrs.match(/\salt="([^"]*)"/i)
    const src = srcMatch ? srcMatch[1] : ''
    const alt = altMatch ? altMatch[1] : ''
    if (!src) return ''
    return `<figure class="to-post-figure"><img src="${src}" alt="${alt}" /></figure>`
  })

  html = html.replace(
    /<figure class="to-post-figure">\s*<figure class="to-post-figure">/gi,
    '<figure class="to-post-figure">'
  )
  html = html.replace(/<\/figure>\s*<\/figure>/gi, '</figure>')

  return wrapPostBody(html)
}

export function resolveMediaUrl(url) {
  if (!url) return ''
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url
  }
  return url
}
