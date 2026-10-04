# ADR-005: Universal Database Layer & Scalable Connection Pooling

## Status
Accepted

## Context
DRAGME requires robust data persistence for users, posts, comments, reactions, bookmarks, and media assets.
- For local development and CI testing: Setup must be zero-friction without requiring a running Docker daemon or cloud database.
- For production: The database must support high concurrent read/write throughput, connection pooling (`pg.Pool`), composite indexing, foreign key constraints, and horizontal read replicas.

## Decision
We implement a **Dual-Engine Unified Database Layer** in [`db.js`](file:///c:/Users/nitis/Desktop/axh/db.js) with strict Repository isolation:

1. **Dual Engine Support**:
   - **Production (PostgreSQL):** Activated when `DATABASE_URL` is configured. Utilizes `pg.Pool` (up to 30 pooled connections, 30s idle timeout, SSL support) with parameterized queries `$1, $2`.
   - **Local Development (SQLite WAL):** Zero-config fallback using Node 22+ built-in `node:sqlite` `DatabaseSync` in Write-Ahead-Logging mode (`PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`, `PRAGMA mmap_size = 268435456`).
2. **Unified Query Interface**:
   - `db.query(sql, params)`
   - `db.get(sql, params)`
   - `db.all(sql, params)`
   - `db.run(sql, params)`
   - `db.isPostgres()`
   - `db.initSchema()`
3. **Strict Repository Isolation**:
   - Application controllers and services **NEVER** write raw SQL queries.
   - All persistence is encapsulated inside `backend/repositories/` (`userRepository`, `postRepository`, `commentRepository`, `reactionRepository`, `mediaRepository`).
4. **Composite Performance Indexes**:
   - `idx_posts_heat_created` on `posts(heat_percent DESC, drag_count DESC, created_at DESC)` for high-throughput feed ranking.
   - `idx_posts_room_created` on `posts(room, created_at DESC)` for community filtering.
   - `idx_comments_post_created` on `comments(post_id, created_at ASC)` for discussion threads.
   - `idx_media_content_hash` on `media_assets(content_hash)` for instant SHA-256 deduplication.

## Alternatives Considered
1. **Heavy ORM (Prisma / TypeORM / Sequelize)**:
   - *Rejected:* Adds substantial runtime overhead, cold-start latency, bundle bloat, and obscures query performance.
2. **PostgreSQL Only (No SQLite fallback)**:
   - *Rejected:* Creates friction for developers without local Postgres setups.

## Consequences
### Positive
- Instant developer onboarding (`npm start` works out of the box with zero external dependencies).
- Seamless transition to managed PostgreSQL (Supabase, Neon, AWS RDS, GCP Cloud SQL) by simply setting `DATABASE_URL`.
- Complete protection against SQL injection via parameterized queries across both engines.
