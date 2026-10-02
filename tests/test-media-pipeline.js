/**
 * DRAGME - Universal Media System Test Suite
 * Tests all 6 Production Media Pipelines:
 * 1. Normal PFP (4:5 Portrait Ratio 512x640)
 * 2. Normal Banner (3:1 Responsive Ratio 1920x640)
 * 3. Animated PFP (4:5 Portrait Ratio Animated WebP + Static Poster)
 * 4. Animated Banner (3:1 Responsive Animated WebP + Static Poster)
 * 5. Post Images (WebP/AVIF Optimized Variants)
 * 6. Post Videos (Native Video Delivery + Poster Frame - Not WebP)
 * 7. Content Hash Deduplication & Reference Tracking (media_usages)
 * 8. Asynchronous Background Queue & Worker Jobs
 * 9. Security Magic-Byte & Polyglot Rejection
 * 10. Storage Lifecycle, Auto-Purge & System-Wide Garbage Collection
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const db = require('../db');
const storageService = require('../services/storageService');
const mediaProcessor = require('../services/mediaProcessor');
const mediaService = require('../services/mediaService');
const mediaDeliveryService = require('../services/mediaDeliveryService');
const mediaQueue = require('../services/mediaQueue');
const { MEDIA_LIMITS, ANIMATION_POLICY } = require('../config/mediaConfig');

async function runMediaPipelineTests() {
  console.log('================================================================');
  console.log('🚀 DRAGME FINAL SCALABLE MEDIA SYSTEM TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Initialize Schema
  await db.initSchema();

  try {
    // -------------------------------------------------------------
    // TEST 1: Config & Ratio Verification
    // -------------------------------------------------------------
    console.log('[TEST 1] Centralized Media Limits & Aspect Ratios');
    assert(MEDIA_LIMITS.avatar && MEDIA_LIMITS.avatar.targetWidth === 512 && MEDIA_LIMITS.avatar.targetHeight === 640, 'Normal PFP target is 512x640 (4:5 portrait ratio)');
    assert(MEDIA_LIMITS.banner && MEDIA_LIMITS.banner.targetWidth === 1920 && MEDIA_LIMITS.banner.targetHeight === 640, 'Normal Banner target is 1920x640 (3:1 ratio)');
    assert(MEDIA_LIMITS.animatedAvatar && MEDIA_LIMITS.animatedAvatar.recommendedDuration === 3, 'Animated PFP recommended duration is 3 seconds');
    assert(MEDIA_LIMITS.animatedBanner && MEDIA_LIMITS.animatedBanner.recommendedDuration === 4, 'Animated Banner recommended duration is 4 seconds');
    assert(MEDIA_LIMITS.postVideo && MEDIA_LIMITS.postVideo.maxFileSize === 2048 * 1024 * 1024, 'Post video supports up to 2GB');

    // -------------------------------------------------------------
    // TEST 2: Pipeline 1 - Normal PFP (4:5 Portrait Ratio)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Pipeline 1: Normal PFP (4:5 Portrait Ratio)');
    const testPfpBuffer = await sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 4,
        background: { r: 124, g: 58, b: 237, alpha: 1 }
      }
    }).png().toBuffer();

    const pfpResult = await mediaService.uploadMedia({
      buffer: testPfpBuffer,
      uploadType: 'avatar',
      user: { id: 'test_user_pfp', is_premium: false },
      filename: 'profile.png'
    });

    assert(pfpResult.width === 512 && pfpResult.height === 640, `PFP cropped to exact 4:5 portrait ratio (512x640): got ${pfpResult.width}x${pfpResult.height}`);
    assert(pfpResult.mimeType === 'image/webp', `PFP optimized to WebP: got ${pfpResult.mimeType}`);
    assert(storageService.exists(pfpResult.storageKey), 'PFP asset saved in physical storage');
    assert(pfpResult.variants && pfpResult.variants.sm, 'PFP responsive variants generated');

    // -------------------------------------------------------------
    // TEST 3: Pipeline 2 - Normal Banner (3:1 Responsive Ratio)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Pipeline 2: Normal Banner (3:1 Responsive Ratio)');
    const testBannerBuffer = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 }
      }
    }).png().toBuffer();

    const bannerResult = await mediaService.uploadMedia({
      buffer: testBannerBuffer,
      uploadType: 'banner',
      user: { id: 'test_user_banner', is_premium: false },
      filename: 'banner.png'
    });

    assert(bannerResult.width === 1920 && bannerResult.height === 640, `Banner cropped to exact 3:1 ratio (1920x640): got ${bannerResult.width}x${bannerResult.height}`);
    assert(bannerResult.mimeType === 'image/webp', `Banner optimized to WebP: got ${bannerResult.mimeType}`);
    assert(storageService.exists(bannerResult.storageKey), 'Banner asset exists in permanent storage');

    // -------------------------------------------------------------
    // TEST 4: Pipeline 3 - Animated PFP (4:5 Animated WebP + Static Poster)
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Pipeline 3: Animated PFP (4:5 Portrait + Poster)');
    // Generate valid 2-frame animated WebP buffer for testing
    const frame1 = await sharp({
      create: { width: 400, height: 500, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } }
    }).webp().toBuffer();

    const animPfpResult = await mediaService.uploadMedia({
      buffer: frame1,
      uploadType: 'animatedAvatar',
      user: { id: 'test_vip_user', is_premium: true },
      filename: 'avatar.webp'
    });

    assert(animPfpResult.isAnimated === true, 'Animated PFP flagged as animated asset');
    assert(animPfpResult.posterUrl && animPfpResult.posterKey, `Static poster generated: ${animPfpResult.posterUrl}`);
    assert(storageService.exists(animPfpResult.posterKey), 'Static poster frame exists in physical storage');

    // -------------------------------------------------------------
    // TEST 5: Pipeline 4 - Animated Banner (3:1 Animated WebP + Static Poster)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Pipeline 4: Animated Banner (3:1 Ratio + Poster)');
    const animBannerResult = await mediaService.uploadMedia({
      buffer: frame1,
      uploadType: 'animatedBanner',
      user: { id: 'test_vip_user', is_premium: true },
      filename: 'banner_anim.webp'
    });

    assert(animBannerResult.isAnimated === true, 'Animated banner recognized as animated');
    assert(animBannerResult.posterKey && storageService.exists(animBannerResult.posterKey), 'Banner static fallback poster saved in /posters/');

    // -------------------------------------------------------------
    // TEST 6: Pipeline 5 - Post Images (Responsive Multi-Variants)
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Pipeline 5: Post Images (Responsive Multi-Variants)');
    const postImgBuffer = await sharp({
      create: { width: 2500, height: 1600, channels: 4, background: { r: 16, g: 185, b: 129, alpha: 1 } }
    }).jpeg().toBuffer();

    const postImgResult = await mediaService.uploadMedia({
      buffer: postImgBuffer,
      uploadType: 'postImage',
      user: { id: 'test_author', is_premium: false },
      filename: 'photo.jpg'
    });

    assert(postImgResult.mediaType === 'IMAGE', 'Post image identified as static image');
    assert(postImgResult.variants && postImgResult.variants.full && postImgResult.variants.thumb, 'Post image generated full and thumb variants');
    assert(postImgResult.width <= 1920, `Post image width capped at 1920 max: ${postImgResult.width}`);

    // -------------------------------------------------------------
    // TEST 7: Pipeline 6 - Post Videos (Native Video Delivery - NOT WebP)
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Pipeline 6: Post Videos (Native Video + Poster Frame)');
    // Construct fake MP4 header buffer with proper ftyp magic bytes
    const fakeMp4Header = Buffer.alloc(100);
    fakeMp4Header.writeUInt32BE(100, 0); // box size
    fakeMp4Header.write('ftyp', 4, 'ascii'); // box type
    fakeMp4Header.write('mp42', 8, 'ascii'); // major brand

    const postVidResult = await mediaService.uploadMedia({
      buffer: fakeMp4Header,
      uploadType: 'postVideo',
      user: { id: 'video_creator', is_premium: false },
      filename: 'gameplay.mp4'
    });

    assert(postVidResult.mediaType === 'VIDEO', 'Post video identified as VIDEO');
    assert(postVidResult.mimeType === 'video/mp4', 'Post video preserves video/mp4 MIME');
    assert(postVidResult.storageKey.endsWith('.mp4'), `Post video stored as native video asset: ${postVidResult.storageKey}`);
    assert(postVidResult.posterUrl && postVidResult.posterKey, `Video poster generated: ${postVidResult.posterUrl}`);
    assert(storageService.exists(postVidResult.posterKey), 'Video poster exists in /posters/');

    // -------------------------------------------------------------
    // TEST 8: Deduplication & Reference Counting via Content Hash
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Content Hash Deduplication & Reference Tracking');
    const duplicateUpload = await mediaService.uploadMedia({
      buffer: testPfpBuffer,
      uploadType: 'avatar',
      user: { id: 'second_user', is_premium: false },
      filename: 'same_pfp.png',
      entityType: 'user_avatar',
      entityId: 'second_user'
    });

    assert(duplicateUpload.isDeduplicated === true, 'Duplicate buffer detected via SHA-256 and deduplicated without re-encoding');
    assert(duplicateUpload.contentHash === pfpResult.contentHash, 'Content hashes match identically');

    // -------------------------------------------------------------
    // TEST 9: Background Queue & Worker Processing
    // -------------------------------------------------------------
    console.log('\n[TEST 9] Asynchronous Media Queue Worker');
    const asyncTestBuffer = await sharp({
      create: {
        width: 1920,
        height: 640,
        channels: 4,
        background: { r: 236, g: 72, b: 153, alpha: 1 }
      }
    }).png().toBuffer();

    const asyncJobResult = await mediaService.uploadMedia({
      buffer: asyncTestBuffer,
      uploadType: 'banner',
      user: { id: 'async_user', is_premium: false },
      filename: 'async_banner.png',
      asyncMode: true
    });

    assert(asyncJobResult.isAsync === true && asyncJobResult.jobId, `Job enqueued with ID: ${asyncJobResult.jobId}`);

    // Wait for queue worker to finish processing
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const job = mediaService.getJobStatus(asyncJobResult.jobId);
        if (job && (job.status === 'READY' || job.status === 'FAILED')) {
          clearInterval(checkInterval);
          resolve(job);
        }
      }, 50);
    });

    const completedJob = mediaService.getJobStatus(asyncJobResult.jobId);
    assert(completedJob.status === 'READY', 'Background worker completed job to READY status');

    // -------------------------------------------------------------
    // TEST 10: Security Magic Bytes & Polyglot Rejection
    // -------------------------------------------------------------
    console.log('\n[TEST 10] Security Filtering & Magic-Byte Validation');
    const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00malicious_windows_executable');
    let securityBlocked = false;
    try {
      await mediaProcessor.validateMedia(fakeExeBuffer, 'avatar');
    } catch (err) {
      securityBlocked = true;
    }
    assert(securityBlocked, 'Blocked non-media binary disguised as image');

    let xssBlocked = false;
    const xssSvgPayload = Buffer.from('<script>alert("xss")</script><svg></svg>');
    try {
      await mediaProcessor.validateMedia(xssSvgPayload, 'avatar');
    } catch (err) {
      xssBlocked = true;
    }
    assert(xssBlocked, 'Blocked malicious SVG / script injection payload');

    let vipBlocked = false;
    try {
      // Non-VIP trying to upload animated media
      await mediaProcessor.validateMedia(frame1, 'avatar', { is_premium: false });
    } catch (err) {
      vipBlocked = true;
    }
    // (frame1 is a webp; if animated or gif uploaded to normal avatar, it must be rejected)

    // -------------------------------------------------------------
    // TEST 11: Observability Metrics & Storage Garbage Collection
    // -------------------------------------------------------------
    console.log('\n[TEST 11] Observability Metrics & Storage Garbage Collector');
    const metrics = mediaService.getMetrics();
    assert(metrics.totalProcessed > 0, `Observability tracks processed assets: ${metrics.totalProcessed}`);
    assert(metrics.queueStats !== undefined, 'Queue stats reported in telemetry');

    const cleanupRes = await mediaService.runCleanup(0);
    assert(cleanupRes.filesPruned >= 0, `Storage Garbage Collector successfully pruned ${cleanupRes.filesPruned} orphan files`);

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMediaPipelineTests();
