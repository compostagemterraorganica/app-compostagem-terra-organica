import { getConfig } from '../config/environment';
import apiClient from './apiClient';

const YOUTUBE_CONFIG = {
  UPLOAD_URL: getConfig('YOUTUBE_UPLOAD_URL')
};

export const youtubeService = {
  async uploadVideo(videoFile, metadata) {
    try {
      const formData = new FormData();

      formData.append('video', {
        uri: videoFile.uri,
        type: 'video/mp4',
        name: videoFile.name || `video_${Date.now()}.mp4`
      });

      formData.append('title', metadata.title);
      formData.append('description', metadata.description);
      formData.append('privacy', 'unlisted');

      const response = await apiClient.request(YOUTUBE_CONFIG.UPLOAD_URL, {
        method: 'POST',
        body: formData
      });

      const text = await response.text();
      const result = text ? JSON.parse(text) : null;
      if (!response.ok) {
        throw new Error(result?.message || result?.error || 'Erro no upload do vídeo');
      }

      const video = result?.video;
      return {
        success: true,
        videoId: video?.id,
        videoUrl: video?.url,
        thumbnail: video?.thumbnail || ''
      };
    } catch (error) {
      throw error;
    }
  },

  generateVideoTitle(centralName, date) {
    const formattedDate = date instanceof Date
      ? date.toLocaleDateString('pt-BR')
      : new Date(date).toLocaleDateString('pt-BR');
    return `${centralName} - ${formattedDate}`;
  },

  generateVideoDescription(centralName, volume, date, location = null) {
    let description = `Central: ${centralName}\n`;
    description += `Volume: ${volume} Litros\n`;
    description += `Data: ${date instanceof Date ? date.toLocaleString('pt-BR') : date}\n`;

    if (location) {
      description += `Localização: ${location.formattedLocation || location}\n`;
      if (location.address) {
        description += `Endereço: ${location.address}\n`;
      }
    }

    return description;
  }
};

export default youtubeService;
