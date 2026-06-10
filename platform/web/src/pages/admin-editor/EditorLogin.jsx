import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import TerraLoader from '../../components/TerraLoader'
import { useAuth } from '../../contexts/AuthContext'

const LOGO_URL = '/images/cropped-cropped-LOGO_CTO_HORIZ.png'

export default function EditorLogin() {
  const { user, loading, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/admin/editor/pages'
  const notAdmin = location.state?.reason === 'not-admin'

  if (!loading && user?.isAdministrator) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      const status = err.response?.status
      const message =
        status === 403
          ? 'Este usuário não tem permissão para acessar o painel administrativo.'
          : err.response?.data?.message || err.response?.data?.error || 'Email ou senha inválidos.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        background: 'linear-gradient(135deg, #f6f8f7 0%, #e8f4ec 50%, #e3f0f8 100%)'
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3} component="form" onSubmit={handleSubmit}>
            <Stack alignItems="center" spacing={1}>
              <Box component="img" src={LOGO_URL} alt="Terra Orgânica" sx={{ width: 200, height: 'auto' }} />
              <Typography variant="h5" color="primary.main" fontWeight={700}>
                Painel CMS
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Faça login para editar e publicar páginas do site.
              </Typography>
            </Stack>

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              fullWidth
            />

            <TextField
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              inputProps={{ minLength: 6 }}
              fullWidth
            />

            {notAdmin ? (
              <Alert severity="warning">Sua conta não possui permissão de administrador para acessar o painel.</Alert>
            ) : null}

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              disabled={submitting || loading}
              fullWidth
            >
              {submitting ? <TerraLoader size="sm" layout="inline" /> : 'Entrar'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
