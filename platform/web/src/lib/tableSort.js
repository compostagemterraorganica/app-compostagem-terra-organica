export function toggleSortKey(current, column) {
  if (current.key === column) {
    return { key: column, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  }
  return { key: column, direction: 'asc' }
}

function isEmptySortValue(value) {
  return value == null || value === '' || (typeof value === 'number' && Number.isNaN(value))
}

function compareSortValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }

  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' })
}

export function sortItems(items, sort, accessors) {
  const accessor = accessors[sort.key]
  if (!accessor) return items

  const direction = sort.direction === 'desc' ? -1 : 1

  return [...items].sort((left, right) => {
    const a = accessor(left)
    const b = accessor(right)
    const aEmpty = isEmptySortValue(a)
    const bEmpty = isEmptySortValue(b)

    // Valores vazios/null sempre por último, independente da direção.
    if (aEmpty && bEmpty) return 0
    if (aEmpty) return 1
    if (bEmpty) return -1

    return compareSortValues(a, b) * direction
  })
}
