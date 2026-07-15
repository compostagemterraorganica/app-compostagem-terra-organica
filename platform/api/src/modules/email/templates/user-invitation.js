function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildUserInvitationEmail({ name, email, centrals, downloadUrl }) {
  const greeting = name ? `Olá, ${name}.` : 'Olá.';
  const centralList = Array.isArray(centrals) && centrals.length > 0 ? centrals : ['Nenhuma central informada'];

  const centralsHtml = centralList
    .map((central) => `<li style="margin-bottom: 4px;">${escapeHtml(central)}</li>`)
    .join('');

  const centralsText = centralList.map((central) => `- ${central}`).join('\n');

  const subject = 'Convite para o app Terra Orgânica';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333; line-height: 1.5;">
      <p>${escapeHtml(greeting)}</p>
      <p>Você foi convidado(a) a fazer parte do sistema <strong>Terra Orgânica</strong>.</p>
      <p>Você fará parte da(s) seguinte(s) central(is):</p>
      <ul style="padding-left: 20px; margin: 16px 0;">
        ${centralsHtml}
      </ul>
      <p><strong>Como começar:</strong></p>
      <ol style="padding-left: 20px; margin: 16px 0;">
        <li style="margin-bottom: 8px;">Baixe o app Terra Orgânica no link abaixo.</li>
        <li style="margin-bottom: 8px;">Abra o app e informe seu email cadastrado: <strong>${escapeHtml(email)}</strong>.</li>
        <li style="margin-bottom: 8px;">Siga as instruções no app para definir sua senha de acesso.</li>
      </ol>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${escapeHtml(downloadUrl)}"
           style="display: inline-block; background: #2e7d32; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Baixar o app Terra Orgânica
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${escapeHtml(downloadUrl)}</p>
      <p style="color: #666; font-size: 12px; margin-top: 24px;">Terra Orgânica</p>
    </div>
  `.trim();

  const text = [
    greeting,
    '',
    'Você foi convidado(a) a fazer parte do sistema Terra Orgânica.',
    '',
    'Você fará parte da(s) seguinte(s) central(is):',
    centralsText,
    '',
    'Como começar:',
    '1. Baixe o app Terra Orgânica:',
    downloadUrl,
    `2. Abra o app e informe seu email cadastrado: ${email}`,
    '3. Siga as instruções no app para definir sua senha de acesso.'
  ].join('\n');

  return { subject, html, text };
}

module.exports = { buildUserInvitationEmail };
