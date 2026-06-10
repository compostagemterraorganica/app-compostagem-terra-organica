import { Platform } from 'react-native';
import CookieManager from '@react-native-cookies/cookies';
import { getConfig } from '../config/environment';

const CSRF_COOKIE_NAME = 'terra_csrf';

function getBaseUrl() {
  return getConfig('API_BASE_URL').replace(/\/$/, '');
}

function getCookieUrl(url = getBaseUrl()) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return String(url).replace(/\/$/, '');
  }
}

function buildCookieHeader(cookies) {
  if (!cookies || typeof cookies !== 'object') return '';
  return Object.values(cookies)
    .filter((entry) => entry?.name && entry?.value !== undefined)
    .map((entry) => `${entry.name}=${entry.value}`)
    .join('; ');
}

function extractSetCookieHeaders(headers) {
  if (!headers) return [];

  if (typeof headers.getSetCookie === 'function') {
    const cookies = headers.getSetCookie();
    if (Array.isArray(cookies)) {
      return cookies.filter((value) => typeof value === 'string' && value.trim());
    }
  }

  const single = headers.get?.('set-cookie') ?? headers.get?.('Set-Cookie');
  if (typeof single === 'string' && single.trim()) {
    return [single];
  }

  return [];
}

async function flushCookiesIfNeeded() {
  if (Platform.OS === 'android' && typeof CookieManager.flush === 'function') {
    await CookieManager.flush();
  }
}

export async function persistResponseCookies(url, response) {
  try {
    if (!response?.headers || typeof CookieManager.setFromResponse !== 'function') {
      return;
    }

    const cookieUrl = getCookieUrl(url);
    const setCookieHeaders = extractSetCookieHeaders(response.headers);
    for (const cookieString of setCookieHeaders) {
      await CookieManager.setFromResponse(cookieUrl, cookieString);
    }

    await flushCookiesIfNeeded();
  } catch (error) {
    console.warn('[cookieClient] setFromResponse failed:', error?.message);
  }
}

export async function setCsrfCookie(csrfToken, url = getBaseUrl()) {
  if (!csrfToken || typeof CookieManager.set !== 'function') return;

  try {
    await CookieManager.set(getCookieUrl(url), {
      name: CSRF_COOKIE_NAME,
      value: String(csrfToken),
      path: '/'
    });
    await flushCookiesIfNeeded();
  } catch (error) {
    console.warn('[cookieClient] setCsrfCookie failed:', error?.message);
  }
}

export async function getCookieHeader(url = getBaseUrl()) {
  try {
    const cookies = await CookieManager.get(getCookieUrl(url));
    return buildCookieHeader(cookies);
  } catch {
    return '';
  }
}

export async function getCsrfToken(url = getBaseUrl()) {
  try {
    const cookies = await CookieManager.get(getCookieUrl(url));
    const entry = cookies?.[CSRF_COOKIE_NAME];
    return entry?.value || null;
  } catch {
    return null;
  }
}

export async function clearAllCookies() {
  try {
    await CookieManager.clearAll();
  } catch (error) {
    console.warn('[cookieClient] clearAll failed:', error?.message);
  }
}

export async function cookieFetch(pathOrUrl, options = {}) {
  const baseUrl = getBaseUrl();
  const cookieUrl = getCookieUrl(baseUrl);
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${baseUrl}${pathOrUrl}`;
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {})
  };

  const cookieHeader = await getCookieHeader(cookieUrl);
  if (cookieHeader && !headers.Cookie) {
    headers.Cookie = cookieHeader;
  }

  if (isMutation) {
    const csrf = await getCsrfToken(cookieUrl);
    if (csrf && !headers['x-csrf-token']) {
      headers['x-csrf-token'] = csrf;
    }
  }

  const response = await fetch(url, {
    ...options,
    method,
    headers,
    body: options.body
  });

  await persistResponseCookies(url, response);
  return response;
}

export default {
  cookieFetch,
  persistResponseCookies,
  setCsrfCookie,
  getCookieHeader,
  getCsrfToken,
  clearAllCookies
};
