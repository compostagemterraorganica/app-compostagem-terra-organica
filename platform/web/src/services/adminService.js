import api from '../lib/api'

export const adminService = {
  listUsers: async () => (await api.get('/users')).data.data,
  getUser: async (id) => (await api.get(`/users/${id}`)).data.data,
  createUser: async (payload) => (await api.post('/users', payload)).data.data,
  updateUser: async (id, payload) => (await api.put(`/users/${id}`, payload)).data.data,
  updateUserPassword: async (id, password) => (await api.patch(`/users/${id}/password`, { password })).data,
  deleteUser: async (id) => (await api.delete(`/users/${id}`)).data,

  listCentrals: async () => (await api.get('/centrals')).data.data,
  getCentral: async (id) => (await api.get(`/centrals/${id}`)).data.data,
  createCentral: async (payload) => (await api.post('/centrals', payload)).data.data,
  updateCentral: async (id, payload) => (await api.put(`/centrals/${id}`, payload)).data.data,
  deleteCentral: async (id) => (await api.delete(`/centrals/${id}`)).data,

  listCentralUsers: async (centralId) => (await api.get(`/centrals/${centralId}/users`)).data.data,
  addCentralUser: async (centralId, userId) =>
    (await api.post(`/centrals/${centralId}/users`, { userId })).data.data,
  removeCentralUser: async (centralId, userId) =>
    (await api.delete(`/centrals/${centralId}/users/${userId}`)).data.data,

  listVolumeVerifications: async (params = {}) => {
    const res = await api.get('/volume-verifications', {
      params: { limit: 1000, ...params }
    })
    return res.data.data
  },
  getVolumeVerification: async (id) => (await api.get(`/volume-verifications/${id}`)).data.data,
  updateVolumeVerification: async (id, payload) =>
    (await api.put(`/volume-verifications/${id}`, payload)).data.data,
  deleteVolumeVerification: async (id) => (await api.delete(`/volume-verifications/${id}`)).data
}
