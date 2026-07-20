import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import AdminAddButton from './AdminAddButton'
import { buildAnalyticsParams, hasActiveAnalyticsFilters } from '../lib/analysisFilters'
import { cmsService } from '../services/cmsService'

/**
 * Exporta relatório CSV respeitando os filtros globais do dashboard.
 * Sem filtros: exporta todos os dados. Com filtros: apenas o recorte filtrado.
 */
export default function AnalysisReportExport({
  filters = {},
  disabled = false,
  loadingLabel = 'Exportando...',
  label = 'Exportar CSV',
  onExportStart,
  onExportEnd,
  onError
}) {
  const handleExport = async () => {
    onExportStart?.()
    try {
      const params = buildAnalyticsParams(filters)
      const { blob, filename } = await cmsService.exportVolumeReportCsv(params)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      const message =
        error?.message ||
        (hasActiveAnalyticsFilters(filters)
          ? 'Não foi possível exportar o relatório filtrado em CSV.'
          : 'Não foi possível exportar o relatório em CSV.')
      onError?.(message)
    } finally {
      onExportEnd?.()
    }
  }

  return (
    <AdminAddButton
      startIcon={<DownloadOutlinedIcon fontSize="small" />}
      onClick={handleExport}
      disabled={disabled}
    >
      {disabled ? loadingLabel : label}
    </AdminAddButton>
  )
}
