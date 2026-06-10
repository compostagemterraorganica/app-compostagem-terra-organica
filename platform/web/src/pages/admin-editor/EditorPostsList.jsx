import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import AdminAddButton from '../../components/AdminAddButton'
import AdminItemImage from '../../components/AdminItemImage'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminSearchField from '../../components/AdminSearchField'
import TerraLoader from '../../components/TerraLoader'
import { filterBySearch } from '../../lib/adminSearch'
import PostContentEditor from '../../components/PostContentEditor'
import { serializePostContent } from '../../lib/postContentHtml'
import { cmsService } from '../../services/cmsService'

const empty = { title: '', slug: '', excerpt: '', contentHtml: '', status: 'draft' }

const statusLabel = {
  draft: { label: 'Rascunho', color: 'warning' },
  published: { label: 'Publicado', color: 'success' },
  publish: { label: 'Publicado', color: 'success' }
}

export default function EditorPostsList() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(empty)
  const [editorHtml, setEditorHtml] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const filteredPosts = useMemo(
    () =>
      filterBySearch(posts, search, (post) => [
        post.id,
        post.title,
        post.slug,
        post.excerpt,
        post.status,
        statusLabel[post.status]?.label
      ]),
    [posts, search]
  )

  const load = async () => {
    setLoading(true)
    try {
      const data = await cmsService.listPosts()
      setPosts(data)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setForm(empty)
    setEditorHtml('')
    setEditingId(null)
  }

  const closeForm = () => {
    setFormOpen(false)
    resetForm()
  }

  const openCreate = () => {
    resetForm()
    setFormOpen(true)
  }

  const openEdit = (post) => {
    setEditingId(post.id)
    setForm({
      title: post.title || '',
      slug: post.slug || '',
      excerpt: post.excerpt || '',
      contentHtml: post.content_html || '',
      status: post.status === 'publish' ? 'published' : post.status || 'draft'
    })
    setEditorHtml(post.content_html || '')
    setFormOpen(true)
  }

  const save = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        contentHtml: serializePostContent(editorHtml)
      }
      if (editingId) await cmsService.updatePost(editingId, payload)
      else await cmsService.createPost(payload)
      closeForm()
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id) => {
    await cmsService.deletePost(id)
    load()
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Posts do Blog"
        description="Crie e edite artigos publicados no blog do site."
        action={<AdminAddButton onClick={openCreate}>Novo post</AdminAddButton>}
      />

      {loading ? <TerraLoader layout="centered" label="Carregando..." /> : null}

      {!loading && posts.length > 0 ? (
        <AdminSearchField
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar por título, slug, resumo ou status..."
        />
      ) : null}

      {!loading ? (
      <Grid container spacing={2}>
        {filteredPosts.map((post) => {
          const status = statusLabel[post.status] || statusLabel.draft
          return (
            <Grid key={post.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <AdminItemImage
                  src={post.thumbnail_url || post.featured_image_url}
                  alt={post.title}
                />
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {post.title}
                  </Typography>
                  <Chip label={status.label} size="small" color={status.color} />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => openEdit(post)}
                  >
                    Editar
                  </Button>
                  <IconButton size="small" color="error" onClick={() => remove(post.id)} aria-label="Excluir post">
                    <DeleteOutlinedIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>
      ) : null}

      {!loading && posts.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          Nenhum post cadastrado ainda.
        </Typography>
      ) : !loading && filteredPosts.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          Nenhum post encontrado para &quot;{search}&quot;.
        </Typography>
      ) : null}

      <Dialog open={formOpen} onClose={closeForm} maxWidth="md" fullWidth scroll="paper">
        <form onSubmit={save}>
          <DialogTitle>{editingId ? 'Editar post' : 'Novo post'}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                label="Título"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="Resumo (excerpt)"
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                fullWidth
                multiline
                rows={2}
              />
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.secondary" gutterBottom>
                  Conteúdo
                </Typography>
                <PostContentEditor value={form.contentHtml} onChange={setEditorHtml} />
              </Box>
              <FormControl size="small" sx={{ maxWidth: 200 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <MenuItem value="draft">Rascunho</MenuItem>
                  <MenuItem value="published">Publicado</MenuItem>
                </Select>
              </FormControl>
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
    </Stack>
  )
}
