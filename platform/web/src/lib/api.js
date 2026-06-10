import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
})

function readCookie(name) {
  const entry = document.cookie.split('; ').find((item) => item.startsWith(`${name}=`))
  return entry ? decodeURIComponent(entry.split('=')[1]) : ''
}

api.interceptors.request.use((config) => {
  const csrfToken = readCookie('terra_csrf')
  if (csrfToken) config.headers['x-csrf-token'] = csrfToken
  return config
})

export default api
