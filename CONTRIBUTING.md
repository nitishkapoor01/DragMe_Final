# Contributing to DRAGME — Permanent Engineering Contract

**Architecture Standard:** DRAGME FOUNDATION v1 (FROZEN)  
**Governance Document:** [`docs/architecture/FOUNDATION_FREEZE_v1.md`](docs/architecture/FOUNDATION_FREEZE_v1.md)  
**Official Test Baseline:** `57 Passed | 0 Failed (100% Green)`

All contributions, future features, fixes, and modifications to DRAGME must adhere strictly to this permanent engineering contract.

---

## 🛡️ Locked Foundation v1 Architecture Rules

### 1. Canonical Frontend Architecture (`src/`)
- **Single Runtime Entrypoint:** [`index.html`](index.html) ➔ [`src/main.js`](src/main.js). Never create parallel root scripts or fallback files.
- **Single Active CSS Source of Truth:** [`style.css`](style.css). Never create fragmented stylesheet directories that duplicate active classes.
- **Domain Feature Encapsulation:** All features live inside [`src/features/`](src/features/) (`auth`, `feed`, `posts`, `comments`, `reactions`, `profile`, `navigation`, `toast`).
- **Reactive State:** Use the centralized reactive store in [`src/app/store.js`](src/app/store.js) exported via [`src/state/index.js`](src/state/index.js).
- **API Client Layer:** All HTTP calls must go through [`src/api/`](src/api/) using [`src/api/apiClient.js`](src/api/apiClient.js). Never call `fetch()` directly in UI components.
- **Desktop vs. Mobile Separation:**
  - Shared domain logic, state, and APIs in `src/features/`, `src/api/`, `src/state/`.
  - Desktop-specific presentation in [`src/platforms/desktop/`](src/platforms/desktop/) (3-column arena, `/` shortcut).
  - Mobile-specific presentation in [`src/platforms/mobile/`](src/platforms/mobile/) (bottom dock nav, drawer, FAB).
  - Never duplicate business logic between platforms.

### 2. Server-Authoritative Backend (`backend/`)
- **Strict Layering:** `Routes` ➔ `Middleware` ➔ `Controllers` ➔ `Validators` ➔ `Services` ➔ `Repositories` ➔ `db.js`.
- **Controllers** handle HTTP transport only.
- **Services** enforce permissions, reaction logic, and server-side anonymous masking.
- **Repositories** handle database persistence with 100% parameterized SQL. Never write raw SQL in controllers or services.
- **Stateless Auth:** Stateless JWT tokens (`backend/middleware/authMiddleware.js`).
- **Storage Driver:** Use [`services/storageService.js`](services/storageService.js) for uploads. Never store binary files in SQL.

### 3. Anti-Duplication & Quality Rules
- **No Duplicate Systems:** Never create parallel auth, state, or styling systems.
- **No Fake Mocks:** All production UI must connect to real server endpoints.
- **Mandatory Test Verification:** Every pull request must pass the 57-test automated suite:
  ```bash
  npm test
  ```

---

## ⏳ Known Future Scale Work (NOT Current Defects)

1. **In-Memory Rate Limiter (`backend/middleware/rateLimiter.js`):** Functional for single-instance; connect optional Redis store adapter when `REDIS_URL` is set for multi-instance cloud scaling.
2. **In-Memory Media Queue (`services/mediaQueue.js`):** Functional for single-instance; connect optional Redis/BullMQ worker queue adapter when `REDIS_URL` is set for multi-worker scaling.

---

## 🛠️ Contribution Workflow

1. **Branch:** Create a descriptive branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Implement:** Follow the [Developer Guide](docs/development/DEVELOPER_GUIDE.md) and [Foundation Freeze Spec](docs/architecture/FOUNDATION_FREEZE_v1.md).
3. **Verify:** Run tests:
   ```bash
   npm test
   ```
   All 57 tests must pass with 0 failures.
4. **Submit PR:** Reference the affected domain in `src/features/` or `backend/`.
