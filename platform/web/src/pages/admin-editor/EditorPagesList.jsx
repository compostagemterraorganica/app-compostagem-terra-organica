import AddIcon from '@mui/icons-material/Add'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminItemImage from '../../components/AdminItemImage'
import TerraLoader from '../../components/TerraLoader'
import { cmsService } from '../../services/cmsService'

export default function EditorPagesList() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [newPage, setNewPage] = useState({ title: '', slug: '' })

  const load = async () => {
    setLoading(true)
    try {
      const data = await cmsService.listPages()
      setPages(data)
    } catch {
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const create = async (event) => {
    event.preventDefault()
    await cmsService.createPage(newPage)
    setNewPage({ title: '', slug: '' })
    load()
  }

  const remove = async (id) => {
    await cmsService.deletePage(id)
    load()
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Páginas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gerencie as páginas do site e abra o editor visual para cada uma.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} gutterBottom>
            Nova página
          </Typography>
          <Stack
            component="form"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            onSubmit={create}
            alignItems={{ sm: 'flex-start' }}
          >
            <TextField
              placeholder="Título"
              value={newPage.title}
              onChange={(e) => setNewPage({ ...newPage, title: e.target.value })}
              required
              sx={{ flex: 1 }}
            />
            <TextField
              placeholder="slug-da-pagina"
              value={newPage.slug}
              onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })}
              required
              sx={{ flex: 1 }}
            />
            <Button type="submit" variant="contained" color="secondary" startIcon={<AddIcon />}>
              Criar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {loading ? <TerraLoader layout="centered" label="Carregando..." /> : null}

      {!loading ? (
      <Grid container spacing={2}>
        {pages.map((page) => (
          <Grid key={page.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <AdminItemImage src={page.thumbnail_url} alt={page.title} />
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" gutterBottom noWrap>
                  {page.title}
                </Typography>
                <Chip label={`/${page.slug}`} size="small" variant="outlined" color="primary" />
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  component={Link}
                  to={`/admin/editor/pages/${page.id}/edit`}
                  size="small"
                  variant="contained"
                  color="primary"
                  startIcon={<EditOutlinedIcon />}
                >
                  Editar
                </Button>
                <IconButton size="small" color="error" onClick={() => remove(page.id)} aria-label="Excluir página">
                  <DeleteOutlinedIcon />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      ) : null}

      {!loading && pages.length === 0 ? (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
          Nenhuma página cadastrada ainda.
        </Typography>
      ) : null}
    </Stack>
  )
}
