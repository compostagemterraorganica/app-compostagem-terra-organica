const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const router = express.Router();

// Chave secreta para JWT (em produção, use variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-aqui';
const JWT_EXPIRES_IN = '180d'; // 180 dias

// Middleware para verificar JWT
const verifyJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token não fornecido'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.auth.error('JWT verification failed', { error: error.message });
    return res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
};

// Configurações do WordPress OAuth
const WORDPRESS_CONFIG = {
  clientId: process.env.WORDPRESS_CLIENT_ID,
  clientSecret: process.env.WORDPRESS_CLIENT_SECRET,
  redirectUri: process.env.WORDPRESS_REDIRECT_URI,
  siteUrl: process.env.WORDPRESS_SITE_URL,
  oauthUrl: process.env.WORDPRESS_OAUTH_URL,
  email: process.env.WORDPRESS_EMAIL,
  password: process.env.WORDPRESS_PASS
};

// Função para gerar Basic Auth header
function getBasicAuthHeader() {
  if (!WORDPRESS_CONFIG.email || !WORDPRESS_CONFIG.password) {
    throw new Error('WORDPRESS_EMAIL e WORDPRESS_PASS devem estar configurados no .env');
  }
  const credentials = Buffer.from(`${WORDPRESS_CONFIG.email}:${WORDPRESS_CONFIG.password}`).toString('base64');
  return `Basic ${credentials}`;
}

// Rota para receber o código de autorização do WordPress
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    logger.separator('WORDPRESS OAUTH CALLBACK');
    logger.auth.info('Received OAuth callback', { code: code ? 'present' : 'missing', state });

    if (error) {
      logger.auth.error('WordPress authorization error', { error, error_description });
      return res.status(400).json({
        success: false,
        error: 'WordPress authorization error',
        error_code: error,
        error_description: error_description
      });
    }

    if (!code) {
      logger.auth.error('Authorization code not provided');
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided'
      });
    }

    // Trocar código por access token
    const tokenResponse = await exchangeCodeForToken(code);
    
    if (!tokenResponse.success) {
      return res.status(400).json(tokenResponse);
    }

    const { access_token, user_id } = tokenResponse.data;

    // Buscar dados do usuário
    const userData = await getUserData(access_token, user_id);
    
    if (!userData.success) {
      return res.status(400).json(userData);
    }

    // Gerar JWT com os dados do usuário
    const jwtPayload = {
      user_id,
      user_data: userData.data,
      access_token, // Incluir o token do WordPress para fazer posts
      iat: Math.floor(Date.now() / 1000) // issued at
    };
    
    const jwtToken = jwt.sign(jwtPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    logger.auth.success('Login completed successfully', { 
      userId: user_id,
      userName: userData.data.name,
      jwtExpiresIn: JWT_EXPIRES_IN,
      jwtTokenLength: jwtToken ? jwtToken.length : 0
    });
    
    console.log('🔐 JWT gerado:', jwtToken ? 'Sim' : 'Não');
    console.log('📏 Tamanho do JWT:', jwtToken ? jwtToken.length : 0);
    
    // Preparar dados do usuário para passar na URL
    const userDataEncoded = encodeURIComponent(JSON.stringify(userData.data));
    
    // Construir deep link com JWT (usando scheme correto)
    const jwtTokenEncoded = encodeURIComponent(jwtToken);
    const deepLinkUrl = `terraorganica://auth/callback?jwt_token=${jwtTokenEncoded}&user_data=${userDataEncoded}`;
    
    console.log('🔗 Deep link construído:', deepLinkUrl);
    console.log('📏 Tamanho da URL:', deepLinkUrl.length);
    console.log('🔐 JWT original vs codificado:', {
      original: jwtToken.length,
      encoded: jwtTokenEncoded.length
    });
    logger.auth.info('Redirecting to deep link', { deepLinkUrl: deepLinkUrl.substring(0, 50) + '...' });
    logger.separator();
    
    // Retornar página HTML com redirect automático
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Realizado - Terra Orgânica</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background-color: #f0f0f0;
            text-align: center;
          }
          .container {
            max-width: 500px;
            margin: 50px auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .success {
            color: #4CAF50;
            font-size: 48px;
            margin-bottom: 20px;
          }
          .message {
            color: #666;
            font-size: 18px;
            margin-bottom: 20px;
          }
          .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #4CAF50;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .manual-link {
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          }
          .manual-link:hover {
            background-color: #45a049;
          }
        </style>
        <script>
          // Tentar abrir o app automaticamente
          window.location.href = '${deepLinkUrl}';
          
          // Fallback para caso o redirect não funcione
          setTimeout(function() {
            document.getElementById('loading').style.display = 'none';
            document.getElementById('manual').style.display = 'block';
          }, 2000);
        </script>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          
          <div id="loading">
            <div class="message">Abrindo o app...</div>
            <div class="spinner"></div>
          </div>
          
          <div id="manual" style="display: none;">
            <div class="message">O app não abriu automaticamente?</div>
            <a href="${deepLinkUrl}" class="manual-link">🔙 Abrir Terra Orgânica</a>
          </div>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    logger.auth.error('Authentication failed', error);
    logger.separator();
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Rota para obter dados do usuário autenticado
router.get('/me', verifyJWT, (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.user_data,
      // Ajuda o app a entender quando a sessão expira (sem precisar adivinhar)
      token: {
        iat: req.user.iat,
        exp: req.user.exp
      }
    });

  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para logout
