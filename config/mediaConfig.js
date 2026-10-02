// =============================================================================
// DRAGME PRODUCTION MEDIA CONFIGURATION
// Centralized Limits, 4:5 Portrait PFP Ratio, 3:1 Banner Ratio, Formats & Policies
// =============================================================================

const path = require('path');

const MEDIA_LIMITS = {
  // 1. NORMAL PFP (4:5 vertical rectangular portrait ratio, 512x640 master max)
  avatar: {
    maxFileSize: 100 * 1024 * 1024, // 100 MB max upload source
    maxWidth: 4096,
    maxHeight: 4096,
    minWidth: 64,
    minHeight: 80,
    targetWidth: 512,
    targetHeight: 640,
    aspectRatio: 4 / 5,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    outputFormat: 'webp',
    outputQuality: 88,
    variants: [
      { name: 'full', width: 512, height: 640, fit: 'cover' },
      { name: 'md', width: 256, height: 320, fit: 'cover' },
      { name: 'sm', width: 128, height: 160, fit: 'cover' },
      { name: 'xs', width: 64, height: 80, fit: 'cover' }
    ]
  },

  // 2. NORMAL BANNER (3:1 responsive banner ratio)
  banner: {
    maxFileSize: 150 * 1024 * 1024, // 150 MB max upload
    maxWidth: 8192,
    maxHeight: 4096,
    minWidth: 480,
    minHeight: 160,
    targetWidth: 1920,
    targetHeight: 640,
    aspectRatio: 3 / 1,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    outputFormat: 'webp',
    outputQuality: 90,
    variants: [
      { name: 'xl', width: 3840, height: 1280, fit: 'cover' },
      { name: 'full', width: 1920, height: 640, fit: 'cover' },
      { name: 'lg', width: 1200, height: 400, fit: 'cover' },
      { name: 'md', width: 768, height: 256, fit: 'cover' },
      { name: 'sm', width: 480, height: 160, fit: 'cover' }
    ]
  },

  // 3. ANIMATED PFP (4:5 portrait ratio, 1-3 sec loop, Animated WebP + static poster)
  animatedAvatar: {
    maxFileSize: 500 * 1024 * 1024, // 500 MB (Large raw video/GIF source support)
    maxDuration: 10, // 10 seconds max duration upload, recommended 1-3s loop
    recommendedDuration: 3,
    maxWidth: 3840,
    maxHeight: 3840,
    minWidth: 64,
    minHeight: 80,
    targetWidth: 512,
    targetHeight: 640,
    aspectRatio: 4 / 5,
    requiresPremium: true,
    allowedMimes: ['image/gif', 'image/webp', 'video/mp4', 'video/webm'],
    outputFormat: 'webp',
    variants: [
      { name: 'full', width: 512, height: 640, fit: 'cover' },
      { name: 'sm', width: 256, height: 320, fit: 'cover' }
    ]
  },

  // 4. ANIMATED BANNER (3:1 wide ratio, 1-4 sec loop, Animated WebP + static poster)
  animatedBanner: {
    maxFileSize: 1024 * 1024 * 1024, // 1 GB (4K / 60fps source clip support)
    maxDuration: 15, // 15 seconds max duration, recommended 1-4s loop
    recommendedDuration: 4,
    maxWidth: 3840,
    maxHeight: 2160,
    minWidth: 480,
    minHeight: 160,
    targetWidth: 1920,
    targetHeight: 640,
    aspectRatio: 3 / 1,
    requiresPremium: true,
    allowedMimes: ['image/gif', 'image/webp', 'video/mp4', 'video/webm'],
    outputFormat: 'webp',
    variants: [
      { name: 'full', width: 1920, height: 640, fit: 'cover' },
      { name: 'md', width: 960, height: 320, fit: 'cover' }
    ]
  },

  // 5. POST IMAGES (Normal static images, NOT converted to animated)
  postImage: {
    maxFileSize: 150 * 1024 * 1024, // 150 MB
    maxWidth: 8192,
    maxHeight: 8192,
    minWidth: 100,
    minHeight: 100,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    outputFormat: 'webp',
    outputQuality: 90,
    variants: [
      { name: 'xl', width: 3840, fit: 'inside' },
      { name: 'full', width: 1920, fit: 'inside' },
      { name: 'lg', width: 1440, fit: 'inside' },
      { name: 'md', width: 1080, fit: 'inside' },
      { name: 'sm', width: 640, fit: 'inside' },
      { name: 'thumb', width: 320, height: 320, fit: 'cover' }
    ]
  },

  // 6. POST VIDEOS (Proper video delivery, NOT converted to Animated WebP)
  postVideo: {
    maxFileSize: 2048 * 1024 * 1024, // 2 GB (Long 4K clips)
    maxDuration: 300, // 5 minutes
    maxWidth: 3840,
    maxHeight: 2160,
    allowedMimes: ['video/mp4', 'video/webm']
  },

  // Premium Profile Video Highlight
  profileVideo: {
    maxFileSize: 1024 * 1024 * 1024, // 1 GB
    maxDuration: 60, // 60 seconds
    maxWidth: 3840,
    maxHeight: 2160,
    requiresPremium: true,
    allowedMimes: ['video/mp4', 'video/webm']
  },

  // Cosmetic Decorations
  cosmeticDecoration: {
    maxFileSize: 50 * 1024 * 1024,
    maxWidth: 1024,
    maxHeight: 1024,
    allowedMimes: ['image/png', 'image/webp', 'image/gif'],
    requiresPremium: true
  }
};

const ANIMATION_POLICY = {
  MAX_ACTIVE_ANIMATIONS_DESKTOP: 10,
  MAX_ACTIVE_ANIMATIONS_MOBILE: 4,
  MAX_ACTIVE_ANIMATIONS_REDUCED_MOTION: 0,
  PRIORITIES: {
    HIGH: 3,    // Hero banner, focused modal, active studio preview
    MEDIUM: 2,  // Visible feed cards, nearby avatars
    LOW: 1      // Partially visible elements, decorative cosmetics
  },
  DEFAULT_POSTER_DIMENSION: 512,
  MAX_PRACTICAL_FPS: 30,
  CACHE_MAX_AGE_SECONDS: 31536000 // 1 year immutable CDN caching
};

const MAGIC_BYTES = {
  jpeg: [
    { offset: 0, bytes: [0xFF, 0xD8, 0xFF] }
  ],
  png: [
    { offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] }
  ],
  gif: [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }  // GIF89a
  ],
  webp: [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }  // WEBP
  ],
  avif: [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] } // ftyp
  ],
  mp4: [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] } // ftyp
  ],
  webm: [
    { offset: 0, bytes: [0x1A, 0x45, 0xDF, 0xA3] } // EBML header
  ]
};

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');

module.exports = {
  MEDIA_LIMITS,
  ANIMATION_POLICY,
  MAGIC_BYTES,
  UPLOADS_DIR: UPLOADS_ROOT,
  ORIGINALS_DIR: path.join(UPLOADS_ROOT, 'originals'),
  VARIANTS_DIR: path.join(UPLOADS_ROOT, 'variants'),
  POSTERS_DIR: path.join(UPLOADS_ROOT, 'posters'),
  TEMP_UPLOADS_DIR: path.join(UPLOADS_ROOT, 'temp'),
  PROFILE_DIR: path.join(UPLOADS_ROOT, 'profile'),
  POST_DIR: path.join(UPLOADS_ROOT, 'post')
};
