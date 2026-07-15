const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { google } = require('googleapis');
const env = require('../../config/env');
const { asyncHandler } = require('../../utils/asyncHandler');
const { HttpError } = require('../../utils/httpError');

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 1024 * 1024 * 1024 }
});

function getOauthClient() {
  if (!env.youtube.clientId || !env.youtube.clientSecret) {
    throw new HttpError(500, 'YouTube nao configurado (clientId/clientSecret)');
  }
  return new google.auth.OAuth2(env.youtube.clientId, env.youtube.clientSecret, env.youtube.redirectUri);
}

router.get('/setup/auth-url', asyncHandler(async (req, res) => {
  const oauth = getOauthClient();
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload'],
    prompt: 'consent'
  });
  res.json({ success: true, auth_url: authUrl });
}));

router.get('/oauth/callback', asyncHandler(async (req, res) => {
  const code = req.query.code;
  if (!code) throw new HttpError(400, 'Codigo nao informado');
  const oauth = getOauthClient();
  const { tokens } = await oauth.getToken(code);
  res.json({ success: true, refresh_token: tokens.refresh_token, access_token: tokens.access_token });
}));

router.post('/setup/exchange-code', asyncHandler(async (req, res) => {
  const code = req.body.code;
  if (!code) throw new HttpError(400, 'Codigo nao informado');
  const oauth = getOauthClient();
  const { tokens } = await oauth.getToken(code);
  res.json({ success: true, refresh_token: tokens.refresh_token, access_token: tokens.access_token });
}));

router.post('/upload', upload.single('video'), asyncHandler(async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) throw new HttpError(400, 'Arquivo de video nao enviado');
    if (!req.body.title) throw new HttpError(400, 'Titulo obrigatorio');
    if (!env.youtube.refreshToken) throw new HttpError(500, 'YOUTUBE_REFRESH_TOKEN nao configurado');

    filePath = req.file.path;
    const oauth = getOauthClient();
    oauth.setCredentials({ refresh_token: env.youtube.refreshToken });

    const youtube = google.youtube({ version: 'v3', auth: oauth });
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: req.body.title,
          description: req.body.description || '',
          tags: req.body.tags ? String(req.body.tags).split(',').map((t) => t.trim()) : [],
          categoryId: '22'
        },
        status: { privacyStatus: req.body.privacyStatus || 'unlisted', selfDeclaredMadeForKids: false }
      },
      media: { body: fs.createReadStream(filePath) }
    });

    res.json({
      success: true,
      video: {
        id: response.data.id,
        url: `https://www.youtube.com/watch?v=${response.data.id}`,
        title: response.data.snippet?.title || req.body.title
      }
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}));

module.exports = router;
