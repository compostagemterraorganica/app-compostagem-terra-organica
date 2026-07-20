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
  Autocomplete,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
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
  measurement_date: (item) => (item.measurement_date ? new Date(item.measurement_date).getTime() : null),
  title: (item) => item.title || '',
  volume_liters: (item) => Number(item.volume_liters) || 0,
  volume_kg: (item) => Number(item.volume_kg) || 0,
  waste_type: (item) => item.waste_type || ''
}

const WASTE_TYPE_OPTIONS = [
  { value: 'alimentares', label: 'Resíduos alimentares' },
  { value: 'verdes', label: 'Resíduos verdes' }
]

const WASTE_TYPE_LABELS = Object.fromEntries(WASTE_TYPE_OPTIONS.map((option) => [option.value, option.label]))

const emptyVerificationForm = {
  title: '',
  central_id: '',
  measurement_date: '',
  volume_liters: '',
  video_link: '',
  status: 'publish',
  waste_type: 'alimentares',
  tag_ids: []
}

const emptyBulkForm = {
  waste_type: 'alimentares',
  updateWasteType: true,
  tag_ids: [],
  updateTags: true
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

function TagsField({ options, value, onChange, loading, disabled, helperText }) {
  const selected = options.filter((tag) => value.includes(tag.id))

  return (
    <Autocomplete
      multiple
      options={options}
      value={selected}
      loading={loading}
      disabled={disabled}
      onChange={(_, next) => onChange(next.map((tag) => tag.id))}
      getOptionLabel={(option) => option.name || ''}
      isOptionEqualToValue={(option, optionValue) => option.id === optionValue.id}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip {...getTagProps({ index })} key={option.id} label={option.name} size="small" />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label="Tags"
          placeholder={disabled ? '' : 'Selecionar tags'}
          helperText={helperText}
        />
      )}
    />
  )
}

