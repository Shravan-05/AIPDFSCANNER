import api from './api';

const pdfToolsAPI = {
  merge: (formData, onProgress) => api.post('/pdf/merge', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
    responseType: 'blob' // Essential for downloading the returned binary PDF
  }),
  aiEdit: (formData, onProgress) => api.post('/pdf/ai-edit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
    // We expect a JSON response here initially containing the download URL and document metadata, not a raw blob.
  }),
  analyze: (formData) => api.post('/pdf/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
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
