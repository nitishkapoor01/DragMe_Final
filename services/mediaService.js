/**
 * DRAGME - ONE Centralized Media Service
 * Unified Media Upload, Validation, Queue Processing, Deduplication,
 * Storage Lifecycle & Database Reference System
 */

const crypto = require('crypto');
const db = require('../db');
const storageService = require('./storageService');
const mediaProcessor = require('./mediaProcessor');
const mediaDeliveryService = require('./mediaDeliveryService');
const mediaQueue = require('./mediaQueue');
const { MEDIA_LIMITS, ANIMATION_POLICY } = require('../config/mediaConfig');

class MediaService {
  constructor() {
    // Register the background queue worker
    mediaQueue.registerWorker(async (job) => {
      return await this._processQueuedJob(job);
    });
  }

  /**
   * Internal Worker Job Processor
   */
  async _processQueuedJob(job) {
    const tempBuffer = await storageService.getBuffer(job.tempStorageKey);

    // 1. Process via MediaProcessor
    const result = await mediaProcessor.processMedia(tempBuffer, job.uploadType, { id: job.ownerId });

    // 2. Update Database Record to READY
    await db.run(
      `UPDATE media_assets SET 
        media_type = ?, 
        usage_type = ?, 
        mime_type = ?, 
        storage_key = ?, 
        storage_url = ?, 
        poster_key = ?, 
        poster_url = ?, 
        thumbnail_url = ?, 
        variants = ?, 
        width = ?, 
        height = ?, 
        duration = ?, 
        size_bytes = ?, 
        file_size = ?, 
        content_hash = ?, 
        processing_status = 'READY', 
        status = 'READY'
       WHERE id = ?`,
      [
        result.mediaType,
        result.usageType,
        result.mimeType,
        result.storageKey,
        result.storageUrl,
        result.posterKey,
        result.posterUrl,
        result.thumbnailUrl,
        JSON.stringify(result.variants || {}),
        result.width || 0,
        result.height || 0,
        result.duration || 0,
        result.sizeBytes || result.fileSize,
        result.sizeBytes || result.fileSize,
        result.contentHash,
        job.mediaId
      ]
    );

    // 3. Verify output asset exists before deleting temp source
    if (storageService.exists(result.storageKey)) {
      await storageService.delete(job.tempStorageKey).catch(() => {});
    }

    return mediaDeliveryService.formatDeliveryAsset({
      id: job.mediaId,
      ...result,
      status: 'READY'
    });
  }

  /**
   * Central Upload Handler
   * Supports both Immediate Synchronous and Asynchronous Background Processing
   */
  async uploadMedia({
    buffer,
    uploadType = 'avatar',
    user = null,
    filename = 'upload',
    entityType = null,
    entityId = null,
    asyncMode = false
  }) {
    if (!buffer || buffer.length === 0) {
      throw new Error('No media buffer provided.');
    }

    // 1. Sniff & Validate (Security, Limits, Magic Bytes)
    const fileInfo = await mediaProcessor.validateMedia(buffer, uploadType, user);
    const contentHash = mediaProcessor.calculateContentHash(buffer);
    const ownerId = user ? user.id : 'anon';

    // 2. Deduplication Check via SHA-256 Hash
    const existing = await db.get(
      `SELECT * FROM media_assets WHERE content_hash = ? AND status = 'READY' LIMIT 1`,
      [contentHash]
    );

    if (existing) {
      // Physical asset already exists in storage! Register new media_usage reference without duplicating bytes
      if (entityType && entityId) {
        await this.attachMediaUsage(existing.id, entityType, entityId);
      }
      return {
        isDeduplicated: true,
        ...mediaDeliveryService.formatDeliveryAsset(existing)
      };
    }

    // 3. Stage original in Temporary Object Storage
    const tempResult = await storageService.putTemp(buffer, filename);
    const mediaId = `${uploadType}_${ownerId}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 4. Register in media_assets as UPLOADING/PROCESSING
    await db.run(
      `INSERT INTO media_assets (
        id, owner_id, media_type, usage_type, mime_type, original_filename,
        storage_key, storage_url, poster_key, poster_url, thumbnail_url, variants,
        width, height, duration, size_bytes, file_size, content_hash,
        is_attached, attached_entity_type, attached_entity_id, processing_status, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        mediaId,
        ownerId,
        fileInfo.isVideo ? 'VIDEO' : (fileInfo.isAnimated ? 'ANIMATED_IMAGE' : 'IMAGE'),
        uploadType.toUpperCase(),
        fileInfo.mimeType,
        filename ? String(filename).substring(0, 150) : 'upload',
        tempResult.storageKey,
        tempResult.publicUrl,
        tempResult.storageKey,
        tempResult.publicUrl,
        tempResult.publicUrl,
        '{}',
        0,
        0,
        0,
        buffer.length,
        buffer.length,
        contentHash,
        entityType ? 1 : 0,
        entityType,
        entityId,
        asyncMode ? 'PROCESSING' : 'UPLOADING',
        asyncMode ? 'PROCESSING' : 'UPLOADING'
      ]
    );

