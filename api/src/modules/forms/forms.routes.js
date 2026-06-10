const express = require('express');
const { requireAuth } = require('../../middlewares/require-auth');
const { requireCsrf } = require('../../middlewares/require-csrf');
const {
  createContatoHandler,
  createFinanciadorHandler,
  createContactHandler,
  createCentralRegistrationHandler,
  listSubmissionsHandler
} = require('./forms.controller');

const router = express.Router();

router.post('/contato', createContatoHandler);
router.post('/financiador', createFinanciadorHandler);
router.post('/contact', createContactHandler);
router.post('/central-registration', createCentralRegistrationHandler);
router.get('/submissions', requireAuth, requireCsrf, listSubmissionsHandler);

module.exports = router;
