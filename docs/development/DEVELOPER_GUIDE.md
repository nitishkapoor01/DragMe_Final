# DRAGME Developer Guide

Welcome to the DRAGME engineering team. This guide explains the core architectural principles, request lifecycle, folder responsibilities, and coding patterns used throughout the codebase.

---

## 1. Core Architectural Mental Model

DRAGME follows a **Clean Modular Monolith** pattern:
- **Server is the single source of truth**: The frontend is never authoritative. User roles, permissions, vote counts, like counts, and author identities are verified server-side.
- **Shared Domain, Separate Presentation**: Desktop and Mobile UI have tailored presentations in `src/platforms/`, but share 100% of domain features, APIs, validation, and reactive state in `src/features/` and `src/app/store.js`.
- **Strict Layering**:
  `Routes` ➔ `Controllers` ➔ `Validators & Services` ➔ `Repositories` ➔ `Database`

---

## 2. Directory Structure & Responsibilities

```
dragme/
├── index.html                  # Single canonical HTML page
├── style.css                   # Authoritative CSS design system
├── server.js                   # Express application entrypoint
├── db.js                       # Universal PostgreSQL + SQLite WAL database driver
│
├── src/                        # Canonical Frontend Application (ES Modules)
│   ├── main.js                 # Frontend application bootstrap
│   ├── app/                    # Store (pub/sub), router (hash/history), environment config
│   ├── core/                   # Platform detector & event bus
│   ├── api/                    # Typed HTTP client modules (auth, posts, comments, etc.)
│   ├── features/               # Shared domain features (feed, posts, reactions, auth, profile)
│   ├── platforms/              # Device-specific presentation
│   │   ├── desktop/            # Desktop keyboard shortcuts, 3-column layout
│   │   └── mobile/             # Mobile bottom nav dock, drawer, FAB
│   ├── services/               # Client compute (audio synthesizer, avatar resolver, compressor)
│   ├── state/                  # Canonical state barrel re-exporting store
│   ├── utils/                  # DOM escaping, formatting
│   └── constants/              # Categories, reaction maps, room definitions
│
├── backend/                    # Server-Authoritative Backend Subsystems
│   ├── routes/                 # HTTP endpoint definitions & rate limiters
│   ├── controllers/            # HTTP request/response serialization
│   ├── services/               # Core business logic (auth, reactions, posts)
│   ├── repositories/           # Parameterized SQL database operations
│   ├── validators/             # Input schema validators & sanitizers
│   ├── middleware/             # JWT auth & sliding-window rate limiters
│   └── utils/                  # Response formatters, time utils
│
├── services/                   # Backend Infrastructure & Compute Engines
│   ├── storageService.js       # Pluggable Storage Driver (Local / S3 / R2 / GCS)
│   ├── mediaProcessor.js       # Sharp WebP image & video poster processing engine
│   ├── mediaQueue.js           # Asynchronous background worker queue
│   ├── mediaService.js         # Media lifecycle orchestration & deduplication
│   └── mediaDeliveryService.js # CDN URL resolution & caching headers
│
├── config/                     # Configuration constants (media limits, aspect ratios)
├── tests/                      # Automated unit, integration, & media pipeline test suites
├── docs/                       # Architecture, ADRs, database schema, & deployment guides
└── uploads/                    # Local media storage buckets (temp, profile, post, posters)
```

---

## 3. End-to-End Request Lifecycle

### Frontend Interaction Example: Reacting with a Crown
1. User clicks the Crown button on a post card.
2. `src/features/reactions/crownReactionEngine.js` triggers sound effect (`sfx.playCrown()`) and performs optimistic UI update.
3. Call dispatched via `src/api/reactionsApi.js` (`POST /api/posts/:id/react`).
4. Request hits `server.js` ➔ `backend/routes/postRoutes.js` (guarded by `requireAuth`).
5. `backend/controllers/reactionController.js` extracts authenticated user ID from JWT.
6. `backend/services/reactionService.js` calculates new heat percentage and ensures idempotent single-reaction-per-user constraint.
7. `backend/repositories/reactionRepository.js` commits to SQLite/PostgreSQL.
8. Server returns `{ success: true, dragCount, heatPercent, reactionType }`.
9. `src/app/store.js` syncs the state to all active subscribers.

---

## 4. Coding Standards

1. **Never use raw SQL in controllers or frontend code.** Put all database logic in `backend/repositories/`.
2. **Never store binary blobs in the database.** Use `storageService` and store keys/URLs in `media_assets`.
3. **Always sanitize and escape user input.** Use `backend/validators/` on the server and `escapeHtml()` on the frontend.
4. **Always run tests after changes.** Run `npm test` to verify all 52 tests pass before committing.
