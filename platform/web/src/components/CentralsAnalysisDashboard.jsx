import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined'
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import {
  Alert,
  Box,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography
} from '@mui/material'
import AdminAddButton from './AdminAddButton'
import AdminPageHeader from './AdminPageHeader'
import AdminSearchField from './AdminSearchField'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import TerraLoader from './TerraLoader'
import { filterBySearch } from '../lib/adminSearch'
import { formatVolumeTotal } from '../lib/format'
import { cmsService } from '../services/cmsService'

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

function formatMonthLabel(monthKey) {
  const date = new Date(`${monthKey}-01T12:00:00`)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function formatMonthTooltip(monthKey) {
  const date = new Date(`${monthKey}-01T12:00:00`)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function StateBarChart({ title, data, dataKey, valueFormatter, tooltipFormatter, wide = false }) {
  const chartHeight = wide ? 320 : 260

  const chartData = useMemo(
    () =>
      (data || []).map((item) => ({
        label: item.stateLabel || item.state,
        value: item[dataKey]
      })),
    [data, dataKey]
  )

  if (chartData.length === 0) {
    return null
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Box sx={{ width: '100%', minWidth: 0, height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={valueFormatter} width={wide ? 72 : 60} />
              <Tooltip
                formatter={(value) => [(tooltipFormatter || valueFormatter)(value), title]}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="value" fill="#3CAA59" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  )
}

function CentralMonthlyChart({ monthlyVolumes, wide = false }) {
  const chartHeight = wide ? 360 : 260

  const chartData = useMemo(
    () =>
      monthlyVolumes.map((item) => ({
        month: item.month,
        label: formatMonthLabel(item.month),
        volume: item.volume
      })),
    [monthlyVolumes]
  )

  const tooltipFormatter = (value) => [`${Math.round(value)} L`, 'Volume']
  const tooltipLabelFormatter = (_, payload) => {
    const month = payload?.[0]?.payload?.month
    return month ? formatMonthTooltip(month) : ''
  }

  return (
    <Box mt={2} sx={{ width: '100%', minWidth: 0, height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={wide ? 24 : 32} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value} L`} width={wide ? 72 : 60} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={tooltipLabelFormatter} />
          <Line
            type="monotone"
            dataKey="volume"
            stroke="#3CAA59"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}

const METRIC_LABEL_SX = { fontSize: '14px', display: 'block' }

function MetricBlock({ label, value }) {
  return (
    <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, textAlign: 'center', height: '100%' }}>
      <Typography variant="caption" color="text.secondary" sx={METRIC_LABEL_SX}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  )
}

function CentralAnalysisCard({ centralData, wide = false }) {
  const { central, metrics } = centralData

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          {central.name}
        </Typography>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, md: 4 }}>
            <MetricBlock label="Total volume" value={formatVolumeTotal(metrics.totalVolume)} />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <MetricBlock label="Total de coletas" value={metrics.postCount} />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <MetricBlock label="Total volume anual" value={formatVolumeTotal(metrics.annualVolume ?? 0)} />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <MetricBlock
              label="Média por coleta Anual"
              value={formatVolumeTotal(metrics.averageVolume)}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <MetricBlock
              label="Total volume mensal"
              value={formatVolumeTotal(metrics.averageMonthlyVolume)}
            />
          </Grid>
          <Grid size={{ xs: 6, md: 4 }}>
            <MetricBlock
              label="Média por coleta mensal"
              value={formatVolumeTotal(metrics.averageVolumePerMonthlyCollection ?? 0)}
            />
          </Grid>
        </Grid>

        {metrics.monthlyVolumes?.length > 0 ? (
          <CentralMonthlyChart monthlyVolumes={metrics.monthlyVolumes} wide={wide} />
        ) : (
          <Typography variant="body2" color="text.secondary" fontStyle="italic" textAlign="center" py={3}>
            Nenhum dado mensal disponível
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default function CentralsAnalysisDashboard({
  title = 'Dashboard de Análises',
  description = 'Análise de volume e performance das centrais de compostagem.',
  showActions = false,
  wide = false
}) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [stateFilter, setStateFilter] = useState('')

  const loadAnalysis = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await cmsService.analyticsCentralsAnalysis()
      setAnalysis(data)
    } catch {
      setAnalysis(null)
      setError('Não foi possível carregar os dados de análise das centrais.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnalysis()
  }, [loadAnalysis])

  const handleExportCsv = useCallback(async () => {
    setExporting(true)
    setError('')
    try {
      const { blob, filename } = await cmsService.exportVolumeReportCsv()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('Não foi possível exportar o relatório em CSV.')
    } finally {
      setExporting(false)
    }
  }, [])

  const summary = analysis?.summary

  const stateOptions = useMemo(() => {
    const ufs = new Set()
    for (const item of analysis?.centrals || []) {
      if (item.central.state_uf) ufs.add(item.central.state_uf)
    }
    return [...ufs].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [analysis?.centrals])

  const filteredCentrals = useMemo(() => {
    let items = analysis?.centrals || []
    if (stateFilter) {
      items = items.filter((item) => item.central.state_uf === stateFilter)
    }
    return filterBySearch(items, search, (item) => [
      item.central.name,
      item.central.slug,
      item.central.state_name,
      item.central.state_uf
    ])
  }, [analysis?.centrals, search, stateFilter])

  const headerAction = showActions ? (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      <AdminAddButton
        startIcon={<RefreshOutlinedIcon fontSize="small" />}
        onClick={loadAnalysis}
        disabled={loading || exporting}
      >
        Atualizar
      </AdminAddButton>
      <AdminAddButton
        startIcon={<DownloadOutlinedIcon fontSize="small" />}
        onClick={handleExportCsv}
        disabled={loading || exporting}
      >
        {exporting ? 'Exportando...' : 'Exportar dados'}
      </AdminAddButton>
    </Stack>
  ) : null

  return (
    <Stack spacing={3} sx={{ width: '100%', minWidth: 0 }}>
      <AdminPageHeader title={title} description={description} action={headerAction} />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {loading ? <TerraLoader layout="centered" label="Carregando dados das centrais..." /> : null}

      {!loading && summary ? (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <KpiCard
                icon={LocationCityOutlinedIcon}
                label="Total de centrais"
                value={summary.totalCentrals}
                color="#9D7B4E"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <KpiCard
                icon={WaterDropOutlinedIcon}
                label="Volume total"
                value={formatVolumeTotal(summary.totalVolume)}
                color="#0274be"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <KpiCard
                icon={PostAddOutlinedIcon}
                label="Total de coletas registradas"
                value={summary.totalPosts}
                color="#3CAA59"
              />
            </Grid>
          </Grid>

          {summary.byState?.volume?.length > 0 ? (
            <StateBarChart
              title="Total volume por estado"
              data={summary.byState.volume}
              dataKey="volume"
              valueFormatter={(value) => `${Math.round(value)} L`}
              tooltipFormatter={formatVolumeTotal}
              wide={wide}
            />
          ) : null}

          {summary.byState?.centralsCount?.length > 0 ? (
            <StateBarChart
              title="Centrais por estado"
              data={summary.byState.centralsCount}
              dataKey="count"
              valueFormatter={(value) => Math.round(value)}
              wide={wide}
            />
          ) : null}

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ sm: 'center' }}
            flexWrap="wrap"
            useFlexGap
          >
            <AdminSearchField
              value={search}
              onChange={setSearch}
              placeholder="Pesquisar central por nome..."
            />
            <FormControl size="small" sx={{ minWidth: { sm: 200 } }}>
              <InputLabel id="central-state-filter-label">Estado (UF)</InputLabel>
              <Select
                labelId="central-state-filter-label"
                value={stateFilter}
                label="Estado (UF)"
                onChange={(event) => setStateFilter(event.target.value)}
              >
                <MenuItem value="">Todos os estados</MenuItem>
                {stateOptions.map((uf) => (
                  <MenuItem key={uf} value={uf}>
                    {uf}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Análise por central
            </Typography>
            <Stack spacing={2}>
              {filteredCentrals.length === 0 ? (
                <Typography variant="body2" color="text.secondary" fontStyle="italic" textAlign="center" py={3}>
                  Nenhuma central encontrada com os filtros aplicados.
                </Typography>
              ) : (
                filteredCentrals.map((centralData) => (
                  <CentralAnalysisCard
                    key={centralData.central.id}
                    centralData={centralData}
                    wide={wide}
                  />
                ))
              )}
            </Stack>
          </Box>
        </>
      ) : null}
    </Stack>
  )
}
