const express = require('express');
const rateLimit = require('express-rate-limit');
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

const authCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas tentativas. Tente novamente mais tarde.' }
});

router.post('/login', loginHandler);
router.post('/check-email', authCodeLimiter, checkEmailHandler);
router.post('/send-code', authCodeLimiter, sendCodeHandler);
router.post('/confirm-password', authCodeLimiter, confirmPasswordHandler);
router.post('/password', setPasswordHandler);
router.get('/me', requireAuth, meHandler);
router.get('/me/centrals', requireAuth, meCentralsHandler);
router.post('/refresh', requireAuth, requireCsrf, refreshHandler);
router.post('/logout', requireAuth, requireCsrf, logoutHandler);

module.exports = router;
