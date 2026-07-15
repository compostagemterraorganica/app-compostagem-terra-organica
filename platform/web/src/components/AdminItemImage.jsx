import TerraImage from './TerraImage'

export default function AdminItemImage({ src, alt }) {
  if (!src) return null

  return (
    <TerraImage
      src={src}
      alt={alt || ''}
      aspectRatio="16 / 9"
      style={{ width: '100%', borderBottom: '1px solid #e0e0e0' }}
    />
  )
}
