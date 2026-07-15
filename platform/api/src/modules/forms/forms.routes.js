const express = require('express');
const { requireAuth } = require('../../middlewares/require-auth');
const { requireCsrf } = require('../../middlewares/require-csrf');
const { requireAdmin } = require('../../middlewares/require-admin');
const {
  createContatoHandler,
  createFinanciadorHandler,
  createContactHandler,
  createCentralRegistrationHandler,
  listSubmissionsHandler,
  getSubmissionHandler,
  markSubmissionReadHandler,
  getUnreadCountHandler,
  replySubmissionHandler
} = require('./forms.controller');

const router = express.Router();

router.post('/contato', createContatoHandler);
router.post('/financiador', createFinanciadorHandler);
router.post('/contact', createContactHandler);
router.post('/central-registration', createCentralRegistrationHandler);

router.get('/submissions/unread-count', requireAuth, requireCsrf, requireAdmin, getUnreadCountHandler);
router.get('/submissions', requireAuth, requireCsrf, requireAdmin, listSubmissionsHandler);
router.get('/submissions/:id', requireAuth, requireCsrf, requireAdmin, getSubmissionHandler);
router.patch('/submissions/:id/read', requireAuth, requireCsrf, requireAdmin, markSubmissionReadHandler);
router.post('/submissions/:id/reply', requireAuth, requireCsrf, requireAdmin, replySubmissionHandler);

module.exports = router;
