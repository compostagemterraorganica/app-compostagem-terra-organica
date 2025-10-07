import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConfig } from '../config/environment';

const STORAGE_KEYS = {
  VIDEOS: `${getConfig('STORAGE_PREFIX')}videos`,
  USER_SESSION: `${getConfig('STORAGE_PREFIX')}user_session`,
  SELECTED_CENTRAL: `${getConfig('STORAGE_PREFIX')}selected_central`
};

export const storageService = {
  // Salvar vídeo localmente
  async saveVideo(videoData) {
    try {
      const videos = await this.getVideos();
      const newVideo = {
        id: Date.now().toString(),
        ...videoData,
        createdAt: new Date().toISOString()
      };
      videos.push(newVideo);
      await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(videos));
      return newVideo;
    } catch (error) {
      throw error;
    }
  },

  // Obter lista de vídeos
  async getVideos() {
    try {
      const videos = await AsyncStorage.getItem(STORAGE_KEYS.VIDEOS);
      return videos ? JSON.parse(videos) : [];
    } catch (error) {
      return [];
    }
  },

  // Remover vídeo
  async removeVideo(videoId) {
    try {
      const videos = await this.getVideos();
      const filteredVideos = videos.filter(video => video.id !== videoId);
      await AsyncStorage.setItem(STORAGE_KEYS.VIDEOS, JSON.stringify(filteredVideos));
    } catch (error) {
      throw error;
    }
  },

  // Salvar sessão do usuário
  async saveUserSession(sessionData) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionData));
    } catch (error) {
      throw error;
    }
  },

  // Obter sessão do usuário
  async getUserSession() {
    try {
      const session = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      return null;
    }
  },

  // Limpar sessão do usuário
  async clearUserSession() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    } catch (error) {
      // Erro silencioso
    }
  },

  // Salvar central selecionada
  async saveSelectedCentral(centralId) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_CENTRAL, centralId.toString());
    } catch (error) {
      // Erro silencioso
    }
  },

  // Obter central selecionada
  async getSelectedCentral() {
    try {
      const centralId = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_CENTRAL);
      return centralId ? parseInt(centralId) : null;
    } catch (error) {
      return null;
    }
  }
};
