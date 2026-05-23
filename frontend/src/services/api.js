import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.put(`/auth/reset-password/${token}`, { password })
};

export const scansAPI = {
  create: (formData, onProgress) => api.post('/scans', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  }),
  addPages: (id, formData, onProgress) => api.post(`/scans/${id}/pages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  }),
  getAll: (params) => api.get('/scans', { params }),
  getOne: (id) => api.get(`/scans/${id}`),
  update: (id, data) => api.put(`/scans/${id}`, data),
  delete: (id) => api.delete(`/scans/${id}`),
  toggleFavorite: (id) => api.put(`/scans/${id}/favorite`),
  reorderPages: (id, pageOrder) => api.put(`/scans/${id}/reorder`, { pageOrder }),
  rotatePage: (id, pageId, rotation) => api.put(`/scans/${id}/pages/${pageId}/rotate`, { rotation }),
  deletePage: (id, pageId) => api.delete(`/scans/${id}/pages/${pageId}`),
  duplicatePage: (id, pageId) => api.post(`/scans/${id}/pages/${pageId}/duplicate`),
  exportPdf: (id, password) => api.get(`/scans/${id}/export${password ? `?password=${encodeURIComponent(password)}` : ''}`, { responseType: 'blob' }),
  updatePage: (id, pageId, data) => api.put(`/scans/${id}/pages/${pageId}`, data),
  autoArrange: (id) => api.post(`/scans/${id}/auto-arrange`),
  getStats: () => api.get('/scans/stats'),
  merge: (scanIds, title) => api.post('/scans/merge', { scanIds, title }),
  split: (id) => api.post(`/scans/${id}/split`),
  annotate: (id, pageId, formData) => api.post(`/scans/${id}/pages/${pageId}/annotate`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const filesAPI = {
  getAll: (params) => api.get('/files', { params }),
  download: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/files/${id}`),
  rename: (id, name) => api.put(`/files/${id}/rename`, { name }),
  share: (id) => api.post(`/files/${id}/share`)
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  testCloud: (cloudConfig) => api.post('/settings/test-cloud', { cloudConfig })
};

/**
 * Resolves a server-side file path/URL to a full URL accessible by the browser.
 * Handles Windows backslash paths and relative paths from both dev and production environments.
 */
export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('data:')
  ) return filePath;
  const normalizedPath = filePath.replace(/\\/g, '/');
  const host = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace('/api', '')
    : '';
  return `${host}/${normalizedPath}`;
};

export default api;
