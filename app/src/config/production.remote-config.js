// Configuração para produção
// Para usar: copie este conteúdo para remote-config.js e faça eas update

const REMOTE_CONFIG = {
  // API Configuration - URLs de produção
  API_BASE_URL: 'https://api-terraorganica-production.up.railway.app',
  YOUTUBE_UPLOAD_URL: 'https://api-terraorganica-production.up.railway.app/youtube/upload',
  
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

