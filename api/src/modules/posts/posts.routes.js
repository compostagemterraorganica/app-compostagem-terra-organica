const express = require('express');
const { requireAuth } = require('../../middlewares/require-auth');
const { requireCsrf } = require('../../middlewares/require-csrf');
const { requireAdmin } = require('../../middlewares/require-admin');
const {
  listPostsHandler,
  listPublicPostsHandler,
  listRecentPublicPostsHandler,
  getPostHandler,
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
  getPublicPostHandler
} = require('./posts.controller');

const router = express.Router();

router.get('/public', listPublicPostsHandler);
router.get('/public/recent', listRecentPublicPostsHandler);
router.get('/public/:slug', getPublicPostHandler);
router.get('/', requireAuth, requireCsrf, requireAdmin, listPostsHandler);
router.post('/', requireAuth, requireCsrf, requireAdmin, createPostHandler);
router.get('/:id', requireAuth, requireCsrf, requireAdmin, getPostHandler);
router.put('/:id', requireAuth, requireCsrf, requireAdmin, updatePostHandler);
router.delete('/:id', requireAuth, requireCsrf, requireAdmin, deletePostHandler);

module.exports = router;
