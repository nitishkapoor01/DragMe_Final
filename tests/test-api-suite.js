/* ==========================================================================
   DRAGME MASTER TEST SUITE: FULL-STACK API & INTEGRATION VERIFICATION
   Tests auth, posts, feed, comments, reactions, profiles, rooms & security
   ========================================================================== */

const http = require('http');
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

async function runMasterSuite() {
  console.log('================================================================');
  console.log('🧪 DRAGME MASTER INTEGRATION & API CONTRACT TEST SUITE');
  console.log('================================================================\n');

  try {
    // 1. Initialize schema
    await db.initSchema();

    // 2. Start server on random available port
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

    // --- TEST GROUP 1: Public Endpoints & Username Availability ---
    console.log('[TEST GROUP 1] Public Endpoints & Username Availability');
    const uRes1 = await request('/api/users/check-username?username=tester');
    assert(uRes1.status === 200 && uRes1.data.available === false, 'Existing username @tester is flagged as taken');

    const randUser = 'user_' + Date.now().toString().slice(-6);
    const uRes2 = await request(`/api/users/check-username?username=${randUser}`);
    assert(uRes2.status === 200 && uRes2.data.available === true, `Random username @${randUser} is available`);

    const reservedRes = await request('/api/users/check-username?username=admin');
    assert(reservedRes.status === 200 && reservedRes.data.available === false, 'Reserved username @admin is blocked');

    // --- TEST GROUP 2: Registration & Login Authentication ---
    console.log('\n[TEST GROUP 2] Registration & Login Authentication');
    const authReg = await request('/api/auth/register', {
      method: 'POST',
      body: {
        username: randUser,
        email: `${randUser}@dragme.gg`,
        password: 'Password123!'
      }
    });
    assert(authReg.status === 201 && authReg.data.token, `Successfully registered user @${randUser}`);
    const userToken = authReg.data.token;
    const userId = authReg.data.user.id;

    const meRes = await request('/api/auth/me', { token: userToken });
    assert(meRes.status === 200 && meRes.data.user && meRes.data.user.id === userId, 'Verified JWT session via /api/auth/me');

    const guestMe = await request('/api/auth/me');
    assert(guestMe.status === 200 && guestMe.data.user === null, 'Guest request to /api/auth/me returns null safely');

    // --- TEST GROUP 3: Feed, Posts, Anonymous Mode ---
    console.log('\n[TEST GROUP 3] Feed, Posts & Anonymous Mode');
    const createPostRes = await request('/api/posts', {
      method: 'POST',
      token: userToken,
      body: {
        title: 'Master Architecture Roast',
        content: 'Testing modular post creation with full backend architecture verification.',
        category: 'Roast',
        isAnonymous: false
      }
    });
    assert(createPostRes.status === 201 && createPostRes.data.post && createPostRes.data.post.id, 'Created new public roast post');
    const testPostId = createPostRes.data.post.id;

    const anonPostRes = await request('/api/posts', {
      method: 'POST',
      token: userToken,
      body: {
        title: 'Midnight Secret',
        content: 'Testing anonymous confession mask persona.',
        category: 'Confession',
        isAnonymous: true
      }
    });
    assert(anonPostRes.status === 201 && anonPostRes.data.post.author === 'Masked Persona', 'Anonymous post author masked on server');

    const feedRes = await request('/api/posts?sort=new');
    assert(feedRes.status === 200 && Array.isArray(feedRes.data.posts) && feedRes.data.posts.length >= 2, 'Feed returns list of posts');

    // --- TEST GROUP 4: Comments ---
    console.log('\n[TEST GROUP 4] Comments & Discussion Threads');
    const commentRes = await request(`/api/posts/${testPostId}/comments`, {
      method: 'POST',
      token: userToken,
      body: { text: 'Outstanding clean architecture refactor!' }
    });
    assert(commentRes.status === 201 && commentRes.data.commentCount >= 1, 'Added comment to post and incremented heat');

    const getCommentsRes = await request(`/api/posts/${testPostId}/comments`);
    assert(getCommentsRes.status === 200 && Array.isArray(getCommentsRes.data.comments) && getCommentsRes.data.comments.length >= 1, 'Retrieved post discussion comments stream');

    // --- TEST GROUP 5: Crown Reactions & Super Crown ---
    console.log('\n[TEST GROUP 5] Crown Reactions & Discovery');
    const reactRes = await request(`/api/posts/${testPostId}/vote`, {
      method: 'POST',
      token: userToken,
      body: { reactionType: 'crown', isSuper: false }
    });
    assert(reactRes.status === 200 && reactRes.data.hasVoted === true, 'Standard Crown reaction applied');

    const superReactRes = await request(`/api/posts/${testPostId}/vote`, {
      method: 'POST',
      token: userToken,
      body: { reactionType: 'fire', isSuper: true, switchOnly: true }
    });
    assert(superReactRes.status === 200 && superReactRes.data.isSuper === true && superReactRes.data.reactionType === 'fire', 'Super Crown upgraded with fire reaction');

    const whoRes = await request(`/api/posts/${testPostId}/who-reacted`);
    assert(whoRes.status === 200 && whoRes.data.total >= 1 && whoRes.data.all.length >= 1, 'Who Reacted endpoint returns reactor metadata');

    // --- TEST GROUP 6: Bookmarks / Saves ---
    console.log('\n[TEST GROUP 6] Bookmarks & Saved Posts');
    const saveRes1 = await request(`/api/posts/${testPostId}/save`, {
      method: 'POST',
      token: userToken
    });
    assert(saveRes1.status === 200 && saveRes1.data.isSaved === true, 'Post bookmarked');

    const saveRes2 = await request(`/api/posts/${testPostId}/save`, {
      method: 'POST',
      token: userToken
    });
    assert(saveRes2.status === 200 && saveRes2.data.isSaved === false, 'Post unbookmarked cleanly');

    // --- TEST GROUP 7: User Profiles & Active Rooms ---
    console.log('\n[TEST GROUP 7] User Profiles & Active Rooms');
    const profRes = await request(`/api/users/${randUser}/profile`, { token: userToken });
    assert(profRes.status === 200 && profRes.data.profile.isOwner === true, 'Fetched user profile with owner privileges');

    const updateProfRes = await request('/api/users/profile', {
      method: 'PUT',
      token: userToken,
      body: {
        displayName: 'Master Architect',
        bio: 'Building production-ready social platforms.',
        location: 'Neo Tokyo',
        dateOfBirth: '2000-01-01',
        gender: 'Male',
        socialLinks: { instagram: 'https://instagram.com/dragme', twitter: 'https://x.com/dragme' },
        visibility: 'public',
        avatarFrame: 'lime_neon',
        avatarShape: 'squircle',
        profileTheme: 'cyberpunk'
      }
    });
    assert(
      updateProfRes.status === 200 &&
      updateProfRes.data.user.display_name === 'Master Architect' &&
      updateProfRes.data.user.avatar_frame === 'lime_neon' &&
      updateProfRes.data.user.profile_theme === 'cyberpunk',
      'Sanitized comprehensive profile & Nitro update applied successfully'
    );

    const refetchedProf = await request(`/api/users/${randUser}/profile`, { token: userToken });
    assert(
      refetchedProf.status === 200 &&
      refetchedProf.data.profile.displayName === 'Master Architect' &&
      refetchedProf.data.profile.avatarFrame === 'lime_neon' &&
      refetchedProf.data.profile.socialLinks?.instagram === 'https://instagram.com/dragme',
      'Verified persisted profile & Nitro attributes on user profile'
    );

    const roomsRes = await request('/api/rooms/active');
    assert(roomsRes.status === 200 && Array.isArray(roomsRes.data.rooms) && roomsRes.data.rooms.length >= 4, 'Fetched active rooms catalog');

    console.log('\n================================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal Test Suite Error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
  }
}

runMasterSuite();
