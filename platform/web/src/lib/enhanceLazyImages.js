/**
 * Aplica lazy load + skeleton visual em <img> dentro de HTML injetado (CMS GrapesJS, posts, etc.).
 * Não usar no editor GrapesJS — apenas na visualização pública.
 */
function isTransparentLogo(img) {
  if (img.classList.contains('to-supporters-logo') || img.classList.contains('to-fin-partners-logo')) {
    return true
  }
  return Boolean(img.closest('.to-supporters-logos, .to-fin-partners-logos'))
}

export function enhanceLazyImages(root, { firstImagePriority = true } = {}) {
  if (!root) return () => {}

  const cleanups = []
  const images = root.querySelectorAll('img:not(.terra-image__img)')

  images.forEach((img, index) => {
    if (img.closest('.terra-image') || img.dataset.terraEnhanced === '1') return

    const transparent = isTransparentLogo(img)
    const wrapper = document.createElement('div')
    wrapper.className = [
      'terra-image',
      'terra-image--loading',
      transparent ? 'terra-image--transparent terra-image--inline' : ''
    ]
      .filter(Boolean)
      .join(' ')

    const parent = img.parentNode
    if (!parent) return

    parent.insertBefore(wrapper, img)
    if (!transparent) {
      const skeleton = document.createElement('span')
      skeleton.className = 'terra-image__skeleton'
      skeleton.setAttribute('aria-hidden', 'true')
      wrapper.appendChild(skeleton)
    }
    wrapper.appendChild(img)

    img.classList.add('terra-image__img')
    img.loading = index === 0 && firstImagePriority ? 'eager' : 'lazy'
    img.decoding = 'async'
    if (index === 0 && firstImagePriority) {
      img.fetchPriority = 'high'
    }

    const syncState = () => {
      if (!img.complete) return
      if (img.naturalWidth > 0) {
        wrapper.classList.remove('terra-image--loading')
        wrapper.classList.add('terra-image--loaded')
      } else {
        wrapper.classList.remove('terra-image--loading')
        wrapper.classList.add('terra-image--error')
      }
    }

    const markLoaded = () => {
      wrapper.classList.remove('terra-image--loading')
      wrapper.classList.add('terra-image--loaded')
    }

    const markError = () => {
      wrapper.classList.remove('terra-image--loading')
      wrapper.classList.add('terra-image--error')
    }

    img.addEventListener('load', markLoaded)
    img.addEventListener('error', markError)
    syncState()

    img.dataset.terraEnhanced = '1'

    cleanups.push(() => {
      img.removeEventListener('load', markLoaded)
      img.removeEventListener('error', markError)
    })
  })

  return () => cleanups.forEach((fn) => fn())
}
