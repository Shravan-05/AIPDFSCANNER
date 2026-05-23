const mongoose = require('mongoose');

const pdfDocumentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  currentFilename: {
    type: String,
    required: true
  },
  filepath: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  numPages: {
    type: Number,
    default: 1
  },
  history: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    description: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

pdfDocumentSchema.index({ user: 1, createdAt: -1 });
pdfDocumentSchema.index({ user: 1, originalFilename: 1 });

pdfDocumentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PdfDocument', pdfDocumentSchema);
