import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import TerraImage from '../../components/TerraImage'
import TerraLoader from '../../components/TerraLoader'
import { useAuth } from '../../contexts/AuthContext'
import { ADMIN_ROUTES } from '../../lib/adminRoutes'
import { authService } from '../../services/authService'

const LOGO_URL = '/images/cropped-cropped-LOGO_CTO_HORIZ.png'
const PASSWORD_POLICY_HINT =
  'A senha deve ter mais de 8 caracteres, incluir ao menos uma letra maiúscula e um caractere especial.'

const MODES = {
  LOGIN: 'login',
  SETUP_EMAIL: 'setup-email',
  SETUP_CODE: 'setup-code',
  SETUP_PASSWORD: 'setup-password'
}

export default function EditorLogin() {
  const { user, loading, login } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState(MODES.LOGIN)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname || ADMIN_ROUTES.centrals
  const notAdmin = location.state?.reason === 'not-admin'

  if (!loading && user?.isAdministrator) {
    return <Navigate to={redirectTo} replace />
  }

  const resetMessages = () => {
    setError('')
    setInfo('')
  }

  const switchToLogin = () => {
    resetMessages()
    setMode(MODES.LOGIN)
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const switchToSetup = () => {
    resetMessages()
    setMode(MODES.SETUP_EMAIL)
    setPassword('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    resetMessages()
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

  const handleSetupEmail = async (event) => {
    event.preventDefault()
    resetMessages()
    setSubmitting(true)
    try {
      const result = await authService.checkEmail(email.trim())
      if (!result.exists) {
        setError('Este email não está cadastrado.')
        return
      }
      if (!result.needsPasswordSetup) {
        setError('Este email já possui senha. Faça login ou redefina a senha.')
        return
      }
      await authService.sendCode(email.trim(), 'setup')
      setInfo('Enviamos um código de 6 dígitos para seu email.')
      setMode(MODES.SETUP_CODE)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Não foi possível verificar o email.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetupCode = async (event) => {
    event.preventDefault()
    resetMessages()
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Informe o código de 6 dígitos recebido por email.')
      return
    }
    setMode(MODES.SETUP_PASSWORD)
  }

  const handleResendCode = async () => {
    resetMessages()
    setSubmitting(true)
    try {
      await authService.sendCode(email.trim(), 'setup')
      setInfo('Código reenviado. Verifique seu email.')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Não foi possível reenviar o código.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSetupPassword = async (event) => {
    event.preventDefault()
    resetMessages()
    setSubmitting(true)
    try {
      await authService.confirmPassword({
        email: email.trim(),
        code: code.trim(),
        password: newPassword,
        passwordConfirm: confirmPassword,
        purpose: 'setup'
      })
      await login(email.trim(), newPassword)
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Não foi possível definir a senha.')
    } finally {
      setSubmitting(false)
    }
  }

  const isLogin = mode === MODES.LOGIN

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
          <Stack spacing={3}>
            <Stack alignItems="center" spacing={1}>
              <TerraImage
                src={LOGO_URL}
                alt="Terra Orgânica"
                priority
                inline
                showSkeleton={false}
                style={{ maxWidth: 200 }}
                objectFit="contain"
              />
              <Typography variant="h5" color="primary.main" fontWeight={700}>
                Painel CMS
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {isLogin
                  ? 'Faça login para editar e publicar páginas do site.'
                  : 'Defina sua senha para o primeiro acesso ao painel.'}
              </Typography>
            </Stack>

            {mode === MODES.LOGIN ? (
              <Stack spacing={3} component="form" onSubmit={handleLogin}>
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
                <Button type="submit" variant="contained" color="primary" size="large" disabled={submitting || loading} fullWidth>
                  {submitting ? <TerraLoader size="sm" layout="inline" /> : 'Entrar'}
                </Button>
                <Typography variant="body2" textAlign="center">
                  <Link component="button" type="button" onClick={switchToSetup} underline="hover">
                    Primeiro acesso
                  </Link>
                </Typography>
              </Stack>
            ) : null}

            {mode === MODES.SETUP_EMAIL ? (
              <Stack spacing={3} component="form" onSubmit={handleSetupEmail}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  fullWidth
                  helperText="Informe o email cadastrado no convite."
                />
                {error ? <Alert severity="error">{error}</Alert> : null}
                {info ? <Alert severity="info">{info}</Alert> : null}
                <Button type="submit" variant="contained" color="primary" size="large" disabled={submitting || loading} fullWidth>
                  {submitting ? <TerraLoader size="sm" layout="inline" /> : 'Enviar código'}
                </Button>
                <Typography variant="body2" textAlign="center">
                  <Link component="button" type="button" onClick={switchToLogin} underline="hover">
                    Voltar ao login
                  </Link>
                </Typography>
              </Stack>
            ) : null}

            {mode === MODES.SETUP_CODE ? (
              <Stack spacing={3} component="form" onSubmit={handleSetupCode}>
                <TextField
                  label="Código de verificação"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 6 }}
                  required
                  fullWidth
                  helperText={`Código enviado para ${email}`}
                />
                {error ? <Alert severity="error">{error}</Alert> : null}
                {info ? <Alert severity="info">{info}</Alert> : null}
                <Button type="submit" variant="contained" color="primary" size="large" disabled={submitting || loading} fullWidth>
                  Continuar
                </Button>
                <Stack direction="row" justifyContent="center" spacing={2}>
                  <Link component="button" type="button" onClick={handleResendCode} underline="hover" disabled={submitting}>
                    Reenviar código
                  </Link>
                  <Link component="button" type="button" onClick={switchToLogin} underline="hover">
                    Voltar ao login
                  </Link>
                </Stack>
              </Stack>
            ) : null}

            {mode === MODES.SETUP_PASSWORD ? (
              <Stack spacing={3} component="form" onSubmit={handleSetupPassword}>
                <TextField
                  label="Nova senha"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  fullWidth
                  helperText={PASSWORD_POLICY_HINT}
                />
                <TextField
                  label="Confirmar senha"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  fullWidth
                />
                {error ? <Alert severity="error">{error}</Alert> : null}
                <Button type="submit" variant="contained" color="primary" size="large" disabled={submitting || loading} fullWidth>
                  {submitting ? <TerraLoader size="sm" layout="inline" /> : 'Definir senha e entrar'}
                </Button>
                <Typography variant="body2" textAlign="center">
                  <Link component="button" type="button" onClick={switchToLogin} underline="hover">
                    Voltar ao login
                  </Link>
                </Typography>
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  )
}
