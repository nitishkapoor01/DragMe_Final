/**
 * DRAGME - Scalable Enterprise Database Layer (PostgreSQL + SQLite Fallback)
 * Supports High-Throughput Connection Pooling (pg.Pool) for Millions of Users
 */

const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

let isPostgres = Boolean(DATABASE_URL && DATABASE_URL.trim().length > 0);
let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  try {
    const isSsl = DATABASE_URL.includes('sslmode=require') || !DATABASE_URL.includes('localhost');
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      max: 30, // Max concurrent connections in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: isSsl ? { rejectUnauthorized: false } : false
    });
    console.log('🐘 Initializing PostgreSQL Connection Pool for Millions of Users...');
  } catch (err) {
    console.error('⚠️ PostgreSQL pool initialization error:', err.message);
    isPostgres = false;
  }
}

if (!isPostgres) {
  // High-Performance SQLite fallback for local development
  sqliteDb = new DatabaseSync(path.join(__dirname, 'dragme_database.db'));
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA synchronous = NORMAL;');
  sqliteDb.exec('PRAGMA cache_size = -64000;');
  sqliteDb.exec('PRAGMA temp_store = MEMORY;');
  sqliteDb.exec('PRAGMA mmap_size = 268435456;');
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  console.log('⚡ Using High-Performance WAL SQLite Engine (Set DATABASE_URL in .env to switch to PostgreSQL)');
}

