const mongoose = require('mongoose');

const timelineStepSchema = new mongoose.Schema({
  name: { type: String, required: true },
  timestamp: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' }
}, { _id: false });

const jobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, default: '000000000000000000000000' },
  originalFilename: { type: String, default: '' },
  filePath: { type: String, default: null },
  actions: { type: mongoose.Schema.Types.Mixed, default: [] },
  command: { type: String, default: '' },
  status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  currentStep: { type: String, default: 'Queueing job...' },
  timeline: { type: [timelineStepSchema], default: [] },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  error: { type: String, default: null }
}, { timestamps: true });

jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ status: 1 });

module.exports = mongoose.model('Job', jobSchema);
