# DRAGME — Master System Architecture

## 1. Architectural Philosophy & Inviolable Principles

DRAGME is a next-generation full-stack social platform engineered around server-authoritative state, modular domain separation, and defensive security by default.

### Core Principles
1. **Server is the Sole Source of Truth**: Client state is untrusted. All permission calculations, user identifiers, vote aggregations, sanitization, and state transitions are strictly validated and computed server-side.
2. **Domain-Driven Modular Structure**:
   - Backend is layered: `routes` ➔ `validators` ➔ `controllers` ➔ `services` ➔ `repositories` ➔ database.
   - Frontend is modular ES6: `app/` (core state/routing), `api/` (domain HTTP clients), `features/` (encapsulated UI domain controllers), `services/` (browser hardware/media/audio), `utils/`, and `constants/`.
3. **Dual Storage Engine Support**: Dual-engine persistence layer supporting SQLite with Write-Ahead Logging (WAL) for local high-throughput development and PostgreSQL pool for scalable cloud deployment with automatic migration synchronization.
4. **Media Processing Pipeline**: Scalable asynchronous and synchronous image/video processing with sharp/ffmpeg, SHA-256 content deduplication, responsive multi-variant generation, magic-byte security checks, and automated storage garbage collection.
5. **Fluid Liquid Identity**: Native support for verified accounts, anonymous posting masks, and anonymous persona shifts without compromising server-side auditability and rate limits.

---

## 2. Directory Layout & Layer Mapping

```
DRAGME/
├── server.js                        # Node.js/Express bootstrap & middleware pipeline
├── db.js                            # Dual-engine SQLite (WAL) / PostgreSQL pool abstraction
├── index.html                       # Responsive HTML5 SPA shell
├── package.json                     # Dependencies, scripts & test suites
│
├── backend/
│   ├── routes/                      # Route declarations & endpoint mappings
│   │   ├── authRoutes.js
│   │   ├── postRoutes.js
│   │   ├── commentRoutes.js
│   │   ├── profileRoutes.js
│   │   ├── roomRoutes.js
│   │   └── mediaRoutes.js
│   ├── controllers/                 # HTTP request extraction & response handling
│   │   ├── authController.js
│   │   ├── postController.js
│   │   ├── commentController.js
│   │   ├── reactionController.js
│   │   └── profileController.js
│   ├── services/                    # Core business logic & cross-domain coordination
│   │   ├── authService.js
│   │   ├── postService.js
│   │   ├── reactionService.js
│   │   ├── commentService.js
│   │   ├── profileService.js
│   │   └── roomService.js
│   ├── repositories/                # Direct database access & query operations
│   │   ├── userRepository.js
│   │   ├── postRepository.js
│   │   ├── commentRepository.js
│   │   ├── reactionRepository.js
│   │   └── mediaRepository.js
│   ├── validators/                  # Schema validation & input sanitization
│   │   ├── authValidator.js
│   │   ├── postValidator.js
│   │   ├── commentValidator.js
│   │   └── profileValidator.js
│   ├── middleware/                  # JWT auth, rate limiting & security filters
│   │   └── authMiddleware.js
│   └── utils/                       # Security utilities, crypto & sanitizers
│
├── src/                             # Canonical modular frontend
│   ├── main.js                      # Application bootstrap & lifecycle orchestrator
│   ├── app/                         # App runtime primitives
│   │   ├── config.js                # Environment & API configurations
│   │   ├── store.js                 # Reactive state store & pub/sub events
│   │   └── router.js                # Hash & History SPA routing engine
│   ├── api/                         # Domain HTTP client layer
│   │   ├── apiClient.js             # Base fetch client with JWT management
│   │   ├── authApi.js
│   │   ├── postsApi.js
│   │   ├── commentsApi.js
│   │   ├── reactionsApi.js
│   │   ├── profilesApi.js
│   │   ├── roomsApi.js
│   │   └── mediaApi.js
│   ├── features/                    # Feature domain modules
│   │   ├── auth/                    # Auth modals, prompts & session handlers
│   │   ├── feed/                    # Feed manager & room/tab switching
│   │   ├── posts/                   # Post creation modal & liquid identity selector
│   │   ├── comments/                # Slide-over comments sheet & thread management
│   │   ├── reactions/               # Crown reaction engine & Who Reacted modal
│   │   ├── profile/                 # Profile viewer, profile editor & media studio
│   │   ├── navigation/              # Top navbar, bottom navigation & sidebar
│   │   └── toast/                   # Toast notification system
│   ├── services/                    # Hardware/browser services
│   │   ├── avatarService.js         # Dicebear, video avatar elements & SVG masks
│   │   ├── sfxService.js            # Synthesized Web Audio API sound effects
│   │   ├── animationScheduler.js    # Concurrency, IntersectionObserver & viewports
│   │   ├── clientMediaCompressor.js # Canvas WebP compression & video trim
│   │   └── mediaPreviewEngine.js    # Instant previews & video poster generation
│   ├── utils/                       # DOM utilities, string escape & time formatting
│   │   ├── domUtils.js
│   │   └── timeUtils.js
│   └── constants/                   # Fixed rooms, categories, reactions & seed data
│       ├── rooms.js
│       ├── categories.js
│       ├── reactions.js
│       └── seedPosts.js
│
├── styles/                          # Modular design tokens & stylesheets
│   ├── variables.css                # CSS custom properties (colors, typography, spacing)
│   ├── reset.css                    # CSS box-sizing & margin normalization
│   ├── base.css                     # Global typography, typography hierarchies
│   ├── utilities.css                # Utility classes (flex, grid, spacing, layout)
│   └── responsive.css               # Media query breakpoints & responsive layout rules
│
├── tests/                           # Automated test suites
│   ├── test-api-suite.js            # Integration tests & API contracts (18 tests)
│   ├── test-media-pipeline.js       # Media processing & security tests (34 tests)
│   └── test-crown-reaction.js       # Crown reaction live verification
│
└── uploads/                         # Storage directory for processed media & posters
```

---

## 3. Request Lifecycle

```
[Browser Client]
       │
       ▼ (HTTP Request with Bearer JWT)
[server.js / Express Pipeline]
       │
       ▼ (Security Headers, CORS, JSON Body Parser)
[backend/middleware/authMiddleware.js]
       │
       ▼ (Attach req.user if authenticated / guest mode)
[backend/routes/*.js]
       │
       ▼ (Route validation & controller dispatch)
[backend/validators/*.js]
       │
       ▼ (Input sanitation, format & length checks)
[backend/controllers/*.js]
       │
       ▼ (HTTP code mapping & error responses)
[backend/services/*.js]
       │
       ▼ (Business domain rules, rate limiting, permissions)
[backend/repositories/*.js]
       │
       ▼ (SQL Prepared Statements / Transactions)
[db.js -> SQLite WAL / PostgreSQL Pool]
```
