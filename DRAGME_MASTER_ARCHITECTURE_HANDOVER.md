# 🏛️ DRAGME — MASTER PROJECT ARCHITECTURE & HANDOVER SPECIFICATION

> **PROJECT NAME:** DRAGME  
> **PLATFORM TYPE:** Next-Gen Social Arena & Community Platform (Unfiltered Debates, Roasts, Anonymous Confessions, Live Rooms)  
> **TECH STACK:** Node.js (Express 4.x), Vanilla JS / ES6 Modules, Vanilla CSS (Custom Design System), SQLite (WAL Mode) / PostgreSQL Pool, Sharp Media Pipeline  
> **CORE IDENTITY:** Dark Aesthetic (`#080B0F`), Cyber Neon Lime Accent (`#B7FF3C`), Cooked Flame (`#ff4757`), Anon Purple (`#a855f7`), Apple-style Spring Physics (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 1. REPOSITORY & DIRECTORY MAP

```text
axh / (Project Root)
│
├── server.js                          ── Express Application Master Bootstrap & Router Mounting
├── db.js                              ── Dual Database Adapter (SQLite WAL local / PostgreSQL Cloud Pool)
├── package.json                       ── Dependencies: express, pg, sharp, bcryptjs, jsonwebtoken, cors, dotenv
├── .env / .env.example                ── Config: PORT, DATABASE_URL, JWT_SECRET, STORAGE_DRIVER, UPLOADS_DIR
│
├── 📁 config/
│   └── mediaConfig.js                 ── Centralized Media Aspect Ratios, Limits & Policies
│
├── 📁 services/                       ── Standalone Compute & Media Engines
│   ├── mediaProcessor.js              ── Sharp Image Processing & Aspect Ratio Transformations
│   ├── mediaService.js                ── Ingest Manager, SHA-256 Deduplication & GC
│   ├── storageService.js              ── Pluggable Storage Driver (Local Disk / AWS S3 / Cloudflare R2)
│   ├── mediaDeliveryService.js        ── CDN URL Generator & Responsive Variant Deliverer
│   └── mediaQueue.js                  ── Asynchronous Background Media Queue Worker
│
├── 📁 backend/                        ── Server-Authoritative Architecture
│   ├── 📁 middleware/
│   │   ├── authMiddleware.js          ── JWT Verification (requireAuth, optionalAuth, requireAdmin)
│   │   └── rateLimiter.js             ── Sliding-Window Memory-Safe Rate Limiter
│   │
│   ├── 📁 controllers/
│   │   ├── authController.js          ── Registration, Login, Session (/me), Check Username
│   │   ├── profileController.js       ── Profile Ingest, Whitelist Sanitization, Customizations
│   │   ├── postController.js          ── Feed Algorithm, Hot/Top/New Sorting, Post Creator
│   │   ├── reactionController.js      ── Crown & Super Crown Reactions, Reaction Switch, Who-Reacted
│   │   ├── commentController.js       ── Comments & Nested Discussion Ingest
│   │   └── mediaController.js         ── 6-Pipeline Media Processor & Storage GC
│   │
│   └── 📁 routes/
│       ├── authRoutes.js              ── /api/auth/* & /api/users/check-username
│       ├── profileRoutes.js           ── /api/users/:username/profile, /api/users/profile
│       ├── postRoutes.js              ── /api/posts/* (Feed, Saves, Votes, Reactions, Reactors)
│       ├── commentRoutes.js           ── /api/posts/:id/comments
│       └── mediaRoutes.js             ── /api/upload/media, /api/media/limits, /api/media/metrics
│
├── 📁 styles/                         ── Central Design System
│   ├── variables.css                  ── Master Tokens: Colors, Elevation, Springs, Radii, Typography
│   ├── base.css                       ── Universal CSS Resets, Typography & Sleek Scrollbars
│   ├── components.css                 ── Master Aggregator Stylesheet
│   │
│   └── 📁 responsive/                 ── Viewport Separation
│       ├── desktop.css                ── Desktop (>= 1025px): 3-Column Grid, Sticky Sidebars, Capsule Plus
│       ├── mobile.css                 ── Phone (<= 768px): Single-Column, Touch Drawers, Floating Dock
│       └── tablet.css                 ── Tablet (769px - 1024px): 2-Column Adaptive Flow
│
├── 📁 components/                     ── Modular Feature Packages (HTML, CSS, JS)
│   ├── navbar/                        ── Top App Bar, Morph Hamburger, Crown Logo, Cooked Metric, Feed Tabs
│   ├── bottom-nav/                    ── Mobile Bottom Dock & Floating Center (+) FAB
│   ├── sidebar/                       ── Left Navigation Drawer & Active Live Rooms
│   ├── feed/                          ── Feed Post Cards, Vote Capsules, Stream Container
│   ├── create-post-modal/             ── Apple-Style 8-Category Post Creator & Anonymous Toggle
│   ├── comments/                      ── Slide-Up Comment Bottom Sheet
│   ├── profile/                       ── Profile Banner, Avatar Cam, Stats, Badges, Tabs
│   ├── widgets/                       ── Desktop Trending Topics & Suggested Communities
│   ├── who-reacted/                   ── Crown Reaction Modal & Reactor Tabs
│   ├── auth/                          ── Login/Signup Dialogs & Session Controller
│   └── toast/                         ── Floating Toast Hub
│
├── 📁 src/                            ── Client Logic & Orchestration
│   ├── 📁 api/
│   │   └── apiClient.js               ── Unified Frontend API Client (Auth, Posts, Reactions, Media)
│   └── main.js                        ── Application Bootstrap & Event Orchestrator
│
├── 📁 tests/                          ── Automated Test Suites (34/34 Media Tests + Crown Reaction Tests)
└── 📁 uploads/                        ── Physical Storage Directory for Optimized Media & Posters
```

---

## 2. INVIOLABLE ENGINEERING CONTRACT & RULES

1. **Server is the Sole Source of Truth:**
   * Never trust client-sent `userId`, `role`, `is_admin`, `reputation`, `isOwner`, or `permissions`. All permissions must be computed and validated server-side from cryptographically signed JWT claims and database queries.
2. **Permanent Contribution Metric (Cooked):**
   * The **Cooked** metric is a permanent, cumulative contributor rating. It **NEVER resets**. It must remain completely independent from monthly emblems, temporary badges, or premium cosmetics.
3. **Zero Client-Side Privilege:**
   * Modifying localStorage or DevTools state must not grant administrative, moderation, or voting privileges.
4. **No Direct Database Binaries:**
   * Media files are never stored as binary BLOBs in the database. The database only stores metadata, content hashes, storage keys, and CDN paths (`media_assets`, `media_usages`).
5. **Clean Architectural Boundaries:**
   * `UI Layer` -> `State / Event Bus` -> `API Client` -> `Express Routes` -> `Controllers` -> `Services` -> `Database / Object Storage`.
   * No layer may bypass an intermediate boundary (e.g., UI directly executing DB operations is prohibited).

---

## 3. SHARED DESIGN SYSTEM (CSS TOKENS)

All UI components consume tokens from `styles/variables.css`:

```css
:root {
  /* Surfaces */
  --bg-app: #080B0F;
  --bg-nav: rgba(8, 11, 15, 0.94);
  --bg-card: #10151C;
  --bg-card-hover: #131A22;
  --bg-subtle: #0C1117;
  --bg-input: #0C1117;
  --bg-bottom-nav: rgba(13, 18, 25, 0.94);
  --bg-pill: rgba(255, 255, 255, 0.05);

  /* Primary Brand Accent */
  --lime-primary: #B7FF3C;
  --lime-hover: #c4ff57;
  --lime-glow: rgba(183, 255, 60, 0.4);
  --lime-dim: rgba(183, 255, 60, 0.12);

  /* Secondary Accents */
  --red-cooked: #ff4757;
  --purple-anon: #a855f7;
  --purple-glow: rgba(168, 85, 247, 0.45);
  --gold-primary: #f59e0b;
  --orange-accent: #f97316;

  /* Typography */
  --text-pure: #F2F4F7;
  --text-med: #98A1AE;
  --text-low: #667180;
  --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-heading: 'Plus Jakarta Sans', sans-serif;

  /* Dimensions */
  --header-h: 58px;
  --feed-tabs-h: 44px;
  --top-nav-full-h: 102px;
  --sidebar-w: 240px;
  --sidebar-right-w: 320px;
  --bottom-nav-h: 62px;

  /* Spring Physics & Motion */
  --spring-ease: cubic-bezier(0.16, 1, 0.3, 1);
  --bounce-ease: cubic-bezier(0.34, 1.56, 0.64, 1);
  --smooth-ease: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 4. RESPONSIVE VIEWPORT STRATEGY

| Viewport | Layout Archetype | Visibility & Navigation Rules |
| :--- | :--- | :--- |
| **Desktop (`>= 1025px`)** | 3-Column Fixed Grid | Sticky Left Navigation Drawer + Center Feed + Sticky Right Info Sidebar. Search Bar and Capsule Plus Button enabled. |
| **Tablet (`769px - 1024px`)**| 2-Column Adaptive | Slim Left Drawer + Center Feed. Right sidebar hidden. |
| **Phone (`<= 768px`)** | 1-Column Mobile Fluid | Single Column Feed. Floating Bottom Navigation Dock with Center (+) FAB. Slide-in Left Navigation Drawer with frosted backdrop. Top Bar auto-collapses on scroll down, springs back on scroll up. |

---

## 5. DATABASE SCHEMA & ENTITIES

* **`users`:** `id (PK)`, `username (UK)`, `email (UK)`, `password_hash`, `display_name`, `bio`, `location`, `avatar_url`, `banner_url`, `cooked_level`, `reputation_score`, `role`, `is_banned`, `created_at`.
* **`posts`:** `id (PK)`, `author_id (FK)`, `author_username`, `author_avatar`, `is_anonymous`, `room`, `title`, `content`, `image_url`, `drag_count`, `comment_count`, `heat_percent`, `created_at`.
* **`votes`:** `(user_id, post_id) (Composite PK)`, `reaction_type (crown, fire, insightful, support, heartfelt, mindblown)`, `is_super`, `created_at`.
* **`comments`:** `id (PK)`, `post_id (FK)`, `author_id (FK)`, `author_username`, `text`, `created_at`.
* **`media_assets`:** `id (PK)`, `owner_id (FK)`, `storage_key`, `storage_url`, `poster_url`, `media_type`, `mime_type`, `width`, `height`, `size_bytes`, `content_hash (UK)`, `is_attached`, `created_at`.
* **`media_usages`:** `(media_id, entity_type, entity_id) (Composite PK)`.

---

## 6. MEDIA PIPELINE ARCHITECTURE (Sharp Powered)

1. **Pipeline 1 (Avatar PFP):** Cropped to 512x640 (4:5 portrait ratio), compressed to WebP.
2. **Pipeline 2 (Banner):** Cropped to 1920x640 (3:1 panoramic ratio), compressed to WebP.
3. **Pipeline 3 (Animated PFP):** Preserves animation duration (max 3s) + generates a static WebP poster frame.
4. **Pipeline 4 (Animated Banner):** Preserves animation (max 4s) + generates a fallback WebP poster frame.
5. **Pipeline 5 (Post Images):** Responsive variants (`full` 1920px max, `thumb` 480px).
6. **Pipeline 6 (Post Video):** Native MP4/WebM storage + automatic extraction of first-frame poster.
7. **Deduplication:** SHA-256 content hashing prevents duplicate storage of identical buffers.
8. **Garbage Collection:** Periodic background worker prunes unattached media assets older than 2 hours.

---

## 7. API CONVENTIONS & RESPONSE PROTOCOL

* **Success Format:** `{ "success": true, "data": { ... }, "meta": { ... } }`
* **Error Format:** `{ "success": false, "error": "Human-readable message", "code": "ERROR_CODE", "status": 400 }`
* **Authentication Header:** `Authorization: Bearer <jwt_token>`
* **Rate Limiting:** Sliding-window rate limiting returning HTTP `429 Too Many Requests`.

---

## 8. CURRENT PROJECT STATUS & HEALTH

* **Regression Tests:** 34/34 Media Pipeline Tests PASSING (`node tests/test-media-pipeline.js`).
* **Reaction Tests:** Crown Reaction & Who-Reacted Test Suite PASSING (`node tests/test-crown-reaction.js`).
* **Refactoring Status:** Full backend decoupled into controllers, routes, and middleware; design system tokenized; phone vs desktop styles isolated.
