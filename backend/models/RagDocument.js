const mongoose = require('mongoose');

const chunkSchema = new mongoose.Schema({
  text: String,
  embedding: [Number],
  pageNumber: { type: Number, default: 1 },
  index: Number,
});

const ragDocumentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalName: String,
  storedName: String,
  filePath: String,
  mimeType: { type: String, default: 'application/pdf' },
  totalPages: { type: Number, default: 0 },
  totalChars: { type: Number, default: 0 },
  chunkCount: { type: Number, default: 0 },
  status: { type: String, enum: ['processing', 'ready', 'error'], default: 'processing' },
  errorMessage: String,
  chunks: [chunkSchema],
}, { timestamps: true });

ragDocumentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('RagDocument', ragDocumentSchema);
