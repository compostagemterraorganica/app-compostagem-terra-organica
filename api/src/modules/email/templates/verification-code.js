function buildVerificationCodeEmail({ name, code, purpose, ttlMinutes }) {
  const isSetup = purpose === 'setup';
  const subject = isSetup
    ? 'Primeiro acesso - codigo de verificacao Terra Organica'
    : 'Redefinicao de senha - codigo Terra Organica';

  const intro = isSetup
    ? 'Voce solicitou definir sua senha no app Terra Organica.'
    : 'Voce solicitou redefinir sua senha no app Terra Organica.';

  const greeting = name ? `Ola, ${name}.` : 'Ola.';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
      <p>${greeting}</p>
      <p>${intro}</p>
      <p style="font-size: 28px; letter-spacing: 6px; font-weight: bold; text-align: center; margin: 24px 0;">
        ${code}
      </p>
      <p>Este codigo expira em ${ttlMinutes} minutos.</p>
      <p>Se voce nao solicitou este email, ignore esta mensagem.</p>
      <p style="color: #666; font-size: 12px;">Terra Organica</p>
    </div>
  `.trim();

  const text = `${greeting}\n\n${intro}\n\nSeu codigo: ${code}\n\nValido por ${ttlMinutes} minutos.`;

  return { subject, html, text };
}

module.exports = { buildVerificationCodeEmail };
