import { Box, CssBaseline, ThemeProvider } from '@mui/material'
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import CentralsAnalysisDashboard from '../../components/CentralsAnalysisDashboard'
import { parseCentralIdsFromSearchParams } from '../../lib/analysisFilters'
import { adminTheme } from '../../theme/adminTheme'

export default function DadosColetasPage() {
  const [searchParams] = useSearchParams()
  const initialCentralIds = useMemo(
    () => parseCentralIdsFromSearchParams(searchParams),
    [searchParams]
  )
  const dashboardKey = initialCentralIds.join(',') || 'all'

  useEffect(() => {
    document.title = 'Dados de Coletas - Terra Orgânica'
  }, [])

  return (
    <ThemeProvider theme={adminTheme}>
      <CssBaseline />
      <Box
        className="dados-coletas-page"
        sx={{
          width: '100%',
          maxWidth: 'min(100%, 1680px)',
          mx: 'auto',
          px: { xs: 2, sm: 3, lg: 5 },
          py: { xs: 3, sm: 4 },
          boxSizing: 'border-box'
        }}
      >
        <CentralsAnalysisDashboard
          key={dashboardKey}
          wide
          initialCentralIds={initialCentralIds}
          title="Dados de Coletas"
          description="Volume e performance das centrais de compostagem da rede Terra Orgânica."
        />
      </Box>
    </ThemeProvider>
  )
}
