import AsyncStorage from '@react-native-async-storage/async-storage';
import apiFetch, { saveAuthTokens, clearAuthTokens } from './apiFetch';
import { getApiBaseUrl } from '../config/apiUrls';

const USER_STORAGE_KEY = 'terra_user_data';
const LAST_LOGIN_EMAIL_KEY = 'terra_last_login_email';

const publicPost = (body) => ({
  method: 'POST',
  auth: false,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
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
  let response;
  try {
    response = await apiFetch(path, options);
  } catch (error) {
    throw new Error(error?.message || 'Network request failed');
  }

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw buildError(response, data);
  }

  return data;
}

async function publicPostDirect(path, body) {
  const url = `${getApiBaseUrl()}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Connection: 'close'
    },
    body: JSON.stringify(body)
  });

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

async function rememberLoginEmail(email) {
  const trimmed = String(email || '').trim();
  if (trimmed) {
    await AsyncStorage.setItem(LAST_LOGIN_EMAIL_KEY, trimmed);
  }
}

async function getRememberedLoginEmail() {
  const value = await AsyncStorage.getItem(LAST_LOGIN_EMAIL_KEY);
  return value ? value.trim() : null;
}

function isSameEmail(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function isValidCheckEmailResponse(data) {
  return Boolean(data && typeof data === 'object' && typeof data.exists === 'boolean');
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
    await clearAuthTokens();
    for (const listener of listeners) {
      try {
        listener({ reason });
      } catch {
        // ignore
      }
    }
  },

  async checkEmail(email) {
    const trimmed = email.trim();
    const payload = { email: trimmed };
    let lastError;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const viaApiFetch = await request('/auth/check-email', publicPost(payload));
        if (isValidCheckEmailResponse(viaApiFetch)) {
          return viaApiFetch;
        }
      } catch (error) {
        lastError = error;
      }

      try {
        const viaFetch = await publicPostDirect('/auth/check-email', payload);
        if (isValidCheckEmailResponse(viaFetch)) {
          return viaFetch;
        }
      } catch (error) {
        lastError = error;
      }

      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }

    const rememberedEmail = await getRememberedLoginEmail();
    if (rememberedEmail && isSameEmail(rememberedEmail, trimmed)) {
      return { exists: true, needsPasswordSetup: false };
    }

    throw lastError || new Error('Não foi possível verificar o email. Tente novamente.');
  },

  async sendCode(email, purpose) {
    return request('/auth/send-code', publicPost({
      email: email.trim(),
      purpose
    }));
  },

  async confirmPassword({ email, code, password, passwordConfirm, purpose }) {
    return request('/auth/confirm-password', publicPost({
      email: email.trim(),
      code: code.trim(),
      password,
      passwordConfirm,
      purpose
    }));
  },

  async login(email, password) {
    const trimmed = email.trim();
    const data = await request('/auth/login', publicPost({
      email: trimmed,
      password
    }));

    await saveAuthTokens({
      sessionToken: data?.sessionToken,
      csrfToken: data?.csrfToken
    });

    if (data?.user) {
      await cacheUser(data.user);
      await rememberLoginEmail(data.user.email || trimmed);
    }

    return data;
  },

  async me() {
    const sessionToken = await AsyncStorage.getItem('terra_session_token');
    if (!sessionToken) return null;

    const data = await request('/auth/me');

    if (data?.csrfToken) {
      await saveAuthTokens({ csrfToken: data.csrfToken });
    }

    if (data?.user) {
      await cacheUser(data.user);
      await rememberLoginEmail(data.user.email);
    }

    return data?.user || null;
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // ignore server errors on logout
    }
    await this.forceLogout('LOGOUT');
  }
};

export default authService;
