import { Box } from '@mui/material'

export default function AdminItemImage({ src, alt }) {
  if (!src) return null

  return (
    <Box
      sx={{
        width: '100%',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        bgcolor: '#e8e4df',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <Box
        component="img"
        src={src}
        alt={alt || ''}
        loading="lazy"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block'
        }}
      />
    </Box>
  )
}
