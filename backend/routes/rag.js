const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');
const { uploadDocument, askQuestion, listDocuments, getDocument, deleteDocument } = require('../controllers/ragController');

router.use(protect);

router.post('/upload', upload.single('file'), uploadDocument);
router.post('/ask', askQuestion);
router.get('/documents', listDocuments);
router.get('/documents/:id', getDocument);
router.delete('/documents/:id', deleteDocument);

module.exports = router;
