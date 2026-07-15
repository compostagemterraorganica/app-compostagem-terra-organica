import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../config/apiUrls';

const SESSION_TOKEN_KEY = 'terra_session_token';
const CSRF_TOKEN_KEY = 'terra_csrf_token';

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const MAX_MUTATION_ATTEMPTS = 3;
const NETWORK_ERROR = 'Network request failed';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readXhrBody(xhr) {
  if (typeof xhr.responseText === 'string' && xhr.responseText.length > 0) {
    return xhr.responseText;
  }
  if (typeof xhr.response === 'string' && xhr.response.length > 0) {
    return xhr.response;
  }
  return xhr.responseText ?? xhr.response ?? '';
}

function buildResponse(xhr, statusOverride, responseTextOverride) {
  const responseText = responseTextOverride ?? readXhrBody(xhr);
  const status = statusOverride ?? xhr.status;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get(name) {
        return xhr.getResponseHeader(name);
      }
    },
    text: async () => responseText,
    json: async () => {
      if (!responseText) return null;
      return JSON.parse(responseText);
    }
  };
}

function parseJsonBody(responseText) {
  if (!responseText) return null;
  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}

function isCompleteSuccessBody(responseText) {
  const parsed = parseJsonBody(responseText);
  if (!parsed || parsed.success !== true) return false;
  return Object.keys(parsed).length >= 2;
}

function finishXhr(xhr, resolve, reject, emptyBodyRetries = 0) {
  const status = xhr.status;
  const responseText = readXhrBody(xhr);

  // Android: onload pode disparar com status 200 e corpo ainda vazio
  if (status >= 200 && status < 300 && !responseText && emptyBodyRetries < 4) {
    setTimeout(() => finishXhr(xhr, resolve, reject, emptyBodyRetries + 1), 50);
    return;
  }

  if (status >= 200 && status < 300) {
    resolve(buildResponse(xhr, undefined, responseText));
    return;
  }

  if (isCompleteSuccessBody(responseText)) {
    resolve(buildResponse(xhr, status || 200, responseText));
    return;
  }

  if (status === 0 && !responseText) {
    reject(new TypeError(NETWORK_ERROR));
    return;
  }

  resolve(buildResponse(xhr, undefined, responseText));
}

function xhrRequest(url, { method, headers, body, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = 'text';

    Object.entries(headers || {}).forEach(([key, value]) => {
      if (value != null) xhr.setRequestHeader(key, value);
    });

    const onAbort = () => {
      xhr.abort();
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    const done = () => {
      signal?.removeEventListener('abort', onAbort);
      finishXhr(xhr, resolve, reject);
    };

    xhr.onload = done;
    xhr.onerror = done;

    xhr.onabort = () => {
      signal?.removeEventListener('abort', onAbort);
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    };

    xhr.send(body ?? null);
  });
}

function fetchRequest(url, { method, headers, body, signal }) {
  const init = { method, headers };
  if (body !== undefined) init.body = body;
  if (signal) init.signal = signal;
  return fetch(url, init);
}

function isNetworkError(error) {
  const message = String(error?.message || error || '');
  return message.includes(NETWORK_ERROR) || error?.name === 'AbortError';
}

async function performRequest(url, init, isMutation) {
  const transports = [];

  if (Platform.OS === 'android' && isMutation) {
    transports.push(() => fetchRequest(url, init));
    transports.push(() => xhrRequest(url, init));
  } else if (isMutation) {
    transports.push(() => xhrRequest(url, init));
    transports.push(() => fetchRequest(url, init));
  } else {
    transports.push(() => fetchRequest(url, init));
    transports.push(() => xhrRequest(url, init));
  }

  const attempts = isMutation ? MAX_MUTATION_ATTEMPTS : 1;
  let lastError;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      await sleep(350 * attempt);
    }

    for (const transport of transports) {
      try {
        const response = await transport();
        if (response.status === 0) {
          throw new TypeError(NETWORK_ERROR);
        }
        return response;
      } catch (error) {
        lastError = error;
        if (!isNetworkError(error)) {
          throw error;
        }
      }
    }
  }

  throw lastError;
}

export async function saveAuthTokens({ sessionToken, csrfToken }) {
  if (sessionToken) {
    await AsyncStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  }
  if (csrfToken) {
    await AsyncStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
  }
}

export async function clearAuthTokens() {
  await AsyncStorage.multiRemove([SESSION_TOKEN_KEY, CSRF_TOKEN_KEY]);
}

export async function apiFetch(pathOrUrl, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${baseUrl}${pathOrUrl}`;
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = MUTATION_METHODS.has(method);
  const useAuth = options.auth !== false;

  const headers = {
    Accept: 'application/json',
    Connection: 'close',
    ...(options.headers || {})
  };

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (
    options.body != null &&
    isMutation &&
    !isFormData &&
    !headers['Content-Type'] &&
    !headers['content-type']
  ) {
    headers['Content-Type'] = 'application/json';
  }

  if (useAuth) {
    const sessionToken = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) {
      headers.Authorization = `Bearer ${sessionToken}`;
    }

    if (isMutation) {
      const csrfToken = await AsyncStorage.getItem(CSRF_TOKEN_KEY);
      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }
    }
  }

  if (__DEV__) {
    console.log(`[api] ${method} ${url}`);
  }

  const init = {
    method,
    headers,
    body: options.body,
    signal: options.signal
  };

  try {
    return await performRequest(url, init, isMutation);
  } catch (error) {
    if (__DEV__) {
      console.error(`[api] erro ${method} ${url}`, error?.message || error);
    }
    throw error;
  }
}

export { isNetworkError };
export default apiFetch;
