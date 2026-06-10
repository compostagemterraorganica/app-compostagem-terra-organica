import api from '../lib/api'

export const cmsService = {
  listPages: async () => (await api.get('/pages')).data.data,
  getPage: async (id) => (await api.get(`/pages/${id}`)).data.data,
  getPublicPage: async (slug) => (await api.get(`/pages/public/${slug}`)).data.data,
  getPublicPageById: async (id) => (await api.get(`/pages/public/id/${id}`)).data.data,
  getLatestPageVersion: async (id) => (await api.get(`/pages/${id}/versions/latest`)).data.data,
  listPageVersions: async (id) => (await api.get(`/pages/${id}/versions`)).data.data,
  createPage: async (payload) => (await api.post('/pages', payload)).data.data,
  updatePage: async (id, payload) => (await api.put(`/pages/${id}`, payload)).data.data,
  deletePage: async (id) => (await api.delete(`/pages/${id}`)).data.data,
  createPageVersion: async (id, payload) => (await api.post(`/pages/${id}/versions`, payload)).data.data,
  publishPage: async (id) => (await api.post(`/pages/${id}/publish`)).data.data,
  listPosts: async () => (await api.get('/posts')).data.data,
  listPublicPosts: async ({ page = 1, limit = 12, excludeCategory = 'central' } = {}) => {
    const res = await api.get('/posts/public', { params: { page, limit, excludeCategory } })
    return { data: res.data.data, pagination: res.data.pagination }
  },
  getPublicPost: async (slug) => (await api.get(`/posts/public/${slug}`)).data.data,
  listRecentPosts: async ({ limit = 5, excludeSlug } = {}) => {
    const res = await api.get('/posts/public/recent', { params: { limit, excludeSlug } })
    return res.data.data
  },
  createPost: async (payload) => (await api.post('/posts', payload)).data.data,
  updatePost: async (id, payload) => (await api.put(`/posts/${id}`, payload)).data.data,
  deletePost: async (id) => (await api.delete(`/posts/${id}`)).data.data,
  listMedia: async () => (await api.get('/media')).data.data,
  uploadImage: async (file) => {
    const form = new FormData()
    form.append('image', file)
    return (await api.post('/media/upload', form)).data.data
  },
  analyticsKpis: async (params) => (await api.get('/analytics/kpis', { params })).data.data,
  analyticsByCentral: async (params) => (await api.get('/analytics/volume-by-central', { params })).data.data,
  analyticsTimeSeries: async (params) => (await api.get('/analytics/volume-timeseries', { params })).data.data
}
