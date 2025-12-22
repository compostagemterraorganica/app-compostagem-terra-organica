import AsyncStorage from '@react-native-async-storage/async-storage';

const JWT_STORAGE_KEY = 'wp_session_id';
const USER_STORAGE_KEY = 'wp_user_data';

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function base64UrlDecodeToString(input) {
  // Base64url -> base64
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad
  const pad = normalized.length % 4;
  const padded = pad ? normalized + '='.repeat(4 - pad) : normalized;
  // React Native geralmente tem atob; se não tiver, falha de forma segura
  if (typeof atob !== 'function') return null;
  return atob(padded);
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  const payloadStr = base64UrlDecodeToString(parts[1]);
  if (!payloadStr) return null;
  return safeJsonParse(payloadStr);
}

export function isJwtExpired(token, { skewSeconds = 60 } = {}) {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (!exp || typeof exp !== 'number') return false; // se não tiver exp, tratamos como "não expirado"
  const now = Math.floor(Date.now() / 1000);
  return now >= (exp - skewSeconds);
}

const listeners = new Set();

export const authService = {
  async getToken() {
    return await AsyncStorage.getItem(JWT_STORAGE_KEY);
  },

  async getUserData() {
    const raw = await AsyncStorage.getItem(USER_STORAGE_KEY);
    return raw ? safeJsonParse(raw) : null;
  },

  async clearSession() {
    await AsyncStorage.removeItem(JWT_STORAGE_KEY);
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
  },

  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  async forceLogout(reason = 'AUTH_EXPIRED') {
    await this.clearSession();
    for (const listener of listeners) {
      try {
        listener({ reason });
      } catch {
        // ignore
      }
    }
  }
};


