// Configurações do ambiente
// Em produção, essas variáveis devem vir do .env

const ENVIRONMENT = {
  // WordPress Configuration
  WORDPRESS_BASE_URL: process.env.WORDPRESS_BASE_URL || 'https://compostagemterraorganica.com.br',
  WORDPRESS_OAUTH_CLIENT_ID: process.env.WORDPRESS_OAUTH_CLIENT_ID || 'Ze32LNbEGNx13ouuoZLGupv47MBfvy7M5PsZuYgs',
  WORDPRESS_OAUTH_REDIRECT_URI: process.env.WORDPRESS_OAUTH_REDIRECT_URI || 'https://stallion-hot-weasel.ngrok-free.app/auth/callback',

  // API Configuration
  API_BASE_URL: process.env.API_BASE_URL || 'https://stallion-hot-weasel.ngrok-free.app',
  YOUTUBE_UPLOAD_URL: process.env.YOUTUBE_UPLOAD_URL || 'https://stallion-hot-weasel.ngrok-free.app/youtube/upload',

  // App Configuration
  APP_NAME: process.env.APP_NAME || 'Terra Orgânica',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  APP_ENVIRONMENT: process.env.APP_ENVIRONMENT || 'development',

  // Deep Linking Configuration
  DEEP_LINK_SCHEME: process.env.DEEP_LINK_SCHEME || 'terraorganica',
  DEEP_LINK_HOST: process.env.DEEP_LINK_HOST || 'app',

  // Storage Configuration
  STORAGE_PREFIX: process.env.STORAGE_PREFIX || 'terra_organica_',

  // API Timeouts (em milissegundos)
  API_TIMEOUT: parseInt(process.env.API_TIMEOUT) || 30000,
  UPLOAD_TIMEOUT: parseInt(process.env.UPLOAD_TIMEOUT) || 300000,

  // Video Configuration
  MAX_VIDEO_DURATION: parseInt(process.env.MAX_VIDEO_DURATION) || 300,
  VIDEO_QUALITY: process.env.VIDEO_QUALITY || '720p',
  VIDEO_FORMAT: process.env.VIDEO_FORMAT || 'mp4',

  // Location Configuration
  LOCATION_ACCURACY: process.env.LOCATION_ACCURACY || 'high',
  LOCATION_TIMEOUT: parseInt(process.env.LOCATION_TIMEOUT) || 15000,
  LOCATION_MAX_AGE: parseInt(process.env.LOCATION_MAX_AGE) || 10000,

  // Assets Configuration
  LOGO_URL: process.env.LOGO_URL || 'https://compostagemterraorganica.com.br/wp-content/uploads/2020/11/cropped-LOGO_CTO_HORIZ-2.png',
  BACKGROUND_URL: process.env.BACKGROUND_URL || 'https://compostagemterraorganica.com.br/wp-content/uploads/2021/01/site-principal-red.jpg',

  // Development Configuration
  DEBUG_MODE: process.env.DEBUG_MODE === 'true' || true,
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  ENABLE_CONSOLE_LOGS: process.env.ENABLE_CONSOLE_LOGS === 'true' || false,
};

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
