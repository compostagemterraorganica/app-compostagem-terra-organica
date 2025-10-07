import { getConfig } from '../config/environment';

const YOUTUBE_CONFIG = {
  UPLOAD_URL: getConfig('YOUTUBE_UPLOAD_URL')
};

export const youtubeService = {
  // Upload de vídeo para YouTube
  async uploadVideo(videoFile, metadata) {
    try {
      const formData = new FormData();
      
      // Adicionar arquivo de vídeo
      formData.append('video', {
        uri: videoFile.uri,
        type: 'video/mp4',
        name: videoFile.name || `video_${Date.now()}.mp4`
      });

      // Adicionar metadados
      formData.append('title', metadata.title);
      formData.append('description', metadata.description);
      formData.append('privacy', 'unlisted'); // Vídeo não listado publicamente

      const response = await fetch(YOUTUBE_CONFIG.UPLOAD_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          videoId: result.videoId,
          videoUrl: result.videoUrl,
          thumbnail: result.thumbnail
        };
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Erro no upload do vídeo');
      }
    } catch (error) {
      throw error;
    }
  },

  // Gerar título do vídeo
  generateVideoTitle(centralName, date) {
    const formattedDate = new Date(date).toLocaleDateString('pt-BR');
    return `${centralName} - ${formattedDate}`;
  },

  // Gerar descrição do vídeo
  generateVideoDescription(videoData) {
    const lines = [
      `🌱 TERRA ORGÂNICA - REGISTRO DE COLETA`,
      '',
      `📍 Central: ${videoData.centralName}`,
      `📦 Volume: ${videoData.volume} Kg`,
      `📅 Data: ${new Date(videoData.date).toLocaleDateString('pt-BR')}`,
      `🕐 Horário: ${new Date(videoData.date).toLocaleTimeString('pt-BR')}`,
    ];

    // Dados de geolocalização
    if (videoData.location) {
      lines.push('');
      lines.push('📍 DADOS DE GEOLOCALIZAÇÃO:');
      
      // Coordenadas GPS
      if (videoData.location.latitude && videoData.location.longitude) {
        lines.push(`🌍 Coordenadas: ${videoData.location.latitude.toFixed(6)}, ${videoData.location.longitude.toFixed(6)}`);
      }
      
      // Precisão do GPS
      if (videoData.location.accuracy) {
        lines.push(`🎯 Precisão: ±${Math.round(videoData.location.accuracy)} metros`);
      }
      
      // Endereço formatado (se disponível)
      if (videoData.location.formattedLocation) {
        lines.push(`📍 Local: ${videoData.location.formattedLocation}`);
      }
      
      // Endereço completo (se disponível)
      if (videoData.location.address && videoData.location.address.formattedAddress) {
        lines.push(`🏠 Endereço: ${videoData.location.address.formattedAddress}`);
      }
    }

    // Dados do vídeo
    if (videoData.duration) {
      lines.push('');
      lines.push('🎬 DADOS DO VÍDEO:');
      lines.push(`⏱️ Duração: ${videoData.duration} segundos`);
    }

    lines.push('');
    lines.push('📱 Postado via App Terra Orgânica');
    lines.push('🌱 Contribuindo para um futuro mais sustentável');

    return lines.join('\n');
  },

  // Validar dados antes do upload
  validateUploadData(videoFile, metadata) {
    if (!videoFile || !videoFile.uri) {
      throw new Error('Arquivo de vídeo é obrigatório');
    }

    if (!metadata.title || !metadata.description) {
      throw new Error('Título e descrição são obrigatórios');
    }

    return true;
  }
};
