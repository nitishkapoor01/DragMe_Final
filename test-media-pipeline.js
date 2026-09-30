/**
 * DRAGME - Production Media Pipeline Test Suite
 * Validates Sharp image compression, animated loops, magic-byte inspection,
 * database tracking, security validation, and endpoint integration.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const MediaProcessor = require('./mediaProcessor');
const { MEDIA_LIMITS } = require('./mediaConfig');
const { db, query, run } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dragme_super_secret_jwt_key_development_2025_#99';

async function runMediaPipelineTests() {
  console.log('================================================================');
  console.log('🚀 DRAGME PRODUCTION MEDIA PIPELINE TEST SUITE');
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

  try {
    // -------------------------------------------------------------
    // Test 1: Config & Centralized Limits Verification
    // -------------------------------------------------------------
    console.log('[TEST 1] Centralized Media Limits & Mime Config');
    assert(MEDIA_LIMITS.avatar && MEDIA_LIMITS.avatar.maxFileSize === 100 * 1024 * 1024, 'Avatar max size is 100MB');
    assert(MEDIA_LIMITS.animatedBanner && MEDIA_LIMITS.animatedBanner.maxFileSize === 1024 * 1024 * 1024, 'Animated banner max size is 1GB');
    assert(MEDIA_LIMITS.avatar.allowedMimes.includes('image/webp') && MEDIA_LIMITS.animatedAvatar.allowedMimes.includes('image/gif'), 'Allowed mime types include webp and gif');
    assert(MEDIA_LIMITS.avatar.variants.some(v => v.name === 'md' && v.width === 256), 'Avatar variant md is 256px');

    // -------------------------------------------------------------
    // Test 2: Sharp Valid Image Processing & Responsive Variants
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Sharp Image Compression & Responsive WebP Generation');
    // Create a synthetic 800x600 test JPEG buffer
    const testJpegBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 180, g: 254, b: 39 } // Lime
      }
    }).jpeg().toBuffer();

    const jpegResult = await MediaProcessor.processMedia(testJpegBuffer, 'avatar', { id: 1, is_premium: 0 });

    assert(jpegResult && jpegResult.storageUrl, 'Processed JPEG generated main URL');
    assert(jpegResult.variants && jpegResult.variants.sm && jpegResult.variants.xs, 'Generated responsive WebP variants');
    assert(jpegResult.width === 800 && jpegResult.height === 600, `Retrieved dimensions accurately (${jpegResult.width}x${jpegResult.height})`);
    
    // Check if main file exists on disk
    const mainFilePath = path.join(__dirname, jpegResult.storageUrl.replace(/^\//, ''));
    assert(fs.existsSync(mainFilePath), `Output file exists at ${mainFilePath}`);

    // Check variant file exists
    const variantPath = path.join(__dirname, jpegResult.variants.sm.replace(/^\//, ''));
    assert(fs.existsSync(variantPath), `Variant file exists at ${variantPath}`);

    // -------------------------------------------------------------
    // Test 3: Animated GIF / WebP Loop Preservation
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Animated GIF Processing with Frame Loop Preservation');
    // Create a 2-frame animated gif or simple gif buffer
    const gifBase64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    const gifBuffer = Buffer.from(gifBase64, 'base64');

    const gifResult = await MediaProcessor.processMedia(gifBuffer, 'animatedAvatar', { id: 1, is_premium: 1 });

    assert(gifResult && gifResult.storageUrl, 'Animated GIF successfully processed');
    assert(gifResult.isAnimated === true, 'Detected animated status correctly');
    const gifOutPath = path.join(__dirname, gifResult.storageUrl.replace(/^\//, ''));
    assert(fs.existsSync(gifOutPath), 'Output animated media exists on disk');

    // Verify that attempting to upload animated GIF under normal 'avatar' is rejected
    let normalBypassError = null;
    try {
      await MediaProcessor.processMedia(gifBuffer, 'avatar', { id: 1, is_premium: 0 });
    } catch (err) {
      normalBypassError = err;
    }
    assert(normalBypassError !== null, 'Attempt to upload animated GIF via normal avatar is rejected');

    // -------------------------------------------------------------
    // Test 4: Magic Byte Validation & Malicious File Rejection
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Magic-Byte Security Inspection & Polyglot Rejection');
    
    // Polyglot/Spoofed PHP/HTML script with fake bytes
    const spoofedBuffer = Buffer.from('<?php echo "evil_payload"; ?>', 'utf8');
    let spoofError = null;
    try {
      await MediaProcessor.processMedia(spoofedBuffer, 'avatar', { id: 1 });
    } catch (err) {
      spoofError = err;
    }
    assert(spoofError !== null, `Spoofed payload correctly rejected (${spoofError?.message})`);

    // Oversized buffer rejection (101MB > 100MB limit for avatar)
    const oversizedBuffer = Buffer.alloc(101 * 1024 * 1024);
    oversizedBuffer[0] = 0xFF;
    oversizedBuffer[1] = 0xD8;
    oversizedBuffer[2] = 0xFF;
    let sizeError = null;
    try {
      await MediaProcessor.processMedia(oversizedBuffer, 'avatar', { id: 1 });
    } catch (err) {
      sizeError = err;
    }
    assert(sizeError !== null, `Oversized avatar (101MB) rejected (${sizeError?.message})`);

    // -------------------------------------------------------------
    // Test 5: Database Persistence (`media_assets` table)
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Database Media Assets Schema & Tracking');
    const assetId = `test_media_${Date.now()}`;
    const insertRes = await run(
      `INSERT INTO media_assets (id, owner_id, media_type, original_filename, storage_url, mime_type, file_size, width, height, is_attached)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [assetId, '1', 'avatar', 'unit_test_img.webp', jpegResult.storageUrl, 'image/webp', 12345, 800, 600, 0]
    );
    assert(insertRes, 'Saved media_assets record to database');

    const assetRow = await query(
      `SELECT * FROM media_assets WHERE storage_url = ?`,
      [jpegResult.storageUrl]
    );
    assert(assetRow && assetRow.length > 0, 'Queried media_assets record from database');
    assert(assetRow[0].is_attached === 0, 'Tracked as unattached temporary media initially');

    // -------------------------------------------------------------
    // Test 6: HTTP Upload API Integration & Entitlement Check
    // -------------------------------------------------------------
    console.log('\n[TEST 6] HTTP POST /api/upload/media API Endpoint Verification');
    
    let userRows = await query('SELECT id, username, role, is_premium FROM users LIMIT 1');
    let testUser = userRows && userRows[0];
    if (!testUser) {
      await run(
        `INSERT INTO users (id, username, email, password_hash, role, is_premium)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['test_u1', 'testuser', 'test@dragme.gg', 'hash123', 'admin', 1]
      );
      testUser = { id: 'test_u1', username: 'testuser', role: 'admin', is_premium: 1 };
    }

    // Generate valid JWT token for test user
    const testToken = jwt.sign(
      { id: testUser.id, username: testUser.username, role: testUser.role || 'user' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const postData = JSON.stringify({
      filename: 'api_test_avatar.jpg',
      mimeType: 'image/jpeg',
      base64Data: `data:image/jpeg;base64,${testJpegBuffer.toString('base64')}`,
      type: 'avatar'
    });

    const apiResponse = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 5173,
          path: '/api/upload/media',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'Authorization': `Bearer ${testToken}`
          }
        },
        (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode, data: JSON.parse(body) });
            } catch (e) {
              resolve({ statusCode: res.statusCode, body });
            }
          });
        }
      );
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    assert(apiResponse.statusCode === 200, `POST /api/upload/media returned HTTP 200 (Got ${apiResponse.statusCode})`);
    assert(apiResponse.data && apiResponse.data.url, `Received output URL: ${apiResponse.data?.url}`);
    assert(apiResponse.data.variants && apiResponse.data.variants.md, 'API returned responsive variants DTO');

    // Test unauthorized guest rejection
    const unauthResponse = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 5173,
          path: '/api/upload/media',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        },
        (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => resolve({ statusCode: res.statusCode }));
        }
      );
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    assert(unauthResponse.statusCode === 401, `Unauthenticated request correctly rejected with HTTP 401 (Got ${unauthResponse.statusCode})`);

    // -------------------------------------------------------------
    // Test 7: GET /api/media/limits
    // -------------------------------------------------------------
    console.log('\n[TEST 7] HTTP GET /api/media/limits API Endpoint');
    const limitsResponse = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:5173/api/media/limits', res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(body) }));
      }).on('error', reject);
    });

    assert(limitsResponse.statusCode === 200, `GET /api/media/limits returned HTTP 200`);
    assert(limitsResponse.data.limits && limitsResponse.data.limits.avatar, 'Received limits object for avatar');

    // -------------------------------------------------------------
    // Test 8: Cache-Control Immutable Header for /uploads/
    // -------------------------------------------------------------
    console.log('\n[TEST 8] CDN & Browser Immutable Caching Header Check');
    if (jpegResult && jpegResult.url) {
      const headerCheck = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:5173${jpegResult.url}`, res => {
          resolve({
            statusCode: res.statusCode,
            cacheControl: res.headers['cache-control']
          });
        }).on('error', reject);
      });

      assert(headerCheck.statusCode === 200, `Static media served with HTTP 200`);
      assert(headerCheck.cacheControl && headerCheck.cacheControl.includes('immutable'), `Cache-Control includes immutable (${headerCheck.cacheControl})`);
    }

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runMediaPipelineTests();
