const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const pdfEngine = require('./pdfActionEngine');
const PdfDocument = require('../models/PdfDocument');
const Job = require('../models/Job');
const { generateFileName } = require('../utils/helpers');

class JobQueueService {
  constructor() {
    this.activeJobs = new Map();
    this._ready = this._init();
  }

  async _init() {
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
    }
    await this._cleanupStaleJobs();
  }

  async _cleanupStaleJobs() {
    try {
      const result = await Job.updateMany(
        { status: { $in: ['queued', 'processing'] } },
        { $set: { status: 'failed', error: 'Server restarted - job terminated', progress: 0 } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[JobQueue] Cleaned up ${result.modifiedCount} stale job(s) from previous session`);
      }
    } catch (err) {
      console.error('[JobQueue] Failed to clean up stale jobs:', err.message);
    }
  }

  async _ensureReady() {
    if (this._ready) {
      await this._ready;
    }
  }

  async createJob(userId, originalFilename, fileBufferOrPath, actions, command) {
    await this._ensureReady();

    const jobId = uuidv4();
    let filePath = null;

    if (typeof fileBufferOrPath === 'string') {
      filePath = fileBufferOrPath;
    } else if (Buffer.isBuffer(fileBufferOrPath)) {
      const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
      const tempFilename = `job_${jobId}_${generateFileName('input.pdf')}`;
      filePath = path.join(uploadDir, tempFilename);
      await fs.writeFile(filePath, fileBufferOrPath);
    }

    const jobData = {
      jobId,
      userId,
      originalFilename,
      filePath,
      actions,
      command,
      status: 'queued',
      progress: 0,
      currentStep: 'Queueing job...',
      timeline: [
        { name: 'Queueing Job', timestamp: new Date(), status: 'completed' },
        { name: 'Normalizing & Parsing', timestamp: null, status: 'pending' },
        { name: 'Loading PDF', timestamp: null, status: 'pending' },
        { name: 'Executing Actions', timestamp: null, status: 'pending' },
        { name: 'Validating & Saving', timestamp: null, status: 'pending' },
        { name: 'Updating Database', timestamp: null, status: 'pending' }
      ],
      result: null,
      error: null
    };

    this.activeJobs.set(jobId, this._toClientJob(jobData));
    await Job.create(jobData);

    this.processJob(jobId).catch(err => {
      console.error(`[JobQueue] Unhandled error processing job ${jobId}:`, err);
    });

    return jobId;
  }

  async getJob(jobId) {
    await this._ensureReady();

    const job = await Job.findOne({ jobId }).lean();
    if (!job) return this.activeJobs.get(jobId) || null;

    const clientJob = this._toClientJob(job);
    this.activeJobs.set(jobId, clientJob);
    return clientJob;
  }

  _toClientJob(job) {
    return {
      id: job.jobId,
      userId: job.userId,
      originalFilename: job.originalFilename,
      filePath: job.filePath,
      actions: job.actions,
      command: job.command,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      timeline: job.timeline,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt
    };
  }

  _mirrorJob(job) {
    if (!job) return;
    const raw = typeof job.toObject === 'function' ? job.toObject() : job;
    this.activeJobs.set(raw.jobId, this._toClientJob(raw));
  }

  async processJob(jobId) {
    let job;
    try {
      job = await Job.findOne({ jobId });
      if (!job) return;

      job.status = 'processing';
      job.progress = 10;
      job.currentStep = 'Loading PDF document...';
      job.timeline[1].timestamp = new Date();
      job.timeline[1].status = 'completed';
      job.timeline[2].timestamp = new Date();
      job.timeline[2].status = 'processing';
      await job.save();
      this._mirrorJob(job);

      let pdfBuffer;
      if (job.filePath) {
        pdfBuffer = await fs.readFile(job.filePath);
      } else {
        throw new Error('No file data available for processing');
      }

      const actionCount = job.actions ? job.actions.length : 0;
      job.progress = 45;
      job.currentStep = `Executing ${actionCount} action(s) in sequence...`;
      job.timeline[2].status = 'completed';
      job.timeline[3].timestamp = new Date();
      job.timeline[3].status = 'processing';
      this._mirrorJob(job);

      const modifiedPdfBytes = await pdfEngine.execute(pdfBuffer, job.actions);

      job.progress = 75;
      job.currentStep = 'Validating and saving modified document...';
      job.timeline[3].status = 'completed';
      job.timeline[4].timestamp = new Date();
      job.timeline[4].status = 'processing';
      this._mirrorJob(job);

      const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
      const outputFilename = `ai_edited_${generateFileName('output.pdf')}`;
      const outputPath = path.join(uploadDir, outputFilename);

      await fs.writeFile(outputPath, modifiedPdfBytes);

      const newPdfDoc = new PdfDocument({
        user: job.userId || '000000000000000000000000',
        originalFilename: job.originalFilename,
        currentFilename: outputFilename,
        filepath: `/uploads/${outputFilename}`,
        size: modifiedPdfBytes.length,
        numPages: job.actions?.length || 1,
        history: [{ action: 'AI_EDIT', description: `Command: ${job.command}` }]
      });
      await newPdfDoc.save();

      if (job.filePath) {
        await fs.unlink(job.filePath).catch(e => console.error('Failed to delete temp file:', e));
      }

      job.progress = 100;
      job.status = 'completed';
      job.currentStep = 'Process completed successfully!';
      job.timeline[4].status = 'completed';
      job.timeline[5].timestamp = new Date();
      job.timeline[5].status = 'completed';
      job.result = {
        document: newPdfDoc.toObject(),
        downloadUrl: `/api/files/${newPdfDoc._id}/download`
      };
      await job.save();
      this._mirrorJob(job);

    } catch (err) {
      console.error(`Error processing job ${jobId}:`, err);
      if (!job) return;

      try {
        job.status = 'failed';
        job.currentStep = 'Error: ' + err.message;
        job.error = err.message;

        const activeStep = job.timeline.find(s => s.status === 'processing');
        if (activeStep) {
          activeStep.status = 'failed';
        } else {
          const lastItem = job.timeline.find(s => s.status === 'pending');
          if (lastItem) lastItem.status = 'failed';
        }

        if (job.filePath) {
          await fs.unlink(job.filePath).catch(e => console.error(e));
        }

        await job.save();
        this._mirrorJob(job);
      } catch (saveErr) {
        console.error(`Failed to save error state for job ${jobId}:`, saveErr);
      }
    }
  }
}

module.exports = new JobQueueService();
