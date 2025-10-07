// Configuração da API Backend
export const API_CONFIG = {
  // Para testar no emulador Android use: http://10.0.2.2:3000
  // Para testar no dispositivo físico, substitua pelo IP da sua máquina
  // Exemplo: http://192.168.1.100:3000
  baseURL: 'http://localhost:3000',
  
  endpoints: {
    health: '/health',
    wordpress: {
      callback: '/auth/callback',
      me: '/me',
      logout: '/logout',
    },
    youtube: {
      authUrl: '/youtube/setup/auth-url',
      exchangeCode: '/youtube/setup/exchange-code',
      upload: '/youtube/upload',
    },
  },
};

export default API_CONFIG;

