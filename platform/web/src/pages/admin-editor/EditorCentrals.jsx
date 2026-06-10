import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
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
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
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
import { useEffect, useMemo, useState } from 'react'
import AdminAddButton from '../../components/AdminAddButton'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminSearchField from '../../components/AdminSearchField'
import SortableTableHeadCell from '../../components/SortableTableHeadCell'
import { filterBySearch } from '../../lib/adminSearch'
import { sortItems, toggleSortKey } from '../../lib/tableSort'
import { adminService } from '../../services/adminService'

const CENTRAL_SORT_ACCESSORS = {
  id: (central) => Number(central.id),
  name: (central) => central.name || '',
  slug: (central) => central.slug || ''
}

const emptyCentral = { name: '', slug: '' }

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
    () => filterBySearch(centrals, search, (central) => [central.id, central.name, central.slug]),
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
    setForm({ name: central.name || '', slug: central.slug || '' })
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (editingId) {
        await adminService.updateCentral(editingId, form)
      } else {
        await adminService.createCentral(form)
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
          placeholder="Pesquisar por nome, slug ou ID..."
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
                  <SortableTableHeadCell label="ID" column="id" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                  <SortableTableHeadCell label="Nome" column="name" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                  <SortableTableHeadCell label="Slug" column="slug" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedCentrals.map((central) => (
                  <TableRow key={central.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {central.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        {central.image_url ? (
                          <Box
                            component="img"
                            src={central.image_url}
                            alt={central.name}
                            loading="lazy"
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 1,
                              objectFit: 'cover',
                              bgcolor: '#e8e4df',
                              flexShrink: 0
                            }}
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

      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingId ? 'Editar central' : 'Nova central'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
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
