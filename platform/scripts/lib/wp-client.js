const axios = require('axios');

function buildClientFromEnv({ requireAuth = false } = {}) {
  const baseUrl = process.env.LEGACY_BASE_URL || process.env.WORDPRESS_SITE_URL || process.env.WORDPRESS_BASE_URL;
  const email = process.env.WORDPRESS_EMAIL;
  const password = process.env.WORDPRESS_APP_PASS || process.env.WORDPRESS_PASS;

  if (!baseUrl) {
    throw new Error('LEGACY_BASE_URL (ou WORDPRESS_SITE_URL/WORDPRESS_BASE_URL) nao configurado.');
  }

  if (requireAuth && (!email || !password)) {
    throw new Error('Credenciais WordPress ausentes. Configure WORDPRESS_EMAIL e WORDPRESS_APP_PASS (ou WORDPRESS_PASS).');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (email && password) {
    const token = Buffer.from(`${email}:${password}`).toString('base64');
    headers.Authorization = `Basic ${token}`;
  }

  const client = axios.create({
    baseURL: baseUrl.replace(/\/$/, ''),
    headers,
    timeout: Number(process.env.MIGRATION_HTTP_TIMEOUT_MS || 30000)
  });

  return { client, baseUrl: baseUrl.replace(/\/$/, ''), hasAuth: Boolean(email && password) };
}

async function fetchPaginated(client, endpointPath, perPage = 100, extraParams = {}) {
  const all = [];
  let page = 1;

  while (true) {
    const response = await client.get(endpointPath, {
      params: { per_page: perPage, page, ...extraParams }
    });

    const rows = Array.isArray(response.data) ? response.data : [];
    all.push(...rows);

    if (rows.length < perPage) break;
    page += 1;
  }

  return all;
}

async function fetchJetRelMap(client, relationId = 13) {
  const response = await client.get(`/wp-json/jet-rel/${relationId}`);
  return response.data || {};
}

module.exports = {
  buildClientFromEnv,
  fetchPaginated,
  fetchJetRelMap
};
