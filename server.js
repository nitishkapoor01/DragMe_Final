const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const MediaProcessor = require('./services/mediaProcessor');
const MediaService = require('./services/mediaService');
const StorageService = require('./services/storageService');
const MediaDeliveryService = require('./services/mediaDeliveryService');
const MediaQueue = require('./services/mediaQueue');
const { MEDIA_LIMITS, ANIMATION_POLICY, UPLOADS_DIR } = require('./config/mediaConfig');

const app = express();
const PORT = process.env.PORT || 5173;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2026_dragme_production';

// =============================================================================
// 1. MIDDLEWARES, SECURITY HEADERS & SCALABLE RATE LIMITER
// =============================================================================
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// High-Performance Immutable CDN & Static Serving for Media Uploads
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(UPLOADS_DIR, {
  maxAge: '30d',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Enterprise Security Headers & Instant Live Cache Buster for HTML/CSS/JS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (!req.path.startsWith('/uploads')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Explicit Zero-Cache Dynamic File Handlers
app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
});

app.get('/app.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'));
});

app.get('/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8'));
});

app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    if (!filePath.includes(path.sep + 'uploads' + path.sep)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// High-Throughput Memory-Safe Sliding Window Rate Limiter
const ipBuckets = new Map();

// Periodic garbage collection to prevent memory leaks at scale
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets.entries()) {
    if (now > bucket.resetTime) {
      ipBuckets.delete(ip);
    }
  }
}, 300000); // Clean every 5 minutes

function rateLimiter({ windowMs = 60000, max = 20 } = {}) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    if (!ipBuckets.has(ip)) {
      ipBuckets.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    const bucket = ipBuckets.get(ip);
    if (now > bucket.resetTime) {
      bucket.count = 1;
      bucket.resetTime = now + windowMs;
      return next();
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Too many requests. Please slow down and try again.' });
    }
    next();
  };
}

// Token Generator with cryptographic claims
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Auth Verification Middlewares
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get('SELECT id, username, email, avatar_url, role, is_banned, is_premium FROM users WHERE id = ?', [decoded.id]);
    req.user = (user && !user.is_banned) ? user : null;
  } catch (err) {
    req.user = null;
  }
  next();
}

async function requireAuth(req, res, next) {
  await optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    if (req.user.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }
    next();
  });
}

// =============================================================================
// 2. AUTH & USER ROUTES
// =============================================================================

// CHECK USERNAME AVAILABILITY
app.get('/api/users/check-username', rateLimiter({ windowMs: 60000, max: 60 }), async (req, res) => {
  const rawUsername = req.query.username;
  if (!rawUsername || typeof rawUsername !== 'string') {
    return res.status(400).json({ available: false, error: 'Username parameter is required.' });
  }

  const username = rawUsername.trim();

  // Rule 1: 4-20 characters long
  if (username.length < 4 || username.length > 20) {
    return res.status(200).json({
      available: false,
      status: 'invalid',
      error: 'Username must be between 4 and 20 characters long.'
    });
  }

  // Rule 2: Can only contain letters, numbers, and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(200).json({
      available: false,
      status: 'invalid',
      error: 'Username can only contain letters, numbers, and underscores.'
    });
  }

  // Rule 3: Cannot start or end with an underscore
  if (username.startsWith('_') || username.endsWith('_')) {
    return res.status(200).json({
      available: false,
      status: 'invalid',
      error: 'Username cannot start or end with an underscore.'
    });
  }

  // Reserved Usernames
  const reserved = ['admin', 'moderator', 'dragme', 'root', 'api', 'system', 'support', 'anonymous', 'owner', 'staff'];
  if (reserved.includes(username.toLowerCase())) {
    return res.status(200).json({
      available: false,
      status: 'taken',
      error: `@${username} is reserved by the platform.`
    });
  }

  // Database Uniqueness Check
  try {
    const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (existing) {
      return res.status(200).json({
        available: false,
        status: 'taken',
        error: `@${username} is already taken. Try another.`
      });
    }

    return res.status(200).json({
      available: true,
      status: 'available',
      username,
      message: `${username} is available!`
    });
  } catch (err) {
    console.error('Username check DB error:', err);
    return res.status(500).json({ available: false, error: 'Server error checking username.' });
  }
});

