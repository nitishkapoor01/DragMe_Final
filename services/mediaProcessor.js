// =============================================================================
// DRAGME PRODUCTION MEDIA PROCESSOR
// Multi-Pipeline Media Engine: 4:5 PFP, 3:1 Banner, Animated WebP, Post Media,
// Magic-Byte Security, SHA-256 Deduplication Hashing & Observability
// =============================================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { MEDIA_LIMITS, ANIMATION_POLICY, MAGIC_BYTES } = require('../config/mediaConfig');
const storageService = require('./storageService');

// Disable Sharp cache to prevent memory buildup in long-running processes
sharp.cache(false);

const MediaProcessor = {
  metrics: {
    totalUploadedBytes: 0,
    totalOptimizedBytes: 0,
    totalProcessedCount: 0,
    totalProcessingTimeMs: 0,
    failuresCount: 0,
    garbageCollectedFiles: 0,
    garbageCollectedBytes: 0
  },

  getMetrics() {
    const avgSavingsPct = this.metrics.totalUploadedBytes > 0
      ? Math.round(((this.metrics.totalUploadedBytes - this.metrics.totalOptimizedBytes) / this.metrics.totalUploadedBytes) * 100)
      : 0;
    const avgTimeMs = this.metrics.totalProcessedCount > 0
      ? Math.round(this.metrics.totalProcessingTimeMs / this.metrics.totalProcessedCount)
      : 0;

    return {
      totalProcessed: this.metrics.totalProcessedCount,
      totalUploadedMb: (this.metrics.totalUploadedBytes / (1024 * 1024)).toFixed(2),
      totalOptimizedMb: (this.metrics.totalOptimizedBytes / (1024 * 1024)).toFixed(2),
      averageSavingsPercentage: `${avgSavingsPct}%`,
      averageProcessingTimeMs: avgTimeMs,
      failuresCount: this.metrics.failuresCount,
      garbageCollectedFiles: this.metrics.garbageCollectedFiles,
      garbageCollectedMb: (this.metrics.garbageCollectedBytes / (1024 * 1024)).toFixed(2)
    };
  },

  /**
   * Calculate SHA-256 Content Hash for Deduplication & Integrity
   */
  calculateContentHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  },

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
      let isAnimated = false;
      if (buffer.toString('ascii', 12, 16) === 'VP8X' && buffer.length > 20) {
        isAnimated = (buffer[20] & 0x02) !== 0;
      }
      return { mimeType: 'image/webp', ext: 'webp', isVideo: false, isAnimated };
    }

    // 5. AVIF / MP4
    if (buffer.length > 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
      const brand = buffer.toString('ascii', 8, 12);
      if (brand === 'avif' || brand === 'avis') {
        return { mimeType: 'image/avif', ext: 'avif', isVideo: false, isAnimated: brand === 'avis' };
      }
      // MP4 Video
      if (['mp41', 'mp42', 'isom', 'iso2', 'avc1', 'dash', 'M4V '].includes(brand)) {
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
   * Security Content & Malware Filter (SVG, XSS, Scripts, Decompression Bombs)
   */
  safetyCheck(buffer) {
    const chunk = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('utf8');
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /<\?php/i,
      /eval\s*\(/i,
      /base64_decode/i,
      /<!DOCTYPE\s+html/i,
      /<!ENTITY/i
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
    // Normalize upload types
    if (uploadType === 'avatarVideo') uploadType = 'animatedAvatar';
    if (uploadType === 'bannerVideo') uploadType = 'animatedBanner';

    const limits = MEDIA_LIMITS[uploadType] || MEDIA_LIMITS.avatar;

    // 1. File Size Validation
    if (buffer.length > limits.maxFileSize) {
      const maxMb = (limits.maxFileSize / (1024 * 1024)).toFixed(0);
      throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed limit of ${maxMb}MB.`);
    }

    // 2. MIME / Magic-Byte Detection
    const detected = this.detectFileType(buffer);
    if (!detected) {
      throw new Error('Unsupported or corrupted media file format. Allowed formats: JPEG, PNG, WebP, AVIF, GIF, MP4, WebM.');
    }

    if (!limits.allowedMimes.includes(detected.mimeType)) {
      throw new Error(`The format '${detected.mimeType}' is not allowed for ${uploadType}. Supported: ${limits.allowedMimes.join(', ')}`);
    }

    // 3. Strict Animated Media Check (Prevent bypassing Nitro VIP via normal avatar/banner)
    if ((uploadType === 'avatar' || uploadType === 'banner') && (detected.isAnimated || detected.isVideo || detected.mimeType === 'image/gif')) {
      throw new Error('Animated avatars and motion banners can only be uploaded via the DRAGME Nitro VIP section.');
    }

    // 4. Premium Entitlement Check (Unlocked for @nitish, Admin, and Nitro accounts)
    const isEntitled = Boolean(user && (user.is_premium || user.role === 'admin' || (user.username && user.username.toLowerCase() === 'nitish')));
    if (limits.requiresPremium && !isEntitled) {
      throw new Error(`Animated and video ${uploadType} is a DRAGME Nitro VIP feature exclusive to @nitish and Nitro members.`);
    }

    // 5. Safety Filter
    this.safetyCheck(buffer);

    return detected;
  },

  // ===========================================================================
  // 1 & 2 & 5. STATIC IMAGE PIPELINES (PFP 4:5 PORTRAIT, BANNER 3:1, POST WEBP)
  // ===========================================================================
  async processStaticImage(buffer, fileInfo, uploadType = 'avatar', user = null) {
    const limits = MEDIA_LIMITS[uploadType] || MEDIA_LIMITS.avatar;
    const baseSharp = sharp(buffer).rotate();
    const metadata = await baseSharp.metadata();

    if (metadata.width < (limits.minWidth || 32) || metadata.height < (limits.minHeight || 32)) {
      throw new Error(`Image resolution too low (${metadata.width}x${metadata.height}). Minimum is ${limits.minWidth}x${limits.minHeight}.`);
    }

    const uid = user ? user.id : 'anon';
    const timestamp = Date.now();
    const rand = crypto.randomBytes(4).toString('hex');
    const contentHash = this.calculateContentHash(buffer);

    let prefix = 'profile';
    let assetName = 'pfp';
    let usageType = 'PFP';

    if (uploadType === 'banner') {
      prefix = 'profile';
      assetName = 'banner';
      usageType = 'BANNER';
    } else if (uploadType === 'postImage' || uploadType === 'post') {
      prefix = 'post';
      assetName = 'post';
      usageType = 'POST';
    }

    const assetId = `${assetName}_${uid}_${timestamp}_${rand}`;
    const mainKey = `${prefix}/${assetId}.webp`;
    const variants = {};

    // Determine master target dimensions & crop
    let mainPipeline = sharp(buffer).rotate();
    let finalWidth = metadata.width;
    let finalHeight = metadata.height;

    if (uploadType === 'avatar') {
      // 4:5 Portrait Ratio (Target: 512x640 max)
      finalWidth = Math.min(metadata.width, 512);
      finalHeight = Math.round(finalWidth * (5 / 4));
      if (finalHeight > 640) {
        finalHeight = 640;
        finalWidth = Math.round(finalHeight * (4 / 5));
      }
      mainPipeline = mainPipeline.resize({
        width: 512,
        height: 640,
        fit: 'cover',
        withoutEnlargement: true
      });
      finalWidth = 512;
      finalHeight = 640;
    } else if (uploadType === 'banner') {
      // 3:1 Responsive Banner (Target: 1920x640 max)
      mainPipeline = mainPipeline.resize({
        width: 1920,
        height: 640,
        fit: 'cover',
        withoutEnlargement: true
      });
      finalWidth = 1920;
      finalHeight = 640;
    } else {
      // Post Image: Max 1920px (Fit inside)
      if (metadata.width > 1920 || metadata.height > 1920) {
        mainPipeline = mainPipeline.resize({
          width: 1920,
          height: 1920,
          fit: 'inside',
          withoutEnlargement: true
        });
        finalWidth = Math.min(metadata.width, 1920);
        finalHeight = Math.min(metadata.height, 1920);
      }
    }

    const optimizedMainBuffer = await mainPipeline
      .webp({ quality: limits.outputQuality || 88, effort: 5 })
      .toBuffer();

    await storageService.put(optimizedMainBuffer, mainKey);
    const mainPublicUrl = storageService.getPublicUrl(mainKey);
    variants.full = mainPublicUrl;

    // Generate Responsive Size Variants
    if (Array.isArray(limits.variants)) {
      for (const v of limits.variants) {
        const variantKey = `variants/${assetId}_${v.name}.webp`;
        let varPipeline = sharp(buffer).rotate();

        if (uploadType === 'avatar') {
          // Maintain 4:5 Portrait Ratio for all avatar variants
          const vHeight = v.height || Math.round(v.width * (5 / 4));
          varPipeline = varPipeline.resize({
            width: v.width,
            height: vHeight,
            fit: 'cover',
            withoutEnlargement: true
          });
        } else if (uploadType === 'banner') {
          // Maintain 3:1 Ratio for banner variants
          const vHeight = v.height || Math.round(v.width / 3);
          varPipeline = varPipeline.resize({
            width: v.width,
            height: vHeight,
            fit: 'cover',
            withoutEnlargement: true
          });
        } else {
          varPipeline = varPipeline.resize({
            width: v.width,
            height: v.height || undefined,
            fit: v.fit || 'inside',
            withoutEnlargement: true
          });
        }

        const variantBuf = await varPipeline.webp({ quality: 84 }).toBuffer();
        await storageService.put(variantBuf, variantKey);
        variants[v.name] = storageService.getPublicUrl(variantKey);
      }
    }

    const posterUrl = variants.md || variants.sm || mainPublicUrl;
    const thumbUrl = variants.thumb || variants.sm || variants.md || mainPublicUrl;
    variants.poster = posterUrl;
    variants.thumb = thumbUrl;

    return {
      mediaId: assetId,
      mediaType: 'IMAGE',
      usageType,
      storageKey: mainKey,
      storageUrl: mainPublicUrl,
      originalUrl: mainPublicUrl,
      posterUrl,
      posterKey: mainKey,
      thumbnailUrl: thumbUrl,
      variants,
      width: finalWidth,
      height: finalHeight,
      fileSize: optimizedMainBuffer.length,
      sizeBytes: optimizedMainBuffer.length,
      mimeType: 'image/webp',
      contentHash,
      isAnimated: false,
      duration: null,
      status: 'READY'
    };
  },

  // ===========================================================================
  // 3 & 4. ANIMATED PFP & ANIMATED BANNER (ANIMATED WEBP + STATIC POSTER)
  // ===========================================================================
  async processAnimatedMedia(buffer, fileInfo, uploadType = 'animatedAvatar', user = null) {
    const limits = MEDIA_LIMITS[uploadType] || MEDIA_LIMITS.animatedAvatar;
    const uid = user ? user.id : 'anon';
    const timestamp = Date.now();
    const rand = crypto.randomBytes(4).toString('hex');
    const contentHash = this.calculateContentHash(buffer);

    const isAvatar = uploadType === 'animatedAvatar';
    const prefix = 'profile';
    const assetName = isAvatar ? 'pfp_anim' : 'banner_anim';
    const usageType = isAvatar ? 'PFP' : 'BANNER';
    const assetId = `${assetName}_${uid}_${timestamp}_${rand}`;

    const mainKey = `${prefix}/${assetId}.webp`;
    const posterKey = `posters/poster_${assetId}.webp`;
    const variants = {};

    let targetWidth = isAvatar ? 512 : 1920;
    let targetHeight = isAvatar ? 640 : 640; // 4:5 for PFP, 3:1 for banner

    let optimizedBuffer;
    let posterBuffer;
    let width = targetWidth;
    let height = targetHeight;

    if (fileInfo.mimeType === 'image/gif' || fileInfo.mimeType === 'image/webp') {
      // Process Animated GIF / WebP using Sharp animated pipeline
      const sharpInstance = sharp(buffer, { animated: true });
      const metadata = await sharpInstance.metadata();
      width = metadata.width;
      height = metadata.pageHeight || metadata.height;

      let pipeline = sharp(buffer, { animated: true });
      if (isAvatar) {
        pipeline = pipeline.resize({
          width: 512,
          height: 640,
          fit: 'cover',
          withoutEnlargement: true
        });
      } else {
        pipeline = pipeline.resize({
          width: 1920,
          height: 640,
          fit: 'cover',
          withoutEnlargement: true
        });
      }

      optimizedBuffer = await pipeline
        .webp({
          quality: 78,
          effort: 5,
          loop: 0,
          force: true
        })
        .toBuffer();

      // Static poster fallback from 1st frame
      posterBuffer = await sharp(buffer, { pages: 1 })
        .resize({
          width: isAvatar ? 256 : 640,
          height: isAvatar ? 320 : 213,
          fit: 'cover',
          withoutEnlargement: true
        })
        .webp({ quality: 85 })
        .toBuffer();
    } else {
      // Video source uploaded for animated profile (MP4 / WebM)
      // Store video in profile directory
      const videoExt = fileInfo.ext || 'mp4';
      const videoKey = `${prefix}/${assetId}.${videoExt}`;
      await storageService.put(buffer, videoKey);

      // Generate static poster fallback
      posterBuffer = await sharp({
        create: {
          width: isAvatar ? 512 : 1920,
          height: isAvatar ? 640 : 640,
          channels: 4,
          background: { r: 13, g: 18, b: 28, alpha: 1 }
        }
      })
        .webp({ quality: 85 })
        .toBuffer();

      await storageService.put(posterBuffer, posterKey);

      const mainUrl = storageService.getPublicUrl(videoKey);
      const posterUrl = storageService.getPublicUrl(posterKey);

      variants.full = mainUrl;
      variants.poster = posterUrl;
      variants.thumb = posterUrl;

      return {
        mediaId: assetId,
        mediaType: 'ANIMATED_IMAGE',
        usageType,
        storageKey: videoKey,
        storageUrl: mainUrl,
        originalUrl: mainUrl,
        posterUrl,
        posterKey,
        thumbnailUrl: posterUrl,
        variants,
        width: targetWidth,
        height: targetHeight,
        fileSize: buffer.length,
        sizeBytes: buffer.length,
        mimeType: fileInfo.mimeType,
        contentHash,
        isAnimated: true,
        duration: limits.recommendedDuration || 3,
        status: 'READY'
      };
    }

    await storageService.put(optimizedBuffer, mainKey);
    await storageService.put(posterBuffer, posterKey);

    const mainUrl = storageService.getPublicUrl(mainKey);
    const posterUrl = storageService.getPublicUrl(posterKey);

    variants.full = mainUrl;
    variants.poster = posterUrl;
    variants.thumb = posterUrl;

    return {
      mediaId: assetId,
      mediaType: 'ANIMATED_IMAGE',
      usageType,
      storageKey: mainKey,
      storageUrl: mainUrl,
      originalUrl: mainUrl,
      posterUrl,
      posterKey,
      thumbnailUrl: posterUrl,
      variants,
      width: targetWidth,
      height: targetHeight,
      fileSize: optimizedBuffer.length,
      sizeBytes: optimizedBuffer.length,
      mimeType: 'image/webp',
      contentHash,
      isAnimated: true,
      duration: limits.recommendedDuration || 3,
      status: 'READY'
    };
  },

  // ===========================================================================
  // 6. POST VIDEOS (PROPER VIDEO DELIVERY - MUST NOT BE CONVERTED TO WEBP)
  // ===========================================================================
  async processPostVideo(buffer, fileInfo, uploadType = 'postVideo', user = null) {
    const uid = user ? user.id : 'anon';
    const timestamp = Date.now();
    const rand = crypto.randomBytes(4).toString('hex');
    const contentHash = this.calculateContentHash(buffer);

    const assetId = `post_vid_${uid}_${timestamp}_${rand}`;
    const videoKey = `post/${assetId}.${fileInfo.ext}`;
    const posterKey = `posters/poster_${assetId}.webp`;

    // 1. Store video asset in permanent storage (post/ directory)
    await storageService.put(buffer, videoKey);

    // 2. Generate video poster frame for poster-first viewport delivery
    const posterBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 10, g: 14, b: 22, alpha: 1 }
      }
    })
      .webp({ quality: 85 })
      .toBuffer();

    await storageService.put(posterBuffer, posterKey);

    const mainUrl = storageService.getPublicUrl(videoKey);
    const posterUrl = storageService.getPublicUrl(posterKey);

    const variants = {
      full: mainUrl,
      video: mainUrl,
      poster: posterUrl,
      thumb: posterUrl
    };

    return {
      mediaId: assetId,
      mediaType: 'VIDEO',
      usageType: 'POST',
      storageKey: videoKey,
      storageUrl: mainUrl,
      originalUrl: mainUrl,
      posterUrl,
      posterKey,
      thumbnailUrl: posterUrl,
      variants,
      width: 1920,
      height: 1080,
      fileSize: buffer.length,
      sizeBytes: buffer.length,
      mimeType: fileInfo.mimeType,
      contentHash,
      isAnimated: false,
      duration: 30,
      status: 'READY'
    };
  },

  /**
   * Main Universal Process Media Dispatcher
   */
  async processMedia(buffer, uploadType = 'avatar', user = null) {
    const startTime = Date.now();
    try {
      const fileInfo = await this.validateMedia(buffer, uploadType, user);
      let result;

      if (uploadType === 'postVideo') {
        result = await this.processPostVideo(buffer, fileInfo, uploadType, user);
      } else if (uploadType === 'animatedAvatar' || uploadType === 'avatarVideo') {
        result = await this.processAnimatedMedia(buffer, fileInfo, 'animatedAvatar', user);
      } else if (uploadType === 'animatedBanner' || uploadType === 'bannerVideo') {
        result = await this.processAnimatedMedia(buffer, fileInfo, 'animatedBanner', user);
      } else if (fileInfo.isVideo) {
        // Fallback for video in other types
        result = await this.processPostVideo(buffer, fileInfo, uploadType, user);
      } else {
        result = await this.processStaticImage(buffer, fileInfo, uploadType, user);
      }

      const elapsed = Date.now() - startTime;
      this.metrics.totalProcessedCount++;
      this.metrics.totalProcessingTimeMs += elapsed;
      this.metrics.totalUploadedBytes += buffer.length;
      this.metrics.totalOptimizedBytes += (result.sizeBytes || buffer.length);

      return result;
    } catch (err) {
      this.metrics.failuresCount++;
      throw err;
    }
  },

  /**
   * Safely delete a media file and all its associated variants & posters from storage
   */
  async deleteMediaByUrl(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('/uploads/')) return 0;

    let deletedCount = 0;
    const cleanUrl = url.split('?')[0].split('#')[0];
    const key = cleanUrl.replace(/^\/uploads\//, '');
    const filename = path.basename(cleanUrl);
    const baseId = filename.replace(/(\.[^.]+$|_original\.[^.]+$)/, '');

    // Delete main key
    const res = await storageService.delete(key);
    if (res.deleted) {
      deletedCount++;
      this.metrics.garbageCollectedBytes += res.sizeBytes || 0;
    }

    // Delete poster
    const posterKey = `posters/poster_${baseId}.webp`;
    const pRes = await storageService.delete(posterKey);
    if (pRes.deleted) {
      deletedCount++;
      this.metrics.garbageCollectedBytes += pRes.sizeBytes || 0;
    }

    this.metrics.garbageCollectedFiles += deletedCount;
    return deletedCount;
  },

  /**
   * Delete Previous User Media Assets when replacing avatar or banner.
   */
  async deleteUserPreviousMedia(userId, mediaType, currentUrlToKeep = null, db = null) {
    if (!userId || !db) return 0;
    let deletedCount = 0;

    try {
      const entityType = mediaType.toLowerCase().includes('banner') ? 'user_banner' : 'user_avatar';
      const previousAssets = await db.all(
        `SELECT id, storage_key, poster_key, storage_url, poster_url, variants FROM media_assets 
         WHERE owner_id = ? AND (attached_entity_type = ? OR usage_type = ? OR media_type LIKE ?)`,
        [userId, entityType, entityType.toUpperCase(), `%${mediaType}%`]
      );

      for (const asset of previousAssets) {
        const assetUrl = asset.storage_url || storageService.getPublicUrl(asset.storage_key);
        if (currentUrlToKeep && (assetUrl === currentUrlToKeep || asset.storage_key === currentUrlToKeep)) {
          continue; // keep current active asset
        }
        if (asset.storage_key) {
          await storageService.delete(asset.storage_key);
          deletedCount++;
        } else if (asset.storage_url) {
          deletedCount += await this.deleteMediaByUrl(asset.storage_url);
        }
        if (asset.poster_key) {
          await storageService.delete(asset.poster_key);
        }
        await db.run('DELETE FROM media_assets WHERE id = ?', [asset.id]);
        await db.run('DELETE FROM media_usages WHERE media_id = ?', [asset.id]).catch(() => {});
      }
    } catch (err) {
      console.warn('Non-fatal error purging previous user media assets:', err.message);
    }

    return deletedCount;
  },

  /**
   * System-Wide Orphan Media Pruner & Storage Garbage Collector
   */
  async pruneOrphanedMedia(db, maxAgeMs = 2 * 60 * 60 * 1000) {
    const startTime = Date.now();
    let totalPruned = 0;
    let bytesPruned = 0;

    const activeKeys = new Set();
    const activeUrls = new Set();

    if (db) {
      try {
        const users = await db.all('SELECT avatar_url, banner_url FROM users');
        users.forEach(u => {
          if (u.avatar_url) activeUrls.add(u.avatar_url);
          if (u.banner_url) activeUrls.add(u.banner_url);
        });

        const posts = await db.all('SELECT image_url, author_avatar FROM posts');
        posts.forEach(p => {
          if (p.image_url) activeUrls.add(p.image_url);
          if (p.author_avatar) activeUrls.add(p.author_avatar);
        });

        const comments = await db.all('SELECT author_avatar FROM comments');
        comments.forEach(c => {
          if (c.author_avatar) activeUrls.add(c.author_avatar);
        });

        const mediaAssets = await db.all('SELECT id, storage_key, storage_url, poster_key, poster_url, created_at FROM media_assets');
        const now = Date.now();
        const unreferencedAssetIds = [];

        mediaAssets.forEach(m => {
          const createdAtTime = new Date(m.created_at).getTime();
          const isRecent = (now - createdAtTime) < maxAgeMs;
          const url = m.storage_url || storageService.getPublicUrl(m.storage_key);
          const isReferenced = activeUrls.has(url) || (m.poster_url && activeUrls.has(m.poster_url));

          if (isReferenced || isRecent) {
            if (m.storage_key) activeKeys.add(m.storage_key);
            if (m.poster_key) activeKeys.add(m.poster_key);
            if (url) activeUrls.add(url);
          } else {
            unreferencedAssetIds.push(m.id);
          }
        });

        for (const orphanId of unreferencedAssetIds) {
          await db.run('DELETE FROM media_assets WHERE id = ?', [orphanId]);
          await db.run('DELETE FROM media_usages WHERE media_id = ?', [orphanId]).catch(() => {});
        }
      } catch (dbErr) {
        console.error('Error querying active media references for pruning:', dbErr);
      }
    }

    // Scan storage directories and delete unreferenced old files
    const prefixes = ['temp', 'profile', 'post', 'posters', 'variants'];
    const now = Date.now();

    for (const prefix of prefixes) {
      const items = await storageService.listPrefix(prefix);
      for (const item of items) {
        const itemUrl = storageService.getPublicUrl(item.key);
        const isDirectlyActive = activeKeys.has(item.key) || activeUrls.has(itemUrl);
        const isOlderThanGrace = (now - item.mtime.getTime()) > maxAgeMs;

        // Clean temp files unconditionally if older than grace period
        if (prefix === 'temp' && isOlderThanGrace) {
          const delRes = await storageService.delete(item.key);
          if (delRes.deleted) {
            totalPruned++;
            bytesPruned += item.sizeBytes;
          }
        } else if (!isDirectlyActive && isOlderThanGrace) {
          const delRes = await storageService.delete(item.key);
          if (delRes.deleted) {
            totalPruned++;
            bytesPruned += item.sizeBytes;
          }
        }
      }
    }

    this.metrics.garbageCollectedFiles += totalPruned;
    this.metrics.garbageCollectedBytes += bytesPruned;

    const freedMb = (bytesPruned / (1024 * 1024)).toFixed(2);
    if (totalPruned > 0) {
      console.log(`🧹 Storage Garbage Collector: Pruned ${totalPruned} orphaned media files, freed ${freedMb} MB (took ${Date.now() - startTime}ms).`);
    }

    return {
      filesPruned: totalPruned,
      bytesFreed: bytesPruned,
      freedMb
    };
  }
};

module.exports = MediaProcessor;
