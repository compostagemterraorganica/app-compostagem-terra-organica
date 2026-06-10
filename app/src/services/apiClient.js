import { getConfig } from '../config/environment';
import { cookieFetch } from './cookieClient';
import authService from './authService';

function isAbsoluteUrl(url) {
  return /^https?:\/\//i.test(url);
}

async function withTimeout(promiseFactory, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0 || typeof AbortController !== 'function') {
    return promiseFactory(undefined);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const apiClient = {
  async request(pathOrUrl, options = {}) {
    const baseUrl = getConfig('API_BASE_URL');
    const url = isAbsoluteUrl(pathOrUrl) ? pathOrUrl : `${baseUrl}${pathOrUrl}`;

    const timeoutMs =
      options.timeoutMs ??
      (url.includes('/youtube/') ? getConfig('UPLOAD_TIMEOUT') : getConfig('API_TIMEOUT'));

    const response = await withTimeout(
      (signal) =>
        cookieFetch(url, {
          ...options,
          signal: signal ?? options.signal
        }),
      timeoutMs
    );

    if (response.status === 401) {
      await authService.forceLogout('AUTH_INVALID');
      const err = new Error('Sessão inválida. Faça login novamente.');
      err.code = 'AUTH_INVALID';
      err.status = response.status;
      throw err;
    }

    return response;
  },

  async getJson(pathOrUrl, options = {}) {
    const response = await this.request(pathOrUrl, options);
    const data = await parseJsonResponse(response);

    if (!response.ok) {
      const err = new Error(
        (data && typeof data === 'object' && (data.message || data.error))
          ? data.message || data.error
          : `Erro HTTP ${response.status}`
      );
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  },

  async postJson(pathOrUrl, body, options = {}) {
    return this.getJson(pathOrUrl, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      body: JSON.stringify(body)
    });
  }
};

export default apiClient;
