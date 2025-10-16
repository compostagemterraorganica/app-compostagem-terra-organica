import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

class UpdateService {
  constructor() {
    this.isCheckingForUpdates = false;
  }

  /**
   * Inicializa o serviço de atualizações Expo Updates
   */
  async initialize() {
    try {
      console.log('🔄 Inicializando Expo Updates...');
      
      // Verificar atualizações na inicialização
      await this.checkForUpdates();
      
      console.log('✅ Expo Updates inicializado');
    } catch (error) {
      console.error('❌ Erro ao inicializar Expo Updates:', error);
    }
  }

  /**
   * Verifica se há atualizações disponíveis via Expo Updates
   */
  async checkForUpdates() {
    if (this.isCheckingForUpdates) {
      return;
    }

    try {
      this.isCheckingForUpdates = true;
      console.log('🔍 Verificando atualizações Expo Updates...');

      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        console.log('🆕 Nova atualização Expo Updates disponível');
        await this.showUpdateNotification(update);
      } else {
        console.log('✅ App está atualizado via Expo Updates');
      }
    } catch (error) {
      console.error('❌ Erro ao verificar atualizações Expo Updates:', error);
    } finally {
      this.isCheckingForUpdates = false;
    }
  }

  /**
   * Mostra notificação de atualização disponível
   */
  async showUpdateNotification(update) {
    return new Promise((resolve) => {
      Alert.alert(
        '🆕 Atualização Disponível',
        'Uma nova versão está disponível. Deseja atualizar agora?',
        [
          {
            text: 'Mais tarde',
            style: 'cancel',
            onPress: () => {
              console.log('⏰ Usuário escolheu atualizar mais tarde');
              resolve(false);
            }
          },
          {
            text: 'Atualizar',
            onPress: async () => {
              console.log('🔄 Usuário escolheu atualizar agora');
              await this.performUpdate(update);
              resolve(true);
            }
          }
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Executa a atualização via Expo Updates
   */
  async performUpdate(update) {
    try {
      console.log('🔄 Iniciando atualização Expo Updates...');
      
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
      
      console.log('✅ Atualização Expo Updates instalada com sucesso');
    } catch (error) {
      console.error('❌ Erro durante atualização Expo Updates:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o app. Tente novamente mais tarde.');
    }
  }

  /**
   * Força verificação de atualizações
   */
  async forceCheckForUpdates() {
    console.log('🔄 Verificação forçada de atualizações Expo Updates...');
    await this.checkForUpdates();
  }

  /**
   * Obtém informações da atualização atual
   */
  async getCurrentUpdateInfo() {
    try {
      const update = await Updates.getUpdateMetadataAsync();
      return update;
    } catch (error) {
      console.error('❌ Erro ao obter informações da atualização:', error);
      return null;
    }
  }

  /**
   * Destrói o serviço
   */
  destroy() {
    console.log('🗑️ Serviço Expo Updates destruído');
  }
}

// Instância singleton
const updateService = new UpdateService();

export default updateService;