export default function EditorVolumeVerifications() {
  const [verifications, setVerifications] = useState([])
  const [centrals, setCentrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [centralFilter, setCentralFilter] = useState([])
  const [itemSort, setItemSort] = useState({ key: 'measurement_date', direction: 'desc' })
  const [videoModal, setVideoModal] = useState({ open: false, url: '', title: '' })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyVerificationForm)
  const [availableTags, setAvailableTags] = useState([])
  const [loadingTags, setLoadingTags] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkForm, setBulkForm] = useState(emptyBulkForm)
  const [bulkTags, setBulkTags] = useState([])
  const [loadingBulkTags, setLoadingBulkTags] = useState(false)

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
      if (column === 'measurement_date') {
        return { key: column, direction: 'desc' }
      }
      return toggleSortKey(current, column)
    })
  }

  const loadTagsForCentral = async (centralId, { keepTagIds } = {}) => {
    if (!centralId) {
      setAvailableTags([])
      return []
    }

    setLoadingTags(true)
    try {
      const tags = await adminService.listCentralTags(centralId)
      setAvailableTags(tags)
      if (keepTagIds) {
        const allowed = new Set(tags.map((tag) => tag.id))
        setForm((prev) => ({
          ...prev,
          tag_ids: prev.tag_ids.filter((id) => allowed.has(id))
        }))
      }
      return tags
    } catch (err) {
      setAvailableTags([])
      setError(getErrorMessage(err, 'Não foi possível carregar as tags da central.'))
      return []
    } finally {
      setLoadingTags(false)
    }
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [items, centralList] = await Promise.all([
        adminService.listVolumeVerifications(),
        adminService.listCentrals()
      ])
      setVerifications(items)
      setCentrals(centralList)
      setSelectedIds(new Set())
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar as verificações.'))
      setVerifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const removeVerification = (id) => {
    setVerifications((prev) => prev.filter((item) => item.id !== id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const applyVerificationUpdate = (updated) => {
    const centralName =
      centrals.find((central) => central.id === updated.central_id)?.name ||
      `Central #${updated.central_id}`

    setVerifications((prev) => {
      const next = prev.map((item) =>
        item.id === updated.id ? { ...item, ...updated, central_name: centralName } : item
      )

      if (
        centralFilter.length > 0 &&
        !centralFilter.some((central) => Number(central.id) === Number(updated.central_id))
      ) {
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

  const openEdit = async (item) => {
    setEditingId(item.id)
    setForm({
      title: item.title || '',
      central_id: String(item.central_id || ''),
      measurement_date: toInputDate(item.measurement_date),
      volume_liters: item.volume_liters != null ? String(item.volume_liters) : '',
      video_link: item.video_link || '',
      status: item.status || 'publish',
      waste_type: item.waste_type || 'alimentares',
      tag_ids: Array.isArray(item.tags) ? item.tags.map((tag) => tag.id) : []
    })
    setFormOpen(true)
    await loadTagsForCentral(item.central_id)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyVerificationForm)
    setAvailableTags([])
  }

  const handleCentralChange = async (centralId) => {
    setForm((prev) => ({ ...prev, central_id: centralId, tag_ids: [] }))
    await loadTagsForCentral(centralId)
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
        status: form.status || 'publish',
        waste_type: form.waste_type || 'alimentares',
        tag_ids: form.tag_ids
      })
      closeForm()
      applyVerificationUpdate(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar a verificação.'))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredVerifications = useMemo(() => {
    const byCentral =
      centralFilter.length === 0
        ? verifications
        : verifications.filter((item) =>
            centralFilter.some((central) => Number(central.id) === Number(item.central_id))
          )

    return filterBySearch(byCentral, search, (item) => [
      item.id,
      item.title,
      item.central_name,
      item.central_id,
      item.video_link,
      item.measurement_date,
      item.volume_liters,
      item.volume_kg,
      item.waste_type,
      formatWasteType(item.waste_type),
      ...(Array.isArray(item.tags) ? item.tags.map((tag) => tag.name) : [])
    ])
  }, [verifications, search, centralFilter])

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

  const selectedItems = useMemo(
    () => filteredVerifications.filter((item) => selectedIds.has(item.id)),
    [filteredVerifications, selectedIds]
  )

  const selectedCount = selectedItems.length

  const selectedCentralIds = useMemo(
    () => [...new Set(selectedItems.map((item) => item.central_id))],
    [selectedItems]
  )
  const bulkSameCentral = selectedCentralIds.length === 1
  const bulkCentralId = bulkSameCentral ? selectedCentralIds[0] : null

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleGroupSelected = (items) => {
    const ids = items.map((item) => item.id)
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        ids.forEach((id) => next.delete(id))
      } else {
        ids.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const openBulkEdit = async () => {
    if (!selectedCount) return

    const sharedWasteType =
      selectedItems.every((item) => (item.waste_type || 'alimentares') === (selectedItems[0].waste_type || 'alimentares'))
        ? selectedItems[0].waste_type || 'alimentares'
        : 'alimentares'

    setBulkForm({
      waste_type: sharedWasteType,
      updateWasteType: true,
      tag_ids: [],
      updateTags: bulkSameCentral
    })
    setBulkTags([])
    setBulkOpen(true)

    if (bulkCentralId) {
      setLoadingBulkTags(true)
      try {
        const tags = await adminService.listCentralTags(bulkCentralId)
        setBulkTags(tags)
        const sharedTagIds = selectedItems.reduce((acc, item, index) => {
          const ids = (item.tags || []).map((tag) => tag.id).sort((a, b) => a - b)
          if (index === 0) return ids
          if (acc.length !== ids.length || acc.some((id, i) => id !== ids[i])) return []
          return acc
        }, [])
        setBulkForm((prev) => ({ ...prev, tag_ids: sharedTagIds }))
      } catch (err) {
        setError(getErrorMessage(err, 'Não foi possível carregar as tags para edição em massa.'))
      } finally {
        setLoadingBulkTags(false)
      }
    }
  }

  const closeBulkEdit = () => {
    setBulkOpen(false)
    setBulkForm(emptyBulkForm)
    setBulkTags([])
  }

  const handleBulkSubmit = async (event) => {
    event.preventDefault()
    if (!selectedCount) return
    if (!bulkForm.updateWasteType && !bulkForm.updateTags) {
      setError('Selecione ao menos um campo para atualizar em massa.')
      return
    }
    if (bulkForm.updateTags && !bulkSameCentral) {
      setError('Para editar tags em massa, selecione verificações da mesma central.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const results = await Promise.all(
        selectedItems.map((item) => {
          const payload = {}
          if (bulkForm.updateWasteType) payload.waste_type = bulkForm.waste_type
          if (bulkForm.updateTags) payload.tag_ids = bulkForm.tag_ids
          return adminService.updateVolumeVerification(item.id, payload)
        })
      )
      results.forEach(applyVerificationUpdate)
      closeBulkEdit()
      clearSelection()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível aplicar a edição em massa.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Verificações de Volume"
        description="Histórico detalhado de medições por central, com links dos vídeos de comprovação."
      />

      {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }}>
        {!loading && verifications.length > 0 ? (
          <AdminSearchField
            value={search}
            onChange={setSearch}
            placeholder="Pesquisar por central, título, volume, categoria..."
          />
        ) : null}
        <Autocomplete
          multiple
          size="small"
          options={centrals}
          value={centralFilter}
          disableCloseOnSelect
          getOptionLabel={(option) => option.name || ''}
          isOptionEqualToValue={(option, selected) => Number(option.id) === Number(selected.id)}
          onChange={(_, selected) => setCentralFilter(selected)}
          renderTags={(selected, getTagProps) =>
            selected.map((option, index) => (
              <Chip {...getTagProps({ index })} key={option.id} label={option.name} size="small" />
            ))
          }
          renderInput={(params) => (
            <TextField {...params} label="Centrais" placeholder={centralFilter.length ? '' : 'Todas'} />
          )}
          sx={{ minWidth: { xs: '100%', md: 280 }, flex: 1, maxWidth: { md: 520 } }}
        />
      </Stack>

      {!loading && filteredVerifications.length > 0 ? (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
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
          {selectedCount > 0 ? (
            <>
              <Chip
                color="info"
                label={
                  <>
                    <BoldNumber>{selectedCount}</BoldNumber> selecionadas
                  </>
                }
              />
              <Button size="small" variant="contained" onClick={openBulkEdit}>
                Editar em massa
              </Button>
              <Button size="small" onClick={clearSelection}>
                Limpar
              </Button>
            </>
          ) : null}
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
        groupedByCentral.map((group) => {
          const groupIds = group.items.map((item) => item.id)
          const allGroupSelected = groupIds.length > 0 && groupIds.every((id) => selectedIds.has(id))
          const someGroupSelected = groupIds.some((id) => selectedIds.has(id))

          return (
            <Accordion
              key={group.centralId}
              disableGutters
              elevation={0}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}
            >
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
                        <TableCell padding="checkbox">
                          <Checkbox
                            size="small"
                            checked={allGroupSelected}
                            indeterminate={someGroupSelected && !allGroupSelected}
                            onChange={() => toggleGroupSelected(group.items)}
                            inputProps={{ 'aria-label': `Selecionar verificações de ${group.centralName}` }}
                          />
                        </TableCell>
                        <SortableTableHeadCell
                          label="Data"
                          column="measurement_date"
                          sort={itemSort}
                          onSort={handleItemSort}
                        />
                        <SortableTableHeadCell label="Título" column="title" sort={itemSort} onSort={handleItemSort} />
                        <SortableTableHeadCell
                          label="Volume"
                          column="volume_liters"
                          sort={itemSort}
                          onSort={handleItemSort}
                          align="right"
                        />
                        <SortableTableHeadCell
                          label="Peso"
                          column="volume_kg"
                          sort={itemSort}
                          onSort={handleItemSort}
                          align="right"
                        />
                        <SortableTableHeadCell
                          label="Categoria"
                          column="waste_type"
                          sort={itemSort}
                          onSort={handleItemSort}
                        />
                        <TableCell sx={{ width: 120, maxWidth: 120 }}>Tags</TableCell>
                        <TableCell>Vídeo</TableCell>
                        <TableCell align="right">Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.items.map((item) => {
                        const checked = selectedIds.has(item.id)
                        return (
                          <TableRow key={item.id} hover selected={checked}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={checked}
                                onChange={() => toggleSelected(item.id)}
                                inputProps={{ 'aria-label': `Selecionar verificação ${item.id}` }}
                              />
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
                            <TableCell>
                              <Chip
                                size="small"
                                label={formatWasteType(item.waste_type)}
                                variant="outlined"
                                color={item.waste_type === 'verdes' ? 'success' : 'default'}
                              />
                            </TableCell>
                            <TableCell sx={{ width: 120, maxWidth: 120 }}>
                              {Array.isArray(item.tags) && item.tags.length > 0 ? (
                                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                  {item.tags.map((tag) => (
                                    <Chip
                                      key={tag.id}
                                      label={tag.name}
                                      size="small"
                                      variant="outlined"
                                      sx={{
                                        maxWidth: 110,
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
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          )
        })
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
                  onChange={(e) => handleCentralChange(e.target.value)}
                >
                  {centrals.map((central) => (
                    <MenuItem key={central.id} value={String(central.id)}>
                      {central.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth required>
                <InputLabel>Categoria</InputLabel>
                <Select
                  label="Categoria"
                  value={form.waste_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, waste_type: e.target.value }))}
                >
                  {WASTE_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TagsField
                options={availableTags}
                value={form.tag_ids}
                onChange={(tagIds) => setForm((prev) => ({ ...prev, tag_ids: tagIds }))}
                loading={loadingTags}
                disabled={!form.central_id}
                helperText={!form.central_id ? 'Selecione uma central para carregar as tags.' : undefined}
              />
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

      <Dialog open={bulkOpen} onClose={() => !submitting && closeBulkEdit()} maxWidth="sm" fullWidth>
        <form onSubmit={handleBulkSubmit}>
          <DialogTitle>Editar em massa ({selectedCount})</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                As alterações serão aplicadas às verificações selecionadas.
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bulkForm.updateWasteType}
                    onChange={(e) =>
                      setBulkForm((prev) => ({ ...prev, updateWasteType: e.target.checked }))
                    }
                  />
                }
                label="Atualizar categoria"
              />
              <FormControl fullWidth disabled={!bulkForm.updateWasteType}>
                <InputLabel>Categoria</InputLabel>
                <Select
                  label="Categoria"
                  value={bulkForm.waste_type}
                  onChange={(e) => setBulkForm((prev) => ({ ...prev, waste_type: e.target.value }))}
                >
                  {WASTE_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={bulkForm.updateTags}
                    disabled={!bulkSameCentral}
                    onChange={(e) => setBulkForm((prev) => ({ ...prev, updateTags: e.target.checked }))}
                  />
                }
                label="Atualizar tags"
              />
              {!bulkSameCentral ? (
                <Alert severity="info">
                  Tags só podem ser editadas em massa quando todas as verificações selecionadas são da mesma
                  central.
                </Alert>
              ) : (
                <TagsField
                  options={bulkTags}
                  value={bulkForm.tag_ids}
                  onChange={(tagIds) => setBulkForm((prev) => ({ ...prev, tag_ids: tagIds }))}
                  loading={loadingBulkTags}
                  disabled={!bulkForm.updateTags}
                  helperText="As tags selecionadas substituirão as tags atuais."
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeBulkEdit} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Aplicando...' : 'Aplicar'}
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
            Cada verificação registra a medição de volume (litros e kg), categoria, tags associadas, a data da
            medição e o link de comprovação em vídeo, quando disponível. Use os checkboxes para editar categoria
            e tags em massa.
          </Typography>
        </Card>
      ) : null}
    </Stack>
  )
}
