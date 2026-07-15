const env = require('../../config/env');
const { HttpError } = require('../../utils/httpError');
const { isSesConfigured, sendEmail } = require('../../config/ses');
const { buildVerificationCodeEmail } = require('./templates/verification-code');
const { buildUserInvitationEmail } = require('./templates/user-invitation');
const { buildAdminInvitationEmail } = require('./templates/admin-invitation');
const { buildContactReplyEmail } = require('./templates/contact-reply');
const { buildFormSubmissionNotificationEmail } = require('./templates/form-submission-notification');

function assertEmailConfigured() {
  if (!isSesConfigured() || !env.ses.from) {
    throw new HttpError(500, 'Servico de email nao configurado (AWS_REGION / SES_FROM)');
  }
}

async function sendVerificationCode({ to, name, code, purpose }) {
  assertEmailConfigured();

  const { subject, html, text } = buildVerificationCodeEmail({
    name,
    code,
    purpose,
    ttlMinutes: env.ses.codeTtlMinutes
  });

  try {
    return await sendEmail({ to, subject, html, text });
  } catch (error) {
    console.error('[email] SES error:', error?.message || error);
    throw new HttpError(502, 'Falha ao enviar email de verificacao');
  }
}

async function sendUserInvitation({ to, name, email, centrals, downloadUrl }) {
  assertEmailConfigured();

  const { subject, html, text } = buildUserInvitationEmail({
    name,
    email: email || to,
    centrals,
    downloadUrl: downloadUrl || env.appDownloadUrl
  });

  try {
    return await sendEmail({ to, subject, html, text });
  } catch (error) {
    console.error('[email] SES invitation error:', error?.message || error);
    throw new HttpError(502, 'Falha ao enviar email de convite');
  }
}

async function sendAdminInvitation({ to, name, email, adminPanelUrl }) {
  assertEmailConfigured();

  const { subject, html, text } = buildAdminInvitationEmail({
    name,
    email: email || to,
    adminPanelUrl: adminPanelUrl || env.adminPanelUrl
  });

  try {
    return await sendEmail({ to, subject, html, text });
  } catch (error) {
    console.error('[email] SES admin invitation error:', error?.message || error);
    throw new HttpError(502, 'Falha ao enviar email de convite administrativo');
  }
}

async function sendContactReply({ to, recipientName, subject, message, originalMessage }) {
  assertEmailConfigured();

  const { subject: emailSubject, html, text } = buildContactReplyEmail({
    recipientName,
    subject,
    message,
    originalMessage
  });

  try {
    return await sendEmail({ to, subject: emailSubject, html, text });
  } catch (error) {
    console.error('[email] SES contact reply error:', error?.message || error);
    throw new HttpError(502, 'Falha ao enviar email de resposta');
  }
}

async function sendFormSubmissionNotification({ formType, pageSlug, payload, submissionId }) {
  const to = env.formNotificationEmail;
  if (!to) return null;
  if (!isSesConfigured() || !env.ses.from) {
    console.warn('[email] FORM_NOTIFICATION_EMAIL definido, mas SES nao configurado — notificacao ignorada');
    return null;
  }

  const { subject, html, text } = buildFormSubmissionNotificationEmail({
    formType,
    pageSlug,
    payload,
    submissionId
  });

  try {
    return await sendEmail({ to, subject, html, text });
  } catch (error) {
    console.error('[email] SES form notification error:', error?.message || error);
    return null;
  }
}

module.exports = {
  sendVerificationCode,
  sendUserInvitation,
  sendAdminInvitation,
  sendContactReply,
  sendFormSubmissionNotification
};
