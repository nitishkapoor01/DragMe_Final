/* ==========================================================================
   DRAGME TEST SUITE: AVATAR & BANNER PERSISTENCE VERIFICATION
   Tests custom image/video uploads, 4:5 / 3:1 encoding, profile DB sync & permissions
   ========================================================================== */

const http = require('http');
const sharp = require('sharp');
const app = require('../server');
const db = require('../db');

let server = null;
let baseUrl = '';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const bodyData = options.body ? JSON.stringify(options.body) : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };
    if (bodyData) {
      headers['Content-Length'] = Buffer.byteLength(bodyData);
    }
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(raw); } catch (e) {}
        resolve({ status: res.statusCode, data: json, raw });
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

async function runProfileMediaSuite() {
  console.log('================================================================');
  console.log('🧪 DRAGME PROFILE AVATAR & BANNER PERSISTENCE TEST SUITE');
  console.log('================================================================\n');

  try {
    await db.initSchema();

    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        console.log(`📡 In-Memory Test Server active at ${baseUrl}\n`);
        resolve();
      });
    });

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

    // 1. Create a dummy test image buffer (PNG)
    const testImgBuf = await sharp({
      create: {
        width: 800,
        height: 1000,
        channels: 4,
        background: { r: 50, g: 120, b: 240, alpha: 1 }
      }
    }).png().toBuffer();
    const testBase64 = `data:image/png;base64,${testImgBuf.toString('base64')}`;

    // 2. Register standard user
    const randUser = 'artisan_' + Date.now().toString().slice(-6);
    const authReg = await request('/api/auth/register', {
      method: 'POST',
      body: {
        username: randUser,
        email: `${randUser}@dragme.gg`,
        password: 'Password123!'
      }
    });
    assert(authReg.status === 201 && authReg.data.token, `Standard user @${randUser} registered`);
    const userToken = authReg.data.token;

    // --- TEST 1: Upload Custom Avatar Photo & Persist in Profile ---
    console.log('\n[TEST 1] Custom Avatar Upload & Database Persistence');
    const avUpload = await request('/api/upload/media', {
      method: 'POST',
      token: userToken,
      body: {
        data: testBase64,
        filename: 'my_avatar.png',
        type: 'avatar'
      }
    });
    assert(avUpload.status === 200 && avUpload.data.url, `Uploaded avatar returned URL: ${avUpload.data.url}`);
    const avatarUrl = avUpload.data.url;

    // Update profile with avatar
    const avProfUpdate = await request('/api/users/profile', {
      method: 'PUT',
      token: userToken,
      body: { avatarUrl }
    });
    assert(
      avProfUpdate.status === 200 &&
      (avProfUpdate.data.user.avatar_url === avatarUrl || avProfUpdate.data.user.avatarUrl === avatarUrl),
      'Profile updated with new avatarUrl'
    );

    // Refetch profile
    const refetch1 = await request(`/api/users/${randUser}/profile`, { token: userToken });
    assert(
      refetch1.status === 200 && refetch1.data.profile.avatarUrl === avatarUrl,
      'Refetched profile confirms persisted custom avatarUrl in SQLite'
    );

    // --- TEST 2: Upload Custom Banner Photo & Persist in Profile ---
    console.log('\n[TEST 2] Custom Banner Upload & Database Persistence');
    const bannerImgBuf = await sharp({
      create: {
        width: 1920,
        height: 640,
        channels: 4,
        background: { r: 240, g: 50, b: 120, alpha: 1 }
      }
    }).png().toBuffer();
    const bannerBase64 = `data:image/png;base64,${bannerImgBuf.toString('base64')}`;

    const banUpload = await request('/api/upload/media', {
      method: 'POST',
      token: userToken,
      body: {
        data: bannerBase64,
        filename: 'my_header_banner.png',
        type: 'banner'
      }
    });
    assert(banUpload.status === 200 && banUpload.data.url, `Uploaded banner returned URL: ${banUpload.data.url}`);
    const bannerUrl = banUpload.data.url;

    const banProfUpdate = await request('/api/users/profile', {
      method: 'PUT',
      token: userToken,
      body: { bannerUrl }
    });
    assert(
      banProfUpdate.status === 200 &&
      (banProfUpdate.data.user.banner_url === bannerUrl || banProfUpdate.data.user.bannerUrl === bannerUrl),
      'Profile updated with new bannerUrl'
    );

    const refetch2 = await request(`/api/users/${randUser}/profile`, { token: userToken });
    assert(
      refetch2.status === 200 &&
      refetch2.data.profile.bannerUrl === bannerUrl &&
      refetch2.data.profile.avatarUrl === avatarUrl,
      'Refetched profile retains both custom avatar and custom banner simultaneously'
    );

    // --- TEST 3: Founder / Nitro @nitish Entitlement & Motion Video Upload ---
    console.log('\n[TEST 3] Nitro Motion Video Permissions (@nitish VIP)');
    const { generateToken } = require('../backend/middleware/authMiddleware');
    let nitishUser = await db.get('SELECT * FROM users WHERE LOWER(username) = ?', ['nitish']);
    if (!nitishUser) {
      await db.run('INSERT INTO users (id, username, email, password_hash, role, is_premium) VALUES (?, ?, ?, ?, ?, ?)', [
        'usr_nitish', 'nitish', 'nitish@dragme.gg', 'seeded_hash', 'user', 1
      ]);
      nitishUser = await db.get('SELECT * FROM users WHERE LOWER(username) = ?', ['nitish']);
    }
    const nitishToken = generateToken(nitishUser);

    if (nitishToken) {
      const webmHeader = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81, 0x01, 0x42, 0xF2, 0x81, 0x04]);
      const webmBase64 = `data:video/webm;base64,${webmHeader.toString('base64')}`;

      const nitishUpload = await request('/api/upload/media', {
        method: 'POST',
        token: nitishToken,
        body: {
          data: webmBase64,
          filename: 'founder_motion_avatar.webm',
          type: 'animatedAvatar'
        }
      });
      assert(nitishUpload.status === 200 && nitishUpload.data.url, '@nitish successfully uploaded motion video avatar');

      const nitishProfUpdate = await request('/api/users/profile', {
        method: 'PUT',
        token: nitishToken,
        body: { avatarUrl: nitishUpload.data.url }
      });
      assert(nitishProfUpdate.status === 200, '@nitish profile updated with animated video avatar');
    }

    // --- TEST 4: Standard User Blocked from Nitro Video Upload ---
    console.log('\n[TEST 4] Standard User Blocked from Nitro Video Upload');
    const fakeWebm = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81, 0x01, 0x42, 0xF7, 0x81, 0x01, 0x42, 0xF2, 0x81, 0x04]);
    const blockedUpload = await request('/api/upload/media', {
      method: 'POST',
      token: userToken,
      body: {
        data: `data:video/webm;base64,${fakeWebm.toString('base64')}`,
        filename: 'hacked_motion_avatar.webm',
        type: 'animatedAvatar'
      }
    });
    assert(blockedUpload.status === 400, 'Standard user without Nitro entitlement correctly rejected for motion video upload');

    console.log('\n================================================================');
    console.log(`🏁 PROFILE MEDIA RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) process.exit(1);
    else process.exit(0);

  } catch (err) {
    console.error('Fatal Profile Media Suite Error:', err);
    process.exit(1);
  } finally {
    if (server) server.close();
  }
}

runProfileMediaSuite();
