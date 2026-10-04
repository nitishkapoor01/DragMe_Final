# DRAGME — Database Architecture & Schema Reference

DRAGME utilizes a dual-engine architecture managed via `db.js`:
- **Development/Edge**: SQLite 3 with Write-Ahead Logging (`PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;`).
- **Production/Cloud**: PostgreSQL Connection Pool with SSL and parameterized SQL.

---

## 1. Relational Schema & Tables

### 1. `users`
Core user identity, authentication credentials, and reputation scores.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | `PRIMARY KEY` | Unique prefixed user ID (`usr_...`) |
| `username` | `VARCHAR(32)` | `UNIQUE, NOT NULL` | Case-insensitive unique handle |
| `email` | `VARCHAR(255)`| `UNIQUE, NOT NULL` | Verified user email |
| `password` | `VARCHAR(255)`| `NOT NULL` | bcrypt-hashed password |
| `bio` | `TEXT` | `DEFAULT ''` | Profile biography |
| `avatar` | `VARCHAR(512)`| `DEFAULT ''` | URL to optimized 4:5 avatar asset |
| `banner` | `VARCHAR(512)`| `DEFAULT ''` | URL to optimized 3:1 banner asset |
| `animated_avatar`| `VARCHAR(512)`| `DEFAULT NULL` | Optional URL to animated avatar |
| `animated_banner`| `VARCHAR(512)`| `DEFAULT NULL` | Optional URL to animated banner |
| `reputation` | `INTEGER` | `DEFAULT 100` | Community karma & standing score |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |

---

### 2. `posts`
Posts, roasts, flame questions, and multimedia arena content.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | `PRIMARY KEY` | Unique post identifier (`post_...`) |
| `author_id` | `VARCHAR(64)` | `FOREIGN KEY (users.id) ON DELETE CASCADE` | Post author user ID |
| `author` | `VARCHAR(32)` | `NOT NULL` | Author username snapshot |
| `author_avatar` | `VARCHAR(512)`| `NOT NULL` | Author avatar snapshot |
| `content` | `TEXT` | `NOT NULL` | Post text body |
| `media_url` | `VARCHAR(512)`| `DEFAULT NULL` | Processed media file URL |
| `media_type`| `VARCHAR(32)` | `DEFAULT 'image'` | `image`, `video`, `none` |
| `is_anonymous`| `BOOLEAN` | `DEFAULT 0` | If true, masked in public feed |
| `drag_count` | `INTEGER` | `DEFAULT 0` | Total crown/reaction vote tally |
| `comments_count` | `INTEGER`| `DEFAULT 0` | Total comment count |
| `heat_level` | `VARCHAR(32)` | `DEFAULT 'normal'` | `normal`, `spicy`, `flame`, `inferno` |
| `room` | `VARCHAR(64)` | `DEFAULT 'general'` | Room topic classification |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Timestamp |

---

### 3. `post_votes`
Reaction registry tracking individual votes and super-reaction status.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `post_id` | `VARCHAR(64)` | `FOREIGN KEY (posts.id) ON DELETE CASCADE` | Target post |
| `user_id` | `VARCHAR(64)` | `FOREIGN KEY (users.id) ON DELETE CASCADE` | Reactor |
| `reaction_type`| `VARCHAR(32)`| `DEFAULT 'crown'` | `crown`, `fire`, `skull`, `clown`, `heart` |
| `is_super` | `BOOLEAN` | `DEFAULT 0` | Super Crown upgraded flag |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Timestamp |
| **Indexes** | `PRIMARY KEY (post_id, user_id)` | Unique vote per user per post |

---

### 4. `comments`
Comment threads and discussions attached to posts.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | `PRIMARY KEY` | Unique comment ID (`cm_...`) |
| `post_id` | `VARCHAR(64)` | `FOREIGN KEY (posts.id) ON DELETE CASCADE` | Parent post ID |
| `author_id` | `VARCHAR(64)` | `FOREIGN KEY (users.id) ON DELETE CASCADE` | Comment author ID |
| `content` | `TEXT` | `NOT NULL` | Comment text content |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Timestamp |

---

### 5. `saved_posts`
User bookmarks for saved posts.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `VARCHAR(64)` | `FOREIGN KEY (users.id) ON DELETE CASCADE` | User saving post |
| `post_id` | `VARCHAR(64)` | `FOREIGN KEY (posts.id) ON DELETE CASCADE` | Saved post ID |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Timestamp |
| **Indexes** | `PRIMARY KEY (user_id, post_id)` | Single bookmark record per user/post |

---

### 6. `media_assets`
Media storage records with SHA-256 deduplication and lifecycle tracking.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `VARCHAR(64)` | `PRIMARY KEY` | Asset identifier (`ast_...`) |
| `user_id` | `VARCHAR(64)` | `FOREIGN KEY (users.id) ON DELETE SET NULL` | Owner ID |
| `hash` | `VARCHAR(64)` | `INDEX` | SHA-256 hash of media buffer |
| `url` | `VARCHAR(512)`| `NOT NULL` | Relative URL to static file |
| `type` | `VARCHAR(32)` | `NOT NULL` | `pfp`, `banner`, `post`, `video` |
| `mime_type` | `VARCHAR(64)` | `NOT NULL` | MIME type (e.g. `image/webp`) |
| `size_bytes`| `INTEGER` | `NOT NULL` | File byte size |
| `variants` | `TEXT` | `DEFAULT NULL` | JSON serialized variant paths |
| `ref_count` | `INTEGER` | `DEFAULT 1` | Active reference count for GC |
| `created_at`| `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Creation date |
