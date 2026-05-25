import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || window.location.origin + '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 120000
});

// Retry logic for failed requests
let retryCount = 0;
const MAX_RETRIES = 2;

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.retryCount = 0;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timed out. Please check your connection.'));
    }
    
    // Retry on network errors or 5xx status codes (except on GET with blob response)
    if ((error.message === 'Network Error' || (error.response?.status >= 500 && error.response?.status < 600)) && 
        config && config.retryCount < MAX_RETRIES && config.method !== 'get') {
      config.retryCount += 1;
      await new Promise(resolve => setTimeout(resolve, 1000 * config.retryCount));
      return api(config);
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_cache');
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
    onUploadProgress: onProgress,
    timeout: 180000
  }),
  addPages: (id, formData, onProgress) => api.post(`/scans/${id}/pages`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
    timeout: 180000
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
  merge: (scanIds, title) => api.post('/scans/merge', { scanIds, title }, { timeout: 120000 }),
  split: (id) => api.post(`/scans/${id}/split`),
  annotate: (id, pageId, formData) => api.post(`/scans/${id}/pages/${pageId}/annotate`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const filesAPI = {
  getAll: (params) => api.get('/files', { params }),
  download: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/files/${id}`),
  rename: (id, name) => api.put(`/files/${id}/rename`, { name })
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
  testCloud: (cloudConfig) => api.post('/settings/test-cloud', { cloudConfig })
};

export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('blob:') ||
    filePath.startsWith('data:')
  ) return filePath;
  const host = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace(/\/api$/, '')
    : '';
  return `${host}/${filePath.replace(/\\/g, '/')}`;
};

export default api;