/* ==========================================================================
   DRAGME BACKEND REPOSITORY: MEDIA ASSETS DATA ACCESS (backend/repositories/mediaRepository.js)
   Server-authoritative database operations for media assets & references
   ========================================================================== */

const db = require('../../db');

const mediaRepository = {
  async findById(id) {
    return await db.get('SELECT * FROM media_assets WHERE id = ?', [id]);
  },

  async findByContentHash(contentHash) {
    return await db.get("SELECT * FROM media_assets WHERE content_hash = ? AND status = 'READY'", [contentHash]);
  },

  async findByStorageUrlOrKey(urlOrKey) {
    return await db.get('SELECT id FROM media_assets WHERE storage_url = ? OR storage_key = ?', [urlOrKey, urlOrKey.replace(/^\/uploads\//, '')]);
  },

  async createAsset(assetData) {
    const {
      id, ownerId, mediaType, usageType = 'PFP', mimeType,
      originalFilename, storageKey, storageUrl, posterKey, posterUrl,
      thumbnailUrl, variants = '{}', width = 0, height = 0,
      duration = 0, sizeBytes = 0, contentHash, status = 'READY',
      processingStatus = 'READY'
    } = assetData;

    await db.run(`
      INSERT INTO media_assets (
        id, owner_id, media_type, usage_type, mime_type, original_filename,
        storage_key, storage_url, poster_key, poster_url, thumbnail_url,
        variants, width, height, duration, size_bytes, file_size,
        content_hash, status, processing_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, ownerId, mediaType, usageType, mimeType, originalFilename,
      storageKey, storageUrl, posterKey, posterUrl, thumbnailUrl,
      typeof variants === 'object' ? JSON.stringify(variants) : variants,
      width, height, duration, sizeBytes, sizeBytes,
      contentHash, status, processingStatus
    ]);

    return await this.findById(id);
  },

  async updateAsset(id, updates) {
    const fields = [];
    const params = [];
    for (const [k, v] of Object.entries(updates)) {
      fields.push(`${k} = ?`);
      params.push(v);
    }
    if (fields.length > 0) {
      params.push(id);
      await db.run(`UPDATE media_assets SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return await this.findById(id);
  },

  async deleteAsset(id) {
    await db.run('DELETE FROM media_usages WHERE media_id = ?', [id]);
    return await db.run('DELETE FROM media_assets WHERE id = ?', [id]);
  },

  async attachUsage(id, mediaId, entityType, entityId) {
    return await db.run(`
      INSERT INTO media_usages (id, media_id, entity_type, entity_id)
      VALUES (?, ?, ?, ?)
    `, [id, mediaId, entityType, entityId]);
  },

  async getOrphanedAssets(cutoffDate) {
    return await db.all(`
      SELECT m.id, m.storage_key, m.poster_key, m.storage_url
      FROM media_assets m
      LEFT JOIN media_usages u ON m.id = u.media_id
      WHERE u.id IS NULL AND m.created_at < ?
    `, [cutoffDate]);
  }
};

module.exports = mediaRepository;
