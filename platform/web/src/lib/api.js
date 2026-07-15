import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
})

const CSRF_STORAGE_KEY = 'terra_csrf_token'

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/check-email',
  '/auth/send-code',
  '/auth/confirm-password'
]

function readStoredCsrfToken() {
  try {
    const fromLocal = localStorage.getItem(CSRF_STORAGE_KEY)
    if (fromLocal) return fromLocal
    const legacy = sessionStorage.getItem(CSRF_STORAGE_KEY)
    if (legacy) {
      localStorage.setItem(CSRF_STORAGE_KEY, legacy)
      sessionStorage.removeItem(CSRF_STORAGE_KEY)
      return legacy
    }
    return null
  } catch {
    return null
  }
}

let csrfTokenMemory = readStoredCsrfToken()
let authFailureHandler = null

function storeCsrfToken(token) {
  csrfTokenMemory = token || null
  try {
    if (token) localStorage.setItem(CSRF_STORAGE_KEY, token)
    else localStorage.removeItem(CSRF_STORAGE_KEY)
  } catch {
    // localStorage indisponivel (modo privado, etc.)
  }
}

export function clearCsrfToken() {
  storeCsrfToken(null)
}

export function registerAuthFailureHandler(handler) {
  authFailureHandler = handler
}

function resolveCsrfToken() {
  return csrfTokenMemory || readStoredCsrfToken()
}

function isPublicAuthRequest(url = '') {
  return PUBLIC_AUTH_PATHS.some((path) => url.includes(path))
}

function isAuthFailure(error) {
  const status = error.response?.status
  if (status === 401) return true
  if (status !== 403) return false
  const message = String(error.response?.data?.message || error.response?.data?.error || '')
  return /csrf|sessao/i.test(message)
}

api.interceptors.request.use((config) => {
  const csrfToken = resolveCsrfToken()
  if (csrfToken) config.headers['x-csrf-token'] = csrfToken
  return config
})

api.interceptors.response.use(
  (response) => {
    const token = response.data?.csrfToken
    if (token) storeCsrfToken(token)
    return response
  },
  (error) => {
    const url = error.config?.url || ''
    if (
      !error.config?.skipAuthFailureHandler &&
      !isPublicAuthRequest(url) &&
      isAuthFailure(error) &&
      authFailureHandler
    ) {
      clearCsrfToken()
      authFailureHandler(error)
    }
    return Promise.reject(error)
  }
)

export default api
