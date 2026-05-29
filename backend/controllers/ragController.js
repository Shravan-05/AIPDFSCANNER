const ragService = require('../services/ragService');
const RagDocument = require('../models/RagDocument');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const RAG_UPLOAD_DIR = path.resolve(process.env.RAG_UPLOAD_DIR || path.join(__dirname, '..', 'rag_uploads'));

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ msg: 'No file uploaded' });
    if (req.file.mimetype !== 'application/pdf') return res.status(400).json({ msg: 'Only PDF files are supported' });

    const userId = req.user.id;
    const ext = path.extname(req.file.originalname) || '.pdf';
    const storedName = uuidv4() + ext;
    const destDir = path.join(RAG_UPLOAD_DIR, userId);
    fs.mkdirSync(destDir, { recursive: true });
    const destPath = path.join(destDir, storedName);
    fs.copyFileSync(req.file.path, destPath);
    try { fs.unlinkSync(req.file.path); } catch {}

    const doc = await ragService.processDocument(destPath, userId, req.file.originalname);
    const statusCode = doc.status === 'error' ? 422 : 201;
    res.status(statusCode).json({
      _id: doc._id,
      originalName: doc.originalName,
      status: doc.status,
      totalPages: doc.totalPages,
      totalChars: doc.totalChars,
      chunkCount: doc.chunkCount,
      errorMessage: doc.errorMessage,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    console.error('RAG upload error:', err.message);
    res.status(500).json({ msg: err.message });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { documentId, question } = req.body;
    if (!documentId || !question) return res.status(400).json({ msg: 'documentId and question are required' });
    const result = await ragService.askQuestion(documentId, req.user.id, question);
    res.json(result);
  } catch (err) {
    console.error('RAG ask error:', err.message);
    res.status(500).json({ msg: err.message });
  }
};

exports.listDocuments = async (req, res) => {
  try {
    const docs = await ragService.listDocuments(req.user.id);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.getDocument = async (req, res) => {
  try {
    const doc = await ragService.getDocument(req.params.id, req.user.id);
    if (!doc) return res.status(404).json({ msg: 'Document not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    await ragService.deleteDocument(req.params.id, req.user.id);
    res.json({ msg: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};
