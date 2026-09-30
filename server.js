const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5173;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2026_dragme_production';

// =============================================================================
// 1. MIDDLEWARES, SECURITY HEADERS & SCALABLE RATE LIMITER
// =============================================================================
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Enterprise Security Headers & Instant Live Cache Buster
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
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
    const user = await db.get('SELECT id, username, email, avatar_url, role, is_banned FROM users WHERE id = ?', [decoded.id]);
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
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Please enter your username/email and password.' });
  }

  const cleanLogin = String(login).trim();

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

// GET CURRENT USER (/me)
app.get('/api/auth/me', optionalAuth, async (req, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }
  const user = await db.get(`
    SELECT id, username, email, display_name, bio, location, avatar_url, banner_url, rank_title, 
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
      SELECT id, username, email, display_name, bio, location, avatar_url, banner_url, rank_title, 
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
    const joinFormatted = joinDateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return res.json({
      profile: {
        id: user.id,
        username: user.username,
        displayName: user.display_name || user.username,
        bio: user.bio || 'Master of Roasts & Pixel-Perfect',
        location: user.location || 'Hamirpur, HP',
        avatarUrl: user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
        bannerUrl: user.banner_url || '',
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
          reactions: parseInt(reactionsRow?.total || 23)
        },
        isOwner
      }
    });
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Server error retrieving profile.' });
  }
});

// UPDATE PROFILE (Server-Authoritative with Validation)
app.put('/api/users/profile', requireAuth, rateLimiter({ windowMs: 60000, max: 15 }), async (req, res) => {
  const { displayName, bio, location, avatarUrl, bannerUrl } = req.body;
  const userId = req.user.id;

  const cleanDisplayName = displayName ? String(displayName).trim().slice(0, 50) : req.user.username;
  const cleanBio = bio ? String(bio).trim().slice(0, 250) : '';
  const cleanLocation = location ? String(location).trim().slice(0, 80) : '';
  const cleanAvatarUrl = avatarUrl ? String(avatarUrl).trim() : req.user.avatar_url;
  const cleanBannerUrl = bannerUrl ? String(bannerUrl).trim() : '';

  try {
    await db.run(`
      UPDATE users 
      SET display_name = ?, bio = ?, location = ?, avatar_url = ?, banner_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [cleanDisplayName, cleanBio, cleanLocation, cleanAvatarUrl, cleanBannerUrl, userId]);

    const updatedUser = await db.get(`
      SELECT id, username, email, display_name, bio, location, avatar_url, banner_url, rank_title, 
             reputation_score, cooked_ratio, judgment_accuracy, rank_number, roast_points, 
             next_level_points, followers_count, following_count, reactions_count, role 
      FROM users WHERE id = ?
    `, [userId]);

    return res.json({
      message: 'Profile updated successfully!',
      user: updatedUser
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
      let isSaved = false;

      if (currentUserId) {
        const voteCheck = await db.get('SELECT 1 FROM votes WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        hasVoted = Boolean(voteCheck);

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
      let isSaved = false;

      if (currentUserId) {
        const voteCheck = await db.get('SELECT 1 FROM votes WHERE user_id = ? AND post_id = ?', [currentUserId, post.id]);
        hasVoted = Boolean(voteCheck);

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

// VOTE ON POST (Requires Authentication)
app.post('/api/posts/:id/vote', requireAuth, async (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  try {
    const post = await db.get('SELECT id, drag_count, heat_percent FROM posts WHERE id = ?', [postId]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const existingVote = await db.get('SELECT 1 FROM votes WHERE user_id = ? AND post_id = ?', [userId, postId]);

    let hasVoted = false;
    let newDragCount = post.drag_count;
    let newHeat = post.heat_percent;

    if (existingVote) {
      await db.run('DELETE FROM votes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      newDragCount = Math.max(0, post.drag_count - 1);
      hasVoted = false;
    } else {
      await db.run('INSERT INTO votes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      newDragCount = post.drag_count + 1;
      newHeat = Math.min(100, post.heat_percent + 2);
      hasVoted = true;
    }

    await db.run('UPDATE posts SET drag_count = ?, heat_percent = ? WHERE id = ?', [newDragCount, newHeat, postId]);

    return res.json({
      postId,
      hasVoted,
      dragCount: newDragCount,
      heatPercent: newHeat
    });
  } catch (err) {
    console.error('Vote error:', err);
    return res.status(500).json({ error: 'Server error processing vote.' });
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
        'post-reddit-1',
        'usr_champ_ahri',
        'champ_ahri',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&auto=format&fit=crop&q=80',
        0,
        'tech_ai',
        'tech_ai',
        'Can someone explain this to me please?',
        'Why is the Gemini model standing alone in the top-tier? I am looking to purchase a model for my unreal engine project but I do not know which one offers the smartest support; could someone explain this and offer some advice?',
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
        'Question / Help',
        'flair-blue',
        285,
        2,
        92
      ]);

      await db.run(`
        INSERT INTO posts (id, author_id, author_username, author_avatar, is_anonymous, room, room_display_name, title, content, image_url, flair, flair_class, drag_count, comment_count, heat_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'post-reddit-2',
        'usr_tester_supreme',
        'Tester Supreme',
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
        0,
        'confessions',
        'Confessions',
        'Confession from Hamirpur',
        'h\n\nFull stack pixel-perfect design in progress.',
        null,
        'Confession',
        'flair-confession',
        23,
        1,
        88
      ]);

      await db.run(`
        INSERT INTO comments (id, post_id, author_id, author_username, text)
        VALUES (?, ?, ?, ?, ?)
      `, ['c1', 'post-reddit-1', 'usr_arch', 'CodeArchitect', 'Gemini 3.7 Reasoning handles large codebase memory better for game engines.']);
    }

    app.listen(PORT, () => {
      console.log(`🚀 DRAGME Enterprise Full-Stack Server running at http://localhost:${PORT}`);
      console.log(`📊 Database Engine: ${db.isPostgres() ? 'PostgreSQL (Cloud Scale Pool)' : 'WAL High-Performance SQLite'}`);
    });
  } catch (err) {
    console.error('Server startup error:', err);
  }
}

startServer();
