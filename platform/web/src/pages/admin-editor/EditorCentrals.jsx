import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import TerraImage from '../../components/TerraImage'
import TerraLoader from '../../components/TerraLoader'
import PersonRemoveOutlinedIcon from '@mui/icons-material/PersonRemoveOutlined'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import AdminAddButton from '../../components/AdminAddButton'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminSearchField from '../../components/AdminSearchField'
import SortableTableHeadCell from '../../components/SortableTableHeadCell'
import PostContentEditor from '../../components/PostContentEditor'
import { EMPTY_META_FORM, formToMeta, metaToForm } from '../../lib/centralMetaForm'
import { serializePostContent, unwrapPostBody } from '../../lib/postContentHtml'
import { filterBySearch } from '../../lib/adminSearch'
import { sortItems, toggleSortKey } from '../../lib/tableSort'
import { adminService } from '../../services/adminService'

const CENTRAL_SORT_ACCESSORS = {
  name: (central) => central.name || '',
  slug: (central) => central.slug || '',
  is_active: (central) => (central.is_active ? 1 : 0)
}

const emptyCentral = {
  name: '',
  slug: '',
  is_active: true,
  meta: { ...EMPTY_META_FORM }
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getErrorMessage(err, fallback) {
  return err.response?.data?.error || err.response?.data?.message || fallback
}

export default function EditorCentrals() {
  const [centrals, setCentrals] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [usersOpen, setUsersOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyCentral)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [activeCentral, setActiveCentral] = useState(null)
  const [centralUsers, setCentralUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [usersLoading, setUsersLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })

  const filteredCentrals = useMemo(
    () =>
      filterBySearch(centrals, search, (central) => [
        central.name,
        central.slug,
        central.is_active ? 'ativa' : 'inativa'
      ]),
    [centrals, search]
  )

  const sortedCentrals = useMemo(
    () => sortItems(filteredCentrals, sort, CENTRAL_SORT_ACCESSORS),
    [filteredCentrals, sort]
  )

  const loadCentrals = async () => {
    setLoading(true)
    setError('')
    try {
      setCentrals(await adminService.listCentrals())
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar as centrais.'))
      setCentrals([])
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      setAllUsers(await adminService.listUsers())
    } catch {
      setAllUsers([])
    }
  }

  useEffect(() => {
    loadCentrals()
    loadAllUsers()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyCentral)
    setFormOpen(true)
  }

  const openEdit = (central) => {
    setEditingId(central.id)
    setForm({
      name: central.name || '',
      slug: central.slug || '',
      is_active: central.is_active !== false,
      meta: metaToForm(central.meta)
    })
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setForm(emptyCentral)
  }

  const handleNameChange = (name) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: editingId ? prev.slug : slugify(name)
    }))
  }

  const handleMetaChange = (field, value) => {
    setForm((prev) => ({ ...prev, meta: { ...prev.meta, [field]: value } }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const serializedCentralText = serializePostContent(form.meta.central_text)
      const payload = {
        name: form.name,
        slug: form.slug,
        is_active: form.is_active,
        meta: formToMeta({
          ...form.meta,
          central_text: unwrapPostBody(serializedCentralText) ? serializedCentralText : ''
        })
      }
      if (editingId) {
        await adminService.updateCentral(editingId, payload)
      } else {
        await adminService.createCentral(payload)
      }
      closeForm()
      await loadCentrals()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar a central.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    setError('')
    try {
      await adminService.deleteCentral(deleteTarget.id)
      setDeleteTarget(null)
      await loadCentrals()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível excluir a central.'))
    } finally {
      setSubmitting(false)
    }
  }

  const openUsersDialog = async (central) => {
    setActiveCentral(central)
    setUsersOpen(true)
    setSelectedUser(null)
    setUsersLoading(true)
    try {
      setCentralUsers(await adminService.listCentralUsers(central.id))
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar os usuários da central.'))
      setCentralUsers([])
    } finally {
      setUsersLoading(false)
    }
  }

  const closeUsersDialog = () => {
    setUsersOpen(false)
    setActiveCentral(null)
    setCentralUsers([])
    setSelectedUser(null)
  }

  const handleAddUser = async () => {
    if (!activeCentral || !selectedUser) return
    setUsersLoading(true)
    setError('')
    try {
      const updated = await adminService.addCentralUser(activeCentral.id, selectedUser.id)
      setCentralUsers(updated)
      setSelectedUser(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível adicionar o usuário.'))
    } finally {
      setUsersLoading(false)
    }
  }

  const handleRemoveUser = async (userId) => {
    if (!activeCentral) return
    setUsersLoading(true)
    setError('')
    try {
      const updated = await adminService.removeCentralUser(activeCentral.id, userId)
      setCentralUsers(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível remover o usuário.'))
    } finally {
      setUsersLoading(false)
    }
  }

  const availableUsers = allUsers.filter(
    (user) => !centralUsers.some((member) => member.id === user.id)
  )

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Centrais"
        description="Cadastre centrais e gerencie os usuários vinculados a cada uma."
        action={<AdminAddButton onClick={openCreate}>Nova central</AdminAddButton>}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && centrals.length > 0 ? (
        <AdminSearchField
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar por nome, slug ou status..."
        />
      ) : null}

      {loading ? (
        <TerraLoader layout="centered" label="Carregando..." />
      ) : centrals.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          Nenhuma central cadastrada.
        </Typography>
      ) : (
        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <SortableTableHeadCell label="Nome" column="name" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                  <SortableTableHeadCell label="Slug" column="slug" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                  <SortableTableHeadCell label="Status" column="is_active" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedCentrals.map((central) => (
                  <TableRow key={central.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {central.image_url ? (
                          <TerraImage
                            src={central.image_url}
                            alt={central.name}
                            width={48}
                            height={48}
                            style={{ borderRadius: 4, flexShrink: 0 }}
                          />
                        ) : null}
                        <Typography variant="body2" fontWeight={600} noWrap title={central.name}>
                          {central.name}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={central.slug || 'sem slug'} size="small" variant="outlined" color="primary" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={central.is_active !== false ? 'Ativa' : 'Inativa'}
                        size="small"
                        color={central.is_active !== false ? 'success' : 'default'}
                        variant={central.is_active !== false ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<GroupOutlinedIcon />}
                        onClick={() => openUsersDialog(central)}
                        sx={{ mr: 0.5 }}
                      >
                        Usuários
                      </Button>
                      <IconButton size="small" color="primary" onClick={() => openEdit(central)} aria-label="Editar central">
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(central)}
                        aria-label="Excluir central"
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {!loading && centrals.length > 0 && filteredCentrals.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          Nenhuma central encontrada para &quot;{search}&quot;.
        </Typography>
      ) : null}

      <Dialog open={formOpen} onClose={closeForm} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingId ? 'Editar central' : 'Nova central'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={3} sx={{ mt: 0.5 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Dados básicos
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Nome"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    fullWidth
                  />
                  <TextField
                    label="Slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    required
                    fullWidth
                    helperText="Identificador usado na URL pública"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        color="primary"
                      />
                    }
                    label={form.is_active ? 'Central ativa' : 'Central inativa'}
                  />
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Informações da central
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Data de publicação"
                    type="datetime-local"
                    value={form.meta.published}
                    onChange={(e) => handleMetaChange('published', e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Responsável"
                    value={form.meta.responsible}
                    onChange={(e) => handleMetaChange('responsible', e.target.value)}
                    fullWidth
                  />
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Texto da central
                    </Typography>
                    <PostContentEditor
                      value={form.meta.central_text}
                      onChange={(html) => handleMetaChange('central_text', html)}
                      placeholder="Escreva o conteúdo da central..."
                    />
                  </Box>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Localização
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Endereço"
                    value={form.meta.address}
                    onChange={(e) => handleMetaChange('address', e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Cidade"
                    value={form.meta.city_name}
                    onChange={(e) => handleMetaChange('city_name', e.target.value)}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Estado"
                      value={form.meta.state_name}
                      onChange={(e) => handleMetaChange('state_name', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="UF"
                      value={form.meta.state_uf}
                      onChange={(e) => handleMetaChange('state_uf', e.target.value)}
                      fullWidth
                      inputProps={{ maxLength: 2 }}
                    />
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Contato
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="E-mail"
                    type="email"
                    value={form.meta.email}
                    onChange={(e) => handleMetaChange('email', e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Telefone"
                    value={form.meta.phone}
                    onChange={(e) => handleMetaChange('phone', e.target.value)}
                    fullWidth
                  />
                </Stack>
              </Box>

              <Divider />

              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Redes sociais
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="Instagram"
                    value={form.meta.instagram}
                    onChange={(e) => handleMetaChange('instagram', e.target.value)}
                    fullWidth
                    placeholder="https://instagram.com/..."
                  />
                  <TextField
                    label="Facebook"
                    value={form.meta.facebook}
                    onChange={(e) => handleMetaChange('facebook', e.target.value)}
                    fullWidth
                    placeholder="https://facebook.com/..."
                  />
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForm}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={usersOpen} onClose={closeUsersDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Usuários da central</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {activeCentral?.name}
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2, mb: 2 }}>
            <Autocomplete
              options={availableUsers}
              value={selectedUser}
              onChange={(_, value) => setSelectedUser(value)}
              getOptionLabel={(option) => `${option.name} (${option.email || 'sem email'})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => <TextField {...params} label="Adicionar usuário" size="small" />}
              sx={{ flex: 1, minWidth: 0 }}
              disabled={usersLoading}
            />
            <AdminAddButton
              onClick={handleAddUser}
              disabled={!selectedUser || usersLoading}
              sx={{ height: 40 }}
            >
              Adicionar
            </AdminAddButton>
          </Stack>

          {usersLoading && centralUsers.length === 0 ? (
            <TerraLoader layout="centered" size="sm" label="Carregando..." />
          ) : centralUsers.length === 0 ? (
            <Typography color="text.secondary" py={2}>
              Nenhum usuário vinculado a esta central.
            </Typography>
          ) : (
            <List dense disablePadding>
              {centralUsers.map((user) => (
                <ListItem key={user.id} divider>
                  <ListItemText
                    primary={user.name}
                    secondary={user.email || '—'}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      color="error"
                      onClick={() => handleRemoveUser(user.id)}
                      disabled={usersLoading}
                      aria-label="Remover usuário"
                    >
                      <PersonRemoveOutlinedIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeUsersDialog}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Excluir central</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Verificações de volume
            vinculadas também serão removidas.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={submitting}>
            {submitting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
