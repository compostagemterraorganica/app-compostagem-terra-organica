import { apiFetch } from './apiFetch';

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeCentral(central) {
  return {
    id: Number(central.id),
    name: central.name,
    slug: central.slug
  };
}

export const userCentralService = {
  async getCurrentUserCentrals() {
    const response = await apiFetch('/auth/me/centrals');
    const data = await parseJsonResponse(response);

    if (!response.ok) {
      const message =
        (data && typeof data === 'object' && (data.message || data.error)) ||
        `Erro HTTP ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    const centrals = Array.isArray(data?.data) ? data.data : [];
    return centrals.map(normalizeCentral);
  }
};

export default userCentralService;
