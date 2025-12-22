import { getConfig } from '../config/environment';
import { authService, isJwtExpired } from './authService';

function isAbsoluteUrl(url) {
  return /^https?:\/\//i.test(url);
}

async function withTimeout(promiseFactory, timeoutMs) {
  if (!timeoutMs || timeoutMs <= 0 || typeof AbortController !== 'function') {
    return await promiseFactory(undefined);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  async request(pathOrUrl, options = {}) {
    const baseUrl = getConfig('API_BASE_URL');
    const url = isAbsoluteUrl(pathOrUrl) ? pathOrUrl : `${baseUrl}${pathOrUrl}`;

    const token = await authService.getToken();

    // Pré-validação local para evitar tentar requests com token claramente expirado
    if (token && isJwtExpired(token)) {
      await authService.forceLogout('AUTH_EXPIRED');
      const err = new Error('Sessão expirada. Faça login novamente.');
      err.code = 'AUTH_EXPIRED';
      throw err;
    }

    const headers = {
      ...(options.headers || {})
    };

    // Injeta Authorization se não foi fornecido e se temos token
    if (token && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    const timeoutMs =
      options.timeoutMs ??
      (url.includes('/youtube/') ? getConfig('UPLOAD_TIMEOUT') : getConfig('API_TIMEOUT'));

    const response = await withTimeout(
      (signal) =>
        fetch(url, {
          ...options,
          headers,
          signal: signal ?? options.signal
        }),
      timeoutMs
    );

    // Auto-logout se backend indicar que token é inválido/expirou
    if (response.status === 401 || response.status === 403) {
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
    const text = await response.text();
    const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

    if (!response.ok) {
      const err = new Error(
        (data && typeof data === 'object' && (data.message || data.error)) ? (data.message || data.error) : `Erro HTTP ${response.status}`
      );
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  }
};


