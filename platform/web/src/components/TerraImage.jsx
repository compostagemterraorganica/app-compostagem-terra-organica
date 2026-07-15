import { useCallback, useEffect, useRef, useState } from 'react'
import './TerraImage.css'

export const TERRA_IMAGE_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260"><rect fill="#e8e4df" width="400" height="260"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9d7b4e" font-family="sans-serif" font-size="16">Terra Orgânica</text></svg>'
  )

function readImageStatus(img) {
  if (!img) return 'loading'
  if (!img.complete) return 'loading'
  return img.naturalWidth > 0 ? 'loaded' : 'error'
}

export default function TerraImage({
  src,
  alt = '',
  priority = false,
  fill = false,
  inline = false,
  aspectRatio,
  objectFit = 'cover',
  className = '',
  imgClassName = '',
  style,
  width,
  height,
  showSkeleton = true,
  fallbackSrc = TERRA_IMAGE_PLACEHOLDER
}) {
  const imgRef = useRef(null)
  const [status, setStatus] = useState('loading')

  const syncStatus = useCallback(() => {
    setStatus(readImageStatus(imgRef.current))
  }, [])

  useEffect(() => {
    syncStatus()
  }, [src, syncStatus])

  const handleImgRef = useCallback(
    (node) => {
      imgRef.current = node
      if (node) syncStatus()
    },
    [syncStatus]
  )

  if (!src) return null

  const fixedSize = !inline && !fill && !aspectRatio && width != null && height != null

  const rootClass = [
    'terra-image',
    fill ? 'terra-image--fill' : '',
    inline ? 'terra-image--inline' : '',
    fixedSize ? 'terra-image--fixed' : '',
    status === 'loading' ? 'terra-image--loading' : '',
    status === 'loaded' ? 'terra-image--loaded' : '',
    status === 'error' ? 'terra-image--error' : '',
    className
  ]
    .filter(Boolean)
    .join(' ')

  const rootStyle = {
    ...(aspectRatio && !fill ? { aspectRatio } : {}),
    ...(fixedSize ? { width, height } : {}),
    ...style
  }

  const handleLoad = () => setStatus('loaded')
  const handleError = (event) => {
    if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
      event.currentTarget.src = fallbackSrc
      return
    }
    setStatus('error')
  }

  const showLoader = showSkeleton && status === 'loading' && !inline

  return (
    <div className={rootClass} style={Object.keys(rootStyle).length ? rootStyle : undefined}>
      {showLoader ? <span className="terra-image__skeleton" aria-hidden="true" /> : null}
      {status === 'error' ? (
        <span className="terra-image__fallback" aria-hidden="true">
          Terra Orgânica
        </span>
      ) : null}
      <img
        ref={handleImgRef}
        className={['terra-image__img', imgClassName].filter(Boolean).join(' ')}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        style={objectFit ? { objectFit } : undefined}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  )
}
