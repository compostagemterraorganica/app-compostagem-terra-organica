import { Box, Stack, Typography } from '@mui/material'

export default function AdminPageHeader({ title, description, action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      spacing={2}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="h4" gutterBottom>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>{action}</Box>
      ) : null}
    </Stack>
  )
}
