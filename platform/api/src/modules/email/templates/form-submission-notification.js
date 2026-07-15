function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const FORM_TYPE_LABELS = {
  contato: 'Contato',
  financiador: 'Financiador',
  'central-registration': 'Cadastro de Central'
};

const FIELD_LABELS = {
  name: 'Nome',
  contactName: 'Nome do contato',
  centralName: 'Nome da central',
  email: 'E-mail',
  phone: 'Telefone',
  message: 'Mensagem',
  city: 'Cidade',
  state: 'Estado'
};

function formatFieldLabel(key) {
  return FIELD_LABELS[key] || key;
}

function buildFormSubmissionNotificationEmail({ formType, pageSlug, payload, submissionId }) {
  const formLabel = FORM_TYPE_LABELS[formType] || formType;
  const subject = `Novo formulário: ${formLabel}`;

  const rows = Object.entries(payload || {})
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(
      ([key, value]) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #666; vertical-align: top; width: 140px;">${escapeHtml(formatFieldLabel(key))}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; white-space: pre-wrap;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  const metaRows = [
    pageSlug
      ? `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #666;">Página</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${escapeHtml(pageSlug)}</td></tr>`
      : '',
    submissionId
      ? `<tr><td style="padding: 8px 12px; border-bottom: 1px solid #eee; color: #666;">ID</td><td style="padding: 8px 12px; border-bottom: 1px solid #eee;">#${escapeHtml(submissionId)}</td></tr>`
      : ''
  ].join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.5;">
      <h2 style="margin: 0 0 16px; font-size: 20px; color: #2e7d32;">${escapeHtml(formLabel)}</h2>
      <p style="margin: 0 0 20px; color: #666;">Um novo formulário foi enviado no site.</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        ${metaRows}
        ${rows}
      </table>
    </div>
  `.trim();

  const textLines = [
    formLabel,
    '',
    'Um novo formulário foi enviado no site.',
    '',
    ...(pageSlug ? [`Página: ${pageSlug}`] : []),
    ...(submissionId ? [`ID: #${submissionId}`] : []),
    '',
    ...Object.entries(payload || {})
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([key, value]) => `${formatFieldLabel(key)}: ${value}`)
  ];

  return { subject, html, text: textLines.join('\n') };
}

module.exports = { buildFormSubmissionNotificationEmail };