// REGISTER
app.post('/api/auth/register', rateLimiter({ windowMs: 60000, max: 8 }), async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }
  const cleanUsername = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (cleanUsername.length < 3 || cleanUsername.length > 25) {
    return res.status(400).json({ error: 'Username must be 3-25 characters long.' });
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  // Check unique username / email
  try {
    const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)', [cleanUsername, cleanEmail]);
    if (existing) {
      return res.status(409).json({ error: 'Username or email is already registered.' });
    }

    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const passwordHash = bcrypt.hashSync(password, 10);
    const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`;

    await db.run(`
      INSERT INTO users (id, username, email, password_hash, avatar_url, role)
      VALUES (?, ?, ?, ?, ?, 'user')
    `, [userId, cleanUsername, cleanEmail, passwordHash, defaultAvatar]);

    const user = await db.get('SELECT id, username, email, avatar_url, role FROM users WHERE id = ?', [userId]);
    const token = generateToken(user);

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      user
    });
  } catch (err) {
    console.error('Registration Error:', err);
    return res.status(500).json({ error: 'Server error while creating account.' });
  }
});

// LOGIN
app.post('/api/auth/login', rateLimiter({ windowMs: 60000, max: 15 }), async (req, res) => {
  const rawLogin = req.body.login || req.body.identifier;
  const password = req.body.password;

  if (!rawLogin || !password) {
    return res.status(400).json({ error: 'Please enter your username/email and password.' });
  }

  const cleanLogin = String(rawLogin).trim();

  try {
    const user = await db.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)', [cleanLogin, cleanLogin.toLowerCase()]);
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }
    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account is suspended.' });
    }

    const token = generateToken(user);
    return res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

// =============================================================================
// CENTRALIZED MEDIA SERVICE & UPLOAD SYSTEM (6 PIPELINES)
// =============================================================================
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// GET CENTRALIZED MEDIA LIMITS & ANIMATION POLICY
app.get('/api/media/limits', (req, res) => {
  return res.json({ success: true, limits: MEDIA_LIMITS, animationPolicy: ANIMATION_POLICY });
});

// GET MEDIA OBSERVABILITY METRICS & WORKER QUEUE STATS
app.get('/api/media/metrics', (req, res) => {
  return res.json({ success: true, metrics: MediaService.getMetrics() });
});

// GET BACKGROUND QUEUE JOB STATUS
app.get('/api/media/jobs/:jobId', (req, res) => {
  const job = MediaService.getJobStatus(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Media job not found or expired.' });
  }
  return res.json({ success: true, job });
});

// GET MEDIA ASSET METADATA & CDN DELIVERY URLS
app.get('/api/media/assets/:id', async (req, res) => {
  try {
    const asset = await MediaService.getMediaAsset(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Media asset not found.' });
    }
    return res.json({ success: true, asset });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve media asset.' });
  }
});

// DELETE MEDIA ASSET
app.delete('/api/media/assets/:id', requireAuth, async (req, res) => {
  try {
    const asset = await db.get('SELECT * FROM media_assets WHERE id = ?', [req.params.id]);
    if (!asset) {
      return res.status(404).json({ error: 'Media asset not found.' });
    }
    if (asset.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this media asset.' });
    }

    if (asset.storage_key) {
      await StorageService.delete(asset.storage_key);
    } else if (asset.storage_url) {
      await MediaProcessor.deleteMediaByUrl(asset.storage_url);
    }
    if (asset.poster_key) {
      await StorageService.delete(asset.poster_key);
    }

    await db.run('DELETE FROM media_assets WHERE id = ?', [asset.id]);
    await db.run('DELETE FROM media_usages WHERE media_id = ?', [asset.id]);

    return res.json({ success: true, message: 'Media asset deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete media asset.' });
  }
});

// UNIFIED CENTRALIZED MEDIA UPLOAD ENDPOINT (Supports both /api/upload/media and /api/media/upload)
const handleMediaUpload = async (req, res) => {
  try {
    const rawData = req.body.data || req.body.base64Data;
    const filename = req.body.filename;
    const type = req.body.type || 'avatar';
    const asyncMode = Boolean(req.body.async || req.query.async === 'true');
    const entityType = req.body.entityType || null;
    const entityId = req.body.entityId || null;

    if (!rawData || typeof rawData !== 'string') {
      return res.status(400).json({ error: 'Media payload data is required.' });
    }

    // Support Base64 Data URL or Raw Base64
    let buffer;
    if (rawData.startsWith('data:')) {
      const matches = rawData.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid base64 media encoding.' });
      }
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(rawData, 'base64');
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Empty media buffer provided.' });
    }

    // Execute via ONE Centralized Media Service
    const result = await MediaService.uploadMedia({
      buffer,
      uploadType: type,
      user: req.user,
      filename,
      entityType,
      entityId,
      asyncMode
    });

    return res.json({
      success: true,
      mediaId: result.mediaId,
      url: result.url,
      mediaUrl: result.url,
      originalUrl: result.url,
      posterUrl: result.posterUrl,
      thumbnailUrl: result.thumbnailUrl,
      variants: result.variants,
      width: result.width,
      height: result.height,
      fileSize: result.sizeBytes || result.fileSize,
      sizeBytes: result.sizeBytes || result.fileSize,
      mimeType: result.mimeType,
      isAnimated: result.isAnimated,
      duration: result.duration,
      status: result.status,
      isDeduplicated: Boolean(result.isDeduplicated),
      jobId: result.jobId || null
    });
  } catch (err) {
    console.error('Media pipeline processing error:', err.message);
    return res.status(400).json({ error: err.message || 'Media processing failed.' });
  }
};

app.post('/api/upload/media', requireAuth, rateLimiter({ windowMs: 60000, max: 20 }), handleMediaUpload);
app.post('/api/media/upload', requireAuth, rateLimiter({ windowMs: 60000, max: 20 }), handleMediaUpload);

// ADMIN ON-DEMAND STORAGE GARBAGE COLLECTOR & ORPHAN PRUNER
app.post('/api/admin/media/cleanup', requireAuth, rateLimiter({ windowMs: 60000, max: 10 }), async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
  }

  try {
    const result = await MediaService.runCleanup(0); // prune all unreferenced immediately
    return res.json({
      success: true,
      message: `Cleaned ${result.filesPruned} orphaned media files and freed ${result.freedMb} MB of storage.`,
      metrics: MediaService.getMetrics()
    });
  } catch (err) {
    console.error('Storage garbage collection error:', err);
    return res.status(500).json({ error: 'Failed to run media cleanup.' });
  }
});

// Periodic Storage Pruning & Temp Media Cleanup (Runs every 3 hours)
setInterval(async () => {
  try {
    await MediaService.runCleanup(2 * 60 * 60 * 1000);
  } catch (err) {
    console.error('Media cleanup error:', err);
  }
}, 3 * 60 * 60 * 1000);

// Run an initial orphan sweep on startup (in background)
setTimeout(async () => {
  try {
    await MediaService.runCleanup(60 * 1000);
  } catch (e) {
    console.warn('Initial media sweep warning:', e.message);
  }
}, 2000);

// GET CURRENT USER (/me)
app.get('/api/auth/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  const user = await db.get(`
    SELECT id, username, email, display_name, bio, location, date_of_birth, gender, social_links, visibility,
           avatar_url, banner_url, avatar_frame, avatar_shape, profile_theme, profile_accent,
           profile_badge, profile_effects, is_premium, badges_owned, rank_title, 
           reputation_score, cooked_ratio, judgment_accuracy, rank_number, roast_points, 
           next_level_points, followers_count, following_count, reactions_count, role, created_at 
    FROM users WHERE id = ?
  `, [req.user.id]);
  return res.json({ user: user || req.user });
});

// GET USER PROFILE BY USERNAME OR ID
app.get('/api/users/:username/profile', optionalAuth, async (req, res) => {
  const target = req.params.username.trim();
  try {
    const user = await db.get(`
      SELECT id, username, email, display_name, bio, location, date_of_birth, gender, social_links, visibility,
             avatar_url, banner_url, avatar_frame, avatar_shape, profile_theme, profile_accent,
             profile_badge, profile_effects, is_premium, badges_owned, rank_title, 
             reputation_score, cooked_ratio, judgment_accuracy, rank_number, roast_points, 
             next_level_points, followers_count, following_count, reactions_count, role, created_at 
      FROM users WHERE LOWER(username) = LOWER(?) OR id = ?
    `, [target, target]);

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Calculate real stats from database
    const postCountRow = await db.get('SELECT COUNT(*) as count FROM posts WHERE LOWER(author_username) = LOWER(?)', [user.username]);
    const confessionCountRow = await db.get("SELECT COUNT(*) as count FROM posts WHERE LOWER(author_username) = LOWER(?) AND (is_anonymous = 1 OR LOWER(room) = 'confessions')", [user.username]);
    const reactionsRow = await db.get('SELECT COALESCE(SUM(drag_count), 0) as total FROM posts WHERE LOWER(author_username) = LOWER(?)', [user.username]);

    const isOwner = req.user ? (req.user.id === user.id || req.user.username.toLowerCase() === user.username.toLowerCase()) : false;

    // Join date formatting
    const joinDateObj = new Date(user.created_at);
    const joinFormatted = joinDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

    // Parse JSON fields safely
    let parsedSocialLinks = {};
    try {
      parsedSocialLinks = user.social_links ? JSON.parse(user.social_links) : {};
    } catch (e) {
      parsedSocialLinks = {};
    }

    let parsedBadges = ['verified', 'senior_roaster', 'battle_champ', 'problem_solver', 'helpful'];
    try {
      if (user.badges_owned) parsedBadges = JSON.parse(user.badges_owned);
    } catch (e) {}

    return res.json({
      profile: {
        id: user.id,
        username: user.username,
        displayName: user.display_name || user.username,
        bio: user.bio || 'Same people. Different minds.',
        location: user.location || 'Hamirpur, HP',
        dateOfBirth: user.date_of_birth || '2005-03-15',
        gender: user.gender || 'Male',
        socialLinks: parsedSocialLinks,
        visibility: user.visibility || 'public',
        avatarUrl: user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
        bannerUrl: user.banner_url || '',
        avatarFrame: user.avatar_frame || 'none',
        avatarShape: user.avatar_shape || 'rectangular',
        profileTheme: user.profile_theme || 'default',
        profileAccent: user.profile_accent || 'lime',
        profileBadge: user.profile_badge || 'senior_roaster',
        profileEffects: user.profile_effects || 'none',
        isPremium: Boolean(user.is_premium),
        badgesOwned: parsedBadges,
        rankTitle: user.rank_title || 'Senior Roaster',
        reputationScore: user.reputation_score || 1800,
        cookedRatio: user.cooked_ratio || 100,
        judgmentAccuracy: user.judgment_accuracy || 98,
        rankNumber: user.rank_number || 143,
        roastPoints: user.roast_points || 2314,
        nextLevelPoints: user.next_level_points || 3000,
        joinedDate: `Joined ${joinFormatted}`,
        stats: {
          posts: parseInt(postCountRow?.count || 40),
          followers: user.followers_count || 1,
          following: user.following_count || 2,
          confessions: parseInt(confessionCountRow?.count || 2),
          reactions: parseInt(reactionsRow?.total || 23),
          badges: Array.isArray(parsedBadges) ? parsedBadges.length : 5
        },
        isOwner
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Server error retrieving profile.' });
  }
});

// UPDATE PROFILE (Server-Authoritative with Validation, Whitelist, & Entitlements)
app.put('/api/users/profile', requireAuth, rateLimiter({ windowMs: 60000, max: 30 }), async (req, res) => {
  const userId = req.user.id;
  const currentDbUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!currentDbUser) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  const {
    displayName,
    username,
    bio,
    location,
    dateOfBirth,
    gender,
    socialLinks,
    visibility,
    avatarUrl,
    bannerUrl,
    avatarFrame,
    avatarShape,
    profileTheme,
    profileAccent,
    profileBadge,
    profileEffects
  } = req.body;

  // 1. Validate & Sanitize Display Name
  const cleanDisplayName = displayName !== undefined ? String(displayName).trim().slice(0, 50) : (currentDbUser.display_name || currentDbUser.username);

  // 2. Validate Username change if provided
  let cleanUsername = currentDbUser.username;
  if (username && typeof username === 'string') {
    const candidateUsername = username.trim();
    if (candidateUsername.toLowerCase() !== currentDbUser.username.toLowerCase()) {
      if (candidateUsername.length < 4 || candidateUsername.length > 20) {
        return res.status(400).json({ error: 'Username must be between 4 and 20 characters long.' });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(candidateUsername)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores.' });
      }
      if (candidateUsername.startsWith('_') || candidateUsername.endsWith('_')) {
        return res.status(400).json({ error: 'Username cannot start or end with an underscore.' });
      }
      const reserved = ['admin', 'moderator', 'dragme', 'root', 'api', 'system', 'support', 'anonymous'];
      if (reserved.includes(candidateUsername.toLowerCase())) {
        return res.status(400).json({ error: 'This username is reserved.' });
      }
      const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [candidateUsername, userId]);
      if (existing) {
        return res.status(409).json({ error: `@${candidateUsername} is already taken.` });
      }
      cleanUsername = candidateUsername;
    }
  }

  // 3. Validate Bio & Location
  const cleanBio = bio !== undefined ? String(bio).trim().slice(0, 150) : (currentDbUser.bio || '');
  const cleanLocation = location !== undefined ? String(location).trim().slice(0, 80) : (currentDbUser.location || '');
  const cleanDob = dateOfBirth !== undefined ? String(dateOfBirth).trim().slice(0, 30) : (currentDbUser.date_of_birth || '');
  
  const allowedGenders = ['Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
  const cleanGender = (gender && allowedGenders.includes(gender)) ? gender : (currentDbUser.gender || 'Male');

  // 4. Validate Social Links
  let cleanSocialLinksStr = currentDbUser.social_links || '{}';
  if (socialLinks !== undefined) {
    if (typeof socialLinks === 'object' && socialLinks !== null) {
      const sanitizedLinks = {};
      const allowedKeys = ['instagram', 'youtube', 'twitter', 'discord', 'github', 'website'];
      for (const key of allowedKeys) {
        if (socialLinks[key] && typeof socialLinks[key] === 'string') {
          sanitizedLinks[key] = socialLinks[key].trim().slice(0, 200);
        }
      }
      cleanSocialLinksStr = JSON.stringify(sanitizedLinks);
    }
  }

  const allowedVisibility = ['public', 'private', 'followers'];
  const cleanVisibility = (visibility && allowedVisibility.includes(visibility)) ? visibility : (currentDbUser.visibility || 'public');

  // 5. Media URLs
  const cleanAvatarUrl = avatarUrl !== undefined ? String(avatarUrl).trim() : (currentDbUser.avatar_url || '');
  const cleanBannerUrl = bannerUrl !== undefined ? String(bannerUrl).trim() : (currentDbUser.banner_url || '');

  // 6. Entitlement Checks for Customizations
  const isPremiumUser = Boolean(currentDbUser.is_premium || currentDbUser.role === 'admin');

  // Avatar Frame validation
  const allowedFrames = ['none', 'minimal', 'lime_neon', 'cyan_matrix', 'gold_crown', 'galactic_violet', 'hologram', 'fire_dragon'];
  const premiumFrames = ['gold_crown', 'galactic_violet', 'hologram', 'fire_dragon'];
  let cleanAvatarFrame = avatarFrame && allowedFrames.includes(avatarFrame) ? avatarFrame : (currentDbUser.avatar_frame || 'none');
  if (premiumFrames.includes(cleanAvatarFrame) && !isPremiumUser) {
    cleanAvatarFrame = 'none';
  }

  // Avatar Shape validation
  const allowedShapes = ['rectangular', 'square', 'circle'];
  const cleanAvatarShape = avatarShape && allowedShapes.includes(avatarShape) ? avatarShape : (currentDbUser.avatar_shape || 'rectangular');

  // Theme validation
  const allowedThemes = ['default', 'midnight', 'graphite', 'cyberpunk', 'emerald'];
  const premiumThemes = ['cyberpunk', 'emerald'];
  let cleanProfileTheme = profileTheme && allowedThemes.includes(profileTheme) ? profileTheme : (currentDbUser.profile_theme || 'default');
  if (premiumThemes.includes(cleanProfileTheme) && !isPremiumUser) {
    cleanProfileTheme = 'default';
  }

  // Accent Color validation
  const allowedAccents = ['lime', 'purple', 'cyan', 'crimson', 'gold'];
  const cleanProfileAccent = profileAccent && allowedAccents.includes(profileAccent) ? profileAccent : (currentDbUser.profile_accent || 'lime');

  // Badge validation
  const allowedBadges = ['senior_roaster', 'verified', 'battle_champ', 'problem_solver', 'helpful'];
  const cleanProfileBadge = profileBadge && allowedBadges.includes(profileBadge) ? profileBadge : (currentDbUser.profile_badge || 'senior_roaster');

  // Effects validation
  const allowedEffects = ['none', 'neon_aura', 'particle_shimmer', 'cyber_glow', 'scanlines'];
  const premiumEffects = ['neon_aura', 'particle_shimmer', 'cyber_glow', 'scanlines'];
  let cleanProfileEffects = profileEffects && allowedEffects.includes(profileEffects) ? profileEffects : (currentDbUser.profile_effects || 'none');
  if (premiumEffects.includes(cleanProfileEffects) && !isPremiumUser) {
    cleanProfileEffects = 'none';
  }

  try {
    await db.run(`
      UPDATE users 
      SET display_name = ?, username = ?, bio = ?, location = ?, date_of_birth = ?, gender = ?,
          social_links = ?, visibility = ?, avatar_url = ?, banner_url = ?, avatar_frame = ?,
          avatar_shape = ?, profile_theme = ?, profile_accent = ?, profile_badge = ?, profile_effects = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      cleanDisplayName, cleanUsername, cleanBio, cleanLocation, cleanDob, cleanGender,
      cleanSocialLinksStr, cleanVisibility, cleanAvatarUrl, cleanBannerUrl, cleanAvatarFrame,
      cleanAvatarShape, cleanProfileTheme, cleanProfileAccent, cleanProfileBadge, cleanProfileEffects,
      userId
    ]);

    // If username changed, update posts and comments author_username
    if (cleanUsername !== currentDbUser.username) {
      await db.run('UPDATE posts SET author_username = ? WHERE author_id = ? OR LOWER(author_username) = LOWER(?)', [cleanUsername, userId, currentDbUser.username]);
      await db.run('UPDATE comments SET author_username = ? WHERE author_id = ? OR LOWER(author_username) = LOWER(?)', [cleanUsername, userId, currentDbUser.username]);
    }
    if (cleanAvatarUrl !== currentDbUser.avatar_url) {
      await db.run('UPDATE posts SET author_avatar = ? WHERE (author_id = ? OR LOWER(author_username) = LOWER(?)) AND is_anonymous = 0', [cleanAvatarUrl, userId, cleanUsername]);
      await db.run('UPDATE comments SET author_avatar = ? WHERE (author_id = ? OR LOWER(author_username) = LOWER(?))', [cleanAvatarUrl, userId, cleanUsername]);
      try {
        await db.run("UPDATE media_assets SET is_attached = 1, attached_entity_type = 'user_avatar', attached_entity_id = ? WHERE storage_url = ? OR poster_url = ?", [userId, cleanAvatarUrl, cleanAvatarUrl]);
        // Purge previous replaced avatar files from disk to prevent storage clutter
        await MediaProcessor.deleteUserPreviousMedia(userId, 'avatar', cleanAvatarUrl, db);
      } catch (mErr) {}
    }
    if (cleanBannerUrl !== currentDbUser.banner_url && cleanBannerUrl) {
      try {
        await db.run("UPDATE media_assets SET is_attached = 1, attached_entity_type = 'user_banner', attached_entity_id = ? WHERE storage_url = ? OR poster_url = ?", [userId, cleanBannerUrl, cleanBannerUrl]);
        // Purge previous replaced banner files from disk to prevent storage clutter
        await MediaProcessor.deleteUserPreviousMedia(userId, 'banner', cleanBannerUrl, db);
      } catch (mErr) {}
    }

    const updatedUser = await db.get(`
      SELECT id, username, email, display_name, bio, location, date_of_birth, gender, social_links, visibility,
             avatar_url, banner_url, avatar_frame, avatar_shape, profile_theme, profile_accent,
             profile_badge, profile_effects, is_premium, badges_owned, rank_title, 
             reputation_score, cooked_ratio, judgment_accuracy, rank_number, roast_points, 
             next_level_points, followers_count, following_count, reactions_count, role 
      FROM users WHERE id = ?
    `, [userId]);

    let token = null;
    if (cleanUsername !== currentDbUser.username) {
      token = generateToken(updatedUser);
    }

    return res.json({
      message: 'Profile updated successfully!',
      user: updatedUser,
      token
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Server error updating profile.' });
  }
});

