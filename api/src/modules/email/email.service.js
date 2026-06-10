const env = require('../../config/env');
const { HttpError } = require('../../utils/httpError');
const { getResendClient } = require('./resend.client');
const { buildVerificationCodeEmail } = require('./templates/verification-code');
const { buildUserInvitationEmail } = require('./templates/user-invitation');

async function sendVerificationCode({ to, name, code, purpose }) {
  if (!env.resend.apiKey || !env.resend.from) {
    throw new HttpError(500, 'Servico de email nao configurado (RESEND_API_KEY / RESEND_FROM)');
  }

  const resend = getResendClient();
  const { subject, html, text } = buildVerificationCodeEmail({
    name,
    code,
    purpose,
    ttlMinutes: env.resend.codeTtlMinutes
  });

  const { data, error } = await resend.emails.send({
    from: env.resend.from,
    to,
    subject,
    html,
    text
  });

  if (error) {
    console.error('[email] Resend error:', error);
    throw new HttpError(502, 'Falha ao enviar email de verificacao');
  }

  return data;
}

async function sendUserInvitation({ to, name, email, centrals, downloadUrl }) {
  if (!env.resend.apiKey || !env.resend.from) {
    throw new HttpError(500, 'Servico de email nao configurado (RESEND_API_KEY / RESEND_FROM)');
  }

  const resend = getResendClient();
  const { subject, html, text } = buildUserInvitationEmail({
    name,
    email: email || to,
    centrals,
    downloadUrl: downloadUrl || env.appDownloadUrl
  });

  const { data, error } = await resend.emails.send({
    from: env.resend.from,
    to,
    subject,
    html,
    text
  });

  if (error) {
    console.error('[email] Resend invitation error:', error);
    throw new HttpError(502, 'Falha ao enviar email de convite');
  }

  return data;
}

module.exports = { sendVerificationCode, sendUserInvitation };
