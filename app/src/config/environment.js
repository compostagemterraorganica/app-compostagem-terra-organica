import {
  API_BASE_URL,
  YOUTUBE_UPLOAD_URL,
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
  LOGO_URL,
  BACKGROUND_URL,
  DEBUG_MODE,
  LOG_LEVEL,
  ENABLE_CONSOLE_LOGS,
} from '@env';

import REMOTE_CONFIG from './remote-config';

const BASE_ENVIRONMENT = {
  API_BASE_URL: API_BASE_URL || 'http://192.168.0.111:3000',
  YOUTUBE_UPLOAD_URL: YOUTUBE_UPLOAD_URL || 'http://192.168.0.111:3000/youtube/upload',

  APP_NAME: APP_NAME || 'Terra Orgânica',
  APP_VERSION: APP_VERSION || '1.0.0',
  APP_ENVIRONMENT: APP_ENVIRONMENT || 'development',

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

  LOGO_URL: LOGO_URL || 'https://compostagemterraorganica.com.br/wp-content/uploads/2020/11/cropped-LOGO_CTO_HORIZ-2.png',
  BACKGROUND_URL: BACKGROUND_URL || 'https://compostagemterraorganica.com.br/wp-content/uploads/2021/01/site-principal-red.jpg',

  DEBUG_MODE: DEBUG_MODE === 'true' || true,
  LOG_LEVEL: LOG_LEVEL || 'debug',
  ENABLE_CONSOLE_LOGS: ENABLE_CONSOLE_LOGS === 'true' || true,
};

const ENVIRONMENT = Object.keys(BASE_ENVIRONMENT).reduce((acc, key) => {
  const remoteValue = REMOTE_CONFIG[key];
  acc[key] = remoteValue !== null && remoteValue !== undefined ? remoteValue : BASE_ENVIRONMENT[key];
  return acc;
}, {});

export const getConfig = (key) => {
  return ENVIRONMENT[key];
};

export const isDevelopment = () => {
  return ENVIRONMENT.APP_ENVIRONMENT === 'development';
};

export const isProduction = () => {
  return ENVIRONMENT.APP_ENVIRONMENT === 'production';
};

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
