import * as Updates from 'expo-updates';

class UpdateService {
  constructor() {
    this.isCheckingForUpdates = false;
  }

  async initialize() {
    console.log('✅ App inicializado');
  }

  async checkForUpdates() {
    if (this.isCheckingForUpdates) {
      return;
    }

    try {
      this.isCheckingForUpdates = true;
      const update = await Updates.checkForUpdateAsync();

      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
      }
    } catch (error) {
      console.error('❌ Erro ao verificar atualizações Expo Updates:', error);
    } finally {
      this.isCheckingForUpdates = false;
    }
  }

  async performUpdate() {
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (error) {
      console.error('❌ Erro durante atualização Expo Updates:', error);
    }
  }

  async forceCheckForUpdates() {
    await this.checkForUpdates();
  }

  async getCurrentUpdateInfo() {
    try {
      return await Updates.getUpdateMetadataAsync();
    } catch (error) {
      console.error('❌ Erro ao obter informações da atualização:', error);
      return null;
    }
  }

  destroy() {}
}

const updateService = new UpdateService();

export default updateService;
