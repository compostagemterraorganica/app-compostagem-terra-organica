import MailOutlinedIcon from '@mui/icons-material/MailOutlined'
import ReplyOutlinedIcon from '@mui/icons-material/ReplyOutlined'
import TerraLoader from '../../components/TerraLoader'
import AdminPageHeader from '../../components/AdminPageHeader'
import AdminSearchField from '../../components/AdminSearchField'
import { filterBySearch } from '../../lib/adminSearch'
import { formsService } from '../../services/formsService'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'

const FORM_TYPE_LABELS = {
  contato: 'Contato',
  financiador: 'Financiadores',
  'central-registration': 'Cadastro de centrais'
}

const PAGE_SLUG_LABELS = {
  'cadastro-de-centrais': 'Cadastro de Centrais'
}

const STATUS_LABELS = {
  new: { label: 'Nova', color: 'error' },
  read: { label: 'Lida', color: 'default' },
  replied: { label: 'Respondida', color: 'success' }
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function getPageLabel(submission) {
  if (submission.page_title) return submission.page_title
  if (submission.page_slug && PAGE_SLUG_LABELS[submission.page_slug]) {
    return PAGE_SLUG_LABELS[submission.page_slug]
  }
  if (submission.page_slug) return `/${submission.page_slug}`
  return '—'
}

function getErrorMessage(err, fallback) {
  return err.response?.data?.error || err.response?.data?.message || fallback
}

function buildDefaultReplySubject(submission) {
  const page = submission.page_title || submission.page_slug || 'Terra Orgânica'
  return `Re: sua mensagem — ${page}`
}

export default function EditorContactMessages() {
  const { setUnreadContactCount, refreshUnreadContactCount } = useOutletContext() || {}
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [replySubject, setReplySubject] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replySuccess, setReplySuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await formsService.listSubmissions()
      setSubmissions(data)
      const unread = data.filter((item) => item.status === 'new').length
      setUnreadContactCount?.(unread)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível carregar as mensagens.'))
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }, [setUnreadContactCount])

  useEffect(() => {
    load()
  }, [load])

  const filteredSubmissions = useMemo(
    () =>
      filterBySearch(submissions, search, (item) => [
        item.name,
        item.email,
        item.phone,
        item.message,
        item.page_slug,
        item.page_title,
        FORM_TYPE_LABELS[item.form_type]
      ]),
    [submissions, search]
  )

  const openSubmission = async (submission) => {
    setReplySuccess('')
    setError('')
    try {
      const data =
        submission.status === 'new'
          ? await formsService.markAsRead(submission.id)
          : await formsService.getSubmission(submission.id)
      setSelected(data)
      setReplySubject(buildDefaultReplySubject(data))
      setReplyMessage('')
      setSubmissions((current) =>
        current.map((item) => (item.id === data.id ? { ...item, ...data } : item))
      )
      const unread = submissions.filter((item) =>
        item.id === data.id ? data.status !== 'new' : item.status === 'new'
      ).length
      setUnreadContactCount?.(unread)
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível abrir a mensagem.'))
    }
  }

  const closeDialog = () => {
    setSelected(null)
    setReplySubject('')
    setReplyMessage('')
    setReplySuccess('')
  }

  const handleReply = async (event) => {
    event.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError('')
    setReplySuccess('')
    try {
      const data = await formsService.reply(selected.id, {
        subject: replySubject,
        message: replyMessage
      })
      setSelected(data)
      setSubmissions((current) => current.map((item) => (item.id === data.id ? data : item)))
      setReplySuccess('Resposta enviada com sucesso.')
      setUnreadContactCount?.(submissions.filter((item) => item.id !== data.id && item.status === 'new').length)
      refreshUnreadContactCount?.()
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível enviar a resposta.'))
    } finally {
      setSubmitting(false)
    }
  }

  const renderPayloadDetails = () => {
    if (!selected || selected.form_type !== 'central-registration') return null
    const payload = selected.payload_json || {}
    return (
      <Stack spacing={1} sx={{ mt: 1 }}>
        <Typography variant="body2">
          <strong>Central:</strong> {payload.centralName || '—'}
        </Typography>
        <Typography variant="body2">
          <strong>Cidade/UF:</strong> {[payload.city, payload.state].filter(Boolean).join(' / ') || '—'}
        </Typography>
      </Stack>
    )
  }

  return (
    <Stack spacing={3}>
      <AdminPageHeader
        title="Mensagens de contato"
        description="Formulários enviados pelas páginas do site. Clique em uma mensagem para ler e responder por email."
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {!loading && submissions.length > 0 ? (
        <AdminSearchField
          value={search}
          onChange={setSearch}
          placeholder="Pesquisar por nome, email, página ou mensagem..."
        />
      ) : null}

      <Card>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Nome</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Página</TableCell>
                <TableCell>Formulário</TableCell>
                <TableCell>Mensagem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <TerraLoader layout="centered" label="Carregando..." />
                  </TableCell>
                </TableRow>
              ) : submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhuma mensagem recebida ainda.
                  </TableCell>
                </TableRow>
              ) : filteredSubmissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Nenhuma mensagem encontrada para &quot;{search}&quot;.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubmissions.map((submission) => {
                  const statusMeta = STATUS_LABELS[submission.status] || STATUS_LABELS.read
                  return (
                    <TableRow
                      key={submission.id}
                      hover
                      onClick={() => openSubmission(submission)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Chip label={statusMeta.label} size="small" color={statusMeta.color} variant="outlined" />
                      </TableCell>
                      <TableCell>{formatDate(submission.submitted_at)}</TableCell>
                      <TableCell>{submission.name || '—'}</TableCell>
                      <TableCell>{submission.email || '—'}</TableCell>
                      <TableCell>{getPageLabel(submission)}</TableCell>
                      <TableCell>{FORM_TYPE_LABELS[submission.form_type] || submission.form_type}</TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" noWrap>
                          {submission.message || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog open={Boolean(selected)} onClose={closeDialog} maxWidth="md" fullWidth>
        {selected ? (
          <form onSubmit={handleReply}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <MailOutlinedIcon color="primary" />
              Mensagem de {selected.name || selected.email}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Recebida em {formatDate(selected.submitted_at)} · {getPageLabel(selected)} ·{' '}
                    {FORM_TYPE_LABELS[selected.form_type] || selected.form_type}
                  </Typography>
                  {selected.phone ? (
                    <Typography variant="body2" color="text.secondary">
                      Telefone: {selected.phone}
                    </Typography>
                  ) : null}
                  <Typography variant="body2" color="text.secondary">
                    Email: {selected.email}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Mensagem recebida
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selected.message || '—'}
                  </Typography>
                  {renderPayloadDetails()}
                </Box>

                {selected.status === 'replied' ? (
                  <Alert severity="success">
                    Respondida em {formatDate(selected.replied_at)}
                    {selected.reply_subject ? ` — assunto: ${selected.reply_subject}` : ''}
                  </Alert>
                ) : null}

                {replySuccess ? <Alert severity="success">{replySuccess}</Alert> : null}

                <Typography variant="subtitle1" fontWeight={600}>
                  Responder por email
                </Typography>
                <TextField
                  label="Assunto"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Mensagem"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  required
                  fullWidth
                  multiline
                  minRows={5}
                  placeholder="Escreva sua resposta ao visitante..."
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={closeDialog}>Fechar</Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<ReplyOutlinedIcon />}
                disabled={submitting || !replyMessage.trim()}
              >
                {submitting ? 'Enviando...' : 'Enviar resposta'}
              </Button>
            </DialogActions>
          </form>
        ) : null}
      </Dialog>
    </Stack>
  )
}
