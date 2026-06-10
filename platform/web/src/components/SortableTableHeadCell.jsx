import { TableCell, TableSortLabel } from '@mui/material'

export default function SortableTableHeadCell({ label, column, sort, onSort, align }) {
  const active = sort.key === column

  return (
    <TableCell align={align} sortDirection={active ? sort.direction : false}>
      <TableSortLabel active={active} direction={active ? sort.direction : 'asc'} onClick={() => onSort(column)}>
        {label}
      </TableSortLabel>
    </TableCell>
  )
}
