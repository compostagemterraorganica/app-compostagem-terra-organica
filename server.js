const express = require('express');
const cors = require('cors');
require('dotenv').config();
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Importar rotas
const wordpressRoutes = require('./routes/wordpress');
const youtubeRoutes = require('./routes/youtube');
const analyticsRoutes = require('./routes/analytics');

// Usar rotas
app.use('/', wordpressRoutes);
app.use('/youtube', youtubeRoutes);
app.use('/analytics', analyticsRoutes);

// Rota de health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString()
  });
});


// Iniciar servidor
app.listen(PORT, () => {
  logger.separator('API SERVER STARTED');
  logger.server.success(`Server running on port ${PORT}`);
  logger.server.info(`Health check: http://localhost:${PORT}/health`);
  
  logger.separator('AVAILABLE ROUTES');
  logger.wordpress.info('WordPress OAuth Routes:');
  console.log('  - GET  /auth/callback');
  console.log('  - GET  /me');
  console.log('  - POST /logout');
  console.log('  - POST /create-post');
  
  logger.youtube.info('YouTube Routes:');
  console.log('  - GET  /youtube/setup/auth-url');
  console.log('  - POST /youtube/setup/exchange-code');
  console.log('  - POST /youtube/upload');
  
  logger.server.info('Analytics Routes:');
  console.log('  - GET  /analytics/centrals-analysis');
  console.log('  - GET  /analytics/dashboard');
  
  logger.separator('YOUTUBE STATUS');
  if (!process.env.YOUTUBE_REFRESH_TOKEN) {
    logger.youtube.warning('REFRESH_TOKEN not configured!');
    logger.youtube.info(`Setup URL: http://localhost:${PORT}/youtube/setup/auth-url`);
  } else {
    logger.youtube.success('YouTube configured and ready for uploads!');
  }
  
  logger.separator();
});

module.exports = app;
