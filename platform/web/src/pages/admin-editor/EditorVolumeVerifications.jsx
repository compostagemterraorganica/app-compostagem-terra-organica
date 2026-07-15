import PlayCircleOutlinedIcon from '@mui/icons-material/PlayCircleOutlined'
import WaterDropOutlinedIcon from '@mui/icons-material/WaterDropOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import TerraLoader from '../../components/TerraLoader'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useEffect, useMemo, useState } from 'react'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminSearchField from '../../components/AdminSearchField'
import SortableTableHeadCell from '../../components/SortableTableHeadCell'
import { filterBySearch } from '../../lib/adminSearch'
import { formatVolumeTotal } from '../../lib/format'
import { sortItems, toggleSortKey } from '../../lib/tableSort'
import { toVideoEmbedUrl } from '../../lib/videoEmbed'
import { adminService } from '../../services/adminService'

const VERIFICATION_SORT_ACCESSORS = {
  id: (item) => Number(item.id),
  measurement_date: (item) => (item.measurement_date ? new Date(item.measurement_date).getTime() : null),
  title: (item) => item.title || '',
  volume_liters: (item) => Number(item.volume_liters) || 0,
  volume_kg: (item) => Number(item.volume_kg) || 0,
  published_at: (item) => (item.published_at ? new Date(item.published_at).getTime() : null)
}

const emptyVerificationForm = {
  title: '',
  central_id: '',
  measurement_date: '',
  volume_liters: '',
  video_link: '',
  status: 'publish'
}

function toInputDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10)
  }
  return String(value).slice(0, 10)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('pt-BR')
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('pt-BR')
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

function getErrorMessage(err, fallback) {
  return err.response?.data?.error || err.response?.data?.message || fallback
}

function BoldNumber({ children }) {
  return (
    <Typography component="span" sx={{ fontWeight: 700 }}>
      {children}
    </Typography>
  )
}

function VideoButton({ href, onClick }) {
  if (!href) {
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    )
  }

  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<PlayCircleOutlinedIcon />}
      onClick={onClick}
      sx={{ textTransform: 'none', maxWidth: '100%' }}
    >
      Video
    </Button>
  )
}

