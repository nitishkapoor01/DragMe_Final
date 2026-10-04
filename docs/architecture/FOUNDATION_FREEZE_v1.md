# DRAGME — FOUNDATION v1 ARCHITECTURAL CONTRACT & GOVERNANCE SPECIFICATION

**Status:** ACTIVE & FROZEN (DRAGME FOUNDATION v1)  
**Effective Date:** 2026-10-03  
**Official Regression Baseline:** `57 Passed | 0 Failed (100% Green)`  
**Applicability:** Mandatory for all future feature development, pull requests, and modifications across the entire DRAGME codebase.

---

## 1. Core Architectural Paradigm: Clean Modular Monolith

DRAGME is strictly architected as a **Server-Authoritative Clean Modular Monolith** with clear infrastructure boundaries.

```
                                  DRAGME CORE (Domain Logic)
                                              │
                         ┌────────────────────┴────────────────────┐
                         │                                         │
                platforms/desktop/                        platforms/mobile/
                (3-column arena grid,                     (bottom dock nav,
                 header search '/' hotkey,                 hamburger morph drawer,
                 user dropdown menu)                       floating create FAB)
                         │                                         │
                         └────────────────────┬────────────────────┘
                                              │
                                          SAME API
                                              │
                                        SAME BACKEND
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        │                     │                     │
                    PostgreSQL              Cloud              Cloudflare R2
                 Connection Pool            Redis               (CDN Media)
                    (pg.Pool)             (Future)               (Storage)
```

- **Single Process Monolith:** Do NOT prematurely split domains into microservices.
- **Portability Invariant:** The codebase MUST run with zero external dependencies locally (built-in SQLite WAL) and scale horizontally to cloud PostgreSQL by configuring `DATABASE_URL`.
- **Stateless Backend:** Authentication is stateless JWT (`authMiddleware.js`). Any server instance can authenticate any request.

---

## 2. Canonical Frontend Rules (`src/`)

