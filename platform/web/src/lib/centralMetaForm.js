export const EMPTY_META_FORM = {
  published: '',
  central_text: '',
  responsible: '',
  city_name: '',
  state_name: '',
  state_uf: '',
  address: '',
  email: '',
  phone: '',
  instagram: '',
  facebook: ''
}

export function slugifyCity(text) {
  if (!text) return null
  const slug = String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || null
}

function toInputDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function metaToForm(meta) {
  if (!meta) return { ...EMPTY_META_FORM }

  return {
    published: toInputDateTime(meta.central_info?.published),
    central_text: meta.central_info?.central_text || '',
    responsible: meta.central_info?.responsible || '',
    city_name: meta.location?.city_name || '',
    state_name: meta.location?.state_name || '',
    state_uf: meta.location?.state_uf || '',
    address: meta.location?.address || '',
    email: meta.contact?.email || '',
    phone: meta.contact?.phone || '',
    instagram: meta.social?.instagram || '',
    facebook: meta.social?.facebook || ''
  }
}

function toNullable(value) {
  const text = String(value ?? '').trim()
  return text || null
}

export function formToMeta(form) {
  let published = null
  if (form.published) {
    const date = new Date(form.published)
    if (!Number.isNaN(date.getTime())) {
      published = date.toISOString()
    }
  }

  const cityName = toNullable(form.city_name)

  return {
    central_info: {
      published,
      central_text: toNullable(form.central_text),
      responsible: toNullable(form.responsible)
    },
    location: {
      city_name: cityName,
      city_slug: cityName ? slugifyCity(cityName) : null,
      state_name: toNullable(form.state_name),
      state_uf: toNullable(form.state_uf),
      address: toNullable(form.address)
    },
    contact: {
      email: toNullable(form.email),
      phone: toNullable(form.phone)
    },
    social: {
      instagram: toNullable(form.instagram),
      facebook: toNullable(form.facebook)
    }
  }
}
