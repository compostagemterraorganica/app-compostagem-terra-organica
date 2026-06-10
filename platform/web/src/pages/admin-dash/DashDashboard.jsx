import AnalyticsOutlinedIcon from '@mui/icons-material/AnalyticsOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import TerraLoader from '../../components/TerraLoader'
import { cmsService } from '../../services/cmsService'

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}18`,
              color
            }}
          >
            <Icon />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function DashDashboard() {
  const [kpis, setKpis] = useState(null)
  const [series, setSeries] = useState([])
  const [byCentral, setByCentral] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      cmsService.analyticsKpis().then(setKpis).catch(() => setKpis(null)),
      cmsService.analyticsTimeSeries().then(setSeries).catch(() => setSeries([])),
      cmsService.analyticsByCentral().then(setByCentral).catch(() => setByCentral([]))
    ]).finally(() => setLoading(false))
  }, [])

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard de Análises
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Visão geral do volume de compostagem e atividade das centrais.
        </Typography>
      </Box>

      {loading ? <TerraLoader layout="centered" label="Carregando..." /> : null}

      {!loading ? (
      <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            icon={WaterDropOutlinedIcon}
            label="Volume total"
            value={`${kpis?.total_volume_liters || 0} L`}
            color="#0274be"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            icon={CheckCircleOutlinedIcon}
            label="Verificações"
            value={kpis?.verification_count || 0}
            color="#3CAA59"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <KpiCard
            icon={LocationCityOutlinedIcon}
            label="Centrais"
            value={kpis?.total_centrals || 0}
            color="#9D7B4E"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <AnalyticsOutlinedIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Volume por data
                </Typography>
              </Stack>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total_volume_liters" stroke="#3CAA59" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <LocationCityOutlinedIcon sx={{ color: '#9D7B4E' }} fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Volume por central
                </Typography>
              </Stack>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={byCentral}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total_volume_liters" fill="#0274be" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </>
      ) : null}
    </Stack>
  )
}
