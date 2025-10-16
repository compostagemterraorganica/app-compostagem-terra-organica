// Configurações do ambiente
// Importar variáveis do arquivo .env
import {
  WORDPRESS_BASE_URL,
  WORDPRESS_OAUTH_CLIENT_ID,
  WORDPRESS_OAUTH_REDIRECT_URI,
  WORDPRESS_EMAIL,
  WORDPRESS_PASS,
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

// Importar configuração remota (pode ser atualizada via EAS Update)
import REMOTE_CONFIG from './remote-config';

const BASE_ENVIRONMENT = {
  // WordPress Configuration
  WORDPRESS_BASE_URL: WORDPRESS_BASE_URL || 'https://compostagemterraorganica.com.br',
  WORDPRESS_OAUTH_CLIENT_ID: WORDPRESS_OAUTH_CLIENT_ID || 'Ze32LNbEGNx13ouuoZLGupv47MBfvy7M5PsZuYgs',
  WORDPRESS_OAUTH_REDIRECT_URI: WORDPRESS_OAUTH_REDIRECT_URI || 'https://api.compostagemterraorganica.com.br/auth/callback',
  WORDPRESS_EMAIL: WORDPRESS_EMAIL || '',
  WORDPRESS_PASS: WORDPRESS_PASS || '',

  // API Configuration
  API_BASE_URL: API_BASE_URL || 'https://api.compostagemterraorganica.com.br',
  YOUTUBE_UPLOAD_URL: YOUTUBE_UPLOAD_URL || 'https://api.compostagemterraorganica.com.br/youtube/upload',

  // App Configuration
  APP_NAME: APP_NAME || 'Terra Orgânica',
  APP_VERSION: APP_VERSION || '1.0.0',
  APP_ENVIRONMENT: APP_ENVIRONMENT || 'development',

  // Deep Linking Configuration
  DEEP_LINK_SCHEME: DEEP_LINK_SCHEME || 'terraorganica',
  DEEP_LINK_HOST: DEEP_LINK_HOST || 'app',

  // Storage Configuration
  STORAGE_PREFIX: STORAGE_PREFIX || 'terra_organica_',

  // API Timeouts (em milissegundos)
  API_TIMEOUT: parseInt(API_TIMEOUT || '30000'),
  UPLOAD_TIMEOUT: parseInt(UPLOAD_TIMEOUT || '300000'),

  // Video Configuration
  MAX_VIDEO_DURATION: parseInt(MAX_VIDEO_DURATION || '300'),
  VIDEO_QUALITY: VIDEO_QUALITY || '720p',
  VIDEO_FORMAT: VIDEO_FORMAT || 'mp4',

  // Location Configuration
  LOCATION_ACCURACY: LOCATION_ACCURACY || 'high',
  LOCATION_TIMEOUT: parseInt(LOCATION_TIMEOUT || '15000'),
  LOCATION_MAX_AGE: parseInt(LOCATION_MAX_AGE || '10000'),

  // Assets Configuration
  LOGO_URL: LOGO_URL || 'https://compostagemterraorganica.com.br/wp-content/uploads/2020/11/cropped-LOGO_CTO_HORIZ-2.png',
  BACKGROUND_URL: BACKGROUND_URL || 'https://compostagemterraorganica.com.br/wp-content/uploads/2021/01/site-principal-red.jpg',

  // Development Configuration
  DEBUG_MODE: DEBUG_MODE === 'true' || true,
  LOG_LEVEL: LOG_LEVEL || 'debug',
  ENABLE_CONSOLE_LOGS: ENABLE_CONSOLE_LOGS === 'true' || true, // Habilitado por padrão para debug
};

// Merge configuração remota (valores não-null sobrescrevem BASE_ENVIRONMENT)
// Isso permite atualizar configurações via EAS Update sem novo build
const ENVIRONMENT = Object.keys(BASE_ENVIRONMENT).reduce((acc, key) => {
  const remoteValue = REMOTE_CONFIG[key];
  acc[key] = remoteValue !== null && remoteValue !== undefined ? remoteValue : BASE_ENVIRONMENT[key];
  return acc;
}, {});

// Função para obter configuração específica
export const getConfig = (key) => {
  return ENVIRONMENT[key];
};

// Função para verificar se está em desenvolvimento
export const isDevelopment = () => {
  return ENVIRONMENT.APP_ENVIRONMENT === 'development';
};

// Função para verificar se está em produção
export const isProduction = () => {
  return ENVIRONMENT.APP_ENVIRONMENT === 'production';
};

// Função para logging condicional
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

// Função para debug (só funciona em desenvolvimento)
export const debug = (message, data = null) => {
  if (ENVIRONMENT.DEBUG_MODE) {
    log('debug', `[DEBUG] ${message}`, data);
  }
};

// Função para info
export const info = (message, data = null) => {
  log('info', `[INFO] ${message}`, data);
};

// Função para warning
export const warn = (message, data = null) => {
  log('warn', `[WARN] ${message}`, data);
};

// Função para error
export const error = (message, data = null) => {
  log('error', `[ERROR] ${message}`, data);
};


export default ENVIRONMENT;
