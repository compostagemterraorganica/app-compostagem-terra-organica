import AsyncStorage from '@react-native-async-storage/async-storage';
import { cookieFetch, clearAllCookies, setCsrfCookie } from './cookieClient';

const USER_STORAGE_KEY = 'terra_user_data';

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildError(response, data) {
  const message =
    (data && typeof data === 'object' && (data.message || data.error)) ||
    `Erro HTTP ${response.status}`;
  const err = new Error(message);
  err.status = response.status;
  err.data = data;
  return err;
}

async function request(path, options = {}) {
  const response = await cookieFetch(path, options);
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw buildError(response, data);
  }

  return data;
}

async function cacheUser(user) {
  if (user) {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
}

const listeners = new Set();

export const authService = {
  async getUserData() {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async forceLogout(reason = 'AUTH_EXPIRED') {
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    await clearAllCookies();
    for (const listener of listeners) {
      try {
        listener({ reason });
      } catch {
        // ignore
      }
    }
  },

  async checkEmail(email) {
    return request('/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    });
  },

  async sendCode(email, purpose) {
    return request('/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), purpose })
    });
  },

  async confirmPassword({ email, code, password, passwordConfirm, purpose }) {
    return request('/auth/confirm-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        code: code.trim(),
        password,
        passwordConfirm,
        purpose
      })
    });
  },

  async login(email, password) {
    const data = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password })
    });
    if (data?.csrfToken) {
      await setCsrfCookie(data.csrfToken);
    }
    if (data?.user) await cacheUser(data.user);
    return data;
  },

  async me() {
    const data = await request('/auth/me');
    if (data?.user) await cacheUser(data.user);
    return data?.user || null;
  },

  async logout() {
    try {
      await request('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    } catch {
      // ignore server errors on logout
    }
    await this.forceLogout('LOGOUT');
  }
};

export default authService;
