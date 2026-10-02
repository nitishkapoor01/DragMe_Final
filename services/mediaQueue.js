/**
 * DRAGME - Media Worker & Background Processing Queue
 * Decouples heavy image optimization and video transcoding from the main HTTP API request loop.
 * Scales horizontally across multiple worker nodes.
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class MediaQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.concurrency = options.concurrency || 4;
    this.activeJobs = 0;
    this.queue = [];
    this.jobs = new Map(); // jobId -> Job
    this.processorFunction = null;

    // Periodic sweep of completed/failed job records older than 1 hour to prevent memory leaks
    setInterval(() => {
      const now = Date.now();
      for (const [id, job] of this.jobs.entries()) {
        if ((job.status === 'READY' || job.status === 'FAILED') && (now - job.completedAt > 3600000)) {
          this.jobs.delete(id);
        }
      }
    }, 600000);
  }

  /**
   * Register the media processing worker function
   */
  registerWorker(processorFn) {
    this.processorFunction = processorFn;
  }

  /**
   * Add a media processing task to the background queue
   */
  async addJob(jobData) {
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const job = {
      id: jobId,
      mediaId: jobData.mediaId,
      ownerId: jobData.ownerId,
      uploadType: jobData.uploadType,
      tempStorageKey: jobData.tempStorageKey,
      mimeType: jobData.mimeType,
      filename: jobData.filename,
      options: jobData.options || {},
      status: 'UPLOADING',
      progress: 0,
      error: null,
      result: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null
    };

    this.jobs.set(jobId, job);
    this.queue.push(job);
    this.emit('jobAdded', job);

    // Trigger queue execution
    process.nextTick(() => this._processNext());

    return job;
  }

  /**
   * Internal queue runner with concurrency control
   */
  async _processNext() {
    if (this.activeJobs >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeJobs++;
    job.status = 'PROCESSING';
    job.startedAt = Date.now();
    job.progress = 10;
    this.emit('jobStarted', job);

    try {
      if (!this.processorFunction) {
        throw new Error('No media worker registered to process job.');
      }

      job.progress = 40;
      const result = await this.processorFunction(job);
      job.progress = 100;
      job.status = 'READY';
      job.result = result;
      job.completedAt = Date.now();
      this.emit('jobCompleted', job);
    } catch (err) {
      job.status = 'FAILED';
      job.error = err.message || 'Processing failed';
      job.completedAt = Date.now();
      this.emit('jobFailed', job);
    } finally {
      this.activeJobs--;
      this._processNext();
    }
  }

  /**
   * Get job status and result
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all active & queued jobs
   */
  getStats() {
    return {
      activeWorkers: this.activeJobs,
      queuedJobs: this.queue.length,
      totalTrackedJobs: this.jobs.size
    };
  }
}

module.exports = new MediaQueue();
