/**
 * DRAGME - Scalable Enterprise Database Layer (PostgreSQL + SQLite Fallback)
 * Supports High-Throughput Connection Pooling (pg.Pool) for Millions of Users
 * Centralized media_assets & media_usages schema with integrity indexes.
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
          reaction_type VARCHAR(30) DEFAULT 'crown',
          is_super SMALLINT DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, post_id)
        );

        CREATE TABLE IF NOT EXISTS saved_posts (
          user_id VARCHAR(100) NOT NULL,
          post_id VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, post_id)
        );

        CREATE TABLE IF NOT EXISTS media_assets (
          id VARCHAR(100) PRIMARY KEY,
          owner_id VARCHAR(100),
          media_type VARCHAR(50) NOT NULL,
          usage_type VARCHAR(50) DEFAULT 'PFP',
          mime_type VARCHAR(100) NOT NULL,
          original_filename TEXT,
          storage_key TEXT NOT NULL,
          storage_url TEXT NOT NULL,
          poster_key TEXT,
          poster_url TEXT,
          thumbnail_url TEXT,
          variants TEXT DEFAULT '{}',
          width INTEGER DEFAULT 0,
          height INTEGER DEFAULT 0,
          duration REAL DEFAULT 0,
          size_bytes BIGINT DEFAULT 0,
          file_size BIGINT DEFAULT 0,
          content_hash VARCHAR(128),
          status VARCHAR(30) DEFAULT 'READY',
          processing_status VARCHAR(30) DEFAULT 'READY',
          is_attached SMALLINT DEFAULT 0,
          attached_entity_type VARCHAR(50),
          attached_entity_id VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP WITH TIME ZONE
        );

        CREATE TABLE IF NOT EXISTS media_usages (
          id VARCHAR(100) PRIMARY KEY,
          media_id VARCHAR(100) NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- PostgreSQL Scalability Indexes
        CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
        CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_posts_room_created ON posts(room, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_heat_created ON posts(heat_percent DESC, drag_count DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_votes_user_post ON votes(user_id, post_id);
        CREATE INDEX IF NOT EXISTS idx_saved_user_post ON saved_posts(user_id, post_id);
        CREATE INDEX IF NOT EXISTS idx_media_owner ON media_assets(owner_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_media_content_hash ON media_assets(content_hash);
        CREATE INDEX IF NOT EXISTS idx_media_status ON media_assets(status, processing_status);
        CREATE INDEX IF NOT EXISTS idx_media_usages_media ON media_usages(media_id);
        CREATE INDEX IF NOT EXISTS idx_media_usages_entity ON media_usages(entity_type, entity_id);
      `);

      // Safe migration check for existing columns
      const cols = [
        'display_name', 'bio', 'location', 'date_of_birth', 'gender', 'social_links', 'visibility',
        'avatar_url', 'banner_url', 'avatar_frame', 'avatar_shape', 'profile_theme', 'profile_accent',
        'profile_badge', 'profile_effects', 'is_premium', 'badges_owned',
        'rank_title', 'reputation_score', 'cooked_ratio', 'judgment_accuracy', 'rank_number',
        'roast_points', 'next_level_points', 'followers_count', 'following_count', 'reactions_count'
      ];
      for (const col of cols) {
        try {
          await pgPool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} VARCHAR(255) DEFAULT ''`);
        } catch (e) { }
      }

      const mediaCols = [
        { name: 'storage_key', type: 'TEXT' },
        { name: 'poster_key', type: 'TEXT' },
        { name: 'usage_type', type: 'VARCHAR(50) DEFAULT \'PFP\'' },
        { name: 'size_bytes', type: 'BIGINT DEFAULT 0' },
        { name: 'content_hash', type: 'VARCHAR(128)' },
        { name: 'status', type: 'VARCHAR(30) DEFAULT \'READY\'' },
        { name: 'deleted_at', type: 'TIMESTAMP WITH TIME ZONE' }
      ];
      for (const mc of mediaCols) {
        try {
          await pgPool.query(`ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS ${mc.name} ${mc.type}`);
        } catch (e) { }
      }

      try {
        await pgPool.query("ALTER TABLE votes ADD COLUMN IF NOT EXISTS reaction_type VARCHAR(30) DEFAULT 'crown'");
        await pgPool.query("ALTER TABLE votes ADD COLUMN IF NOT EXISTS is_super SMALLINT DEFAULT 0");
      } catch (e) { }

      console.log('✅ PostgreSQL Schema & Scalable Media Indexes Verified.');
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
          date_of_birth TEXT DEFAULT '',
          gender TEXT DEFAULT '',
          social_links TEXT DEFAULT '{}',
          visibility TEXT DEFAULT 'public',
          avatar_url TEXT DEFAULT '',
          banner_url TEXT DEFAULT '',
          avatar_frame TEXT DEFAULT 'none',
          avatar_shape TEXT DEFAULT 'rectangular',
          profile_theme TEXT DEFAULT 'default',
          profile_accent TEXT DEFAULT 'lime',
          profile_badge TEXT DEFAULT 'senior_roaster',
          profile_effects TEXT DEFAULT 'none',
          is_premium INTEGER DEFAULT 0,
          badges_owned TEXT DEFAULT '["verified","senior_roaster","battle_champ","problem_solver","helpful"]',
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
          reaction_type TEXT DEFAULT 'crown',
          is_super INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, post_id)
        );

        CREATE TABLE IF NOT EXISTS saved_posts (
          user_id TEXT NOT NULL,
          post_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, post_id)
        );

        CREATE TABLE IF NOT EXISTS media_assets (
          id TEXT PRIMARY KEY,
          owner_id TEXT,
          media_type TEXT NOT NULL,
          usage_type TEXT DEFAULT 'PFP',
          mime_type TEXT NOT NULL,
          original_filename TEXT,
          storage_key TEXT,
          storage_url TEXT NOT NULL,
          poster_key TEXT,
          poster_url TEXT,
          thumbnail_url TEXT,
          variants TEXT DEFAULT '{}',
          width INTEGER DEFAULT 0,
          height INTEGER DEFAULT 0,
          duration REAL DEFAULT 0,
          size_bytes INTEGER DEFAULT 0,
          file_size INTEGER DEFAULT 0,
          content_hash TEXT,
          status TEXT DEFAULT 'READY',
          processing_status TEXT DEFAULT 'READY',
          is_attached INTEGER DEFAULT 0,
          attached_entity_type TEXT,
          attached_entity_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          deleted_at DATETIME
        );

        CREATE TABLE IF NOT EXISTS media_usages (
          id TEXT PRIMARY KEY,
          media_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(media_id) REFERENCES media_assets(id) ON DELETE CASCADE
        );
      `);

      // SQLite dynamic column migrations
      const columnsToAdd = [
        { table: 'users', name: 'display_name', type: "TEXT DEFAULT ''" },
        { table: 'users', name: 'bio', type: "TEXT DEFAULT ''" },
        { table: 'users', name: 'location', type: "TEXT DEFAULT ''" },
        { table: 'users', name: 'date_of_birth', type: "TEXT DEFAULT ''" },
        { table: 'users', name: 'gender', type: "TEXT DEFAULT ''" },
        { table: 'users', name: 'social_links', type: "TEXT DEFAULT '{}'" },
        { table: 'users', name: 'visibility', type: "TEXT DEFAULT 'public'" },
        { table: 'users', name: 'avatar_url', type: "TEXT DEFAULT ''" },
        { table: 'users', name: 'banner_url', type: "TEXT DEFAULT ''" },
        { table: 'users', name: 'avatar_frame', type: "TEXT DEFAULT 'none'" },
        { table: 'users', name: 'avatar_shape', type: "TEXT DEFAULT 'rectangular'" },
        { table: 'users', name: 'profile_theme', type: "TEXT DEFAULT 'default'" },
        { table: 'users', name: 'profile_accent', type: "TEXT DEFAULT 'lime'" },
        { table: 'users', name: 'profile_badge', type: "TEXT DEFAULT 'senior_roaster'" },
        { table: 'users', name: 'profile_effects', type: "TEXT DEFAULT 'none'" },
        { table: 'users', name: 'is_premium', type: 'INTEGER DEFAULT 0' },
        { table: 'users', name: 'badges_owned', type: "TEXT DEFAULT '[\"verified\",\"senior_roaster\",\"battle_champ\",\"problem_solver\",\"helpful\"]'" },
        { table: 'users', name: 'rank_title', type: "TEXT DEFAULT 'Senior Roaster'" },
        { table: 'users', name: 'reputation_score', type: 'INTEGER DEFAULT 1800' },
        { table: 'users', name: 'cooked_ratio', type: 'INTEGER DEFAULT 100' },
        { table: 'users', name: 'judgment_accuracy', type: 'INTEGER DEFAULT 98' },
        { table: 'users', name: 'rank_number', type: 'INTEGER DEFAULT 143' },
        { table: 'users', name: 'roast_points', type: 'INTEGER DEFAULT 2314' },
        { table: 'users', name: 'next_level_points', type: 'INTEGER DEFAULT 3000' },
        { table: 'users', name: 'followers_count', type: 'INTEGER DEFAULT 1' },
        { table: 'users', name: 'following_count', type: 'INTEGER DEFAULT 2' },
        { table: 'users', name: 'reactions_count', type: 'INTEGER DEFAULT 23' },
        { table: 'media_assets', name: 'storage_key', type: 'TEXT' },
        { table: 'media_assets', name: 'poster_key', type: 'TEXT' },
        { table: 'media_assets', name: 'usage_type', type: "TEXT DEFAULT 'PFP'" },
        { table: 'media_assets', name: 'size_bytes', type: 'INTEGER DEFAULT 0' },
        { table: 'media_assets', name: 'content_hash', type: 'TEXT' },
        { table: 'media_assets', name: 'status', type: "TEXT DEFAULT 'READY'" },
        { table: 'media_assets', name: 'deleted_at', type: 'DATETIME' },
        { table: 'votes', name: 'reaction_type', type: "TEXT DEFAULT 'crown'" },
        { table: 'votes', name: 'is_super', type: 'INTEGER DEFAULT 0' }
      ];

      for (const col of columnsToAdd) {
        try {
          sqliteDb.exec(`ALTER TABLE ${col.table} ADD COLUMN ${col.name} ${col.type};`);
        } catch (e) {
          // Column already exists or handled
        }
      }

      // Create scalable indexes after columns exist
      sqliteDb.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));
        CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
        CREATE INDEX IF NOT EXISTS idx_posts_room_created ON posts(room, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_heat_created ON posts(heat_percent DESC, drag_count DESC, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);
        CREATE INDEX IF NOT EXISTS idx_votes_user_post ON votes(user_id, post_id);
        CREATE INDEX IF NOT EXISTS idx_saved_user_post ON saved_posts(user_id, post_id);
        CREATE INDEX IF NOT EXISTS idx_media_owner ON media_assets(owner_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_media_content_hash ON media_assets(content_hash);
        CREATE INDEX IF NOT EXISTS idx_media_status ON media_assets(status, processing_status);
        CREATE INDEX IF NOT EXISTS idx_media_usages_media ON media_usages(media_id);
        CREATE INDEX IF NOT EXISTS idx_media_usages_entity ON media_usages(entity_type, entity_id);
      `);
    }
  }
};

module.exports = db;
