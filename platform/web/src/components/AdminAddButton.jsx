import AddIcon from '@mui/icons-material/Add'
import { Button } from '@mui/material'

export default function AdminAddButton({ children, onClick, startIcon, ...props }) {
  return (
    <Button
      variant="outlined"
      color="primary"
      size="small"
      startIcon={startIcon ?? <AddIcon fontSize="small" />}
      onClick={onClick}
      sx={{
        borderRadius: 2,
        px: 1.75,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...props.sx
      }}
      {...props}
    >
      {children}
    </Button>
  )
}
