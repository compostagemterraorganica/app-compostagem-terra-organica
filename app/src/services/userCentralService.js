import { getConfig } from '../config/environment';

const WORDPRESS_CONFIG = {
  BASE_URL: getConfig('WORDPRESS_BASE_URL'),
  EMAIL: getConfig('WORDPRESS_EMAIL'),
  PASSWORD: getConfig('WORDPRESS_PASS')
};

export const userCentralService = {
  // Gerar header de autenticação básica
  getBasicAuthHeader() {
    if (!WORDPRESS_CONFIG.EMAIL || !WORDPRESS_CONFIG.PASSWORD) {
      return null;
    }
    
    const credentials = `${WORDPRESS_CONFIG.EMAIL}:${WORDPRESS_CONFIG.PASSWORD}`;
    const base64Credentials = btoa(credentials);
    return `Basic ${base64Credentials}`;
  },

  // Buscar todas as relações (Relation ID 13)
  async getAllRelations() {
    const url = `${WORDPRESS_CONFIG.BASE_URL}/wp-json/jet-rel/13`;
    
    const authHeader = this.getBasicAuthHeader();
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    try {
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        const errorText = await response.text();
        throw new Error(`Erro ao buscar relações: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('❌ [userCentralService] Erro na requisição getAllRelations:', error);
      throw error;
    }
  },

  // Analisar as relações para entender a estrutura
  analyzeRelations(relations) {
    
    if (typeof relations === 'object' && relations !== null) {
      const centralIds = Object.keys(relations);
      
      // Analisar cada central e seus usuários
      centralIds.forEach(centralId => {
        const users = relations[centralId];
        if (Array.isArray(users)) {
          const userIds = users.map(user => user.child_object_id);
        }
      });
      
      // Verificar se o usuário atual está em alguma relação
      this.getCurrentUserId().then(userId => {
        if (userId) {
          
          const userCentrals = [];
          centralIds.forEach(centralId => {
            const users = relations[centralId];
            if (Array.isArray(users)) {
              const userIds = users.map(user => user.child_object_id);
              if (userIds.includes(userId.toString())) {
                userCentrals.push(centralId);
              }
            }
          });
        }
      });
    }
    
  },

  // Buscar centrais filhas (children) de um usuário específico
  async getUserCentrals(userId) {
    const url = `${WORDPRESS_CONFIG.BASE_URL}/wp-json/jet-rel/13/children/${userId}`;
    
    const authHeader = this.getBasicAuthHeader();
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    try {
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const data = await response.json();
        // Se for um array, processar os dados
        if (Array.isArray(data)) {
          const processedCentrals = data.map(central => ({
            id: central.id || central.ID,
            name: central.title || central.post_title || central.name || 'Central sem nome',
            rawData: central // Manter dados originais para debug
          }));
          
          return processedCentrals;
        }
        
        return [];
      } else {
        const errorText = await response.text();
        throw new Error(`Erro ao buscar centrais do usuário: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw error;
    }
  },

  // Buscar usuários pais (parents) de uma central específica
  async getCentralUsers(centralId) {
    const url = `${WORDPRESS_CONFIG.BASE_URL}/wp-json/jet-rel/13/parents/${centralId}`;
    
    const authHeader = this.getBasicAuthHeader();
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    try {
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const data = await response.json();
        // Se for um array, processar os dados
        if (Array.isArray(data)) {
          const processedUsers = data.map(user => ({
            id: user.id || user.ID,
            name: user.display_name || user.user_login || user.name || 'Usuário sem nome',
            email: user.user_email || user.email || '',
            rawData: user // Manter dados originais para debug
          }));
          
          return processedUsers;
        }
        
        return [];
      } else {
        const errorText = await response.text();
        throw new Error(`Erro ao buscar usuários da central: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      throw error;
    }
  },

  // Método principal para obter centrais do usuário logado
  async getCurrentUserCentrals() {
    try {
      // Primeiro, vamos tentar obter o ID do usuário atual
      const userId = await this.getCurrentUserId();
      
      if (!userId) {
        return [];
      }
      
      // Método 1: Tentar usar a API específica de children
      try {
        const userCentrals = await this.getUserCentrals(userId);
        if (userCentrals && userCentrals.length > 0) {
          return userCentrals;
        }
      } catch (apiError) {
      }
      
      // Método 2: Usar as relações diretas para encontrar centrais
      const relations = await this.getAllRelations();
      const userCentralsFromRelations = this.getUserCentralsFromRelations(relations, userId);
      
      // Buscar nomes reais das centrais
      const centralsWithNames = await this.enrichCentralsWithNames(userCentralsFromRelations);
      
      return centralsWithNames;
      
    } catch (error) {   
      return [];
    }
  },

  // Método alternativo: buscar centrais do usuário através das relações diretas
  getUserCentralsFromRelations(relations, userId) {
    
    const userCentrals = [];
    
    if (typeof relations === 'object' && relations !== null) {
      const centralIds = Object.keys(relations);
      
      centralIds.forEach(centralId => {
        const users = relations[centralId];
        if (Array.isArray(users)) {
          const userIds = users.map(user => user.child_object_id);
          
          // Verificar se o usuário atual está nesta central
          if (userIds.includes(userId.toString())) {
            userCentrals.push({
              id: centralId,
              name: `Central ${centralId}`, // Nome temporário, será atualizado com o nome real
              rawData: { centralId, users }
            });
          }
        }
      });
    }
    
    return userCentrals;
  },

  // Enriquecer centrais com nomes reais da API do WordPress
  async enrichCentralsWithNames(centrals) {
    
    if (!centrals || centrals.length === 0) {
      return centrals;
    }
    
    const authHeader = this.getBasicAuthHeader();
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    try {
      // Buscar todas as centrais disponíveis da rota /wp-json/wp/v2/central?per_page=100
      const centralsUrl = `${WORDPRESS_CONFIG.BASE_URL}/wp-json/wp/v2/central?per_page=100`;
      
      const response = await fetch(centralsUrl, { headers });
      
      if (response.ok) {
        const allCentrals = await response.json();
        
        // Mapear os IDs para nomes reais
        const enrichedCentrals = centrals.map(central => {
          const realCentral = allCentrals.find(c => c.id.toString() === central.id);
          
          if (realCentral) {
            return {
              ...central,
              name: realCentral.title?.rendered || realCentral.title || `Central ${central.id}`,
              rawData: {
                ...central.rawData,
                realCentralData: realCentral
              }
            };
          } else {
            return central; // Manter o nome temporário
          }
        });
        
        return enrichedCentrals;
        
      } else {
        return centrals; // Retornar com nomes temporários
      }
      
    } catch (error) {
      return centrals; // Retornar com nomes temporários
    }
  },

  // Obter ID do usuário atual (implementação básica - pode ser melhorada)
  async getCurrentUserId() {
    try {
      // Tentar obter do AsyncStorage primeiro
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const userDataString = await AsyncStorage.getItem('wp_user_data');
      
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        
        if (userData.id || userData.ID) {
          return userData.id || userData.ID;
        }
      }
      
      // Se não encontrar no AsyncStorage, tentar fazer uma requisição para /me
      const authHeader = this.getBasicAuthHeader();
      if (authHeader) {
        const response = await fetch(`${WORDPRESS_CONFIG.BASE_URL}/wp-json/wp/v2/users/me`, {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          return userData.id || userData.ID;
        }
      }
      
      return null;
      
    } catch (error) {
      return null;
    }
  }
};

export default userCentralService;
