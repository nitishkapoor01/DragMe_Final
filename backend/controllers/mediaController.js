/* ==========================================================================
   DRAGME BACKEND CONTROLLER: MEDIA PROCESSING & STORAGE PIPELINE
   ========================================================================== */

const fs = require('fs');
const MediaProcessor = require('../../services/mediaProcessor');
const MediaService = require('../../services/mediaService');
const StorageService = require('../../services/storageService');
const mediaRepository = require('../repositories/mediaRepository');
const { MEDIA_LIMITS, ANIMATION_POLICY } = require('../../config/mediaConfig');

const mediaController = {
  // Get Limits & Animation Policy
  getLimits(req, res) {
    return res.json({ success: true, limits: MEDIA_LIMITS, animationPolicy: ANIMATION_POLICY });
  },

  // Get Metrics
  getMetrics(req, res) {
    return res.json({ success: true, metrics: MediaService.getMetrics() });
  },

  // Get Job Status
  getJobStatus(req, res) {
    const job = MediaService.getJobStatus(req.params.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Media job not found or expired.' });
    }
    return res.json({ success: true, job });
  },

  // Get Asset Metadata
  async getAsset(req, res) {
    try {
      const asset = await MediaService.getMediaAsset(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: 'Media asset not found.' });
      }
      return res.json({ success: true, asset });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve media asset.' });
    }
  },

  // Delete Media Asset
  async deleteAsset(req, res) {
    try {
      const asset = await mediaRepository.findById(req.params.id);
      if (!asset) {
        return res.status(404).json({ error: 'Media asset not found.' });
      }
      if (asset.owner_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to delete this media asset.' });
      }

      if (asset.storage_key) {
        await StorageService.delete(asset.storage_key);
      } else if (asset.storage_url) {
        await MediaProcessor.deleteMediaByUrl(asset.storage_url);
      }
      if (asset.poster_key) {
        await StorageService.delete(asset.poster_key);
      }

      await mediaRepository.deleteAsset(asset.id);

      return res.json({ success: true, message: 'Media asset deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete media asset.' });
    }
  },

  // Unified Upload Handler
  async upload(req, res) {
    try {
      const rawData = req.body.data || req.body.base64Data;
      const filename = req.body.filename;
      const type = req.body.type || 'avatar';
      const asyncMode = Boolean(req.body.async || req.query.async === 'true');
      const entityType = req.body.entityType || null;
      const entityId = req.body.entityId || null;

      if (!rawData || typeof rawData !== 'string') {
        return res.status(400).json({ error: 'Media payload data is required.' });
      }

      let buffer;
      if (rawData.startsWith('data:')) {
        const matches = rawData.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: 'Invalid base64 media encoding.' });
        }
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(rawData, 'base64');
      }

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ error: 'Empty media buffer provided.' });
      }

      const result = await MediaService.uploadMedia({
        buffer,
        uploadType: type,
        user: req.user,
        filename,
        entityType,
        entityId,
        asyncMode
      });

      return res.json({
        success: true,
        mediaId: result.mediaId,
        url: result.url,
        mediaUrl: result.url,
        originalUrl: result.url,
        posterUrl: result.posterUrl,
        thumbnailUrl: result.thumbnailUrl,
        variants: result.variants,
        width: result.width,
        height: result.height,
        fileSize: result.sizeBytes || result.fileSize,
        sizeBytes: result.sizeBytes || result.fileSize,
        mimeType: result.mimeType,
        isAnimated: result.isAnimated,
        duration: result.duration,
        status: result.status,
        isDeduplicated: Boolean(result.isDeduplicated),
        jobId: result.jobId || null
      });
    } catch (err) {
      console.error('Media pipeline processing error:', err.message);
      return res.status(400).json({ error: err.message || 'Media processing failed.' });
    }
  },

  // Admin Cleanup
  async runCleanup(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
    }
    try {
      const result = await MediaService.runCleanup(0);
      return res.json({
        success: true,
        message: `Cleaned ${result.filesPruned} orphaned media files and freed ${result.freedMb} MB of storage.`,
        metrics: MediaService.getMetrics()
      });
    } catch (err) {
      console.error('Storage garbage collection error:', err);
      return res.status(500).json({ error: 'Failed to run media cleanup.' });
    }
  }
};

module.exports = mediaController;
