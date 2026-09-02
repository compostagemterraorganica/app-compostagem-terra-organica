import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true
})

const CSRF_STORAGE_KEY = 'terra_csrf_token'
const SESSION_STORAGE_KEY = 'terra_session_token'

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/check-email',
  '/auth/send-code',
  '/auth/confirm-password'
]

function readStoredValue(key) {
  try {
    const fromLocal = localStorage.getItem(key)
    if (fromLocal) return fromLocal
    const legacy = sessionStorage.getItem(key)
    if (legacy) {
      localStorage.setItem(key, legacy)
      sessionStorage.removeItem(key)
      return legacy
    }
    return null
  } catch {
    return null
  }
}

function persistValue(key, value) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // localStorage indisponivel (modo privado, etc.)
  }
}

let csrfTokenMemory = readStoredValue(CSRF_STORAGE_KEY)
let sessionTokenMemory = readStoredValue(SESSION_STORAGE_KEY)
let authFailureHandler = null

function storeCsrfToken(token) {
  csrfTokenMemory = token || null
  persistValue(CSRF_STORAGE_KEY, csrfTokenMemory)
}

function storeSessionToken(token) {
  sessionTokenMemory = token || null
  persistValue(SESSION_STORAGE_KEY, sessionTokenMemory)
}

export function clearCsrfToken() {
  storeCsrfToken(null)
  storeSessionToken(null)
}

export function registerAuthFailureHandler(handler) {
  authFailureHandler = handler
}

function resolveCsrfToken() {
  return csrfTokenMemory || readStoredValue(CSRF_STORAGE_KEY)
}

function resolveSessionToken() {
  return sessionTokenMemory || readStoredValue(SESSION_STORAGE_KEY)
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
  const sessionToken = resolveSessionToken()
  if (csrfToken) config.headers['x-csrf-token'] = csrfToken
  if (sessionToken) config.headers.Authorization = `Bearer ${sessionToken}`
  return config
})

api.interceptors.response.use(
  (response) => {
    const csrfToken = response.data?.csrfToken
    const sessionToken = response.data?.sessionToken
    if (csrfToken) storeCsrfToken(csrfToken)
    if (sessionToken) storeSessionToken(sessionToken)
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
