const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const logger = require('../utils/logger');
const router = express.Router();

// Configuração do multer para upload de arquivos
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB
  }
});

// Configurações do YouTube OAuth 2.0
const YOUTUBE_CONFIG = {
  clientId: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/youtube/oauth/callback',
  refreshToken: process.env.YOUTUBE_REFRESH_TOKEN
};

// Rota 1: Gerar URL de autorização do YouTube (USAR APENAS UMA VEZ PARA SETUP)
router.get('/setup/auth-url', (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    YOUTUBE_CONFIG.clientId,
    YOUTUBE_CONFIG.clientSecret,
    YOUTUBE_CONFIG.redirectUri
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
    prompt: 'consent'
  });

  res.json({
    success: true,
    message: 'Acesse esta URL no navegador para autorizar o acesso ao YouTube',
    auth_url: authUrl,
    instructions: [
      '1. Acesse a URL acima no navegador',
      '2. Faça login com a conta do YouTube que possui o canal',
      '3. Autorize o acesso',
      '4. Você será redirecionado para o callback que vai gerar o REFRESH_TOKEN',
      '5. Copie o REFRESH_TOKEN e adicione no arquivo .env'
    ]
  });
});

// Rota 2: Callback do OAuth (USAR APENAS UMA VEZ PARA SETUP)
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Código de autorização não fornecido'
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      YOUTUBE_CONFIG.clientId,
      YOUTUBE_CONFIG.clientSecret,
      YOUTUBE_CONFIG.redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('=== TOKENS DO YOUTUBE OBTIDOS ===');
    console.log('Refresh Token:', tokens.refresh_token ? 'Obtido com sucesso' : 'Erro');

    res.json({
      success: true,
      message: 'Autorização concluída! Copie o REFRESH_TOKEN abaixo e adicione no .env',
      refresh_token: tokens.refresh_token,
      instructions: [
        'Adicione esta linha no seu arquivo .env:',
        `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`,
        '',
        'Depois reinicie o servidor e você poderá fazer uploads!'
      ]
    });

  } catch (error) {
    console.error('Erro no callback do YouTube:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar autorização',
      details: error.message
    });
  }
});

// Rota 3: Trocar código manualmente (ALTERNATIVA ao callback)
router.post('/setup/exchange-code', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Código de autorização não fornecido',
        example: {
          code: '4/0AVGzR1AJBuCkq...'
        }
      });
    }

    const oauth2Client = new google.auth.OAuth2(
      YOUTUBE_CONFIG.clientId,
      YOUTUBE_CONFIG.clientSecret,
      YOUTUBE_CONFIG.redirectUri
    );

    console.log('=== TROCANDO CÓDIGO POR TOKENS ===');
    console.log('Código recebido:', code.substring(0, 20) + '...');
    
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('=== TOKENS OBTIDOS ===');
    console.log('Refresh Token:', tokens.refresh_token ? 'Obtido com sucesso' : 'Erro');

    res.json({
      success: true,
      message: '✅ Autorização concluída! Copie o REFRESH_TOKEN abaixo e adicione no .env',
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      instructions: [
        '1. Copie o refresh_token abaixo',
        '2. Adicione esta linha no seu arquivo .env:',
        `   YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`,
        '',
        '3. Reinicie o servidor',
        '4. Pronto! Você pode fazer uploads no /youtube/upload'
      ]
    });

  } catch (error) {
    console.error('Erro ao trocar código:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao trocar código por tokens',
      details: error.message,
      help: 'O código pode ter expirado. Gere um novo em /youtube/setup/auth-url'
    });
  }
});

// Rota 4: Upload de vídeo (ROTA PRINCIPAL - SEM AUTENTICAÇÃO)
router.post('/upload', upload.single('video'), async (req, res) => {
  let videoFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo de vídeo foi enviado'
      });
    }

    videoFilePath = req.file.path;

    const { title, description, tags, privacyStatus } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'O título do vídeo é obrigatório'
      });
    }

    if (!YOUTUBE_CONFIG.refreshToken) {
      return res.status(500).json({
        success: false,
        error: 'Refresh Token do YouTube não configurado',
        details: 'Execute /youtube/setup/auth-url para configurar'
      });
    }

    logger.separator('UPLOADING VIDEO TO YOUTUBE');
    logger.youtube.info('Starting upload', {
      file: req.file.originalname,
      size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
      title
    });

    const oauth2Client = new google.auth.OAuth2(
      YOUTUBE_CONFIG.clientId,
      YOUTUBE_CONFIG.clientSecret,
      YOUTUBE_CONFIG.redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: YOUTUBE_CONFIG.refreshToken
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const videoMetadata = {
      snippet: {
        title: title,
        description: description || '',
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        categoryId: '22'
      },
      status: {
        privacyStatus: privacyStatus || 'private',
        selfDeclaredMadeForKids: false
      }
    };

    logger.upload.info('Sending video to YouTube API...');

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: videoMetadata,
      media: {
        body: fs.createReadStream(videoFilePath)
      }
    });

    logger.youtube.success('Upload completed!', { 
      videoId: response.data.id,
      url: `https://www.youtube.com/watch?v=${response.data.id}`
    });

    if (fs.existsSync(videoFilePath)) {
      fs.unlinkSync(videoFilePath);
      logger.upload.info('Temporary file deleted');
    }
    
    logger.separator();

    res.json({
      success: true,
      message: 'Video uploaded successfully to YouTube!',
      video: {
        id: response.data.id,
        title: response.data.snippet.title,
        description: response.data.snippet.description,
        url: `https://www.youtube.com/watch?v=${response.data.id}`,
        thumbnail: response.data.snippet.thumbnails?.default?.url || '',
        privacy_status: response.data.status.privacyStatus,
        channel_id: response.data.snippet.channelId
      }
    });

  } catch (error) {
    logger.youtube.error('Upload failed', error);
    
    let errorDetails = error.message;
    if (error.response?.data?.error) {
      errorDetails = {
        code: error.response.data.error.code,
        message: error.response.data.error.message,
        errors: error.response.data.error.errors
      };
      logger.network.error('YouTube API error', errorDetails);
    }

    if (videoFilePath && fs.existsSync(videoFilePath)) {
      try {
        fs.unlinkSync(videoFilePath);
      } catch (unlinkError) {
        logger.error('Failed to delete temporary file', unlinkError);
      }
    }
    
    logger.separator();

    res.status(500).json({
      success: false,
      error: 'Failed to upload video to YouTube',
      details: errorDetails
    });
  }
});

module.exports = router;

