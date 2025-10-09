// Configuração para produção
// Para usar: copie este conteúdo para remote-config.js e faça eas update

const REMOTE_CONFIG = {
  // API Configuration - URLs de produção
  API_BASE_URL: 'https://api.terraorganica.com.br', // Altere para sua URL de produção
  YOUTUBE_UPLOAD_URL: 'https://api.terraorganica.com.br/youtube/upload',
  
  // WordPress Configuration - URLs de produção
  WORDPRESS_BASE_URL: 'https://compostagemterraorganica.com.br',
  WORDPRESS_OAUTH_CLIENT_ID: 'seu-client-id-producao', // Altere
  WORDPRESS_OAUTH_REDIRECT_URI: 'https://api.terraorganica.com.br/auth/callback',
  
  // Features toggles
  ENABLE_DEBUG: false,
  ENABLE_ANALYTICS: true,
  
  // Configurações de vídeo
  MAX_VIDEO_DURATION: 300, // 5 minutos
  VIDEO_QUALITY: '720p',
  
  // Timeouts
  API_TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 300000,
};

export default REMOTE_CONFIG;

