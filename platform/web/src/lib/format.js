export function truncateWords(text, maxWords = 60) {
  if (!text) return ''
  const words = String(text).trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return words.join(' ')
  return `${words.slice(0, maxWords).join(' ')}…`
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('pt-BR')
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('pt-BR')
}

export function formatVolume(value) {
  const amount = Number(value)
  if (Number.isNaN(amount) || amount === 0) return '—'
  return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`
}

const LITERS_PER_KG = 0.55

export function litersToKg(liters) {
  const amount = Number(liters)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * LITERS_PER_KG * 100) / 100
}

/** Peso em kg (usa volume_kg ou deriva de litros). */
export function formatWeight(volumeKg, volumeLiters) {
  const kg = Number(volumeKg)
  if (volumeKg != null && volumeKg !== '' && Number.isFinite(kg) && kg > 0) {
    return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
  }
  const derived = litersToKg(volumeLiters)
  if (derived === null) return '—'
  return `${derived.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
}

/** Litros com peso derivado (volume × 0,55). */
export function formatVolumeTotal(liters) {
  const amount = Number(liters)
  if (Number.isNaN(amount)) return '—'
  const litersLabel = `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L`
  const kg = litersToKg(amount)
  if (kg === null) return litersLabel
  return `${litersLabel} / ${kg.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
}

function includesNormalized(haystack, needle) {
  if (!haystack || !needle) return false
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function formatCentralLocation({ address, city, state, state_uf: stateUf } = {}) {
  const addressText = address?.trim() || ''
  const cityText = city?.trim() || ''
  const stateText = state?.trim() || ''
  const ufText = stateUf?.trim() || ''
  const stateLabel = stateText || ufText

  if (addressText) {
    const addressAlreadyComplete =
      (cityText && includesNormalized(addressText, cityText)) ||
      (stateText && includesNormalized(addressText, stateText)) ||
      (ufText && new RegExp(`\\b${ufText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(addressText))

    if (addressAlreadyComplete) return addressText

    const locality = [cityText, stateLabel].filter(Boolean).join(' — ')
    return locality ? `${addressText} — ${locality}` : addressText
  }

  return [cityText, stateLabel].filter(Boolean).join(' — ') || null
}