export default function EditorVolumeVerifications() {
  const [verifications, setVerifications] = useState([])
  const [centrals, setCentrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [centralFilter, setCentralFilter] = useState('')
  const [itemSort, setItemSort] = useState({ key: 'published_at', direction: 'desc' })
  const [videoModal, setVideoModal] = useState({ open: false, url: '', title: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyVerificationForm)

  const openVideoModal = (item) => {
    setVideoModal({
      open: true,
      url: item.video_link,
      title: item.title || `Verificação #${item.id}`
    })
  }

  const closeVideoModal = () => {
    setVideoModal({ open: false, url: '', title: '' })
  }

  const videoEmbedUrl = toVideoEmbedUrl(videoModal.url)

  const handleItemSort = (column) => {
    setItemSort((current) => {
      if (current.key === column) {
        return toggleSortKey(current, column)
      }
      if (column === 'published_at') {
        return { key: column, direction: 'desc' }
      }
      return toggleSortKey(current, column)
    })
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const params = centralFilter ? { central_id: centralFilter } : {}
      const [items, centralList] = await Promise.all([
        adminService.listVolumeVerifications(params),
        adminService.listCentrals()
      ])
      setVerifications(items)
      setCentrals(centralList)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar as verificações.'))
      setVerifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [centralFilter])

  const removeVerification = (id) => {
    setVerifications((prev) => prev.filter((item) => item.id !== id))
  }

  const applyVerificationUpdate = (updated) => {
    const centralName =
      centrals.find((central) => central.id === updated.central_id)?.name ||
      `Central #${updated.central_id}`

    setVerifications((prev) => {
      const next = prev.map((item) =>
        item.id === updated.id ? { ...item, ...updated, central_name: centralName } : item
      )

      if (centralFilter && String(updated.central_id) !== centralFilter) {
        return next.filter((item) => item.id !== updated.id)
      }

      return next
    })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const { id } = deleteTarget
    setSubmitting(true)
    setError('')
    try {
      await adminService.deleteVolumeVerification(id)
      setDeleteTarget(null)
      removeVerification(id)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível excluir a verificação.'))
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setForm({
      title: item.title || '',
      central_id: String(item.central_id || ''),
      measurement_date: toInputDate(item.measurement_date),
      volume_liters: item.volume_liters != null ? String(item.volume_liters) : '',
      video_link: item.video_link || '',
      status: item.status || 'publish'
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyVerificationForm)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!editingId) return

    const volume = Number(form.volume_liters)
    if (!form.title.trim()) {
      setError('Informe o título da verificação.')
      return
    }
    if (!form.central_id) {
      setError('Selecione uma central.')
      return
    }
    if (Number.isNaN(volume) || volume < 0) {
      setError('Informe um volume válido em litros.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const updated = await adminService.updateVolumeVerification(editingId, {
        title: form.title.trim(),
        central_id: Number(form.central_id),
        measurement_date: form.measurement_date || undefined,
        volume_liters: volume,
        video_link: form.video_link.trim(),
        status: form.status || 'publish'
      })
      closeForm()
      applyVerificationUpdate(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar a verificação.'))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredVerifications = useMemo(
    () =>
      filterBySearch(verifications, search, (item) => [
        item.id,
        item.title,
        item.central_name,
        item.central_id,
        item.video_link,
        item.measurement_date,
        item.volume_liters,
        item.volume_kg,
        ...(Array.isArray(item.tags) ? item.tags.map((tag) => tag.name) : [])
      ]),
    [verifications, search]
  )

  const groupedByCentral = useMemo(() => {
    const groups = new Map()

    for (const item of filteredVerifications) {
      const key = item.central_id
      if (!groups.has(key)) {
        groups.set(key, {
          centralId: key,
          centralName: item.central_name || `Central #${key}`,
          items: [],
          totalVolume: 0
        })
      }
      const group = groups.get(key)
      group.items.push(item)
      group.totalVolume += Number(item.volume_liters) || 0
    }

    for (const group of groups.values()) {
      group.items = sortItems(group.items, itemSort, VERIFICATION_SORT_ACCESSORS)
    }

    return [...groups.values()].sort((a, b) => {
      const byCount = b.items.length - a.items.length
      if (byCount !== 0) return byCount
      return a.centralName.localeCompare(b.centralName, 'pt-BR')
    })
  }, [filteredVerifications, itemSort])

  const summary = useMemo(() => {
    const totalVolume = filteredVerifications.reduce((sum, item) => sum + (Number(item.volume_liters) || 0), 0)
    return {
      count: filteredVerifications.length,
      centrals: groupedByCentral.length,
      totalVolume
    }
  }, [filteredVerifications, groupedByCentral])

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Verificações de Volume"
        description="Histórico detalhado de medições por central, com links dos vídeos de comprovação."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        {!loading && verifications.length > 0 ? (
          <AdminSearchField
            value={search}
            onChange={setSearch}
            placeholder="Pesquisar por central, título, volume..."
          />
        ) : null}
        <FormControl size="small" sx={{ minWidth: { md: 220 }, width: { xs: '100%', md: 'auto' } }}>
          <InputLabel>Central</InputLabel>
          <Select label="Central" value={centralFilter} onChange={(e) => setCentralFilter(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            {centrals.map((central) => (
              <MenuItem key={central.id} value={String(central.id)}>
                {central.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {!loading && filteredVerifications.length > 0 ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
          <Chip
            icon={<WaterDropOutlinedIcon />}
            label={
              <>
                <BoldNumber>{summary.count}</BoldNumber> verificações
              </>
            }
            color="primary"
            variant="outlined"
          />
          <Chip
            label={
              <>
                <BoldNumber>{summary.centrals}</BoldNumber> centrais
              </>
            }
            variant="outlined"
          />
          <Chip
            label={
              <>
                Volume total: <BoldNumber>{formatVolumeTotal(summary.totalVolume)}</BoldNumber>
              </>
            }
            color="secondary"
            variant="outlined"
          />
        </Stack>
      ) : null}

      {loading ? (
        <TerraLoader layout="centered" label="Carregando..." />
      ) : verifications.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          Nenhuma verificação cadastrada.
        </Typography>
      ) : filteredVerifications.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          Nenhuma verificação encontrada para &quot;{search}&quot;.
        </Typography>
      ) : (
        groupedByCentral.map((group) => (
          <Accordion key={group.centralId} disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                alignItems={{ sm: 'center' }}
                sx={{ width: '100%', pr: 1 }}
              >
                <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                  {group.centralName}
                </Typography>
                <Chip
                  size="small"
                  label={
                    <>
                      <BoldNumber>{group.items.length}</BoldNumber> verificações
                    </>
                  }
                />
                <Chip
                  size="small"
                  color="secondary"
                  label={<BoldNumber>{formatVolumeTotal(group.totalVolume)}</BoldNumber>}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <SortableTableHeadCell label="ID" column="id" sort={itemSort} onSort={handleItemSort} />
                      <SortableTableHeadCell label="Data medição" column="measurement_date" sort={itemSort} onSort={handleItemSort} />
                      <SortableTableHeadCell label="Título" column="title" sort={itemSort} onSort={handleItemSort} />
                      <SortableTableHeadCell label="Volume" column="volume_liters" sort={itemSort} onSort={handleItemSort} align="right" />
                      <SortableTableHeadCell label="Peso" column="volume_kg" sort={itemSort} onSort={handleItemSort} align="right" />
                      <TableCell>Tags</TableCell>
                      <SortableTableHeadCell label="Publicado em" column="published_at" sort={itemSort} onSort={handleItemSort} />
                      <TableCell>Vídeo</TableCell>
                      <TableCell align="right">Ações</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>
                            {item.id}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatDate(item.measurement_date)}</TableCell>
                        <TableCell sx={{ maxWidth: 240 }}>
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
                        <TableCell sx={{ maxWidth: 200 }}>
                          {Array.isArray(item.tags) && item.tags.length > 0 ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {item.tags.map((tag) => (
                                <Chip key={tag.id} label={tag.name} size="small" variant="outlined" />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(item.published_at)}</TableCell>
                        <TableCell>
                          <VideoButton href={item.video_link} onClick={() => openVideoModal(item)} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEdit(item)}
                            aria-label={`Editar verificação ${item.id}`}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={`Excluir verificação ${item.id}`}
                          >
                            <DeleteOutlinedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <Dialog
        open={videoModal.open}
        onClose={closeVideoModal}
        maxWidth={false}
        scroll="body"
        PaperProps={{
          sx: {
            bgcolor: '#000',
            color: '#fff',
            width: 'auto',
            maxWidth: 'min(720px, 92vw)',
            m: 2
          }
        }}
      >
        <DialogTitle sx={{ bgcolor: '#000', color: '#fff', pb: 1 }}>{videoModal.title}</DialogTitle>
        <DialogContent sx={{ bgcolor: '#000', p: 2, pt: 0, overflow: 'hidden' }}>
          {videoEmbedUrl ? (
            <Box
              sx={{
                mx: 'auto',
                aspectRatio: '16 / 9',
                width: 'min(680px, 88vw, calc((100vh - 11rem) * 16 / 9))',
                maxHeight: 'calc(100vh - 11rem)',
                bgcolor: '#000',
                borderRadius: 1,
                overflow: 'hidden'
              }}
            >
              <Box
                component="iframe"
                src={videoEmbedUrl}
                title={videoModal.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sx={{ display: 'block', width: '100%', height: '100%', border: 0 }}
              />
            </Box>
          ) : (
            <Typography color="grey.400" py={2}>
              Não foi possível exibir este vídeo no player embutido.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#000', pt: 0, px: 2, pb: 2 }}>
          <Button onClick={closeVideoModal} sx={{ color: '#fff' }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={formOpen} onClose={() => !submitting && closeForm()} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Editar verificação #{editingId}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Título"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                required
                fullWidth
              />
              <FormControl fullWidth required>
                <InputLabel>Central</InputLabel>
                <Select
                  label="Central"
                  value={form.central_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, central_id: e.target.value }))}
                >
                  {centrals.map((central) => (
                    <MenuItem key={central.id} value={String(central.id)}>
                      {central.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Data da medição"
                type="date"
                value={form.measurement_date}
                onChange={(e) => setForm((prev) => ({ ...prev, measurement_date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Volume (litros)"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                value={form.volume_liters}
                onChange={(e) => setForm((prev) => ({ ...prev, volume_liters: e.target.value }))}
                required
                fullWidth
              />
              <TextField
                label="Link do vídeo"
                value={form.video_link}
                onChange={(e) => setForm((prev) => ({ ...prev, video_link: e.target.value }))}
                placeholder="https://..."
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="publish">Publicado</MenuItem>
                  <MenuItem value="draft">Rascunho</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => !submitting && setDeleteTarget(null)}>
        <DialogTitle>Excluir verificação</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a verificação <strong>#{deleteTarget?.id}</strong>
            {deleteTarget?.title ? (
              <>
                {' '}
                (<strong>{deleteTarget.title}</strong>)
              </>
            ) : null}
            ? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={submitting}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={submitting}>
            {submitting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {!loading && filteredVerifications.length > 0 ? (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Detalhes adicionais
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cada verificação registra a medição de volume (litros e kg), tags associadas, a data da medição e o
            link de comprovação em vídeo, quando disponível.
          </Typography>
        </Card>
      ) : null}
    </Stack>
  )
}
