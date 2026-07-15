import api from '../lib/api'

export const formsService = {
  listSubmissions: async (params = {}) => (await api.get('/forms/submissions', { params })).data.data,
  getSubmission: async (id) => (await api.get(`/forms/submissions/${id}`)).data.data,
  markAsRead: async (id) => (await api.patch(`/forms/submissions/${id}/read`)).data.data,
  reply: async (id, payload) => (await api.post(`/forms/submissions/${id}/reply`, payload)).data.data,
  getUnreadCount: async () => (await api.get('/forms/submissions/unread-count')).data.data.count
}
