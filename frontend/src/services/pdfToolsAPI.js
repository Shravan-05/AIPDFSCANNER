import api from './api';

const pdfToolsAPI = {
  merge: (formData, onProgress) => api.post('/pdf/merge', formData, {
    headers: { 'Content-Type': undefined },
    onUploadProgress: onProgress,
    responseType: 'blob'
  }),
  aiEdit: (formData, onProgress) => api.post('/pdf/ai-edit', formData, {
    headers: { 'Content-Type': undefined },
    onUploadProgress: onProgress
  }),
  analyze: (formData) => api.post('/pdf/analyze', formData, {
    headers: { 'Content-Type': undefined }
  }),
  getJobStatus: (id) => api.get(`/pdf/job/${id}`),
  
  // New endpoints for enhanced features
  getSmartSuggestions: (context) => api.post('/pdf/suggestions', context),
  
  getCommandHelp: (command) => api.get('/pdf/help', {
    params: { command }
  }),
  
  getOnboardingSuggestions: () => api.get('/pdf/onboarding'),
  
  validateAction: (action, metadata) => api.post('/pdf/validate-action', {
    action,
    pdfMetadata: metadata
  })
};

export default pdfToolsAPI;