router.post('/logout', verifyJWT, (req, res) => {
  try {
    console.log('=== LOGOUT REQUEST RECEIVED ===');
    console.log('User ID:', req.user.user_id);
    console.log('User Name:', req.user.user_data.name);
    console.log('=== LOGOUT COMPLETED ===');

    // Com JWT, não precisamos remover nada do servidor
    // O token simplesmente expira automaticamente
    res.json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro no logout:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Rota para criar post de verificação de volume
router.post('/create-post', verifyJWT, async (req, res) => {
  try {

    // Dados do post vindos do body
    const { title, meta, status } = req.body;

    logger.separator('CREATING WORDPRESS POST');
    logger.wordpress.info('Request data received', { 
      title,
      meta,
      status 
    });

    if (!title) {
      logger.wordpress.error('Title is required');
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Fazer POST no WordPress usando o access_token da sessão
    const postData = {
      title: title,
      meta: meta || {},
      status: status || 'publish'
    };

    logger.wordpress.info('Sending data to WordPress API', postData);
    logger.auth.info('Using Basic Auth', { email: WORDPRESS_CONFIG.email });

    const response = await axios.post(
      `${WORDPRESS_CONFIG.siteUrl}/wp-json/wp/v2/verificacoes-de-volu`,
      postData,
      {
        headers: {
          'Authorization': getBasicAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    logger.wordpress.success('Post created successfully!', { 
      postId: response.data.id,
      title: response.data.title?.rendered || response.data.title,
      meta: response.data.meta
    });
    logger.separator();

    res.json({
      success: true,
      message: 'Post created successfully',
      post: response.data
    });

  } catch (error) {
    logger.wordpress.error('Failed to create post', error);
    logger.network.error('WordPress API error', {
      status: error.response?.status,
      data: error.response?.data
    });
    logger.separator();
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: 'Failed to create WordPress post',
      message: error.response?.data?.message || error.message,
      details: error.response?.data
    });
  }
});


// Função para trocar código por access token
async function exchangeCodeForToken(code) {
  try {
    const tokenData = {
      client_id: WORDPRESS_CONFIG.clientId,
      client_secret: WORDPRESS_CONFIG.clientSecret,
      redirect_uri: WORDPRESS_CONFIG.redirectUri,
      grant_type: 'authorization_code',
      code: code
    };

    logger.auth.info('Exchanging code for token', { url: `${WORDPRESS_CONFIG.oauthUrl}/token` });

    const response = await axios.post(`${WORDPRESS_CONFIG.oauthUrl}/token`, tokenData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    logger.auth.success('Token obtained successfully');

    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    logger.auth.error('Failed to exchange code for token', error);
    logger.network.error('OAuth token exchange failed', {
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: 'WordPress authentication failed',
      details: error.response?.data || error.message
    };
  }
}

// Função para buscar dados do usuário
async function getUserData(accessToken, userId) {
  try {
    console.log('=== BUSCANDO DADOS DO USUÁRIO ===');

    const endpoints = [
      `${WORDPRESS_CONFIG.siteUrl}/wp-json/wp/v2/users/me`,
      `${WORDPRESS_CONFIG.siteUrl}/wp-json/wp/v2/users/${userId}`,
      `${WORDPRESS_CONFIG.oauthUrl}/me`,
      `${WORDPRESS_CONFIG.siteUrl}/wp-json/custom/v1/user`
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log('Tentando endpoint:', endpoint);
        
        const response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        const userData = processUserData(response.data, endpoint);
        
        return {
          success: true,
          data: userData,
          endpoint_used: endpoint
        };

      } catch (error) {
        console.log(`Erro no endpoint ${endpoint}:`, error.response?.status);
        lastError = error;
        continue;
      }
    }

    console.log('Todos os endpoints falharam, usando dados básicos...');
    return await getBasicUserData(accessToken);

  } catch (error) {
    console.error('Erro geral ao buscar dados do usuário:', error);
    return {
      success: false,
      error: 'Falha ao buscar dados do usuário',
      details: error.message
    };
  }
}

// Função para processar dados do usuário
function processUserData(data, endpoint) {
  if (endpoint.includes('/oauth/me')) {
    return {
      id: data.ID || data.id,
      name: data.display_name || data.name,
      email: data.user_email || data.email,
      username: data.user_login || data.username,
      avatar_url: data.avatar || data.avatar_url,
      description: data.description || '',
      registered_date: data.user_registered || data.registered_date,
      capabilities: data.capabilities || {},
      roles: data.roles || []
    };
  }
  
  if (data.id) {
    return {
      id: data.id,
      name: data.name,
      email: data.email || 'não disponível',
      username: data.slug,
      avatar_url: data.avatar_urls?.['96'] || data.avatar_url,
      description: data.description || '',
      registered_date: data.registered_date,
      capabilities: data.capabilities || {},
      roles: data.roles || []
    };
  }
  
  return {
    id: data.ID || data.id || 'desconhecido',
    name: data.display_name || data.name || 'Usuário',
    email: data.user_email || data.email || 'não disponível',
    username: data.user_login || data.username || 'desconhecido',
    avatar_url: data.avatar || data.avatar_url || '',
    description: data.description || '',
    registered_date: data.user_registered || data.registered_date || '',
    capabilities: data.capabilities || {},
    roles: data.roles || []
  };
}

// Função para buscar dados básicos do usuário
async function getBasicUserData(accessToken) {
  try {
    const response = await axios.get(`${WORDPRESS_CONFIG.siteUrl}/wp-json/wp/v2/users/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return {
      success: true,
      data: {
        id: response.data.id || 'desconhecido',
        name: response.data.name || 'Usuário',
        email: response.data.email || 'não disponível',
        username: response.data.slug || 'desconhecido',
        avatar_url: response.data.avatar_urls?.['96'] || '',
        description: response.data.description || '',
        registered_date: response.data.registered_date || '',
        capabilities: response.data.capabilities || {},
        roles: response.data.roles || []
      },
      endpoint_used: 'basic_fallback'
    };

  } catch (error) {
    console.error('Erro ao buscar dados básicos:', error.response?.data || error.message);
    
    return {
      success: true,
      data: {
        id: 'desconhecido',
        name: 'Usuário Autenticado',
        email: 'não disponível',
        username: 'usuario',
        avatar_url: '',
        description: 'Usuário autenticado via OAuth',
        registered_date: new Date().toISOString(),
        capabilities: {},
        roles: ['subscriber']
      },
      endpoint_used: 'minimal_fallback',
      warning: 'Dados limitados devido a problemas na API do WordPress'
    };
  }
}

module.exports = router;

