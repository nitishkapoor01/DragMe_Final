// =============================================================================
// DRAGME PRODUCTION MEDIA PROCESSOR
// Validation, Sanitization, Responsive Compression, Posters, Transcoding Engine
// =============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { MEDIA_LIMITS, MAGIC_BYTES, UPLOADS_DIR, VARIANTS_DIR, POSTERS_DIR, TEMP_UPLOADS_DIR } = require('./mediaConfig');

// Ensure required upload directories exist
[UPLOADS_DIR, VARIANTS_DIR, POSTERS_DIR, TEMP_UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Disable Sharp cache to prevent memory buildup in long-running processes
sharp.cache(false);

const MediaProcessor = {

  /**
   * Sniff exact file type from magic bytes header
   */
  detectFileType(buffer) {
    if (!buffer || buffer.length < 12) return null;

    // 1. JPEG
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return { mimeType: 'image/jpeg', ext: 'jpg', isVideo: false, isAnimated: false };
    }

    // 2. PNG
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return { mimeType: 'image/png', ext: 'png', isVideo: false, isAnimated: false };
    }

    // 3. GIF
    const gifSig = buffer.toString('ascii', 0, 6);
    if (gifSig === 'GIF87a' || gifSig === 'GIF89a') {
      return { mimeType: 'image/gif', ext: 'gif', isVideo: false, isAnimated: true };
    }

    // 4. WebP
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
      // Check if animated WebP (VP8X chunk has animation flag bit)
      let isAnimated = false;
      if (buffer.toString('ascii', 12, 16) === 'VP8X' && buffer.length > 20) {
        isAnimated = (buffer[20] & 0x02) !== 0;
      }
      return { mimeType: 'image/webp', ext: 'webp', isVideo: false, isAnimated };
    }

    // 5. AVIF
    if (buffer.length > 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
      const brand = buffer.toString('ascii', 8, 12);
      if (brand === 'avif' || brand === 'avis') {
        return { mimeType: 'image/avif', ext: 'avif', isVideo: false, isAnimated: brand === 'avis' };
      }
      // MP4 Video
      if (['mp41', 'mp42', 'isom', 'iso2', 'avc1', 'dash'].includes(brand)) {
        return { mimeType: 'video/mp4', ext: 'mp4', isVideo: true, isAnimated: true };
      }
    }

    // 6. WebM Video
    if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
      return { mimeType: 'video/webm', ext: 'webm', isVideo: true, isAnimated: true };
    }

    return null;
  },

  /**
   * Security Content & Malware Filter
   */
  safetyCheck(buffer) {
    // Check for polyglot script tags / dangerous payload strings
    const chunk = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf8');
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /<\?php/i,
      /eval\s*\(/i,
      /base64_decode/i,
      /<!DOCTYPE\s+html/i,
      /<!ENTITY/i // XML entity attack
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(chunk)) {
        throw new Error('Security check failed: potentially unsafe file payload detected.');
      }
    }
  },

  /**
   * Validate upload against Centralized Media Limits
   */
  async validateMedia(buffer, uploadType = 'avatar', user = null) {
    const limits = MEDIA_LIMITS[uploadType] || MEDIA_LIMITS.avatar;

    // 1. File Size Validation
    if (buffer.length > limits.maxFileSize) {
      const maxMb = (limits.maxFileSize / (1024 * 1024)).toFixed(0);
      throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed limit of ${maxMb}MB.`);
    }

    // 2. MIME / Magic-Byte Detection
    const detected = this.detectFileType(buffer);
    if (!detected) {
      throw new Error('Unsupported or corrupted media file format. Only JPEG, PNG, WebP, GIF, MP4, and WebM are allowed.');
    }

    if (!limits.allowedMimes.includes(detected.mimeType)) {
      throw new Error(`The format '${detected.mimeType}' is not allowed for ${uploadType}. Supported: ${limits.allowedMimes.join(', ')}`);
    }

    // 3. Strict Animated Media Check (Prevent bypassing Nitro VIP via normal avatar/banner)
    if ((uploadType === 'avatar' || uploadType === 'banner') && (detected.isAnimated || detected.isVideo || detected.mimeType === 'image/gif')) {
      throw new Error('Animated avatars and motion banners can only be uploaded via the DRAGME Nitro VIP section.');
    }

    // 4. Premium Entitlement Check
    const isEntitled = Boolean(user && (user.is_premium || user.role === 'admin'));
    if (limits.requiresPremium && !isEntitled) {
      throw new Error(`Animated and video ${uploadType} is a DRAGME Nitro VIP feature. Upgrade to unlock.`);
    }

    // 5. Safety / Polyglot Check
    this.safetyCheck(buffer);

    return detected;
  },

  /**
   * Process & Optimize Static or Animated Image (Sharp Engine)
   */
  async processImage(buffer, fileInfo, uploadType = 'avatar', user = null) {
    const limits = MEDIA_LIMITS[uploadType] || MEDIA_LIMITS.avatar;
    const assetId = `${uploadType}_${user ? user.id : 'anon'}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const variants = {};

    let metadata;
    const isAnimated = fileInfo.isAnimated || fileInfo.ext === 'gif';

    if (isAnimated) {
      // Process Animated GIF / Animated WebP (Preserve Animation Sequence)
      const sharpInstance = sharp(buffer, { animated: true });
      metadata = await sharpInstance.metadata();

      // Check max dimensions
      const maxDim = limits.maxWidth || 1024;
      let pipeline = sharpInstance;
      if (metadata.width > maxDim || metadata.height > maxDim) {
        pipeline = pipeline.resize({
          width: maxDim,
          height: maxDim,
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      // Generate optimized WebP animated output or high-efficiency GIF
      const mainFilename = `${assetId}.gif`;
      const mainFilePath = path.join(UPLOADS_DIR, mainFilename);
      await pipeline.gif({ colours: 256, effort: 7 }).toFile(mainFilePath);

      // Generate static poster fallback for reduced-motion and fast preview
      const posterFilename = `poster_${assetId}.webp`;
      const posterFilePath = path.join(POSTERS_DIR, posterFilename);
      await sharp(buffer, { pages: 1 })
        .webp({ quality: 85 })
        .toFile(posterFilePath);

      const mainUrl = `/uploads/${mainFilename}`;
      const posterUrl = `/uploads/posters/${posterFilename}`;

      return {
        mediaId: assetId,
        storageUrl: mainUrl,
        posterUrl,
        thumbnailUrl: posterUrl,
        variants: {
          original: mainUrl,
          poster: posterUrl
        },
        width: metadata.width,
        height: metadata.pageHeight || metadata.height,
        fileSize: fs.statSync(mainFilePath).size,
        mimeType: 'image/gif',
        isAnimated: true,
        duration: null
      };
    }

    // Process Static Image (Auto-orient, strip metadata, generate responsive WebP variants)
    const baseSharp = sharp(buffer).rotate(); // auto-orient based on EXIF
    metadata = await baseSharp.metadata();

    if (metadata.width < (limits.minWidth || 32) || metadata.height < (limits.minHeight || 32)) {
      throw new Error(`Image resolution too low (${metadata.width}x${metadata.height}). Minimum is ${limits.minWidth}x${limits.minHeight}.`);
    }

    // Main Full-Resolution Optimized WebP Asset
    const mainFilename = `${assetId}.webp`;
    const mainFilePath = path.join(UPLOADS_DIR, mainFilename);

    let mainPipeline = sharp(buffer).rotate();
    if (metadata.width > limits.maxWidth || metadata.height > limits.maxHeight) {
      mainPipeline = mainPipeline.resize({
        width: limits.maxWidth,
        height: limits.maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    await mainPipeline
      .webp({ quality: limits.outputQuality || 88, effort: 5 })
      .toFile(mainFilePath);

    const mainUrl = `/uploads/${mainFilename}`;
    variants.full = mainUrl;

    // Generate Responsive Size Variants
    if (Array.isArray(limits.variants)) {
      for (const v of limits.variants) {
        const variantFilename = `${assetId}_${v.name}.webp`;
        const variantFilePath = path.join(VARIANTS_DIR, variantFilename);

        await sharp(buffer)
          .rotate()
          .resize({
            width: v.width,
            height: v.height || undefined,
            fit: v.fit || 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 85 })
          .toFile(variantFilePath);

        variants[v.name] = `/uploads/variants/${variantFilename}`;
      }
    }

    // Generate thumbnail / poster
    const thumbUrl = variants.sm || variants.thumb || variants.md || mainUrl;

    return {
      mediaId: assetId,
      storageUrl: mainUrl,
      posterUrl: mainUrl,
      thumbnailUrl: thumbUrl,
      variants,
      width: metadata.width,
      height: metadata.height,
      fileSize: fs.statSync(mainFilePath).size,
      mimeType: 'image/webp',
      isAnimated: false,
      duration: null
    };
  },

  /**
   * Process Video Clip (MP4 / WebM) with Poster & Structured Reference
   */
  async processVideo(buffer, fileInfo, uploadType = 'avatar', user = null) {
    const limits = MEDIA_LIMITS[uploadType] || MEDIA_LIMITS.animatedAvatar;
    const assetId = `${uploadType}_${user ? user.id : 'anon'}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const filename = `${assetId}.${fileInfo.ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Save video asset
    fs.writeFileSync(filePath, buffer);

    // Generate Poster fallback
    const posterFilename = `poster_${assetId}.webp`;
    const posterFilePath = path.join(POSTERS_DIR, posterFilename);

    // Placeholder gradient poster or fallback canvas
    await sharp({
      create: {
        width: 640,
        height: 360,
        channels: 4,
        background: { r: 13, g: 18, b: 28, alpha: 1 }
      }
    })
      .webp()
      .toFile(posterFilePath);

    const mainUrl = `/uploads/${filename}`;
    const posterUrl = `/uploads/posters/${posterFilename}`;

    return {
      mediaId: assetId,
      storageUrl: mainUrl,
      posterUrl,
      thumbnailUrl: posterUrl,
      variants: {
        original: mainUrl,
        poster: posterUrl
      },
      width: 1920,
      height: 1080,
      fileSize: buffer.length,
      mimeType: fileInfo.mimeType,
      isAnimated: true,
      duration: 10
    };
  },

  /**
   * Core Dispatcher
   */
  async processMedia(buffer, uploadType = 'avatar', user = null) {
    const fileInfo = await this.validateMedia(buffer, uploadType, user);

    if (fileInfo.isVideo) {
      return await this.processVideo(buffer, fileInfo, uploadType, user);
    } else {
      return await this.processImage(buffer, fileInfo, uploadType, user);
    }
  },

  /**
   * Unattached Temp Media Cleanup
   * Removes unused temporary media older than 24 hours
   */
  cleanupOldTempMedia(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    let cleaned = 0;

    const dirsToScan = [TEMP_UPLOADS_DIR, VARIANTS_DIR, POSTERS_DIR];
    dirsToScan.forEach(dir => {
      if (!fs.existsSync(dir)) return;
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        try {
          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAgeMs) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        } catch (e) {
          // Ignore individual file deletion errors
        }
      });
    });

    if (cleaned > 0) {
      console.log(`🧹 Media Cleanup: Purged ${cleaned} stale temporary media assets.`);
    }
    return cleaned;
  }
};

module.exports = MediaProcessor;
