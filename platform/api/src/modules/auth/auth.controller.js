const env = require('../../config/env');
const { asyncHandler } = require('../../utils/asyncHandler');
const { HttpError } = require('../../utils/httpError');
const {
  login,
  refresh,
  logout,
  resolveCsrfForSession,
  cookieOptions,
  csrfCookieOptions
} = require('./auth.service');
const {
  checkEmail,
  sendCode,
  confirmPassword,
  listUserCentrals
} = require('./auth-codes.service');

function setSessionCookies(res, result) {
  res.cookie(env.sessionCookieName, result.sessionToken, cookieOptions());
  res.cookie(env.csrfCookieName, result.csrfToken, csrfCookieOptions());
}

const loginHandler = asyncHandler(async (req, res) => {
  const result = await login({
    email: req.body.email,
    password: req.body.password,
    admin: Boolean(req.body.admin),
    userAgent: req.headers['user-agent'],
    ip: req.ip
  });

  setSessionCookies(res, result);
  res.json({
    success: true,
    user: result.user,
    sessionToken: result.sessionToken,
    csrfToken: result.csrfToken
  });
});

const meHandler = asyncHandler(async (req, res) => {
  const csrfFromCookie = req.cookies?.[env.csrfCookieName];
  const csrfToken = await resolveCsrfForSession(req.auth.sessionId, csrfFromCookie);

  if (csrfFromCookie !== csrfToken) {
    res.cookie(env.csrfCookieName, csrfToken, csrfCookieOptions());
  }

  res.json({
    success: true,
    user: {
      ...req.auth.user,
      isAdministrator: req.auth.isAdministrator
    },
    csrfToken
  });
});

const meCentralsHandler = asyncHandler(async (req, res) => {
  const data = await listUserCentrals(req.auth.user.id);
  res.json({ success: true, data });
});

const refreshHandler = asyncHandler(async (req, res) => {
  const tokens = await refresh(req.auth.sessionId);
  res.cookie(env.sessionCookieName, tokens.sessionToken, cookieOptions());
  res.cookie(env.csrfCookieName, tokens.csrfToken, csrfCookieOptions());
  res.json({ success: true, sessionToken: tokens.sessionToken, csrfToken: tokens.csrfToken });
});

const logoutHandler = asyncHandler(async (req, res) => {
  await logout(req.auth.sessionId);
  res.clearCookie(env.sessionCookieName, { path: '/', domain: env.cookieDomain });
  res.clearCookie(env.csrfCookieName, { path: '/', domain: env.cookieDomain });
  res.json({ success: true });
});

const checkEmailHandler = asyncHandler(async (req, res) => {
  const data = await checkEmail(req.body.email);
  res.json({ success: true, ...data });
});

const sendCodeHandler = asyncHandler(async (req, res) => {
  if (req.body.action === 'check') {
    const data = await checkEmail(req.body.email);
    return res.json({ success: true, ...data });
  }

  const data = await sendCode({
    email: req.body.email,
    purpose: req.body.purpose
  });
  res.json(data);
});

const confirmPasswordHandler = asyncHandler(async (req, res) => {
  const user = await confirmPassword({
    email: req.body.email,
    code: req.body.code,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    purpose: req.body.purpose
  });
  res.json({ success: true, user });
});

const setPasswordHandler = asyncHandler(async (req, res) => {
  throw new HttpError(
    410,
    'Rota descontinuada. Use POST /auth/confirm-password com codigo de verificacao por email.'
  );
});

module.exports = {
  loginHandler,
  meHandler,
  meCentralsHandler,
  refreshHandler,
  logoutHandler,
  checkEmailHandler,
  sendCodeHandler,
  confirmPasswordHandler,
  setPasswordHandler
};
