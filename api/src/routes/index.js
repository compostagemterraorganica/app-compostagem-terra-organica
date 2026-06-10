const express = require('express');
const authRoutes = require('../modules/auth/auth.routes');
const usersRoutes = require('../modules/users/users.routes');
const centralsRoutes = require('../modules/centrals/centrals.routes');
const centralsPublicRoutes = require('../modules/centrals/centrals.public.routes');
const volumeVerificationsRoutes = require('../modules/volume-verifications/volume-verifications.routes');
const youtubeRoutes = require('../modules/youtube/youtube.routes');
const pagesRoutes = require('../modules/pages/pages.routes');
const postsRoutes = require('../modules/posts/posts.routes');
const mediaRoutes = require('../modules/media/media.routes');
const formsRoutes = require('../modules/forms/forms.routes');
const analyticsRoutes = require('../modules/analytics/analytics.routes');
const wordpressAnalyticsRoutes = require('../../routes/analytics');
const { requireAuth } = require('../middlewares/require-auth');
const { requireCsrf } = require('../middlewares/require-csrf');
const { requireAdmin } = require('../middlewares/require-admin');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/youtube', requireAuth, requireCsrf, youtubeRoutes);

router.use('/users', requireAuth, requireCsrf, requireAdmin, usersRoutes);
router.use('/centrals/public', centralsPublicRoutes);
router.use('/centrals', requireAuth, requireCsrf, requireAdmin, centralsRoutes);
router.use('/volume-verifications', requireAuth, requireCsrf, volumeVerificationsRoutes);
router.use('/pages', pagesRoutes);
router.use('/posts', postsRoutes);
router.use('/media', requireAuth, requireCsrf, requireAdmin, mediaRoutes);
router.use('/forms', formsRoutes);
// Dashboard WordPress (HTML + centrals-analysis + export-records) — mesmo router da API legada na raiz
router.use('/analytics', wordpressAnalyticsRoutes);
// Analytics Postgres (kpis, séries) — público
router.use('/analytics', analyticsRoutes);

module.exports = router;
