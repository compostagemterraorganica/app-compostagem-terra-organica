import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined'
import TerraLoader from '../../components/TerraLoader'
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

const USER_SORT_ACCESSORS = {
  name: (user) => user.name || '',
  email: (user) => user.email || '',
  centrals: (user) => (user.centrals || []).map((central) => central.name).join(', ')
}

const emptyForm = { name: '', email: '', description: '' }

function getErrorMessage(err, fallback) {
  return err.response?.data?.error || err.response?.data?.message || fallback
}

export default function EditorUsers() {
  const [users, setUsers] = useState([])
  const [centrals, setCentrals] = useState([])
  const [selectedCentrals, setSelectedCentrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [isAdministrator, setIsAdministrator] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ key: 'name', direction: 'asc' })

  const filteredUsers = useMemo(
    () =>
      filterBySearch(users, search, (user) => [
        user.id,
        user.name,
        user.email,
        user.description,
        ...(user.centrals || []).map((central) => central.name)
      ]),
    [users, search]
  )

  const sortedUsers = useMemo(
    () => sortItems(filteredUsers, sort, USER_SORT_ACCESSORS),
    [filteredUsers, sort]
  )

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [userList, centralList] = await Promise.all([
        adminService.listUsers(),
        adminService.listCentrals()
      ])
      setUsers(userList)
      setCentrals(centralList)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar os usuários.'))
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setSelectedCentrals([])
    setIsAdministrator(false)
    setNewPassword('')
    setDialogOpen(true)
  }

  const openEdit = (user) => {
    setEditingId(user.id)
    setForm({
      name: user.name || '',
      email: user.email || '',
      description: user.description || ''
    })
    setIsAdministrator(Boolean(user.isAdministrator))
    setSelectedCentrals([])
    setNewPassword('')
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setSelectedCentrals([])
    setIsAdministrator(false)
    setNewPassword('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      if (editingId) {
        await adminService.updateUser(editingId, {
          name: form.name,
          email: form.email,
          description: form.description || undefined,
          isAdministrator
        })
        if (newPassword.trim()) {
          await adminService.updateUserPassword(editingId, newPassword)
        }
      } else {
        await adminService.createUser({
          name: form.name,
          email: form.email,
          description: form.description || undefined,
          isAdministrator,
          centralIds: selectedCentrals.map((central) => Number(central.id))
        })
      }
      closeDialog()
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível salvar o usuário.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    setError('')
    try {
      await adminService.deleteUser(deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível excluir o usuário.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Usuários"
        description="Cadastre usuários e envie convite por email para primeiro acesso no app."
        action={<AdminAddButton onClick={openCreate}>Novo usuário</AdminAddButton>}
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && users.length > 0 ? (
        <AdminSearchField
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar por nome, email ou central..."
        />
      ) : null}

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <SortableTableHeadCell label="Nome" column="name" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                <SortableTableHeadCell label="Email" column="email" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                <SortableTableHeadCell label="Centrais" column="centrals" sort={sort} onSort={(column) => setSort((current) => toggleSortKey(current, column))} />
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <TerraLoader layout="centered" label="Carregando..." />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Nenhum usuário encontrado para &quot;{search}&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                sortedUsers.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      {Array.isArray(user.centrals) && user.centrals.length > 0 ? (
                        <Stack direction="column" spacing={0.5} alignItems="flex-start">
                          {user.centrals.map((central) => (
                            <Chip
                              key={central.id}
                              label={central.name}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" color="primary" onClick={() => openEdit(user)} aria-label="Editar usuário">
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteTarget(user)}
                        aria-label="Excluir usuário"
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{editingId ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              {!editingId ? (
                <Alert severity="info">
                  {isAdministrator
                    ? 'O usuário receberá um email de convite para acessar o painel administrativo, com instruções para definir a senha no primeiro acesso.'
                    : 'O usuário receberá um email de convite com as centrais selecionadas e instruções para baixar o app, informar o email cadastrado e definir a senha no primeiro acesso.'}
                </Alert>
              ) : null}
              <Stack direction="row" spacing={2} alignItems="flex-end">
                <TextField
                  label="Nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  fullWidth
                  sx={{ flex: 1, minWidth: 0 }}
                />
                <Box
                  component="button"
                  type="button"
                  onClick={() => setIsAdministrator((current) => !current)}
                  aria-label={isAdministrator ? 'Remover permissão de administrador' : 'Conceder permissão de administrador'}
                  aria-pressed={isAdministrator}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexShrink: 0,
                    mb: '2px',
                    p: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: isAdministrator ? '#D4AF37' : 'text.secondary',
                    '&:hover': {
                      color: isAdministrator ? '#c9a030' : 'text.primary'
                    }
                  }}
                >
                  {isAdministrator ? (
                    <VpnKeyIcon sx={{ fontSize: 28 }} />
                  ) : (
                    <VpnKeyOutlinedIcon sx={{ fontSize: 28 }} />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isAdministrator ? 600 : 400,
                      whiteSpace: 'nowrap',
                      textAlign: 'left'
                    }}
                  >
                    {isAdministrator ? 'Excluir acesso de admin' : 'Permitir acesso de admin'}
                  </Typography>
                </Box>
              </Stack>
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Descrição"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
              {!editingId ? (
                <Autocomplete
                  multiple
                  options={centrals}
                  value={selectedCentrals}
                  onChange={(_, value) => setSelectedCentrals(value)}
                  getOptionLabel={(option) => option.name || `Central #${option.id}`}
                  isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.name || `Central #${option.id}`}
                        size="small"
                      />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Centrais"
                      placeholder="Selecione uma ou mais centrais"
                      helperText="As centrais escolhidas aparecerão no email de convite."
                    />
                  )}
                />
              ) : null}
              {editingId ? (
                <TextField
                  label="Nova senha (opcional)"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                  inputProps={{ minLength: 6 }}
                  helperText="Deixe em branco para manter a senha atual"
                />
              ) : null}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" variant="contained" color="primary" disabled={submitting}>
              {submitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar e enviar convite'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Excluir usuário</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
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
