import api from './api';

export const shareAPI = {
  create: (pdfId, { expiresIn, password, maxAccessCount, model = 'Scan' } = {}) =>
    api.post(`/pdf/${pdfId}/share`, { model, expiresIn, password, maxAccessCount }),

  access: (token) =>
    api.get(`/share/${token}`),

  verifyPassword: (token, password) =>
    api.post(`/share/${token}/verify`, { password }),

  revoke: (token) =>
    api.delete(`/share/${token}`),

  getInfo: (token) =>
    api.get(`/share/${token}/info`),

  getUserShares: () =>
    api.get('/shares')
};

export const getShareUrl = (token) => {
  return `${window.location.origin}/share/${token}`;
};

export default shareAPI;
