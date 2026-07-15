function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildAdminInvitationEmail({ name, email, adminPanelUrl }) {
  const greeting = name ? `Olá, ${name}.` : 'Olá.';
  const subject = 'Convite para o painel administrativo Terra Orgânica';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #333; line-height: 1.5;">
      <p>${escapeHtml(greeting)}</p>
      <p>Você foi convidado(a) a acessar o <strong>painel administrativo</strong> do site Terra Orgânica como administrador.</p>
      <p><strong>Como começar:</strong></p>
      <ol style="padding-left: 20px; margin: 16px 0;">
        <li style="margin-bottom: 8px;">Acesse o painel administrativo pelo link abaixo.</li>
        <li style="margin-bottom: 8px;">Na tela de login, clique em <strong>Primeiro acesso</strong>.</li>
        <li style="margin-bottom: 8px;">Informe seu email cadastrado: <strong>${escapeHtml(email)}</strong>.</li>
        <li style="margin-bottom: 8px;">Você receberá um código por email para definir sua senha de acesso.</li>
        <li style="margin-bottom: 8px;">Depois, faça login com seu email e a senha definida.</li>
      </ol>
      <p style="text-align: center; margin: 28px 0;">
        <a href="${escapeHtml(adminPanelUrl)}"
           style="display: inline-block; background: #0274be; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">
          Acessar o painel administrativo
        </a>
      </p>
      <p style="color: #666; font-size: 13px;">Se o botão não funcionar, copie e cole este endereço no navegador:<br>${escapeHtml(adminPanelUrl)}</p>
      <p style="color: #666; font-size: 12px; margin-top: 24px;">Terra Orgânica</p>
    </div>
  `.trim();

  const text = [
    greeting,
    '',
    'Você foi convidado(a) a acessar o painel administrativo do site Terra Orgânica como administrador.',
    '',
    'Como começar:',
    '1. Acesse o painel administrativo:',
    adminPanelUrl,
    '2. Na tela de login, clique em Primeiro acesso.',
    `3. Informe seu email cadastrado: ${email}`,
    '4. Você receberá um código por email para definir sua senha de acesso.',
    '5. Depois, faça login com seu email e a senha definida.'
  ].join('\n');

  return { subject, html, text };
}

module.exports = { buildAdminInvitationEmail };
