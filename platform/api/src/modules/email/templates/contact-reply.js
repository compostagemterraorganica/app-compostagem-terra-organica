function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildContactReplyEmail({ recipientName, subject, message, originalMessage }) {
  const greeting = recipientName ? `Olá, ${recipientName}.` : 'Olá.';
  const safeSubject = subject || 'Resposta — Terra Orgânica';

  const originalBlock = originalMessage
    ? `
      <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
      <p style="color: #666; font-size: 13px; margin: 0 0 8px;">Sua mensagem original:</p>
      <blockquote style="margin: 0; padding: 12px 16px; background: #f5f5f5; border-left: 3px solid #3CAA59; color: #555; white-space: pre-wrap;">
        ${escapeHtml(originalMessage)}
      </blockquote>
    `
    : '';

  const originalText = originalMessage ? `\n\n---\nSua mensagem original:\n${originalMessage}` : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333; line-height: 1.6;">
      <p>${escapeHtml(greeting)}</p>
      <div style="white-space: pre-wrap;">${escapeHtml(message)}</div>
      ${originalBlock}
      <p style="margin-top: 28px; color: #666; font-size: 13px;">
        Equipe Terra Orgânica<br />
        <a href="https://compostagemterraorganica.com.br" style="color: #2e7d32;">compostagemterraorganica.com.br</a>
      </p>
    </div>
  `.trim();

  const text = `${greeting}\n\n${message}${originalText}\n\n—\nEquipe Terra Orgânica\ncompostagemterraorganica.com.br`;

  return { subject: safeSubject, html, text };
}

module.exports = { buildContactReplyEmail };
