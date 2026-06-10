import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined'
import { Box, Card, CardContent, Chip, Grid, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import TerraLoader from '../../components/TerraLoader'
import api from '../../lib/api'

export default function DashCentrals() {
  const [centrals, setCentrals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .get('/centrals')
      .then((res) => setCentrals(res.data.data || []))
      .catch(() => setCentrals([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Centrais
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Lista de centrais de compostagem cadastradas na plataforma.
        </Typography>
      </Box>

      {loading ? <TerraLoader layout="centered" label="Carregando..." /> : null}

      {!loading ? (
      <Grid container spacing={2}>
        {centrals.map((central) => (
          <Grid key={central.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'primary.main',
                      color: '#fff',
                      flexShrink: 0
                    }}
                  >
                    <LocationCityOutlinedIcon fontSize="small" />
                  </Box>
                  <Box minWidth={0}>
                    <Typography variant="h6" noWrap>
                      {central.name}
                    </Typography>
                    <Chip label={central.slug} size="small" variant="outlined" color="primary" sx={{ mt: 0.5 }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      ) : null}

      {!loading && centrals.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          Nenhuma central cadastrada.
        </Typography>
      ) : null}
    </Stack>
  )
}
