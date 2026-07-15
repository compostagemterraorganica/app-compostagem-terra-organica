import apiClient from './apiClient';
import { isNetworkError } from './apiFetch';

function tagIdsMatch(rowTags, payloadTagIds) {
  const expected = (payloadTagIds || []).map(Number).sort((a, b) => a - b);
  const actual = (rowTags || []).map((t) => Number(t.id)).sort((a, b) => a - b);
  if (expected.length !== actual.length) return false;
  return expected.every((id, i) => id === actual[i]);
}

function matchesPayload(row, payload) {
  if (!row) return false;
  if (Number(row.central_id) !== Number(payload.central_id)) return false;
  if (Number(row.volume_liters) !== Number(payload.volume_liters)) return false;
  if (Number(row.volume_kg) !== Number(payload.volume_kg)) return false;
  if ((row.waste_type || 'alimentares') !== (payload.waste_type || 'alimentares')) return false;
  if (row.title !== payload.title) return false;
  if (payload.measurement_date && row.measurement_date) {
    const rowDate = String(row.measurement_date).slice(0, 10);
    if (rowDate !== payload.measurement_date) return false;
  }
  const expectedLink = payload.video_link || '';
  const rowLink = row.video_link || '';
  if (expectedLink && rowLink !== expectedLink) return false;
  if (!tagIdsMatch(row.tags, payload.tag_ids)) return false;
  return true;
}

async function findCreatedVerification(payload) {
  const data = await apiClient.getJson(
    `/volume-verifications?central_id=${payload.central_id}&limit=10`
  );
  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows.find((row) => matchesPayload(row, payload)) || null;
}

export const volumeVerificationService = {
  async listByCentral(centralId, { limit = 100, page = 1 } = {}) {
    const params = new URLSearchParams({
      central_id: String(centralId),
      limit: String(limit),
      page: String(page)
    });
    const data = await apiClient.getJson(`/volume-verifications?${params.toString()}`);
    return data?.data || [];
  },

  async create(payload) {
    try {
      const data = await apiClient.postJson('/volume-verifications', payload);
      return data?.data;
    } catch (error) {
      if (!isNetworkError(error)) throw error;

      const created = await findCreatedVerification(payload);
      if (created) return created;

      throw error;
    }
  }
};

export default volumeVerificationService;
