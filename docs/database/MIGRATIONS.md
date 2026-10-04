# Database Schema & Migrations Guide

DRAGME uses an idempotent schema initialization pattern supported across both PostgreSQL and SQLite WAL engines.

---

## 1. Schema Initialization (`db.initSchema()`)

When the server boots, `db.initSchema()` in [`db.js`](file:///c:/Users/nitis/Desktop/axh/db.js) executes the following idempotent tasks:

1. **Tables Creation (`CREATE TABLE IF NOT EXISTS`)**:
   - `users`: User profiles, credentials, reputation scores, badges, and roles.
   - `posts`: Community roast posts, media attachments, anonymity flags, and heat metrics.
   - `comments`: Discussion threads linked to posts with cascade deletion.
   - `votes`: Single-vote per user-post pair tracking crown and super crown reactions.
   - `saved_posts`: Bookmarked posts per user.
   - `media_assets`: Media metadata, storage keys, CDN URLs, dimensions, and processing status.
   - `media_usages`: Entity attachment tracking (e.g. which post or profile uses which media asset) for orphan detection and GC.

2. **Dynamic Column Migrations**:
   - Safely adds newly introduced columns without dropping data or requiring destructive rebuilds.

3. **High-Throughput Composite Indexes**:
   - `idx_users_username_lower`: Fast case-insensitive username lookup.
   - `idx_posts_heat_created`: Indexed feed ranking for hot / top sorts.
   - `idx_posts_room_created`: Fast community-filtered queries.
   - `idx_comments_post_created`: Fast comment thread queries.
   - `idx_media_content_hash`: Instant SHA-256 deduplication lookups.
   - `idx_media_usages_media` & `idx_media_usages_entity`: Foreign key search and garbage collection.

---

## 2. Adding New Fields or Tables

When extending the database schema in future releases:
1. Add the column definition to both the PostgreSQL and SQLite blocks in `db.initSchema()`.
2. Add corresponding parameterized queries in the respective repository in `backend/repositories/`.
3. Add input validation in `backend/validators/`.
4. Update `docs/database/SCHEMA.md`.
5. Run `npm test` to verify regression safety.
