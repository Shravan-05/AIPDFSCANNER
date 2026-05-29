const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { 
  mergePdfs, 
  aiEdit, 
  getJobStatus, 
  analyzePdf,
  getSmartSuggestions,
  getCommandHelp,
  getOnboardingSuggestions,
  validateAction,
  testOllamaConnection
} = require('../controllers/pdfToolController');

router.use(protect);

// NLP parser status test (for debugging/setup)
router.get('/nlp/test', testOllamaConnection);

// Using the same upload middleware, allowing up to 100 PDFs
router.post('/merge', upload.array('files', 100), mergePdfs);

// AI Editor route takes a single PDF and a natural language command
router.post('/ai-edit', upload.single('file'), aiEdit);

// Job status polling route for real-time progress timelines
router.get('/job/:id', getJobStatus);

// Analyze route to classify document type and get smart suggestions
router.post('/analyze', upload.single('file'), analyzePdf);

// Smart suggestions based on document context
router.post('/suggestions', getSmartSuggestions);

// Command help and related commands
router.get('/help', getCommandHelp);

// Onboarding suggestions for new users
router.get('/onboarding', getOnboardingSuggestions);

// Validate action before execution
router.post('/validate-action', validateAction);

module.exports = router;
