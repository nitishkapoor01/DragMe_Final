/**
 * DRAGME - Universal Cloud & Local Object Storage Service Abstraction
 * Manages /temp/, /profile/, /post/, /posters/ buckets/prefixes.
 * Never stores raw binaries in PostgreSQL; stores metadata/keys only.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const STORAGE_PREFIXES = {
  TEMP: 'temp',
  PROFILE: 'profile',
  POST: 'post',
  POSTERS: 'posters',
  VARIANTS: 'variants'
};

// Ensure all physical storage subdirectories exist
const DIRECTORIES = {
  root: UPLOADS_ROOT,
  temp: path.join(UPLOADS_ROOT, STORAGE_PREFIXES.TEMP),
  profile: path.join(UPLOADS_ROOT, STORAGE_PREFIXES.PROFILE),
  post: path.join(UPLOADS_ROOT, STORAGE_PREFIXES.POST),
  posters: path.join(UPLOADS_ROOT, STORAGE_PREFIXES.POSTERS),
  variants: path.join(UPLOADS_ROOT, STORAGE_PREFIXES.VARIANTS)
};

Object.values(DIRECTORIES).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class StorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local'; // 'local' | 's3' | 'r2' | 'gcs'
    this.cdnBaseUrl = process.env.CDN_BASE_URL || ''; // e.g. 'https://cdn.dragme.gg' or empty for relative
    this.s3Bucket = process.env.S3_BUCKET_NAME || 'dragme-media-bucket';
  }

  /**
   * Get absolute local path for a given storage key
   */
  getLocalPath(storageKey) {
    if (!storageKey) return null;
    const cleanKey = storageKey.replace(/^\/+/, '').replace(/^uploads\//, '');
    return path.join(UPLOADS_ROOT, cleanKey);
  }

  /**
   * Resolve CDN or public URL for a given storage key
   */
  getPublicUrl(storageKey) {
    if (!storageKey) return '';
    if (storageKey.startsWith('http://') || storageKey.startsWith('https://') || storageKey.startsWith('data:')) {
      return storageKey;
    }
    const cleanKey = storageKey.replace(/^\/+/, '');
    const standardPath = cleanKey.startsWith('uploads/') ? `/${cleanKey}` : `/uploads/${cleanKey}`;
    
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl.replace(/\/+$/, '')}${standardPath}`;
    }
    return standardPath;
  }

  /**
   * Store temporary upload waiting for validation / worker processing
   */
  async putTemp(buffer, filenameHint = 'upload') {
    const ext = path.extname(filenameHint) || '.bin';
    const tempKey = `${STORAGE_PREFIXES.TEMP}/temp_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
    const fullPath = this.getLocalPath(tempKey);
    await fs.promises.writeFile(fullPath, buffer);
    return {
      storageKey: tempKey,
      publicUrl: this.getPublicUrl(tempKey),
      fullPath,
      sizeBytes: buffer.length
    };
  }

  /**
   * Store permanent optimized asset
   */
  async put(buffer, storageKey) {
    const fullPath = this.getLocalPath(storageKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, buffer);
    return {
      storageKey,
      publicUrl: this.getPublicUrl(storageKey),
      sizeBytes: buffer.length
    };
  }

  /**
   * Move file from temporary storage to permanent storage
   */
  async moveFromTemp(tempKey, permanentKey) {
    const tempPath = this.getLocalPath(tempKey);
    const permPath = this.getLocalPath(permanentKey);
    const dir = path.dirname(permPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(tempPath)) {
      await fs.promises.copyFile(tempPath, permPath);
      await fs.promises.unlink(tempPath).catch(() => {});
    }

    return {
      storageKey: permanentKey,
      publicUrl: this.getPublicUrl(permanentKey)
    };
  }

  /**
   * Read file buffer from storage
   */
  async getBuffer(storageKey) {
    const fullPath = this.getLocalPath(storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Media file not found in storage: ${storageKey}`);
    }
    return await fs.promises.readFile(fullPath);
  }

  /**
   * Check if file exists in storage
   */
  exists(storageKey) {
    if (!storageKey) return false;
    const fullPath = this.getLocalPath(storageKey);
    return fs.existsSync(fullPath);
  }

  /**
   * Delete file from storage
   */
  async delete(storageKey) {
    if (!storageKey) return false;
    const fullPath = this.getLocalPath(storageKey);
    if (fs.existsSync(fullPath)) {
      try {
        const stats = await fs.promises.stat(fullPath);
        await fs.promises.unlink(fullPath);
        return { deleted: true, sizeBytes: stats.size };
      } catch (err) {
        return { deleted: false, error: err.message };
      }
    }
    return { deleted: false, error: 'File not found' };
  }

  /**
   * List files in a prefix directory
   */
  async listPrefix(prefix) {
    const dirPath = path.join(UPLOADS_ROOT, prefix);
    if (!fs.existsSync(dirPath)) return [];
    const files = await fs.promises.readdir(dirPath);
    const items = [];
    for (const file of files) {
      if (file.startsWith('.')) continue;
      const fullPath = path.join(dirPath, file);
      const stat = await fs.promises.stat(fullPath);
      if (!stat.isDirectory()) {
        items.push({
          key: `${prefix}/${file}`,
          sizeBytes: stat.size,
          mtime: stat.mtime
        });
      }
    }
    return items;
  }
}

module.exports = new StorageService();
