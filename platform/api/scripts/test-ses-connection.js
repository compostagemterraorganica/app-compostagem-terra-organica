#!/usr/bin/env node
/**
 * Valida credenciais AWS/SES, identidade remetente e envio de e-mail de teste.
 *
 * Uso:
 *   cd api
 *   cp .env.example .env   # preencher AWS_*, SES_FROM, SES_TEST_TO
 *   npm run test:ses
 *
 * Opcional:
 *   npm run test:ses -- --to seu@gmail.com
 *   SES_TEST_SKIP_SEND=true   # so valida config/conta/identidade, sem enviar
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const {
  hasAwsCredentials,
  getSesConfig,
  parseFromAddress,
  assertSesConfigured,
  getAccountInfo,
  getIdentityStatus,
  sendEmail
} = require('../src/config/ses');

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

function fail(message, detail) {
  console.error(`\nFalha: ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

function parseArgs(argv) {
  const toIdx = argv.indexOf('--to');
  const to = toIdx >= 0 ? argv[toIdx + 1] : process.env.SES_TEST_TO?.trim();
  const skipSend = String(process.env.SES_TEST_SKIP_SEND ?? 'false') === 'true';
  return { to, skipSend };
}

function domainFromEmail(email) {
  const at = String(email).lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : email;
}

async function run() {
  console.log('=== Teste de conexao Amazon SES ===\n');

  const { to, skipSend } = parseArgs(process.argv.slice(2));
  const config = getSesConfig();

  log('1/5', 'Verificando variaveis de ambiente...');

  const required = ['AWS_REGION', 'SES_FROM'];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    fail(`Variaveis ausentes: ${missing.join(', ')}`, 'Preencha api/.env conforme .env.example');
  }

  if (hasAwsCredentials()) {
    if (process.env.AWS_PROFILE?.trim()) {
      log('ok', `Credencial: AWS profile "${process.env.AWS_PROFILE.trim()}"`);
    } else {
      const keyId = process.env.AWS_ACCESS_KEY_ID.trim();
      log('ok', `Credencial: access key ${keyId.slice(0, 4)}...${keyId.slice(-4)}`);
    }
  } else {
    log(
      'warn',
      'AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY nao definidos — tentando credenciais padrao (IAM role, ~/.aws/credentials)'
    );
  }

  const parsedFrom = parseFromAddress(config.from);
  log('ok', `Regiao: ${config.region}`);
  log('ok', `Remetente: ${config.from}`);
  log('ok', `Email remetente: ${parsedFrom.email}`);

  assertSesConfigured();

  log('2/5', 'Consultando conta SES...');
  let account;
  try {
    account = await getAccountInfo();
  } catch (error) {
    fail('Nao foi possivel consultar a conta SES', error.message);
  }

  if (!account.available) {
    log(
      'warn',
      'GetAccount negado (policy sem ses:GetAccount) — prosseguindo com verificacao de identidade/envio'
    );
  } else if (account.productionAccessEnabled) {
    log('ok', 'Conta com acesso de producao (fora do sandbox)');
  } else {
    log(
      'warn',
      'Conta ainda em sandbox — so e possivel enviar para enderecos verificados no SES'
    );
  }

  log('3/5', 'Verificando identidade remetente...');
  const domain = domainFromEmail(parsedFrom.email);
  const [emailIdentity, domainIdentity] = await Promise.all([
    getIdentityStatus(parsedFrom.email),
    domain !== parsedFrom.email ? getIdentityStatus(domain) : null
  ]);

  const senderVerified = emailIdentity.verified || domainIdentity?.verified;
  const identityCheckUnavailable =
    emailIdentity.checkAvailable === false || domainIdentity?.checkAvailable === false;

  if (identityCheckUnavailable) {
    log(
      'warn',
      'GetEmailIdentity negado (policy sem ses:GetEmailIdentity) — prosseguindo para envio de teste'
    );
  } else if (emailIdentity.verified) {
    log('ok', `Email ${parsedFrom.email} verificado (${emailIdentity.verificationStatus})`);
  } else if (domainIdentity?.verified) {
    log('ok', `Dominio ${domain} verificado (${domainIdentity.verificationStatus})`);
  } else {
    log(
      'warn',
      `Remetente nao verificado (email: ${emailIdentity.verificationStatus}, dominio: ${domainIdentity?.verificationStatus || 'N/A'})`
    );
    log('warn', 'Verifique o dominio ou o email no console SES antes de enviar em producao.');
  }

  if (!to && !skipSend) {
    log('4/5', 'Envio de teste ignorado (defina SES_TEST_TO ou --to)');
    log(
      'info',
      'Exemplo: SES_TEST_TO=seu@gmail.com npm run test:ses'
    );
    console.log('\n=== SES configurado (sem envio de teste) ===');
    return;
  }

  if (skipSend) {
    log('4/5', 'Envio ignorado (SES_TEST_SKIP_SEND=true)');
    console.log('\n=== SES configurado com sucesso ===');
    return;
  }

  log('4/5', `Enviando e-mail de teste para ${to}...`);

  if (
    account.productionAccessEnabled === false &&
    to !== parsedFrom.email &&
    !emailIdentity.verified
  ) {
    log(
      'warn',
      'Sandbox: destinatario precisa estar verificado no SES, salvo se for o proprio remetente verificado'
    );
  }

  try {
    const result = await sendEmail({
      to,
      subject: 'Teste SES — Terra Organica',
      text: 'E-mail de teste enviado pelo script test-ses-connection.js.',
      html: '<p>E-mail de teste enviado pelo script <strong>test-ses-connection.js</strong>.</p>'
    });
    log('ok', `E-mail enviado (MessageId: ${result.messageId})`);
  } catch (error) {
    const msg = error?.message || String(error);
    if (error.name === 'MessageRejected') {
      fail(
        'SES rejeitou o envio. Verifique identidade remetente, sandbox e destinatario.',
        msg
      );
    }
    if (error.name === 'AccessDenied' || error.$metadata?.httpStatusCode === 403) {
      fail(
        'Permissao negada (403). Adicione ses:SendEmail na policy IAM do usuario.',
        msg
      );
    }
    fail('Erro ao enviar e-mail de teste', msg);
  }

  log('5/5', 'Verifique a caixa de entrada (e spam) do destinatario');

  console.log('\n=== SES configurado com sucesso ===');
  if (!senderVerified && !identityCheckUnavailable) {
    console.log('Atencao: remetente ainda nao aparece como verificado no SES.');
  }
}

run().catch((error) => {
  const msg = error?.message || String(error);
  if (error.name === 'CredentialsProviderError' || msg.includes('Could not load credentials')) {
    fail(
      'Credenciais AWS invalidas ou ausentes',
      'Defina AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env, ou configure AWS_PROFILE / IAM role.'
    );
  }
  fail('Erro inesperado no teste SES', msg);
});
