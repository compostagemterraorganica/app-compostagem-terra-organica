import {
  APP_NAME,
  APP_VERSION,
  APP_ENVIRONMENT,
  DEEP_LINK_SCHEME,
  DEEP_LINK_HOST,
  STORAGE_PREFIX,
  API_TIMEOUT,
  UPLOAD_TIMEOUT,
  MAX_VIDEO_DURATION,
  VIDEO_QUALITY,
  VIDEO_FORMAT,
  LOCATION_ACCURACY,
  LOCATION_TIMEOUT,
  LOCATION_MAX_AGE,
  DEBUG_MODE,
  LOG_LEVEL,
  ENABLE_CONSOLE_LOGS,
} from '@env';

import REMOTE_CONFIG from './remote-config';
import { getApiBaseUrl, getYoutubeUploadUrl } from './apiUrls';

const BASE_ENVIRONMENT = {
  API_BASE_URL: getApiBaseUrl(),
  YOUTUBE_UPLOAD_URL: getYoutubeUploadUrl(),

  APP_NAME: APP_NAME || 'Terra Orgânica',
  APP_VERSION: APP_VERSION || '1.0.0',
  APP_ENVIRONMENT: __DEV__ ? (APP_ENVIRONMENT || 'development') : 'production',

  DEEP_LINK_SCHEME: DEEP_LINK_SCHEME || 'terraorganica',
  DEEP_LINK_HOST: DEEP_LINK_HOST || 'app',

  STORAGE_PREFIX: STORAGE_PREFIX || 'terra_organica_',

  API_TIMEOUT: parseInt(API_TIMEOUT || '30000'),
  UPLOAD_TIMEOUT: parseInt(UPLOAD_TIMEOUT || '300000'),

  MAX_VIDEO_DURATION: parseInt(MAX_VIDEO_DURATION || '300'),
  VIDEO_QUALITY: VIDEO_QUALITY || '720p',
  VIDEO_FORMAT: VIDEO_FORMAT || 'mp4',

  LOCATION_ACCURACY: LOCATION_ACCURACY || 'high',
  LOCATION_TIMEOUT: parseInt(LOCATION_TIMEOUT || '15000'),
  LOCATION_MAX_AGE: parseInt(LOCATION_MAX_AGE || '10000'),

  DEBUG_MODE: __DEV__ && String(DEBUG_MODE) === 'true',
  LOG_LEVEL: LOG_LEVEL || (__DEV__ ? 'debug' : 'error'),
  ENABLE_CONSOLE_LOGS: __DEV__ && String(ENABLE_CONSOLE_LOGS) === 'true',
};

const ENVIRONMENT = Object.keys(BASE_ENVIRONMENT).reduce((acc, key) => {
  const remoteValue = REMOTE_CONFIG[key];
  acc[key] = remoteValue !== null && remoteValue !== undefined ? remoteValue : BASE_ENVIRONMENT[key];
  return acc;
}, {});

export const getConfig = (key) => {
  return ENVIRONMENT[key];
};

export const isDevelopment = () => __DEV__;

export const isProduction = () => !__DEV__;

export const log = (level, message, data = null) => {
  if (!ENVIRONMENT.ENABLE_CONSOLE_LOGS) return;

  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevel = levels.indexOf(ENVIRONMENT.LOG_LEVEL);
  const messageLevel = levels.indexOf(level);

  if (messageLevel >= currentLevel) {
    if (data) {
      console[level](message, data);
    } else {
      console[level](message);
    }
  }
};

export const debug = (message, data = null) => {
  if (ENVIRONMENT.DEBUG_MODE) {
    log('debug', `[DEBUG] ${message}`, data);
  }
};

export const info = (message, data = null) => {
  log('info', `[INFO] ${message}`, data);
};

export const warn = (message, data = null) => {
  log('warn', `[WARN] ${message}`, data);
};

export const error = (message, data = null) => {
  log('error', `[ERROR] ${message}`, data);
};

export default ENVIRONMENT;
