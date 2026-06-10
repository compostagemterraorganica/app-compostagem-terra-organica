const { z } = require('zod');
const { pool } = require('../../config/db');
const { HttpError } = require('../../utils/httpError');

const contatoSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(''),
  message: z.string().min(1)
});

const financiadorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1)
});

const centralRegistrationSchema = z.object({
  centralName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  city: z.string().min(1),
  state: z.string().min(2)
});

async function insertSubmission({ formType, parsed }) {
  const result = await pool.query(
    `INSERT INTO form_submissions (form_type, payload_json, name, email, phone, message, status, submitted_at)
     VALUES ($1, $2::jsonb, $3, $4, $5, $6, 'new', NOW())
     RETURNING id, form_type, name, email, phone, message, status, submitted_at`,
    [
      formType,
      JSON.stringify(parsed.data),
      parsed.data.name || parsed.data.contactName || null,
      parsed.data.email,
      parsed.data.phone || null,
      parsed.data.message || null
    ]
  );
  return result.rows[0];
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

async function createCentralRegistrationSubmission(payload) {
  const parsed = centralRegistrationSchema.safeParse(payload);
  if (!parsed.success) throw new HttpError(400, 'Payload invalido', parsed.error.flatten());
  const result = await pool.query(
    `INSERT INTO form_submissions (form_type, payload_json, name, email, message, status, submitted_at)
     VALUES ('central-registration', $1::jsonb, $2, $3, $4, 'new', NOW())
     RETURNING id, form_type, name, email, message, status, submitted_at`,
    [
      JSON.stringify(parsed.data),
      parsed.data.contactName,
      parsed.data.email,
      `${parsed.data.centralName} — ${parsed.data.city}/${parsed.data.state}`
    ]
  );
  return result.rows[0];
}

async function listSubmissions({ formType } = {}) {
  const values = [];
  let where = '';
  if (formType) {
    where = 'WHERE form_type = $1';
    values.push(formType);
  }
  const result = await pool.query(
    `SELECT id, form_type, payload_json, name, email, phone, message, status, submitted_at
     FROM form_submissions
     ${where}
     ORDER BY submitted_at DESC
     LIMIT 500`,
    values
  );
  return result.rows;
}

module.exports = {
  createContatoSubmission,
  createFinanciadorSubmission,
  createContactSubmission,
  createCentralRegistrationSubmission,
  listSubmissions
};
