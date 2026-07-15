const express = require('express');
const {
  loginHandler,
  meHandler,
  meCentralsHandler,
  refreshHandler,
  logoutHandler,
  checkEmailHandler,
  sendCodeHandler,
  confirmPasswordHandler,
  setPasswordHandler
} = require('./auth.controller');
const { requireAuth } = require('../../middlewares/require-auth');
const { requireCsrf } = require('../../middlewares/require-csrf');

const router = express.Router();

router.post('/login', loginHandler);
router.post('/check-email', checkEmailHandler);
router.post('/send-code', sendCodeHandler);
router.post('/confirm-password', confirmPasswordHandler);
router.post('/password', setPasswordHandler);
router.get('/me', requireAuth, meHandler);
router.get('/me/centrals', requireAuth, meCentralsHandler);
router.post('/refresh', requireAuth, requireCsrf, refreshHandler);
router.post('/logout', requireAuth, requireCsrf, logoutHandler);

module.exports = router;
