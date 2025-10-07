import * as Linking from 'expo-linking';
import { storageService } from '../services/storageService';
import { getConfig } from '../config/environment';

export const deepLinkingService = {
  // Configurar deep linking
  configureDeepLinking() {
    const prefix = Linking.createURL('/');
    
    // Escutar URLs que chegam ao app
    const subscription = Linking.addEventListener('url', this.handleDeepLink);
    
    // Verificar se o app foi aberto por uma URL
    this.getInitialURL();
    
    return subscription;
  },

  // Obter URL inicial (quando app é aberto por deep link)
  async getInitialURL() {
    try {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        this.handleDeepLink({ url: initialUrl });
      }
    } catch (error) {
      console.error('Erro ao obter URL inicial:', error);
    }
  },

  // Processar deep link recebido
  async handleDeepLink({ url }) {
    try {
      console.log('Deep link recebido:', url);
      
      // Parse da URL
      const parsedUrl = Linking.parse(url);
      
      // Verificar se é callback de autenticação OAuth
      if (parsedUrl.queryParams && parsedUrl.queryParams.code) {
        await this.handleOAuthCallback(parsedUrl.queryParams);
      }
      
      // Verificar se é callback do WordPress
      if (url.includes('auth/callback') || parsedUrl.queryParams.state === 'app') {
        await this.handleWordPressCallback(url);
      }
      
    } catch (error) {
      console.error('Erro ao processar deep link:', error);
    }
  },

  // Processar callback OAuth do WordPress
  async handleWordPressCallback(url) {
    try {
      // Extrair parâmetros da URL
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      
      if (code && state === 'app') {
        // Fazer requisição para obter dados da sessão
        const sessionData = await this.exchangeCodeForSession(code);
        
        if (sessionData) {
          // Salvar sessão no storage
          await storageService.saveUserSession(sessionData);
          
          // Emitir evento de login bem-sucedido
          this.emitLoginSuccess(sessionData);
        }
      }
    } catch (error) {
      console.error('Erro no callback OAuth:', error);
      this.emitLoginError(error);
    }
  },

  // Trocar código OAuth por dados da sessão
  async exchangeCodeForSession(code) {
    try {
      // Fazer requisição para o endpoint de callback
      const response = await fetch(`${getConfig('API_BASE_URL')}/auth/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state: 'app' })
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }
      throw new Error('Falha na troca do código OAuth');
    } catch (error) {
      console.error('Erro ao trocar código por sessão:', error);
      throw error;
    }
  },

  // Emitir evento de erro no login
  emitLoginError(error) {
    console.error('Erro no login:', error);
    
    // Aqui você pode mostrar um alerta ou notificação de erro
  },

  // Abrir URL de autenticação
  async openAuthUrl(authUrl) {
    try {
      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        await Linking.openURL(authUrl);
      } else {
        throw new Error('Não é possível abrir a URL de autenticação');
      }
    } catch (error) {
      console.error('Erro ao abrir URL de autenticação:', error);
      throw error;
    }
  },

  // Verificar se app pode abrir URLs
  async canOpenURL(url) {
    try {
      return await Linking.canOpenURL(url);
    } catch (error) {
      console.error('Erro ao verificar URL:', error);
      return false;
    }
  }
};