    if (entityType && entityId) {
      await this.attachMediaUsage(mediaId, entityType, entityId);
    }

    // 5. Handle Async Queue vs Sync Processing
    if (asyncMode) {
      const job = await mediaQueue.addJob({
        mediaId,
        ownerId,
        uploadType,
        tempStorageKey: tempResult.storageKey,
        mimeType: fileInfo.mimeType,
        filename
      });

      return {
        jobId: job.id,
        mediaId,
        status: 'PROCESSING',
        isAsync: true,
        message: 'Media processing scheduled in background queue.'
      };
    }

    // Synchronous Pipeline Processing
    try {
      const processed = await mediaProcessor.processMedia(buffer, uploadType, user);

      // Update Database Asset with Final Optimized Metadata
      await db.run(
        `UPDATE media_assets SET 
          media_type = ?, 
          usage_type = ?, 
          mime_type = ?, 
          storage_key = ?, 
          storage_url = ?, 
          poster_key = ?, 
          poster_url = ?, 
          thumbnail_url = ?, 
          variants = ?, 
          width = ?, 
          height = ?, 
          duration = ?, 
          size_bytes = ?, 
          file_size = ?, 
          content_hash = ?, 
          processing_status = 'READY', 
          status = 'READY'
         WHERE id = ?`,
        [
          processed.mediaType,
          processed.usageType,
          processed.mimeType,
          processed.storageKey,
          processed.storageUrl,
          processed.posterKey,
          processed.posterUrl,
          processed.thumbnailUrl,
          JSON.stringify(processed.variants || {}),
          processed.width || 0,
          processed.height || 0,
          processed.duration || 0,
          processed.sizeBytes,
          processed.sizeBytes,
          processed.contentHash,
          mediaId
        ]
      );

      // Verify delivery asset in storage before removing temp source
      if (storageService.exists(processed.storageKey)) {
        await storageService.delete(tempResult.storageKey).catch(() => {});
      }

      return mediaDeliveryService.formatDeliveryAsset({
        id: mediaId,
        ...processed,
        status: 'READY'
      });
    } catch (err) {
      await db.run(
        `UPDATE media_assets SET processing_status = 'FAILED', status = 'FAILED' WHERE id = ?`,
        [mediaId]
      ).catch(() => {});
      await storageService.delete(tempResult.storageKey).catch(() => {});
      throw err;
    }
  }

  /**
   * Reference Tracking: Attach media asset to an entity (user_avatar, user_banner, post_media, etc.)
   */
  async attachMediaUsage(mediaId, entityType, entityId) {
    if (!mediaId || !entityType || !entityId) return;
    const usageId = `usage_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    try {
      await db.run(
        `INSERT INTO media_usages (id, media_id, entity_type, entity_id) VALUES (?, ?, ?, ?)`,
        [usageId, mediaId, entityType, entityId]
      );
      await db.run(
        `UPDATE media_assets SET is_attached = 1, attached_entity_type = ?, attached_entity_id = ? WHERE id = ?`,
        [entityType, entityId, mediaId]
      );
    } catch (err) {
      console.warn('Non-fatal media_usages attach warning:', err.message);
    }
  }

  /**
   * Reference Tracking: Detach media asset from an entity
   */
  async detachMediaUsage(mediaId, entityType, entityId) {
    if (!mediaId || !entityType || !entityId) return;
    try {
      await db.run(
        `DELETE FROM media_usages WHERE media_id = ? AND entity_type = ? AND entity_id = ?`,
        [mediaId, entityType, entityId]
      );
      const remaining = await db.get(
        `SELECT COUNT(*) as count FROM media_usages WHERE media_id = ?`,
        [mediaId]
      );
      if (remaining && remaining.count === 0) {
        await db.run(`UPDATE media_assets SET is_attached = 0 WHERE id = ?`, [mediaId]);
      }
    } catch (err) {
      console.warn('Non-fatal media_usages detach warning:', err.message);
    }
  }

  /**
   * Retrieve asset by ID
   */
  async getMediaAsset(mediaId) {
    const asset = await db.get(`SELECT * FROM media_assets WHERE id = ?`, [mediaId]);
    if (!asset) return null;
    return mediaDeliveryService.formatDeliveryAsset(asset);
  }

  /**
   * Get queue job status
   */
  getJobStatus(jobId) {
    return mediaQueue.getJob(jobId);
  }

  /**
   * Run storage garbage collector and prune orphans
   */
  async runCleanup(maxAgeMs = 2 * 60 * 60 * 1000) {
    return await mediaProcessor.pruneOrphanedMedia(db, maxAgeMs);
  }

  /**
   * Get Media System Observability Metrics
   */
  getMetrics() {
    return {
      ...mediaProcessor.getMetrics(),
      queueStats: mediaQueue.getStats()
    };
  }
}

module.exports = new MediaService();
