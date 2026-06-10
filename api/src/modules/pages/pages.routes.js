const express = require('express');
const { requireAuth } = require('../../middlewares/require-auth');
const { requireCsrf } = require('../../middlewares/require-csrf');
const { requireAdmin } = require('../../middlewares/require-admin');
const {
  listPagesHandler,
  getPageHandler,
  createPageHandler,
  updatePageHandler,
  deletePageHandler,
  createVersionHandler,
  listVersionsHandler,
  getLatestVersionHandler,
  publishPageHandler,
  getPublicPageHandler,
  getPublicPageByIdHandler
} = require('./pages.controller');

const router = express.Router();

router.get('/public/id/:id', getPublicPageByIdHandler);
router.get('/public/:slug', getPublicPageHandler);
router.get('/', requireAuth, requireCsrf, requireAdmin, listPagesHandler);
router.post('/', requireAuth, requireCsrf, requireAdmin, createPageHandler);
router.get('/:id', requireAuth, requireCsrf, requireAdmin, getPageHandler);
router.put('/:id', requireAuth, requireCsrf, requireAdmin, updatePageHandler);
router.delete('/:id', requireAuth, requireCsrf, requireAdmin, deletePageHandler);
router.post('/:id/versions', requireAuth, requireCsrf, requireAdmin, createVersionHandler);
router.get('/:id/versions/latest', requireAuth, requireCsrf, requireAdmin, getLatestVersionHandler);
router.get('/:id/versions', requireAuth, requireCsrf, requireAdmin, listVersionsHandler);
router.post('/:id/publish', requireAuth, requireCsrf, requireAdmin, publishPageHandler);

module.exports = router;
