// =============================================================================
// DRAGME PRODUCTION MEDIA CONFIGURATION
// Centralized, Environment-Driven Limits & Format Registry
// =============================================================================

const path = require('path');

const MEDIA_LIMITS = {
  avatar: {
    maxFileSize: 15 * 1024 * 1024, // 15 MB
    maxWidth: 2048,
    maxHeight: 2048,
    minWidth: 64,
    minHeight: 64,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    outputFormat: 'webp',
    outputQuality: 85,
    variants: [
      { name: 'full', width: 512, height: 512, fit: 'cover' },
      { name: 'md', width: 256, height: 256, fit: 'cover' },
      { name: 'sm', width: 128, height: 128, fit: 'cover' },
      { name: 'xs', width: 64, height: 64, fit: 'cover' }
    ]
  },

  banner: {
    maxFileSize: 30 * 1024 * 1024, // 30 MB
    maxWidth: 4096,
    maxHeight: 2048,
    minWidth: 480,
    minHeight: 160,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    outputFormat: 'webp',
    outputQuality: 88,
    variants: [
      { name: 'full', width: 1920, height: 640, fit: 'cover' },
      { name: 'lg', width: 1200, height: 400, fit: 'cover' },
      { name: 'md', width: 768, height: 256, fit: 'cover' },
      { name: 'sm', width: 480, height: 160, fit: 'cover' }
    ]
  },

  animatedAvatar: {
    maxFileSize: 30 * 1024 * 1024, // 30 MB
    maxDuration: 10, // 10 seconds
    maxWidth: 1024,
    maxHeight: 1024,
    minWidth: 64,
    minHeight: 64,
    requiresPremium: true,
    allowedMimes: ['image/gif', 'image/webp', 'video/mp4', 'video/webm'],
    outputWidth: 512,
    outputHeight: 512
  },

  animatedBanner: {
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    maxDuration: 15, // 15 seconds
    maxWidth: 2560,
    maxHeight: 1440,
    minWidth: 480,
    minHeight: 160,
    requiresPremium: true,
    allowedMimes: ['image/gif', 'image/webp', 'video/mp4', 'video/webm'],
    outputWidth: 1920,
    outputHeight: 640
  },

  postImage: {
    maxFileSize: 25 * 1024 * 1024, // 25 MB
    maxWidth: 8192,
    maxHeight: 8192,
    minWidth: 100,
    minHeight: 100,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
    outputFormat: 'webp',
    outputQuality: 88,
    variants: [
      { name: 'full', width: 1920, fit: 'inside' },
      { name: 'lg', width: 1440, fit: 'inside' },
      { name: 'md', width: 1080, fit: 'inside' },
      { name: 'sm', width: 640, fit: 'inside' },
      { name: 'thumb', width: 320, height: 320, fit: 'cover' }
    ]
  },

  postVideo: {
    maxFileSize: 250 * 1024 * 1024, // 250 MB
    maxDuration: 180, // 3 minutes
    maxWidth: 3840,
    maxHeight: 2160,
    allowedMimes: ['video/mp4', 'video/webm']
  },

  profileVideo: {
    maxFileSize: 100 * 1024 * 1024, // 100 MB
    maxDuration: 30, // 30 seconds
    maxWidth: 1920,
    maxHeight: 1080,
    requiresPremium: true,
    allowedMimes: ['video/mp4', 'video/webm']
  }
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

module.exports = {
  MEDIA_LIMITS,
  MAGIC_BYTES,
  UPLOADS_DIR: path.join(__dirname, 'uploads'),
  TEMP_UPLOADS_DIR: path.join(__dirname, 'uploads', 'temp'),
  VARIANTS_DIR: path.join(__dirname, 'uploads', 'variants'),
  POSTERS_DIR: path.join(__dirname, 'uploads', 'posters')
};
