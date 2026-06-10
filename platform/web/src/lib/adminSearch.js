export function normalizeSearch(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function filterBySearch(items, query, getValues) {
  const normalizedQuery = normalizeSearch(query).trim()
  if (!normalizedQuery) return items

  return items.filter((item) => {
    const values = getValues(item)
    return values.some((value) => normalizeSearch(value).includes(normalizedQuery))
  })
}
