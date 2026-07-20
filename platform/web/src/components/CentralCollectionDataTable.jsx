import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography
} from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import TerraLoader from './TerraLoader'
import { buildAnalyticsParams } from '../lib/analysisFilters'
import { toVideoEmbedUrl } from '../lib/videoEmbed'
import { cmsService } from '../services/cmsService'

const WASTE_TYPE_LABELS = {
  alimentares: 'Resíduos alimentares',
  verdes: 'Resíduos verdes'
}

const PAGE_SIZE = 50

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('pt-BR')
}

function formatVolumeLiters(value) {
  const amount = Number(value)
  if (Number.isNaN(amount)) return '—'
  return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} L`
}

function resolveWeightKg(volumeKg, volumeLiters) {
  const kg = Number(volumeKg)
  if (volumeKg != null && volumeKg !== '' && !Number.isNaN(kg) && kg > 0) {
    return kg
  }
  const liters = Number(volumeLiters)
  if (!Number.isNaN(liters) && liters > 0) {
    return Math.round(liters * 0.55 * 100) / 100
  }
  return null
}

function formatKg(volumeKg, volumeLiters) {
  const amount = resolveWeightKg(volumeKg, volumeLiters)
  if (amount === null) return '—'
  return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
}

function formatWasteType(value) {
  return WASTE_TYPE_LABELS[value] || value || '—'
}

/**
 * Tabela paginada de verificações de volume de uma central (somente leitura).
 * Respeita os filtros globais do dashboard.
 */
export default function CentralCollectionDataTable({ centralId, filters = {} }) {
  const [page, setPage] = useState(0)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [videoModal, setVideoModal] = useState({ open: false, url: '', title: '' })

  const loadPage = useCallback(
    async (nextPage) => {
      setLoading(true)
      setError('')
      try {
        const data = await cmsService.analyticsCentralVerifications(centralId, {
          ...buildAnalyticsParams(filters),
          page: nextPage + 1,
          limit: PAGE_SIZE
        })
        setItems(data.items || [])
        setTotal(data.pagination?.total || 0)
      } catch {
        setItems([])
        setTotal(0)
        setError('Não foi possível carregar os dados de coleta desta central.')
      } finally {
        setLoading(false)
      }
    },
    [centralId, filters]
  )

  useEffect(() => {
    setPage(0)
  }, [centralId, filters])

  useEffect(() => {
    loadPage(page)
  }, [page, loadPage])

  const openVideo = (item) => {
    const embed = toVideoEmbedUrl(item.video_link)
    setVideoModal({
      open: true,
      url: embed || item.video_link || '',
      title: item.title || 'Vídeo da coleta'
    })
  }

  return (
    <Box mt={2}>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? <TerraLoader layout="centered" label="Carregando dados de coleta..." /> : null}

      {!loading && items.length === 0 && !error ? (
        <Typography variant="body2" color="text.secondary" fontStyle="italic" textAlign="center" py={3}>
          Nenhum dado de coleta encontrado para os filtros aplicados.
        </Typography>
      ) : null}

      {!loading && items.length > 0 ? (
        <>
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell align="right">Volume</TableCell>
                  <TableCell align="right">Peso</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell sx={{ width: 140, maxWidth: 140 }}>Tags</TableCell>
                  <TableCell>Vídeo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      {formatDate(item.posting_date || item.published_at || item.measurement_date)}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 260 }}>
                      <Typography variant="body2" fontWeight={600} noWrap title={item.title}>
                        {item.title || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="secondary.main">
                        {formatVolumeLiters(item.volume_liters)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {formatKg(item.volume_kg, item.volume_liters)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={formatWasteType(item.waste_type)}
                        variant="outlined"
                        color={item.waste_type === 'verdes' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 140, maxWidth: 140 }}>
                      {Array.isArray(item.tags) && item.tags.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {item.tags.map((tag) => (
                            <Chip
                              key={tag.id}
                              label={tag.name}
                              size="small"
                              variant="outlined"
                              sx={{
                                maxWidth: 120,
                                height: 20,
                                fontSize: 11,
                                '& .MuiChip-label': {
                                  px: 0.75,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }
                              }}
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.video_link ? (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<PlayCircleOutlinedIcon />}
                          onClick={() => openVideo(item)}
                          sx={{ textTransform: 'none' }}
                        >
                          Vídeo
                        </Button>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            labelRowsPerPage="Por página"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          />
        </>
      ) : null}

      <Dialog
        open={videoModal.open}
        onClose={() => setVideoModal({ open: false, url: '', title: '' })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{videoModal.title}</DialogTitle>
        <DialogContent>
          {videoModal.url && toVideoEmbedUrl(videoModal.url) ? (
            <Box
              component="iframe"
              src={toVideoEmbedUrl(videoModal.url) || videoModal.url}
              title={videoModal.title}
              sx={{ width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 1 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : videoModal.url ? (
            <Button href={videoModal.url} target="_blank" rel="noopener noreferrer" variant="contained">
              Abrir vídeo
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </Box>
  )
}