### 1. Canonical Entrypoint
- **Single Runtime Entrypoint:** [`index.html`](file:///c:/Users/nitis/Desktop/axh/index.html) ➔ [`src/main.js`](file:///c:/Users/nitis/Desktop/axh/src/main.js).
- **Rule:** Never create parallel frontend bootstrap files or monolithic fallback scripts (e.g. `app.js` is permanently retired).

### 2. Single Active CSS Source of Truth
- **Authoritative Stylesheet:** [`style.css`](file:///c:/Users/nitis/Desktop/axh/style.css).
- **Rule:** All design tokens, reset rules, Apple-style spring animations, responsive viewports, and component classes are maintained in `style.css`. Never create fragmented stylesheet folders (e.g. `styles/` or `components/*.css`) that duplicate active CSS classes.

### 3. Feature & Module Boundaries (`src/features/`)
- All user-facing feature functionality is encapsulated into domain packages:
  - [`src/features/auth/`](file:///c:/Users/nitis/Desktop/axh/src/features/auth/) (login, signup, session checking, auth prompts)
  - [`src/features/feed/`](file:///c:/Users/nitis/Desktop/axh/src/features/feed/) (feed tabs, card rendering, stream management)
  - [`src/features/posts/`](file:///c:/Users/nitis/Desktop/axh/src/features/posts/) (post creation modal, liquid identity pill)
  - [`src/features/comments/`](file:///c:/Users/nitis/Desktop/axh/src/features/comments/) (discussion sheet, optimistic replies)
  - [`src/features/reactions/`](file:///c:/Users/nitis/Desktop/axh/src/features/reactions/) (crown reaction engine, who-reacted modal)
  - [`src/features/profile/`](file:///c:/Users/nitis/Desktop/axh/src/features/profile/) (profile manager, edit modal, media studio)
  - [`src/features/navigation/`](file:///c:/Users/nitis/Desktop/axh/src/features/navigation/) (navbar, sidebar, bottom navigation)
  - [`src/features/toast/`](file:///c:/Users/nitis/Desktop/axh/src/features/toast/) (notification toasts)
- **Rule:** Features must import their dependencies explicitly and must NOT write directly to window globals.

### 4. State Management Rules (`src/state/` & `src/app/store.js`)
- Single reactive store in [`src/app/store.js`](file:///c:/Users/nitis/Desktop/axh/src/app/store.js) exported via [`src/state/index.js`](file:///c:/Users/nitis/Desktop/axh/src/state/index.js).
- State transitions publish events via pub/sub (`store.subscribe()`).
- **Rule:** Never store application state in ad-hoc global variables or unmanaged DOM attributes.

### 5. API Client Layer Rules (`src/api/`)
- All backend communication is routed through typed modules in [`src/api/`](file:///c:/Users/nitis/Desktop/axh/src/api/) using [`src/api/apiClient.js`](file:///c:/Users/nitis/Desktop/axh/src/api/apiClient.js).
- **Rule:** Never call `fetch()` directly inside UI components or templates. All HTTP calls must go through `src/api/`.

### 6. Desktop vs. Mobile Separation Rules (`src/platforms/`)
- **Shared:** 100% of domain logic, state, validation, sound effects, and API integrations are shared.
- **Separate Presentation:**
  - Desktop-specific UI logic (3-column arena, `/` keyboard shortcut, header dropdown) belongs in [`src/platforms/desktop/`](file:///c:/Users/nitis/Desktop/axh/src/platforms/desktop/).
  - Mobile-specific UI logic (bottom navigation dock, 3-line morphing drawer, floating create FAB) belongs in [`src/platforms/mobile/`](file:///c:/Users/nitis/Desktop/axh/src/platforms/mobile/).
- **Rule:** Never duplicate business logic or API calls between desktop and mobile.

### 7. Window & Global Dependencies Policy
- Direct internal module communication must use ES imports or [`src/core/eventBus.js`](file:///c:/Users/nitis/Desktop/axh/src/core/eventBus.js).
- `window.*` globals in [`src/main.js`](file:///c:/Users/nitis/Desktop/axh/src/main.js) exist strictly as backward-compatible bridges for inline HTML attributes and browser console inspection.
- **Rule:** Do NOT add new unmanaged window globals.

---

## 3. Server-Authoritative Backend Rules (`backend/`)

### 1. Strict Layering Order
Every HTTP request must traverse layers in strict unidirectional order:
```
Routes ──► Middleware ──► Controllers ──► Validators ──► Services ──► Repositories ──► Database
```
- **`backend/routes/`**: Path declarations, attaching rate limiters and auth middleware.
- **`backend/middleware/`**: Cross-cutting concerns (JWT verification, sliding-window rate limiters).
- **`backend/controllers/`**: HTTP transport concerns only (parsing `req.body`/`params`/`query`, status codes).
- **`backend/validators/`**: Input schema validation and sanitization.
- **`backend/services/`**: Pure domain business logic, anonymous masking, and reaction rules.
- **`backend/repositories/`**: Parameterized SQL persistence.
- **`db.js`**: Dual-engine database adapter.

### 2. No Bypassing of Backend Layers
- **Rule:** Controllers must NEVER execute raw SQL or bypass the service/repository layers.
- **Rule:** Application logic must NEVER trust client-provided user IDs, roles, or vote counters.

### 3. Database & SQL Rules
- All SQL statements must be prepared and parameterized (`?` translated to `$1, $2`).
- String literals in SQL must use standard single quotes (`'READY'`), never double quotes.
- Composite indexes must accompany all high-throughput queries (`idx_posts_heat_created`, `idx_posts_room_created`, `idx_comments_post_created`, `idx_media_content_hash`).

### 4. Storage Abstraction Rules (`services/storageService.js`)
- All media uploads must use [`services/storageService.js`](file:///c:/Users/nitis/Desktop/axh/services/storageService.js).
- **Rule:** Never store raw binary files in PostgreSQL or SQLite. The database stores metadata and storage keys only in `media_assets`.

### 5. Authentication & Anonymous Privacy Invariants
- User identity is derived strictly from verified JWT payloads (`req.user.id`).
- When a post or comment is authored in anonymous mode (`is_anonymous = 1`), author identity is masked server-side before returning HTTP payloads to clients.

---

## 4. Known Future Scale Work (NOT Current Defects)

The following two items are verified, functional in single-instance and local development, and documented for future multi-instance horizontal scaling:

1. **In-Memory Rate Limiter (`backend/middleware/rateLimiter.js`)**:
   - *Current State:* Uses in-memory sliding-window maps with periodic auto-GC. Works out-of-the-box for single-instance deployments.
   - *Future Scale Work:* When scaling horizontally across multiple cloud instances behind a load balancer, connect an optional Redis store adapter when `REDIS_URL` is configured.
2. **In-Memory Media Queue (`services/mediaQueue.js`)**:
   - *Current State:* Uses an in-process EventEmitter worker queue with concurrency of 4. Decouples heavy Sharp WebP and video poster processing from the HTTP loop.
   - *Future Scale Work:* When scaling to a distributed multi-worker cluster, connect an optional Redis/BullMQ or AWS SQS worker queue driver when `REDIS_URL` is configured.

---

## 5. Anti-Duplication & Quality Rules

1. **No Duplicate Architectures:** Never create parallel state managers, second API client libraries, second auth systems, or duplicate CSS files.
2. **No Mocks in Production Code:** All production UI must connect to real backend endpoints.
3. **Continuous Regression Testing:** All changes must maintain 100% pass rate on `npm test` across all 57 automated test cases:
   - `tests/test-media-pipeline.js` (34 tests)
   - `tests/test-api-suite.js` (18 tests)
   - `tests/test-crown-reaction.js` (5 tests)

---

## 6. Declaration of DRAGME FOUNDATION v1

With the completion of Phase 1 Cleanup and the verification of all architectural boundaries, **DRAGME FOUNDATION v1 is hereby officially FROZEN**.

The codebase is declared clean, modular, portable, maintainable, and ready to enter the normal product feature-development phase.
