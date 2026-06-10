import apiClient from './apiClient';

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
    const data = await apiClient.postJson('/volume-verifications', payload);
    return data?.data;
  }
};

export default volumeVerificationService;
