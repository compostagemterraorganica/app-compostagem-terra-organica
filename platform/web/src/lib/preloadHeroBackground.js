function extractUrlFromHeroBlock(block) {
  if (!block) return null
  const match = block.match(/background-image:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/i)
  return match?.[1]?.trim() || null
}

/**
 * Extrai URLs de background do bloco .to-hero no css_snapshot da home.
 */
export function extractHeroBackgroundUrls(cssText) {
  if (!cssText || typeof cssText !== 'string') {
    return { desktop: null, mobile: null }
  }

  const desktopBlock = cssText.match(/\.to-hero\s*\{[^}]*\}/i)?.[0]
  const mobileBlock = cssText.match(
    /@media[^{]*\(max-width:\s*767px\)[\s\S]*?\.to-hero\s*\{[^}]*\}/i
  )?.[0]

  return {
    desktop: extractUrlFromHeroBlock(desktopBlock),
    mobile: extractUrlFromHeroBlock(mobileBlock)
  }
}

export function pickHeroBackgroundUrl(cssText) {
  const { desktop, mobile } = extractHeroBackgroundUrls(cssText)
  const isMobile =
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  if (isMobile && mobile) return mobile
  return desktop || mobile || null
}

export function preloadImageUrl(url) {
  if (!url) return Promise.resolve()

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => resolve()
    img.src = url
  })
}

export function preloadHeroBackground(cssText) {
  return preloadImageUrl(pickHeroBackgroundUrl(cssText))
}
