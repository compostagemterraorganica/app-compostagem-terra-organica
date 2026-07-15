function buildVerificationCodeEmail({ name, code, purpose, ttlMinutes }) {
  const isSetup = purpose === 'setup';
  const subject = isSetup
    ? 'Primeiro acesso - código de verificação Terra Orgânica'
    : 'Redefinição de senha - código Terra Orgânica';

  const intro = isSetup
    ? 'Você solicitou definir sua senha no app Terra Orgânica.'
    : 'Você solicitou redefinir sua senha no app Terra Orgânica.';

  const greeting = name ? `Olá, ${name}.` : 'Olá.';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
      <p>${greeting}</p>
      <p>${intro}</p>
      <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold; text-align: center; margin: 24px 0;">
        ${code}
      </p>
      <p>Este código expira em ${ttlMinutes} minutos.</p>
      <p>Se você não solicitou este email, ignore esta mensagem.</p>
      <p style="color: #666; font-size: 12px;">Terra Orgânica</p>
    </div>
  `.trim();

  const text = `${greeting}\n\n${intro}\n\nSeu código: ${code}\n\nVálido por ${ttlMinutes} minutos.`;

  return { subject, html, text };
}

module.exports = { buildVerificationCodeEmail };
