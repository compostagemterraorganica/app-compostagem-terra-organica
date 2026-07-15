const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const routes = require('./routes');
const { requestLogger } = require('./middlewares/request-logger');
const { errorHandler } = require('./middlewares/error-handler');

const app = express();

if (env.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet());
function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (env.appOrigins.includes(origin)) return true;
  if (env.nodeEnv === 'development' && /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) {
    return true;
  }
  if (env.nodeEnv === 'development' && /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, origin || env.appOrigins[0]);
      return;
    }
    callback(null, false);
  },
  credentials: true
}));
// Upload de vídeo usa multipart; não passar pelo parser JSON (limite 10mb quebraria vídeos).
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path === '/youtube/upload') {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});
app.use(cookieParser());
app.use(requestLogger);
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true
}));

app.get('/health', (req, res) => {
  res.json({ success: true, service: 'api-postgres', timestamp: new Date().toISOString() });
});

app.use('/uploads', express.static(path.resolve(__dirname, '..', 'uploads')));
app.use('/', routes);
app.use(errorHandler);

module.exports = app;