// GET PROFILE POSTS & ACTIVITY BY TAB
app.get('/api/users/:username/posts', optionalAuth, async (req, res) => {
  const target = req.params.username.trim();
  const tab = req.query.tab || 'overview';
  const currentUserId = req.user ? req.user.id : null;

  try {
    const user = await db.get('SELECT id, username FROM users WHERE LOWER(username) = LOWER(?) OR id = ?', [target, target]);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isOwner = req.user && (req.user.id === user.id || req.user.username.toLowerCase() === user.username.toLowerCase());
    let query = 'SELECT * FROM posts';
    const params = [];
    const conditions = [];

    if (tab === 'confessions') {
      conditions.push("(LOWER(author_username) = LOWER(?) OR LOWER(room) = 'confessions')");
      params.push(user.username);
    } else if (tab === 'media') {
      conditions.push("LOWER(author_username) = LOWER(?) AND image_url IS NOT NULL AND image_url != ''");
      params.push(user.username);
    } else if (tab === 'posts') {
      conditions.push('LOWER(author_username) = LOWER(?) AND is_anonymous = 0');
      params.push(user.username);
    } else if (tab === 'saved') {
      if (!isOwner) {
        return res.status(403).json({ error: 'Saved items are private to the account owner.' });
      }
      query = `
        SELECT p.* FROM posts p
        INNER JOIN saved_posts s ON p.id = s.post_id
        WHERE s.user_id = ?
      `;
      params.push(user.id);
    } else {
      // overview / default
      conditions.push('LOWER(author_username) = LOWER(?)');
      params.push(user.username);
    }

    if (conditions.length > 0 && tab !== 'saved') {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT 30';

    const posts = await db.all(query, params);

    const formattedPosts = await Promise.all(posts.map(async (post) => {
      let hasVoted = false;
      let reactionType = null;
      let isSuper = false;
      let isSaved = false;

      if (currentUserId) {
        const voteCheck = await db.get('SELECT reaction_type, is_super FROM votes WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        if (voteCheck) {
          hasVoted = true;
          reactionType = voteCheck.reaction_type || 'crown';
          isSuper = Boolean(voteCheck.is_super);
        }

        const saveCheck = await db.get('SELECT 1 FROM saved_posts WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        isSaved = Boolean(saveCheck);
      }

      const postComments = await db.all('SELECT id, author_username as author, text, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC', [post.id]);

      return {
        id: post.id,
        title: post.title,
        author: post.author_username,
        avatar: post.author_avatar,
        isAnonymous: Boolean(post.is_anonymous),
        room: post.room,
        roomDisplayName: post.room_display_name,
        timeAgo: formatTimeAgo(post.created_at),
        flair: post.flair,
        flairClass: post.flair_class,
        imageUrl: post.image_url,
        content: post.content,
        dragCount: post.drag_count,
        commentCount: post.comment_count,
        heatPercent: post.heat_percent,
        hasVoted,
        reactionType,
        isSuper,
        isSaved,
        comments: postComments.map(c => ({
          id: c.id,
          author: c.author,
          text: c.text,
          timeAgo: formatTimeAgo(c.created_at)
        }))
      };
    }));

    return res.json({ posts: formattedPosts });
  } catch (err) {
    console.error('Fetch user posts error:', err);
    return res.status(500).json({ error: 'Server error retrieving user posts.' });
  }
});

// =============================================================================
// 3. POSTS & ARENA API ROUTES
// =============================================================================

function formatTimeAgo(dateString) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = Math.max(0, now - past);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// GET POSTS FEED
app.get('/api/posts', optionalAuth, async (req, res) => {
  const { room, sort = 'hot', search } = req.query;
  const currentUserId = req.user ? req.user.id : null;

  let query = 'SELECT * FROM posts';
  const params = [];
  const conditions = [];

  if (room && room !== 'all') {
    conditions.push('room = ?');
    params.push(room);
  }

  if (search && search.trim()) {
    conditions.push('(title LIKE ? OR content LIKE ? OR author_username LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  if (sort === 'new') {
    query += ' ORDER BY created_at DESC';
  } else if (sort === 'top') {
    query += ' ORDER BY drag_count DESC, created_at DESC';
  } else {
    // Hot sorting
    query += ' ORDER BY heat_percent DESC, drag_count DESC, created_at DESC';
  }

  const limitNum = Math.min(Math.max(1, parseInt(req.query.limit) || 40), 100);
  const offsetNum = Math.max(0, parseInt(req.query.offset) || 0);
  query += ` LIMIT ? OFFSET ?`;
  params.push(limitNum, offsetNum);

  try {
    const posts = await db.all(query, params);

    // Fetch user interactions & comments
    const formattedPosts = await Promise.all(posts.map(async (post) => {
      let hasVoted = false;
      let reactionType = null;
      let isSuper = false;
      let isSaved = false;

      if (currentUserId) {
        const voteCheck = await db.get('SELECT reaction_type, is_super FROM votes WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        if (voteCheck) {
          hasVoted = true;
          reactionType = voteCheck.reaction_type || 'crown';
          isSuper = Boolean(voteCheck.is_super);
        }

        const saveCheck = await db.get('SELECT 1 FROM saved_posts WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        isSaved = Boolean(saveCheck);
      }

      const postComments = await db.all('SELECT id, author_username as author, text, created_at FROM comments WHERE post_id = ? ORDER BY created_at ASC', [post.id]);
      const commentsFormatted = postComments.map(c => ({
        id: c.id,
        author: c.author,
        text: c.text,
        timeAgo: formatTimeAgo(c.created_at)
      }));

      return {
        id: post.id,
        title: post.title,
        author: post.author_username,
        avatar: post.author_avatar,
        isAnonymous: Boolean(post.is_anonymous),
        room: post.room,
        roomDisplayName: post.room_display_name,
        timeAgo: formatTimeAgo(post.created_at),
        flair: post.flair,
        flairClass: post.flair_class,
        imageUrl: post.image_url,
        content: post.content,
        dragCount: post.drag_count,
        commentCount: post.comment_count,
        heatPercent: post.heat_percent,
        hasVoted,
        reactionType,
        isSuper,
        isSaved,
        comments: commentsFormatted
      };
    }));

    return res.json({ posts: formattedPosts });
  } catch (err) {
    console.error('Fetch posts error:', err);
    return res.status(500).json({ error: 'Server error fetching posts.' });
  }
});

// CREATE POST (Requires Authentication)
app.post('/api/posts', requireAuth, rateLimiter({ windowMs: 60000, max: 10 }), async (req, res) => {
  const { title, content, category, isAnonymous, attachedFile } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content cannot be empty.' });
  }

  const isAnon = Boolean(isAnonymous);
  const authorId = req.user.id;
  const authorUsername = isAnon ? 'Masked Persona' : req.user.username;
  const authorAvatar = isAnon ? '' : (req.user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(req.user.username)}`);

  const cleanContent = content.trim();
  const cleanTitle = title ? title.trim() : (cleanContent.length > 70 ? cleanContent.substring(0, 70) + '...' : cleanContent);
  const roomKey = (category || 'General').toLowerCase().replace(/[^a-z0-9_]/g, '_');

  let flairClass = 'flair-blue';
  const tagUpper = (category || 'General').toUpperCase();
  if (tagUpper.includes('ROAST')) flairClass = 'flair-roast';
  if (tagUpper.includes('CONFESSION') || isAnon) flairClass = 'flair-confession';
  if (tagUpper.includes('DISCUSS')) flairClass = 'flair-discuss';
  if (tagUpper.includes('HOT')) flairClass = 'flair-orange';

  const postId = `post-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const heatPercent = Math.floor(Math.random() * 15) + 85;

  try {
    await db.run(`
      INSERT INTO posts (id, author_id, author_username, author_avatar, is_anonymous, room, room_display_name, title, content, image_url, flair, flair_class, drag_count, comment_count, heat_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
    `, [
      postId,
      authorId,
      authorUsername,
      authorAvatar,
      isAnon ? 1 : 0,
      roomKey,
      category || 'General',
      cleanTitle,
      cleanContent,
      attachedFile || null,
      category || 'General',
      flairClass,
      heatPercent
    ]);

    if (attachedFile && typeof attachedFile === 'string' && attachedFile.startsWith('/uploads/')) {
      try {
        const asset = await db.get('SELECT id FROM media_assets WHERE storage_url = ? OR storage_key = ?', [attachedFile, attachedFile.replace(/^\/uploads\//, '')]);
        if (asset) {
          await MediaService.attachMediaUsage(asset.id, 'post_media', postId);
        }
      } catch (mErr) {}
    }

    return res.status(201).json({
      message: 'Post published successfully!',
      post: {
        id: postId,
        title: cleanTitle,
        author: authorUsername,
        avatar: authorAvatar,
        isAnonymous: isAnon,
        room: roomKey,
        roomDisplayName: category || 'General',
        timeAgo: 'Just now',
        flair: category || 'General',
        flairClass,
        imageUrl: attachedFile || null,
        content: cleanContent,
        dragCount: 1,
        commentCount: 0,
        heatPercent,
        hasVoted: true,
        isSaved: false,
        comments: []
      }
    });
  } catch (err) {
    console.error('Create post error:', err);
    return res.status(500).json({ error: 'Server error publishing post.' });
  }
});

// CROWN REACTION / VOTE ON POST (Requires Authentication)
const handleVoteOrReact = async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;
  const rawType = (req.body?.reactionType || 'crown').toString().toLowerCase().trim();
  const validReactions = ['crown', 'fire', 'insightful', 'support', 'heartfelt', 'mindblown'];
  const targetReaction = validReactions.includes(rawType) ? rawType : 'crown';
  const isSuper = Boolean(req.body?.isSuper);
  const explicitRemove = req.body?.remove === true;

  try {
    const post = await db.get('SELECT id, drag_count, heat_percent FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existingVote = await db.get('SELECT reaction_type, is_super FROM votes WHERE user_id = ? AND post_id = ?', [userId, postId]);

    let hasVoted = false;
    let newDragCount = post.drag_count;
    let newHeat = post.heat_percent;
    let finalReaction = targetReaction;
    let finalIsSuper = isSuper;

    if (existingVote) {
      const sameType = (existingVote.reaction_type || 'crown') === targetReaction;
      const sameSuper = Boolean(existingVote.is_super) === isSuper;

      if (explicitRemove || (sameType && sameSuper && !req.body?.switchOnly)) {
        // Toggle OFF
        await db.run('DELETE FROM votes WHERE user_id = ? AND post_id = ?', [userId, postId]);
        newDragCount = Math.max(0, post.drag_count - 1);
        hasVoted = false;
        finalReaction = null;
        finalIsSuper = false;
      } else {
        // Switch reaction or upgrade to Super Crown
        await db.run('UPDATE votes SET reaction_type = ?, is_super = ? WHERE user_id = ? AND post_id = ?', [
          targetReaction,
          isSuper ? 1 : (existingVote.is_super || 0),
          userId,
          postId
        ]);
        hasVoted = true;
        finalReaction = targetReaction;
        finalIsSuper = isSuper || Boolean(existingVote.is_super);
        newHeat = Math.min(100, post.heat_percent + (isSuper ? 4 : 1));
      }
    } else {
      // New Reaction
      await db.run('INSERT INTO votes (user_id, post_id, reaction_type, is_super) VALUES (?, ?, ?, ?)', [
        userId,
        postId,
        targetReaction,
        isSuper ? 1 : 0
      ]);
      newDragCount = post.drag_count + 1;
      newHeat = Math.min(100, post.heat_percent + (isSuper ? 5 : 2));
      hasVoted = true;
      finalReaction = targetReaction;
      finalIsSuper = isSuper;
    }

    await db.run('UPDATE posts SET drag_count = ?, heat_percent = ? WHERE id = ?', [newDragCount, newHeat, postId]);

    return res.json({
      postId,
      hasVoted,
      reactionType: finalReaction,
      isSuper: finalIsSuper,
      dragCount: newDragCount,
      heatPercent: newHeat
    });
  } catch (err) {
    console.error('Vote/React error:', err);
    return res.status(500).json({ error: 'Server error processing reaction.' });
  }
};

app.post('/api/posts/:id/vote', requireAuth, handleVoteOrReact);
app.post('/api/posts/:id/react', requireAuth, handleVoteOrReact);

// WHO REACTED PANEL ENDPOINT (Public & Authenticated Discovery)
app.get('/api/posts/:id/reactors', optionalAuth, async (req, res) => {
  const postId = req.params.id;
  const currentUserId = req.user ? req.user.id : null;

  try {
    const post = await db.get('SELECT id, author_username, is_anonymous FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const reactorRows = await db.all(`
      SELECT v.user_id, v.reaction_type, v.is_super, v.created_at,
             u.username, u.display_name, u.avatar_url, u.is_premium, u.rank_title, u.reputation_score
      FROM votes v
      LEFT JOIN users u ON v.user_id = u.id
      WHERE v.post_id = ?
      ORDER BY v.is_super DESC, v.created_at DESC
    `, [postId]);

    const reactionIconMap = {
      crown: { icon: 'fa-solid fa-crown', label: 'Crown', color: '#C6FF00' },
      fire: { icon: 'fa-solid fa-fire', label: 'Fire', color: '#FF7043' },
      insightful: { icon: 'fa-solid fa-lightbulb', label: 'Insightful', color: '#29B6F6' },
      support: { icon: 'fa-solid fa-handshake', label: 'Support', color: '#5C6BC0' },
      heartfelt: { icon: 'fa-solid fa-heart', label: 'Heartfelt', color: '#AB47BC' },
      mindblown: { icon: 'fa-solid fa-brain', label: 'Mind Blown', color: '#FFCA28' }
    };

    const counts = { crown: 0, fire: 0, insightful: 0, support: 0, heartfelt: 0, mindblown: 0 };

    const formattedReactors = reactorRows.map(r => {
      const type = (r.reaction_type || 'crown').toLowerCase();
      if (counts[type] !== undefined) counts[type]++;

      const isCurrent = currentUserId && currentUserId === r.user_id;
      const meta = reactionIconMap[type] || reactionIconMap.crown;

      return {
        userId: r.user_id,
        username: r.username || 'dragme_user',
        displayName: r.display_name || r.username || 'Arena Member',
        avatarUrl: r.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(r.username || 'reactor')}`,
        rankTitle: r.rank_title || 'Roaster',
        isPremium: Boolean(r.is_premium),
        isSuper: Boolean(r.is_super),
        isCurrentUser: Boolean(isCurrent),
        reactionType: type,
        reactionIcon: meta.icon,
        reactionLabel: meta.label,
        reactionColor: meta.color,
        timeAgo: formatTimeAgo(r.created_at)
      };
    });

    const topReactors = formattedReactors.filter(r => r.isSuper || (r.isPremium)).slice(0, 15);
    const friends = formattedReactors.slice(0, 10); // Connected network reactors

    return res.json({
      postId,
      total: formattedReactors.length,
      counts,
      all: formattedReactors,
      friends,
      topReactors
    });
  } catch (err) {
    console.error('Fetch reactors error:', err);
    return res.status(500).json({ error: 'Server error retrieving reactors.' });
  }
});

// SAVE/BOOKMARK POST (Requires Authentication)
app.post('/api/posts/:id/save', requireAuth, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  try {
    const post = await db.get('SELECT id FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existingSave = await db.get('SELECT 1 FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]);

    let isSaved = false;
    if (existingSave) {
      await db.run('DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?', [userId, postId]);
      isSaved = false;
    } else {
      await db.run('INSERT INTO saved_posts (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      isSaved = true;
    }

    return res.json({ postId, isSaved });
  } catch (err) {
    console.error('Save error:', err);
    return res.status(500).json({ error: 'Server error saving post.' });
  }
});

// ADD COMMENT (Requires Authentication)
app.post('/api/posts/:id/comments', requireAuth, rateLimiter({ windowMs: 60000, max: 20 }), async (req, res) => {
  const postId = req.params.id;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Comment cannot be empty.' });
  }

  try {
    const post = await db.get('SELECT id, comment_count, heat_percent FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const commentId = `c-${Date.now()}`;
    const authorId = req.user ? req.user.id : 'guest_commenter';
    const authorUsername = req.user ? req.user.username : 'Anonymous Contributor';

    await db.run(`
      INSERT INTO comments (id, post_id, author_id, author_username, text)
      VALUES (?, ?, ?, ?, ?)
    `, [commentId, postId, authorId, authorUsername, text.trim()]);

    const newCommentCount = post.comment_count + 1;
    const newHeat = Math.min(100, post.heat_percent + 3);
    await db.run('UPDATE posts SET comment_count = ?, heat_percent = ? WHERE id = ?', [newCommentCount, newHeat, postId]);

    return res.status(201).json({
      message: 'Comment posted!',
      comment: {
        id: commentId,
        author: authorUsername,
        text: text.trim(),
        timeAgo: 'Just now'
      },
      commentCount: newCommentCount
    });
  } catch (err) {
    console.error('Comment error:', err);
    return res.status(500).json({ error: 'Server error posting comment.' });
  }
});

// PROTECTED DATA ENDPOINT
app.get('/api/protected-data', requireAuth, (req, res) => {
  res.json({
    secret: '🔐 This is protected data only accessible to authenticated DRAGME users!',
    authenticatedUser: req.user
  });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Full-Stack Server
async function startServer() {
  try {
    await db.initSchema();

    // Seed default tester user if not exists
    const testerUser = await db.get("SELECT id FROM users WHERE LOWER(username) = 'tester'");
    if (!testerUser) {
      const pwdHash = bcrypt.hashSync('password123', 10);
      await db.run(`
        INSERT INTO users (
          id, username, email, password_hash, display_name, bio, location, 
          avatar_url, banner_url, rank_title, reputation_score, cooked_ratio, 
          judgment_accuracy, rank_number, roast_points, next_level_points, 
          followers_count, following_count, reactions_count, role
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user'
        )
      `, [
        'usr_tester_supreme',
        'tester',
        'tester@dragme.gg',
        pwdHash,
        'Tester Supreme',
        'Master of Roasts & Pixel-Perfect',
        'Hamirpur, HP',
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
        'Senior Roaster',
        1800,
        100,
        98,
        143,
        2314,
        3000,
        1,
        2,
        23
      ]);
    }

    // Seed default posts if table is empty
    const postCountRow = await db.get('SELECT COUNT(*) as count FROM posts');
    const count = postCountRow ? parseInt(postCountRow.count) : 0;
    if (count === 0) {
      await db.run(`
        INSERT INTO posts (id, author_id, author_username, author_avatar, is_anonymous, room, room_display_name, title, content, image_url, flair, flair_class, drag_count, comment_count, heat_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'post-nightrider-1',
        'usr_nightrider',
        'NightRider',
        'https://api.dicebear.com/7.x/bottts/svg?seed=NightRider',
        0,
        'tech_ai',
        'r/tech_ai',
        'First Full-Stack Post in SQLite',
        'Unfiltered high-energy discussion saved directly to SQLite backend.',
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
        'Roast',
        'tag-roast',
        3,
        1,
        96
      ]);

      await db.run(`
        INSERT INTO posts (id, author_id, author_username, author_avatar, is_anonymous, room, room_display_name, title, content, image_url, flair, flair_class, drag_count, comment_count, heat_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'post-devzero-2',
        'usr_devzero',
        'DevZero',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        0,
        'tech_ai',
        'r/tech_ai',
        'Unpopular Opinion: 90% of "Agentic" SaaS are just 3 chained API calls',
        'Why does every startup slap a $49/mo paywall on a basic python script with 3 tool calls and call it an Autonomous Agent? Let us have an honest debate.',
        null,
        'Roast',
        'tag-roast',
        96,
        17,
        99
      ]);

      await db.run(`
        INSERT INTO posts (id, author_id, author_username, author_avatar, is_anonymous, room, room_display_name, title, content, image_url, flair, flair_class, drag_count, comment_count, heat_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'post-chipdrill-3',
        'usr_chipdrill',
        'chip_drill',
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&auto=format&fit=crop&q=80',
        0,
        'help_wanted',
        'r/help_wanted',
        'Can someone explain this to me please?',
        "I'm getting this error while deploying. I've checked my environment variables but still not working...",
        null,
        'Help',
        'tag-help-wanted',
        24,
        5,
        92
      ]);

      await db.run(`
        INSERT INTO comments (id, post_id, author_id, author_username, text)
        VALUES (?, ?, ?, ?, ?)
      `, ['c1', 'post-nightrider-1', 'usr_devzero', 'DevZero', 'SQLite WAL mode rocks!']);
    }

    // Hourly Unattached Temp Media Garbage Collector
    setInterval(() => {
      try {
        MediaProcessor.cleanupOldTempMedia(24 * 60 * 60 * 1000);
      } catch (cleanErr) {
        console.warn('Hourly media cleanup warning:', cleanErr);
      }
    }, 3600000);

    app.listen(PORT, () => {
      console.log(`🚀 DRAGME Enterprise Full-Stack Server running at http://localhost:${PORT}`);
      console.log(`📊 Database Engine: ${db.isPostgres() ? 'PostgreSQL (Cloud Scale Pool)' : 'WAL High-Performance SQLite'}`);
    });
  } catch (err) {
    console.error('Server startup error:', err);
  }
}

startServer();
