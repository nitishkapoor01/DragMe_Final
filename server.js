/* ==========================================================================
   DRAGME ENTERPRISE FULL-STACK APPLICATION SERVER (server.js)
   Modular Architecture with Routers, Rate Limiters, Media Workers & SQLite WAL
   ========================================================================== */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const db = require('./db');
const MediaProcessor = require('./services/mediaProcessor');
const MediaService = require('./services/mediaService');
const { UPLOADS_DIR } = require('./config/mediaConfig');

// Modular Route Handlers
const authRoutes = require('./backend/routes/authRoutes');
const profileRoutes = require('./backend/routes/profileRoutes');
const mediaRoutes = require('./backend/routes/mediaRoutes');
const postRoutes = require('./backend/routes/postRoutes');
const commentRoutes = require('./backend/routes/commentRoutes');
const roomRoutes = require('./backend/routes/roomRoutes');

const app = express();
const PORT = process.env.PORT || 5173;

// =============================================================================
// 1. CORE MIDDLEWARE & SECURITY HEADERS
// =============================================================================
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// High-Performance Immutable CDN & Static Serving for Media Uploads
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

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

// Security & Cache Headers
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

// Explicit Zero-Cache Dynamic Root Handlers
app.get(['/', '/index.html'], (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.send(fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8'));
});

app.get('/style.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.send(fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8'));
});

app.use(express.static(__dirname, {
  etag: false,
  lastModified: false
}));

// =============================================================================
// 2. MOUNT MODULAR API ROUTERS
// =============================================================================
app.use('/api', authRoutes);
app.use('/api', profileRoutes);
app.use('/api', mediaRoutes);
app.use('/api', postRoutes);
app.use('/api', commentRoutes);
app.use('/api', roomRoutes);

// Global Health & Cloud Telemetry Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'DRAGME Enterprise Social Arena',
    version: '1.0.0',
    uptime_seconds: Math.floor(process.uptime()),
    database: {
      engine: db.isPostgres() ? 'postgresql' : 'sqlite_wal',
      status: 'connected'
    },
    storage: {
      provider: process.env.STORAGE_PROVIDER || 'local'
    },
    memory: {
      rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
});

// Protected Sample Endpoint
app.get('/api/protected-data', (req, res) => {
  res.json({ secret: '🔐 Protected DRAGME resource.' });
});

// SPA Catch-all Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =============================================================================
// 3. SEEDING, BACKGROUND WORKERS & SERVER BOOTSTRAP
// =============================================================================
async function startServer() {
  try {
    await db.initSchema();

    // 1. Seed Tester and Community Creators
    const communitySeeds = [
      {
        id: 'usr_tester_supreme',
        username: 'tester',
        email: 'tester@dragme.gg',
        displayName: 'Tester Supreme',
        bio: 'Master of Roasts & Pixel-Perfect',
        location: 'Hamirpur, HP',
        avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
        rankTitle: 'Senior Roaster',
        reputationScore: 1800,
        cookedRatio: 100,
        followersCount: 1,
        followingCount: 2
      },
      {
        id: 'usr_devzero',
        username: 'DevZero',
        email: 'devzero@dragme.gg',
        displayName: 'DevZero',
        bio: 'Core Platform Engineer & Lead Architect. Roasting bad code daily.',
        location: 'Bengaluru, India',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
        rankTitle: 'Grand Judge',
        reputationScore: 2450,
        cookedRatio: 98,
        followersCount: 420,
        followingCount: 68
      },
      {
        id: 'usr_chip_drill',
        username: 'chip_drill',
        email: 'chipdrill@dragme.gg',
        displayName: 'Chip Drill',
        bio: 'Hardware geek, silicon roaster, and high-frequency trader.',
        location: 'Mumbai, India',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=300&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1600&auto=format&fit=crop&q=80',
        rankTitle: 'Master Roaster',
        reputationScore: 1980,
        cookedRatio: 92,
        followersCount: 156,
        followingCount: 34
      },
      {
        id: 'usr_riya',
        username: 'Riya',
        email: 'riya@dragme.gg',
        displayName: 'Riya Sen',
        bio: 'Design enthusiast & UI roaster. Making web pixels bleed neon.',
        location: 'New Delhi, India',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
        bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80',
        rankTitle: 'Senior Roaster',
        reputationScore: 1620,
        cookedRatio: 88,
        followersCount: 289,
        followingCount: 91
      },
      {
        id: 'usr_nightrider',
        username: 'NightRider',
        email: 'nightrider@dragme.gg',
        displayName: 'Night Rider',
        bio: 'Roaming the midnight arenas. Unfiltered tech opinions only.',
        location: 'Pune, India',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=NightRider',
        bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
        rankTitle: 'Arena Champion',
        reputationScore: 2100,
        cookedRatio: 95,
        followersCount: 180,
        followingCount: 45
      }
    ];

    const defaultPwdHash = bcrypt.hashSync('password123', 10);
    for (const u of communitySeeds) {
      const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [u.username]);
      if (!existing) {
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
          u.id, u.username, u.email, defaultPwdHash,
          u.displayName, u.bio, u.location,
          u.avatarUrl, u.bannerUrl,
          u.rankTitle, u.reputationScore, u.cookedRatio, 98, 143, 2314, 3000,
          u.followersCount, u.followingCount, 23
        ]);
      }
    }

    // 2. Seed Default Posts if empty
    const postCountRow = await db.get('SELECT COUNT(*) as count FROM posts');
    const count = postCountRow ? parseInt(postCountRow.count) : 0;
    if (count === 0) {
      await db.run(`
        INSERT INTO posts (id, author_id, author_username, author_avatar, is_anonymous, room, room_display_name, title, content, image_url, flair, flair_class, drag_count, comment_count, heat_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'post-nightrider-1', 'usr_nightrider', 'NightRider',
        'https://api.dicebear.com/7.x/bottts/svg?seed=NightRider',
        0, 'tech_ai', 'r/tech_ai', 'First Full-Stack Post in SQLite',
        'Unfiltered high-energy discussion saved directly to SQLite backend.',
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
        'Roast', 'tag-roast', 3, 1, 96
      ]);
    }

    // 3. Periodic Cleanups
    setInterval(async () => {
      try {
        await MediaService.runCleanup(2 * 60 * 60 * 1000);
      } catch (err) {}
    }, 3 * 60 * 60 * 1000);

    setInterval(() => {
      try {
        MediaProcessor.cleanupOldTempMedia(24 * 60 * 60 * 1000);
      } catch (cleanErr) {}
    }, 3600000);

    app.listen(PORT, () => {
      console.log(`🚀 DRAGME Enterprise Full-Stack Server running at http://localhost:${PORT}`);
      console.log(`📊 Database Engine: ${db.isPostgres() ? 'PostgreSQL (Cloud Scale Pool)' : 'WAL High-Performance SQLite'}`);
    });
  } catch (err) {
    console.error('Server startup error:', err);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