// Unified Database Access Interface
const db = {
  isPostgres() {
    return isPostgres;
  },

  async query(text, params = []) {
    if (isPostgres) {
      // PostgreSQL uses $1, $2 instead of ?
      let paramIndex = 1;
      const pgText = text.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await pgPool.query(pgText, params);
      return res.rows;
    } else {
      // SQLite
      const stmt = sqliteDb.prepare(text);
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        return stmt.all(...params);
      } else {
        return stmt.run(...params);
      }
    }
  },

  async get(text, params = []) {
    if (isPostgres) {
      let paramIndex = 1;
      const pgText = text.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await pgPool.query(pgText, params);
      return res.rows[0] || null;
    } else {
      return sqliteDb.prepare(text).get(...params) || null;
    }
  },

  async all(text, params = []) {
    if (isPostgres) {
      let paramIndex = 1;
      const pgText = text.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await pgPool.query(pgText, params);
      return res.rows;
    } else {
      return sqliteDb.prepare(text).all(...params);
    }
  },

  async run(text, params = []) {
    if (isPostgres) {
      let paramIndex = 1;
      const pgText = text.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await pgPool.query(pgText, params);
      return { rowCount: res.rowCount };
    } else {
      return sqliteDb.prepare(text).run(...params);
    }
  },

  async initSchema() {
    if (isPostgres) {
      await pgPool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name VARCHAR(100) DEFAULT '',
          bio TEXT DEFAULT '',
          location VARCHAR(100) DEFAULT '',
          avatar_url TEXT DEFAULT '',
          banner_url TEXT DEFAULT '',
          rank_title VARCHAR(50) DEFAULT 'Senior Roaster',
          reputation_score INTEGER DEFAULT 1800,
          cooked_ratio INTEGER DEFAULT 100,
          judgment_accuracy INTEGER DEFAULT 98,
          rank_number INTEGER DEFAULT 143,
          roast_points INTEGER DEFAULT 2314,
          next_level_points INTEGER DEFAULT 3000,
          followers_count INTEGER DEFAULT 1,
          following_count INTEGER DEFAULT 2,
          reactions_count INTEGER DEFAULT 23,
          role VARCHAR(20) DEFAULT 'user' CHECK(role IN ('user', 'moderator', 'admin')),
          is_banned SMALLINT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS posts (
          id VARCHAR(100) PRIMARY KEY,
          author_id VARCHAR(100),
          author_username VARCHAR(50) NOT NULL,
          author_avatar TEXT DEFAULT '',
          is_anonymous SMALLINT DEFAULT 0,
          room VARCHAR(50) DEFAULT 'general',
          room_display_name VARCHAR(100) DEFAULT 'General',
          title TEXT NOT NULL,
          content TEXT DEFAULT '',
          image_url TEXT,
          flair VARCHAR(50) DEFAULT 'General',
          flair_class VARCHAR(50) DEFAULT 'flair-blue',
          drag_count INTEGER DEFAULT 1,
          comment_count INTEGER DEFAULT 0,
          heat_percent INTEGER DEFAULT 85,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS comments (
          id VARCHAR(100) PRIMARY KEY,
          post_id VARCHAR(100) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          author_id VARCHAR(100),
          author_username VARCHAR(50) NOT NULL,
          author_avatar TEXT DEFAULT '',
          text TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS votes (
          user_id VARCHAR(100) NOT NULL,
          post_id VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, post_id)
        );

        CREATE TABLE IF NOT EXISTS saved_posts (
          user_id VARCHAR(100) NOT NULL,
          post_id VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, post_id)
        );

        -- PostgreSQL Million-User Scalability Indexes
        CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
        CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_posts_room_created ON posts(room, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_heat_created ON posts(heat_percent DESC, drag_count DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_votes_user_post ON votes(user_id, post_id);
        CREATE INDEX IF NOT EXISTS idx_saved_user_post ON saved_posts(user_id, post_id);
      `);

      // Safe migration check for existing columns
      const cols = ['display_name', 'bio', 'location', 'banner_url', 'rank_title', 'reputation_score', 'cooked_ratio', 'judgment_accuracy', 'rank_number', 'roast_points', 'next_level_points', 'followers_count', 'following_count', 'reactions_count'];
      for (const col of cols) {
        try {
          await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} VARCHAR(255) DEFAULT ''`);
        } catch (e) {}
      }
      console.log('✅ PostgreSQL Schema & Scalable Indexes Verified.');
    } else {
      sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT DEFAULT '',
          bio TEXT DEFAULT '',
          location TEXT DEFAULT '',
          avatar_url TEXT DEFAULT '',
          banner_url TEXT DEFAULT '',
          rank_title TEXT DEFAULT 'Senior Roaster',
          reputation_score INTEGER DEFAULT 1800,
          cooked_ratio INTEGER DEFAULT 100,
          judgment_accuracy INTEGER DEFAULT 98,
          rank_number INTEGER DEFAULT 143,
          roast_points INTEGER DEFAULT 2314,
          next_level_points INTEGER DEFAULT 3000,
          followers_count INTEGER DEFAULT 1,
          following_count INTEGER DEFAULT 2,
          reactions_count INTEGER DEFAULT 23,
          role TEXT DEFAULT 'user' CHECK(role IN ('user', 'moderator', 'admin')),
          is_banned INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS posts (
          id TEXT PRIMARY KEY,
          author_id TEXT,
          author_username TEXT NOT NULL,
          author_avatar TEXT DEFAULT '',
          is_anonymous INTEGER DEFAULT 0,
          room TEXT DEFAULT 'general',
          room_display_name TEXT DEFAULT 'General',
          title TEXT NOT NULL,
          content TEXT DEFAULT '',
          image_url TEXT,
          flair TEXT DEFAULT 'General',
          flair_class TEXT DEFAULT 'flair-blue',
          drag_count INTEGER DEFAULT 1,
          comment_count INTEGER DEFAULT 0,
          heat_percent INTEGER DEFAULT 85,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL,
          author_id TEXT,
          author_username TEXT NOT NULL,
          author_avatar TEXT DEFAULT '',
          text TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS votes (
          user_id TEXT NOT NULL,
          post_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, post_id)
        );

        CREATE TABLE IF NOT EXISTS saved_posts (
          user_id TEXT NOT NULL,
          post_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, post_id)
        );

        CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
        CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_posts_room_created ON posts(room, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_heat_created ON posts(heat_percent DESC, drag_count DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_votes_user_post ON votes(user_id, post_id);
        CREATE INDEX IF NOT EXISTS idx_saved_user_post ON saved_posts(user_id, post_id);
      `);

      // SQLite dynamic column migrations
      const columnsToAdd = [
        { name: 'display_name', type: 'TEXT DEFAULT ""' },
        { name: 'bio', type: 'TEXT DEFAULT ""' },
        { name: 'location', type: 'TEXT DEFAULT ""' },
        { name: 'banner_url', type: 'TEXT DEFAULT ""' },
        { name: 'rank_title', type: 'TEXT DEFAULT "Senior Roaster"' },
        { name: 'reputation_score', type: 'INTEGER DEFAULT 1800' },
        { name: 'cooked_ratio', type: 'INTEGER DEFAULT 100' },
        { name: 'judgment_accuracy', type: 'INTEGER DEFAULT 98' },
        { name: 'rank_number', type: 'INTEGER DEFAULT 143' },
        { name: 'roast_points', type: 'INTEGER DEFAULT 2314' },
        { name: 'next_level_points', type: 'INTEGER DEFAULT 3000' },
        { name: 'followers_count', type: 'INTEGER DEFAULT 1' },
        { name: 'following_count', type: 'INTEGER DEFAULT 2' },
        { name: 'reactions_count', type: 'INTEGER DEFAULT 23' }
      ];

      for (const col of columnsToAdd) {
        try {
          sqliteDb.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
        } catch (e) {
          // Column already exists
        }
      }
    }
  }
};

module.exports = db;
