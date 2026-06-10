#!/usr/bin/env node
/**
 * Valida credenciais GCS, acesso ao bucket e upload de arquivo de teste.
 *
 * Uso:
 *   cd api
 *   cp .env.example .env   # preencher GCS_*
 *   npm run test:gcs
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true });

const {
  getGcsConfig,
  assertGcsConfigured,
  getBucket,
  uploadBuffer,
  fileExists,
  deleteObject,
  buildPublicUrl
} = require('../src/config/gcs');

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
          ? 'Objeto existe mas nao e publico. Conceda allUsers → Leitor de objetos no bucket.'
          : 'Verifique GCS_PUBLIC_BASE e permissoes do bucket.'
    };
  } catch (error) {
    return { ok: false, status: 0, hint: error.message };
  }
}

async function run() {
  console.log('=== Teste de conexao Google Cloud Storage ===\n');

  const config = getGcsConfig();
  log('1/6', 'Verificando variaveis de ambiente...');

  const required = ['GCS_BUCKET', 'GOOGLE_APPLICATION_CREDENTIALS', 'GCS_PUBLIC_BASE'];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    fail(`Variaveis ausentes: ${missing.join(', ')}`, 'Preencha api/.env conforme .env.example');
  }

  if (!fs.existsSync(config.credentialsPath)) {
    fail(`Arquivo de credenciais nao encontrado: ${config.credentialsPath}`);
  }

  try {
    const creds = JSON.parse(fs.readFileSync(config.credentialsPath, 'utf8'));
    log('ok', `Credencial: service account "${creds.client_email || 'desconhecido'}"`);
  } catch (error) {
    fail('Arquivo GOOGLE_APPLICATION_CREDENTIALS nao e um JSON valido', error.message);
  }

  log('2/6', `Bucket configurado: ${config.bucket}`);
  log('ok', `Public base: ${config.publicBase}`);
  log('ok', `Media prefix: ${config.mediaPrefix}/`);

  assertGcsConfigured();

  log('3/6', 'Testando acesso ao bucket...');
  const bucket = getBucket();
  const [exists] = await bucket.exists();
  if (!exists) {
    fail(`Bucket "${config.bucket}" nao existe ou a service account nao tem acesso`);
  }
  log('ok', 'Bucket acessivel');

  const testKey = `${config.mediaPrefix}/_test/connection-${Date.now()}.png`;
  log('4/6', `Fazendo upload de teste: ${testKey}`);

  const uploaded = await uploadBuffer({
    key: testKey,
    buffer: TEST_PNG,
    mimeType: 'image/png',
    metadata: { purpose: 'gcs-connection-test' }
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

  const cleanup = String(process.env.GCS_TEST_CLEANUP ?? 'true') !== 'false';
  if (cleanup) {
    await deleteObject(testKey);
    log('ok', 'Arquivo de teste removido (GCS_TEST_CLEANUP=true)');
  } else {
    log('info', `Arquivo de teste mantido: ${buildPublicUrl(testKey)}`);
  }

  console.log('\n=== GCS configurado com sucesso ===');
  console.log('Proximo passo: executar o plano de migracao de midia (Fase 0).');
}

run().catch((error) => {
  const msg = error?.message || String(error);
  if (msg.includes('Could not load the default credentials')) {
    fail('Credenciais GCS invalidas ou caminho incorreto', msg);
  }
  if (error?.code === 403) {
    fail(
      'Permissao negada (403). A service account precisa de Storage Object Admin (ou Creator+Viewer) no bucket.',
      msg
    );
  }
  fail('Erro inesperado no teste GCS', msg);
});
