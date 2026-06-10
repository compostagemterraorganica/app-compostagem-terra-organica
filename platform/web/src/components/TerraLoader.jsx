import './TerraLoader.css'

const LAYOUTS = new Set(['inline', 'centered', 'fullscreen', 'overlay'])
const SIZES = new Set(['sm', 'md', 'lg'])

export default function TerraLoader({
  size = 'md',
  label,
  layout = 'centered',
  className = ''
}) {
  const resolvedSize = SIZES.has(size) ? size : 'md'
  const resolvedLayout = LAYOUTS.has(layout) ? layout : 'centered'
  const ariaLabel = label || 'Carregando'

  const rootClass = [
    'terra-loader',
    `terra-loader--${resolvedLayout}`,
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rootClass}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <span className={`terra-loader__spinner terra-loader__spinner--${resolvedSize}`} aria-hidden="true">
        <span className="terra-loader__ring terra-loader__ring--outer" />
        <span className="terra-loader__ring terra-loader__ring--inner" />
      </span>
      {label ? <p className="terra-loader__label">{label}</p> : null}
    </div>
  )
}
