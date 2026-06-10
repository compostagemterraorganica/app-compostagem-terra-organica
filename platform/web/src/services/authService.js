import api from '../lib/api'

export const authService = {
  me: async () => (await api.get('/auth/me')).data.user,
  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password, admin: true })
    return res.data.user
  },
  logout: async () => {
    await api.post('/auth/logout')
  }
}
