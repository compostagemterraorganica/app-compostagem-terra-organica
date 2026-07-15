import api, { clearCsrfToken } from '../lib/api'

export const authService = {
  me: async () => (await api.get('/auth/me')).data.user,
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password, admin: true })
    return res.data.user
  },
  checkEmail: async (email) => {
    const res = await api.post('/auth/check-email', { email: email.trim() })
    return res.data
  },
  sendCode: async (email, purpose) => {
    const res = await api.post('/auth/send-code', { email: email.trim(), purpose })
    return res.data
  },
  confirmPassword: async ({ email, code, password, passwordConfirm, purpose }) => {
    const res = await api.post('/auth/confirm-password', {
      email: email.trim(),
      code: code.trim(),
      password,
      passwordConfirm,
      purpose
    })
    return res.data
  },
  logout: async () => {
    try {
      await api.post('/auth/logout', null, { skipAuthFailureHandler: true })
    } finally {
      clearCsrfToken()
    }
  }
}
