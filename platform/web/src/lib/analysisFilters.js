/**
 * Serializa filtros globais do dashboard de análises para query params da API.
 */
export function buildAnalyticsParams(filters = {}) {
  const params = {}

  if (filters.fromDate) params.from_date = filters.fromDate
  if (filters.toDate) params.to_date = filters.toDate

  if (Array.isArray(filters.centralIds) && filters.centralIds.length > 0) {
    params.central_ids = filters.centralIds.join(',')
  }

  if (Array.isArray(filters.tagIds) && filters.tagIds.length > 0) {
    params.tag_ids = filters.tagIds.join(',')
  } else if (Array.isArray(filters.tagNames) && filters.tagNames.length > 0) {
    params.tag_names = filters.tagNames.join(',')
  }

  if (filters.category) {
    params.waste_type = filters.category
  }

  return params
}

export function hasActiveAnalyticsFilters(filters = {}) {
  return Boolean(
    filters.fromDate ||
      filters.toDate ||
      (filters.centralIds && filters.centralIds.length > 0) ||
      (filters.tagIds && filters.tagIds.length > 0) ||
      (filters.tagNames && filters.tagNames.length > 0) ||
      filters.category
  )
}

export function parseCentralIdsFromSearchParams(searchParams) {
  if (!searchParams) return []
  const raw =
    searchParams.get?.('central_id') ||
    searchParams.get?.('central_ids') ||
    searchParams.get?.('central') ||
    ''
  if (!raw) return []
  return [
    ...new Set(
      String(raw)
        .split(',')
        .map((item) => Number(String(item).trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    )
  ]
}

export const EMPTY_ANALYSIS_FILTERS = {
  fromDate: '',
  toDate: '',
  centralIds: [],
  tagIds: [],
  tagNames: [],
  category: ''
}
