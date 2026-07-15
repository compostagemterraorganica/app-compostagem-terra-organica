import { useEffect, useRef } from 'react'
import { enhanceLazyImages } from '../lib/enhanceLazyImages'

export default function HtmlContent({
  html,
  className,
  enhanceImages = true,
  firstImagePriority = true
}) {
  const ref = useRef(null)

  useEffect(() => {
    if (!enhanceImages || !ref.current) return undefined
    return enhanceLazyImages(ref.current, { firstImagePriority })
  }, [html, enhanceImages, firstImagePriority])

  return (
    <div
      ref={ref}
      className={className}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  )
}
