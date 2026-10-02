/**
 * DRAGME - Centralized Media Delivery Service
 * Generates CDN-ready asset URLs, responsive variants, video poster frames,
 * and immutable cache metadata.
 */

const storageService = require('./storageService');
const { ANIMATION_POLICY } = require('../config/mediaConfig');

class MediaDeliveryService {
  constructor() {
    this.cdnUrl = process.env.CDN_BASE_URL || '';
  }

  /**
   * Resolve public delivery URL for a storage key or existing URL
   */
  resolveUrl(storageKeyOrUrl) {
    if (!storageKeyOrUrl) return '';
    return storageService.getPublicUrl(storageKeyOrUrl);
  }

  /**
   * Format complete delivery asset representation for API responses
   */
  formatDeliveryAsset(asset) {
    if (!asset) return null;

    const storageKey = asset.storageKey || asset.storage_key || asset.storage_url || '';
    const posterKey = asset.posterKey || asset.poster_key || asset.poster_url || '';
    const deliveryUrl = this.resolveUrl(storageKey);
    const posterUrl = posterKey ? this.resolveUrl(posterKey) : deliveryUrl;

    let variants = {};
    if (typeof asset.variants === 'string') {
      try {
        variants = JSON.parse(asset.variants || '{}');
      } catch (_) {
        variants = {};
      }
    } else if (typeof asset.variants === 'object' && asset.variants !== null) {
      variants = asset.variants;
    }

    // Resolve CDN URLs for all variants
    const resolvedVariants = {};
    for (const [vName, vKey] of Object.entries(variants)) {
      resolvedVariants[vName] = this.resolveUrl(vKey);
    }
    if (!resolvedVariants.full) resolvedVariants.full = deliveryUrl;
    if (!resolvedVariants.poster) resolvedVariants.poster = posterUrl;

    const mediaType = asset.mediaType || asset.media_type || 'IMAGE';
    const isAnimated = asset.isAnimated !== undefined
      ? Boolean(asset.isAnimated)
      : (mediaType === 'ANIMATED_IMAGE' || asset.is_animated === 1);

    return {
      mediaId: asset.id || asset.mediaId || asset.media_id,
      mediaType,
      usageType: asset.usageType || asset.usage_type,
      mimeType: asset.mimeType || asset.mime_type,
      status: asset.status || asset.processing_status || 'READY',
      storageKey: asset.storageKey || asset.storage_key,
      storageUrl: deliveryUrl,
      url: deliveryUrl,
      posterKey: asset.posterKey || asset.poster_key,
      posterUrl,
      thumbnailUrl: resolvedVariants.thumb || resolvedVariants.sm || posterUrl,
      variants: resolvedVariants,
      width: asset.width || 0,
      height: asset.height || 0,
      duration: asset.duration || 0,
      sizeBytes: asset.sizeBytes || asset.size_bytes || asset.file_size || 0,
      fileSize: asset.sizeBytes || asset.size_bytes || asset.file_size || 0,
      contentHash: asset.contentHash || asset.content_hash || null,
      isAnimated,
      createdAt: asset.created_at || asset.createdAt || new Date().toISOString()
    };
  }

  /**
   * Generate HTTP delivery headers for static media
   */
  getDeliveryHeaders(isImmutable = true) {
    return {
      'Cache-Control': isImmutable
        ? `public, max-age=${ANIMATION_POLICY.CACHE_MAX_AGE_SECONDS}, immutable`
        : 'public, max-age=86400, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*'
    };
  }
}

module.exports = new MediaDeliveryService();
