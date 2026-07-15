import apiClient from './apiClient';

export const centralTagsService = {
  async listByCentral(centralId) {
    const params = new URLSearchParams({ central_id: String(centralId) });
    const data = await apiClient.getJson(`/central-tags?${params.toString()}`);
    return data?.data || [];
  },

  async create({ central_id, name }) {
    const data = await apiClient.postJson('/central-tags', { central_id, name });
    return data?.data;
  },

  async update(id, { name }) {
    const data = await apiClient.putJson(`/central-tags/${id}`, { name });
    return data?.data;
  },

  async delete(id) {
    await apiClient.deleteJson(`/central-tags/${id}`);
  }
};

export default centralTagsService;
