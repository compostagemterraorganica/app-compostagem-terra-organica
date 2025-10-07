import { getConfig } from '../config/environment';

const WORDPRESS_CONFIG = {
  BASE_URL: getConfig('WORDPRESS_BASE_URL'),
  OAUTH_CLIENT_ID: getConfig('WORDPRESS_OAUTH_CLIENT_ID'),
  REDIRECT_URI: getConfig('WORDPRESS_OAUTH_REDIRECT_URI')
};

export const wordpressService = {
  // Gerar URL de autenticação OAuth
  generateAuthUrl() {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: WORDPRESS_CONFIG.OAUTH_CLIENT_ID,
      redirect_uri: WORDPRESS_CONFIG.REDIRECT_URI,
      scope: 'basic',
      state: 'app'
    });

    return `${WORDPRESS_CONFIG.BASE_URL}/oauth/authorize?${params.toString()}`;
  },

  // Verificar se usuário está logado
  async isUserLoggedIn() {
    try {
      const response = await fetch(`${WORDPRESS_CONFIG.REDIRECT_URI}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.success && data.user;
      }
      return false;
    } catch (error) {
      return false;
    }
  },

  // Obter lista de centrais
  async getCentrals() {
    try {
      const response = await fetch(`${WORDPRESS_CONFIG.BASE_URL}/wp-json/wp/v2/central`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const centrals = await response.json();
        return centrals.map(central => ({
          id: central.id,
          name: central.title.rendered
        }));
      }
      throw new Error('Erro ao obter centrais');
    } catch (error) {
      throw error;
    }
  },

  // Criar postagem de verificação de volume
  async createVolumeVerification(postData) {
    try {
      // Formatar data no formato YYYY-MM-DD
      let dataFormatada;
      if (postData.data instanceof Date) {
        // Se for objeto Date, converte para YYYY-MM-DD
        dataFormatada = postData.data.toISOString().split('T')[0];
      } else if (typeof postData.data === 'string') {
        // Se for string, verifica o formato
        if (postData.data.includes('-')) {
          // Formato DD-MM-YYYY ou YYYY-MM-DD
          const partes = postData.data.split('-');
          if (partes[0].length === 4) {
            // Já está em YYYY-MM-DD
            dataFormatada = postData.data;
          } else {
            // Converter DD-MM-YYYY para YYYY-MM-DD
            dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`;
          }
        } else {
          dataFormatada = postData.data;
        }
      } else {
        dataFormatada = postData.data;
      }

      const payload = {
        title: postData.title || `Verificação de Volume - ${new Date().toLocaleDateString('pt-BR')}`,
        meta: {
          central: postData.central,
          volume: postData.volume,
          data: dataFormatada,
          'link-do-video': postData.videoLink
        }
      };

      const response = await fetch(`${WORDPRESS_CONFIG.BASE_URL}/wp-json/wp/v2/verificacoes-de-volu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      }
      throw new Error('Erro ao criar postagem');
    } catch (error) {
      throw error;
    }
  },

  // Validar sessão do usuário
  async validateSession(sessionData) {
    try {
      if (!sessionData || !sessionData.session_id) {
        return false;
      }

      // Aqui você pode implementar uma validação adicional da sessão
      // Por exemplo, verificar se a sessão ainda é válida no servidor
      return true;
    } catch (error) {
      return false;
    }
  }
};
