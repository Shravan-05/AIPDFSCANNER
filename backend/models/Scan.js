const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
  originalImage: {
    type: String,
    required: true
  },
  processedImage: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    default: ''
  },
  cropCoordinates: {
    x1: Number,
    y1: Number,
    x2: Number,
    y2: Number
  },
  enhancement: {
    brightness: Number,
    contrast: Number,
    saturation: Number,
    sharpness: Number
  },
  ocrText: String,
  pageNumber: Number,
  rotation: {
    type: Number,
    default: 0
  },
  isDuplicate: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const scanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  pages: [pageSchema],
  totalPages: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'processing', 'completed', 'failed'],
    default: 'draft'
  },
  scanMode: {
    type: String,
    enum: ['color', 'grayscale', 'blackwhite'],
    default: 'color'
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  tags: [String],
  folder: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  pdfUrl: {
    type: String,
    default: ''
  },
  ocrText: {
    type: String,
    default: ''
  },
  exportHistory: [{
    url: String,
    format: String,
    createdAt: Date
  }]
}, {
  timestamps: true
});

scanSchema.index({ user: 1, createdAt: -1 });
scanSchema.index({ user: 1, status: 1, createdAt: -1 });
scanSchema.index({ user: 1, isFavorite: 1 });
scanSchema.index({ user: 1, folder: 1 });
scanSchema.index({ tags: 1 });
scanSchema.index({ status: 1 });
scanSchema.index({ ocrText: 'text' });

module.exports = mongoose.model('Scan', scanSchema);
