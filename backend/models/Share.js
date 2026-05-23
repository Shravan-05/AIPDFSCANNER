const mongoose = require('mongoose');

const shareSchema = new mongoose.Schema({
  pdfId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  pdfModel: {
    type: String,
    enum: ['Scan', 'PdfDocument'],
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  shareToken: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  passwordHash: {
    type: String,
    default: null
  },
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: {
    type: Date,
    default: null
  },
  maxAccessCount: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

shareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
shareSchema.index({ ownerId: 1, createdAt: -1 });

shareSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return Date.now() > this.expiresAt.getTime();
};

shareSchema.methods.isAccessLimitReached = function() {
  if (!this.maxAccessCount) return false;
  return this.accessCount >= this.maxAccessCount;
};

module.exports = mongoose.model('Share', shareSchema);
