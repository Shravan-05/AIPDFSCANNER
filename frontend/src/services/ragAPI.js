import api from './api';

const ragAPI = {
  upload: (formData, onProgress) => api.post('/rag/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
    timeout: 120000,
  }),
  ask: (documentId, question) => api.post('/rag/ask', { documentId, question }),
  listDocuments: () => api.get('/rag/documents'),
  getDocument: (id) => api.get('/rag/documents/' + id),
  delete: (id) => api.delete('/rag/documents/' + id),
};

export default ragAPI;
