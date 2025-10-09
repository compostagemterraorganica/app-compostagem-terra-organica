// Configuração remota que pode ser atualizada via EAS Update
// Estas configurações sobrescrevem as do environment.js quando definidas

const REMOTE_CONFIG = {
  // API Configuration - pode ser alterado via OTA update
  API_BASE_URL: null, // null = usa o valor padrão do environment.js
  YOUTUBE_UPLOAD_URL: null,
  
  // WordPress Configuration
  WORDPRESS_BASE_URL: null,
  WORDPRESS_OAUTH_CLIENT_ID: null,
  WORDPRESS_OAUTH_REDIRECT_URI: null,
  
  // Features toggles - pode ser alterado via OTA update
  ENABLE_DEBUG: null,
  ENABLE_ANALYTICS: null,
  
  // Configurações de vídeo
  MAX_VIDEO_DURATION: null,
  VIDEO_QUALITY: null,
  
  // Timeouts
  API_TIMEOUT: null,
  UPLOAD_TIMEOUT: null,
};

export default REMOTE_CONFIG;

