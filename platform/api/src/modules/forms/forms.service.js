const { z } = require('zod');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');
const { sendContactReply, sendFormSubmissionNotification } = require('../email/email.service');

const pageSlugField = z.string().optional().default('');

const contatoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  message: z.string().min(1),
  pageSlug: pageSlugField
});

const financiadorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
  pageSlug: pageSlugField
});

const centralRegistrationSchema = z.object({
  centralName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  city: z.string().min(1),
  state: z.string().min(2),
  pageSlug: pageSlugField
});

const replySchema = z.object({
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(10000)
});

// Rotas React sem registro na tabela pages (slug → título exibido no admin)
const STATIC_PAGE_TITLES = {
  'cadastro-de-centrais': 'Cadastro de Centrais'
};

const STATIC_PAGE_TITLE_CASE = Object.entries(STATIC_PAGE_TITLES)
  .map(([slug, title]) => `WHEN '${slug}' THEN '${title.replace(/'/g, "''")}'`)
  .join('\n      ');

const SUBMISSION_COLUMNS = `
  s.id, s.form_type, s.page_slug, s.payload_json, s.name, s.email, s.phone, s.message,
  s.status, s.submitted_at, s.read_at, s.replied_at, s.reply_subject, s.reply_body,
  COALESCE(
    p.title,
    CASE s.page_slug
      ${STATIC_PAGE_TITLE_CASE}
      ELSE NULL
    END
  ) AS page_title
`;

function stripPageSlug(data) {
  const { pageSlug, ...rest } = data;
  return { pageSlug: pageSlug || null, payload: rest };
}

function notifyFormSubmission({ formType, pageSlug, payload, submissionId }) {
  sendFormSubmissionNotification({ formType, pageSlug, payload, submissionId }).catch((error) => {
    console.error('[forms] Falha ao enviar notificacao por email:', error?.message || error);
  });
}

async function insertSubmission({ formType, parsed }) {
  const { pageSlug, payload } = stripPageSlug(parsed.data);
  const result = await pool.query(
    `INSERT INTO form_submissions (form_type, page_slug, payload_json, name, email, phone, message, status, submitted_at)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, 'new', NOW())
     RETURNING id, form_type, page_slug, name, email, phone, message, status, submitted_at`,
    [
      formType,
      pageSlug,
      JSON.stringify(payload),
      payload.name || payload.contactName || null,
      payload.email,
      payload.phone || null,
      payload.message || null
    ]
  );
  const row = result.rows[0];
  notifyFormSubmission({
    formType,
    pageSlug,
    payload,
    submissionId: row.id
  });
  return row;
}

async function createContatoSubmission(payload) {
  const parsed = contatoSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  return insertSubmission({ formType: 'contato', parsed });
}

async function createFinanciadorSubmission(payload) {
  const parsed = financiadorSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  return insertSubmission({ formType: 'financiador', parsed });
}

async function createContactSubmission(payload) {
  return createContatoSubmission(payload);
}

async function createCentralRegistrationSubmission(body) {
  const parsed = centralRegistrationSchema.safeParse(body);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const { pageSlug, payload: formData } = stripPageSlug(parsed.data);
  const result = await pool.query(
    `INSERT INTO form_submissions (form_type, page_slug, payload_json, name, email, message, status, submitted_at)
     VALUES ('central-registration', $1, $2::jsonb, $3, $4, $5, 'new', NOW())
     RETURNING id, form_type, page_slug, name, email, message, status, submitted_at`,
    [
      pageSlug,
      JSON.stringify(formData),
      formData.contactName,
      formData.email,
      `${formData.centralName} — ${formData.city}/${formData.state}`
    ]
  );
  const row = result.rows[0];
  notifyFormSubmission({
    formType: 'central-registration',
    pageSlug,
    payload: formData,
    submissionId: row.id
  });
  return row;
}

async function listSubmissions({ formType, status, pageSlug } = {}) {
  const values = [];
  const conditions = [];

  if (formType) {
    values.push(formType);
    conditions.push(`s.form_type = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`s.status = $${values.length}`);
  }
  if (pageSlug) {
    values.push(pageSlug);
    conditions.push(`s.page_slug = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await pool.query(
    `SELECT ${SUBMISSION_COLUMNS}
     FROM form_submissions s
     LEFT JOIN pages p ON p.slug = s.page_slug
     ${where}
     ORDER BY s.submitted_at DESC
     LIMIT 500`,
    values
  );
  return result.rows;
}

async function getSubmissionById(id) {
  const result = await pool.query(
    `SELECT ${SUBMISSION_COLUMNS}
     FROM form_submissions s
     LEFT JOIN pages p ON p.slug = s.page_slug
     WHERE s.id = $1`,
    [id]
  );
  if (!result.rows[0]) throw new HttpError(404, 'Mensagem nao encontrada');
  return result.rows[0];
}

async function markSubmissionAsRead(id) {
  const result = await pool.query(
    `UPDATE form_submissions
     SET status = CASE WHEN status = 'new' THEN 'read' ELSE status END,
         read_at = COALESCE(read_at, NOW())
     WHERE id = $1
     RETURNING id, status, read_at`,
    [id]
  );
  if (!result.rows[0]) throw new HttpError(404, 'Mensagem nao encontrada');
  return getSubmissionById(id);
}

async function getUnreadCount() {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM form_submissions WHERE status = 'new'`
  );
  return result.rows[0].count;
}

async function replyToSubmission(id, payload) {
  const parsed = replySchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());

  const submission = await getSubmissionById(id);
  if (!submission.email) throw new HttpError(400, 'Mensagem sem email de destino');

  await sendContactReply({
    to: submission.email,
    recipientName: submission.name,
    subject: parsed.data.subject,
    message: parsed.data.message,
    originalMessage: submission.message
  });

  const result = await pool.query(
    `UPDATE form_submissions
     SET status = 'replied',
         replied_at = NOW(),
         read_at = COALESCE(read_at, NOW()),
         reply_subject = $2,
         reply_body = $3
     WHERE id = $1
     RETURNING id`,
    [id, parsed.data.subject, parsed.data.message]
  );
  if (!result.rows[0]) throw new HttpError(404, 'Mensagem nao encontrada');

  return getSubmissionById(id);
}

module.exports = {
  createContatoSubmission,
  createFinanciadorSubmission,
  createContactSubmission,
  createCentralRegistrationSubmission,
  listSubmissions,
  getSubmissionById,
  markSubmissionAsRead,
  getUnreadCount,
  replyToSubmission
};
