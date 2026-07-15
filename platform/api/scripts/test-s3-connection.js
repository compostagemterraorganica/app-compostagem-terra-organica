#!/usr/bin/env node
/**
 * Valida credenciais AWS/S3, acesso ao bucket e upload de arquivo de teste.
 *
 * Uso:
 *   cd api
 *   cp .env.example .env   # preencher S3_* e AWS_*
 *   npm run test:s3
 */

const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const {
  getS3Config,
  hasAwsCredentials,
  assertS3Configured,
  bucketExists,
  uploadBuffer,
  fileExists,
  deleteObject,
  buildPublicUrl
} = require('../src/config/s3');

const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function log(step, message) {
  console.log(`[${step}] ${message}`);
}

function fail(message, detail) {
  console.error(`\nFalha: ${message}`);
  if (detail) console.error(detail);
  process.exit(1);
}

async function checkPublicUrl(publicUrl) {
  try {
    const res = await axios.get(publicUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      validateStatus: (s) => s < 500
    });
    if (res.status === 200) {
      return { ok: true, status: res.status, bytes: res.data?.length || 0 };
    }
    return {
      ok: false,
      status: res.status,
      hint:
        res.status === 403
          ? 'Objeto existe mas nao e publico. Adicione policy de leitura publica ou use CloudFront.'
          : 'Verifique S3_PUBLIC_BASE e se o nome do bucket coincide com a URL.'
    };
  } catch (error) {
    return { ok: false, status: 0, hint: error.message };
  }
}

function bucketFromPublicBase(publicBase) {
  if (!publicBase) return null;
  try {
    const host = new URL(publicBase).hostname;
    const virtualHosted = host.match(/^(.+)\.s3[.-][a-z0-9-]+\.amazonaws\.com$/i);
    if (virtualHosted) return virtualHosted[1];
    const pathStyle = publicBase.match(
      /^https:\/\/s3[.-][a-z0-9-]+\.amazonaws\.com\/([^/?#]+)/i
    );
    if (pathStyle) return pathStyle[1];
  } catch {
    return null;
  }
  return null;
}

async function run() {
  console.log('=== Teste de conexao Amazon S3 ===\n');

  const config = getS3Config();
  log('1/6', 'Verificando variaveis de ambiente...');

  const required = ['S3_BUCKET', 'AWS_REGION', 'S3_PUBLIC_BASE'];
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

  log('2/6', `Bucket configurado: ${config.bucket}`);
  log('ok', `Regiao: ${config.region}`);
  log('ok', `Public base: ${config.publicBase}`);
  log('ok', `Media prefix: ${config.mediaPrefix}/`);

  const publicBucket = bucketFromPublicBase(config.publicBase);
  if (publicBucket && publicBucket !== config.bucket) {
    log(
      'warn',
      `S3_BUCKET="${config.bucket}" difere do bucket na URL publica ("${publicBucket}") — alinhe S3_BUCKET e S3_PUBLIC_BASE`
    );
  }

  assertS3Configured();

  log('3/6', 'Testando acesso ao bucket...');
  try {
    const exists = await bucketExists();
    if (!exists) {
      fail(`Bucket "${config.bucket}" nao existe ou as credenciais nao tem acesso`);
    }
    log('ok', 'Bucket acessivel');
  } catch (error) {
    const denied =
      error?.$metadata?.httpStatusCode === 403 ||
      error?.name === 'AccessDenied' ||
      error?.Code === 'AccessDenied';
    if (denied) {
      log(
        'warn',
        'HeadBucket negado (policy sem s3:ListBucket) — prosseguindo com teste de upload'
      );
    } else {
      throw error;
    }
  }

  const testKey = `${config.mediaPrefix}/_test/connection-${Date.now()}.png`;
  log('4/6', `Fazendo upload de teste: ${testKey}`);

  const uploaded = await uploadBuffer({
    key: testKey,
    buffer: TEST_PNG,
    mimeType: 'image/png',
    metadata: { purpose: 's3-connection-test' }
  });

  log('ok', `Upload concluido (${uploaded.sizeBytes} bytes)`);
  log('ok', `URL publica: ${uploaded.publicUrl}`);

  log('5/6', 'Verificando existencia do objeto...');
  const existsAfter = await fileExists(testKey);
  if (!existsAfter) fail('Objeto nao encontrado apos upload');
  log('ok', 'Objeto confirmado no bucket');

  log('6/6', 'Testando leitura publica da URL...');
  const publicCheck = await checkPublicUrl(uploaded.publicUrl);
  if (publicCheck.ok) {
    log('ok', `URL publica acessivel (HTTP ${publicCheck.status}, ${publicCheck.bytes} bytes)`);
  } else {
    log(
      'warn',
      `Upload OK, mas URL publica retornou HTTP ${publicCheck.status}. ${publicCheck.hint || ''}`
    );
    log(
      'warn',
      'A migracao pode prosseguir; ajuste permissoes publicas do bucket antes de ir para producao.'
    );
  }

  const cleanup = String(process.env.S3_TEST_CLEANUP ?? 'true') !== 'false';
  if (cleanup) {
    await deleteObject(testKey);
    log('ok', 'Arquivo de teste removido (S3_TEST_CLEANUP=true)');
  } else {
    log('info', `Arquivo de teste mantido: ${buildPublicUrl(testKey)}`);
  }

  console.log('\n=== S3 configurado com sucesso ===');
}

run().catch((error) => {
  const msg = error?.message || String(error);
  const code = error?.name || error?.Code;

  if (code === 'CredentialsProviderError' || msg.includes('Could not load credentials')) {
    fail(
      'Credenciais AWS invalidas ou ausentes',
      'Defina AWS_ACCESS_KEY_ID e AWS_SECRET_ACCESS_KEY no .env, ou configure AWS_PROFILE / IAM role.'
    );
  }
  if (error?.$metadata?.httpStatusCode === 403 || code === 'AccessDenied') {
    fail(
      'Permissao negada (403). Verifique: (1) S3_BUCKET correto, (2) AWS_REGION, (3) policy IAM com s3:PutObject, s3:GetObject, s3:DeleteObject e s3:ListBucket no bucket.',
      msg
    );
  }
  if (error?.$metadata?.httpStatusCode === 404 || code === 'NotFound') {
    fail(`Bucket "${process.env.S3_BUCKET}" nao encontrado na regiao ${process.env.AWS_REGION}`, msg);
  }
  fail('Erro inesperado no teste S3', msg);
});
