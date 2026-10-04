# DRAGME — Phase 1: Safe Architecture Stabilization & Migration Plan

## Baseline Audit & Verification

| Subsystem / Flow | Test Verification | Baseline Status | Notes |
| :--- | :--- | :---: | :--- |
| **Media Processing Pipeline** | `tests/test-media-pipeline.js` (34 tests) | ✅ PASS (34/34) | 4:5 PFP, 3:1 Banner, animated loops, posters, SHA-256 deduplication, queue worker, garbage collector. |
| **API Contract Suite** | `tests/test-api-suite.js` (18 tests) | ✅ PASS (18/18) | Auth me/register/login, username check, feed, roasts, anonymous mask, comments, crown reactions, bookmarks, profiles, rooms. |
| **Crown Reaction Verification** | `tests/test-crown-reaction.js` | ✅ PASS | Single tap toggle, Super Crown upgrade, Who Reacted modal. |
| **JS Syntax & Parsing** | 98 JavaScript files across repository | ✅ PASS (98/98) | Strict syntax validation passed with 0 syntax errors. |
| **Database Engines** | `db.js` (SQLite WAL / PostgreSQL pool) | ✅ PASS | Schema tables verified: `users`, `posts`, `post_votes`, `comments`, `saved_posts`, `media_assets`. |

---

## 1. app.js Responsibility to Target Module Map

| # | Responsibility in `app.js` (Lines) | Current Dependencies | Target Module / File | Reusable Components / Assets | Duplicate Implementation to Deprecate | Functionality Remaining Untouched | Tests Verifying |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Universal Avatar & Identity Resolver** (`AvatarService`, SVG constants, lines 1–144) | DOM `<img>`/`<video>`, `AnimationScheduler` | `src/services/avatarService.js` | `GUEST_SILHOUETTE_SVG`, `ANONYMOUS_MASK_SVG`, Dicebear API | Inline SVG literals in HTML strings | Automatic video avatar replacement, active source caching, guest/mask fallback | `tests/test-api-suite.js` (Test Group 3) |
| **2** | **Animation Scheduler & Viewport Delivery** (`AnimationScheduler`, `MediaDeliveryManager`, lines 145–354) | Browser `IntersectionObserver`, `requestAnimationFrame` | `src/services/animationScheduler.js` | Priority constants (`HIGH`, `MEDIUM`, `LOW`, `BACKGROUND`) | Ad-hoc intersection listeners in feed | Concurrency throttling, offscreen video pause/play, frame budget control | `tests/test-media-pipeline.js` (Test 3 & 4) |
| **3** | **Client Media Preview Engine** (`MediaPreviewEngine`, lines 355–501) | Browser `createImageBitmap`, Canvas, Blob URLs | `src/services/mediaPreviewEngine.js` | URL revocations & canvas reuse pool | Legacy FileReader base64 loaders | Instant thumbnail generation, video poster frame grabber | `tests/test-media-pipeline.js` (Test 7) |
| **4** | **Static Presets & Constants** (`SEED_POSTS`, `ROOMS_DATA`, lines 502–616) | None | `src/constants/` (`seedPosts.js`, `rooms.js`, `categories.js`, `reactions.js`) | Room definitions, icons, categories | Hardcoded JSON objects across files | Room metadata, category pills, reaction icon map | `tests/test-api-suite.js` (Test Group 7) |
| **5** | **Client Pre-Upload Compressor** (`ClientMediaCompressor`, lines 623–822) | Canvas 2D, Blob, Sharp/WebP specs | `src/services/clientMediaCompressor.js` | Target aspect ratios (4:5, 3:1, 16:9) | Uncompressed raw uploads | Client-side WebP compression, downscaling, duration check | `tests/test-media-pipeline.js` (Test 1 & 2) |
| **6** | **Auth API Client** (`AuthAPI`, lines 823–920) | `localStorage` (`dragme_jwt_token`), `fetch` | `src/api/authApi.js` & `src/api/apiClient.js` | Centralized fetch wrapper with JWT header & error handler | Loose `fetch('/api/auth/...')` in multiple places | Token storage, session check (`/api/auth/me`), login, register | `tests/test-api-suite.js` (Test Group 1 & 2) |
| **7** | **Auth State Manager** (`AuthManager`, lines 926–1053) | `AuthAPI`, `store.js`, `sfxService.js`, DOM elements | `src/features/auth/authManager.js` | Store state listener (`subscribe`) | Scattered `currentUser` variables | State A (Guest), State B (Initializing), State C (Logged-in), return intent | `tests/test-api-suite.js` (Test Group 2) |
| **8** | **Feed & Core Arena Engine** (`DragMeEngine`, lines 1054–1313) | `postsApi.js`, DOM `#postsStream`, `AnimationScheduler` | `src/features/feed/feedManager.js` | Continuous dark surface post card template, 1px divider layout | Mock post generator | Paginated feed query, infinite scroll, heat level calculations, room filtering | `tests/test-api-suite.js` (Test Group 3) |
| **9** | **Web Audio Synthesizer** (`SoundFXEngine`, `SFXEngine`, lines 1314–1918) | Browser `AudioContext` | `src/services/sfxService.js` | Synthesized sound frequencies (sine, triangle, square) | Audio file downloads | Tap, crown upvote, super crown upgrade fanfare, liquid morph acoustic cues | Browser manual audit |
| **10** | **Liquid Identity Pill** (`LiquidIdentityPill`, lines 1920–2060) | Spring physics, `sfxService.js`, DOM `#liquidIdentityPill` | `src/features/posts/liquidIdentityPill.js` | Bezier spring animations | Basic checkbox toggle | Smooth morph between public handle and masked persona | `tests/test-api-suite.js` (Test Group 3) |
| **11** | **Create Post Modal** (`CreatePostModal`, lines 2064–2586) | `postsApi.js`, `clientMediaCompressor.js`, `sfxService.js` | `src/features/posts/createPostModal.js` | Modal layout & backdrop | Inline script form submissions | Multi-type composer, media attachment, anonymous toggle, form validation | `tests/test-api-suite.js` (Test Group 3) |
| **12** | **Mobile Bottom Dock & Nav** (`MobileCreateSystem`, lines 2590–3159) | `router.js`, `store.js`, DOM `#mobileBottomNav` | `src/features/navigation/bottomNav.js` | Style 6 Asymmetric Geometric dock capsule | Static tab bars | Spring dock collapse on scroll, center create morph, active indicator | Browser UI verification |
| **13** | **Feed Tabs Controller** (`FeedTabsController`, lines 3163–3470) | `feedManager.js`, `store.js` | `src/features/feed/feedTabsController.js` | Tab pill buttons (`#tabForYou`, `#tabRoasts`, etc.) | Ad-hoc tab listeners | Smooth sliding lime indicator, tab state synchronization | `tests/test-api-suite.js` (Test Group 3) |
| **14** | **Crown Reaction Engine** (`CrownReactionEngine`, lines 3471–4034) | `reactionsApi.js`, `sfxService.js`, `WhoReactedModal` | `src/features/reactions/crownReactionEngine.js` & `whoReactedModal.js` | Particle burst canvas & wheel elements | Basic like counter increment | Single tap crown toggle, hold for super reaction wheel, atomic server vote | `tests/test-api-suite.js` (Test Group 5) & `tests/test-crown-reaction.js` |
| **15** | **Contextual Auth Gate & Logout** (`AuthPromptManager`, `LogoutManager`, lines 4038–4118) | `store.js`, `router.js`, DOM `#guestAuthPromptModal` | `src/features/auth/authPromptManager.js` & `logoutManager.js` | Gate modal dialog & action copy map | Hard page redirects | Pending action preservation, zero-flicker gate, session termination | `tests/test-api-suite.js` (Test Group 2) |
| **16** | **Glass Profile Drawer** (`ProfileDrawerHub`, lines 4122–4428) | `authManager.js`, `router.js`, DOM `#dragmeProfileDrawerHub` | `src/features/profile/profileManager.js` & `navigation/navbar.js` | Translucent frosted glass panel (`backdrop-filter`) | Generic sidebar links | User hero card, reputation counters, quick actions | `tests/test-api-suite.js` (Test Group 7) |
| **17** | **Registration Wizard & Username Availability** (`UsernameService`, lines 4429–4980) | `authApi.js`, DOM `#signupPageView` | `src/features/auth/signupManager.js` | 4-step responsive stepper | Basic browser form submit | Debounced username verification, strength indicator, step navigation | `tests/test-api-suite.js` (Test Group 1 & 2) |
| **18** | **Profile Arena & Edit Profile** (`ProfileManager`, `EditProfileManager`, lines 4981–5330) | `profilesApi.js`, `authManager.js`, DOM `#profileViewContainer` | `src/features/profile/profileManager.js` & `editProfileManager.js` | Profile banner, stats bar, top badges | Fragmented user views | User overview, posts stream, reputation badge progression, profile update | `tests/test-api-suite.js` (Test Group 7) |
| **19** | **Universal Media Studio** (`MediaStudioManager`, lines 5331–7053) | Canvas 2D, `mediaApi.js`, PointerEvents | `src/features/profile/mediaStudioManager.js` | Dual crop guides (4:5 PFP, 3:1 Banner) | Static uncropped image upload | Pinch-to-zoom, pan, rotation, live aspect-ratio grid, video trim | `tests/test-media-pipeline.js` (Test 1 & 2) |
| **20** | **App Bootstrap & Global Lifecycle** (lines 7054–7600) | All feature controllers & services | `src/main.js` | `DragmeApplication` class | Script-tag DOMContentLoaded event listeners | Global error boundary, window object bridges, route initializers | End-to-End Suite |

---

## 2. Dependency Graph & Circular Dependency Prevention

```
                    [src/constants/*]
                           │
                           ▼
                    [src/utils/*]
                           │
                           ▼
                 [src/services/*] ◄──── [src/app/config.js]
                  (avatar, sfx,           │
                   scheduler,             ▼
                   compression)     [src/app/store.js]
                           │              │
                           ▼              ▼
                    [src/api/*] ◄─── [src/app/router.js]
                     (apiClient,
                      domain APIs)
                           │
                           ▼
                   [src/features/*]
                 (auth, feed, posts,
                  comments, reactions,
                  profile, navigation)
                           │
                           ▼
                     [src/main.js]
```

### Invariants:
1. **`src/services/`** NEVER import from `src/features/` or `src/app/router.js`.
2. **`src/api/`** only depends on `src/app/config.js` and `src/api/apiClient.js`.
3. **`src/features/`** import from `src/api/`, `src/services/`, `src/app/store.js`, `src/app/router.js`, and `src/utils/`.
4. **`src/main.js`** is the leaf orchestrator importing domain features and initializing them in strict dependency order.
5. **Global Window Bridges**: `window.DRAGME_APP`, `window.DRAGME_STORE`, `window.sfx`, `window.AvatarService`, `window.AuthManager`, `window.CreatePostModal` are bound in `src/main.js` to ensure any legacy HTML `onclick` attributes or inline scripts continue working with zero breaking changes.

---

## 3. Behavior & Regression Risks and Mitigations

| Risk | Mitigation |
| :--- | :--- |
| **Loss of inline DOM handlers (e.g. `onclick="openCommentsDrawer(id)"`)** | `src/main.js` explicitly re-binds global helpers (`window.openCommentsDrawer`, `window.renderFeed`, `window.showToast`) to the corresponding feature instances. |
| **Dual bootstrap collision** | `index.html` loads `<script type="module" src="src/main.js"></script>`. Root `app.js` is preserved as a fallback/reference and NOT simultaneously loaded as a script tag in `index.html`. |
| **CSS style collision** | Existing `style.css` contains all visual classes; structured files in `styles/` define reusable design tokens (`variables.css`), reset (`reset.css`), base typography (`base.css`), and responsive breakpoints (`responsive.css`) without overwriting active CSS class names. |
| **Database connection loss** | `db.js` dual-engine abstraction maintains identical SQLite WAL and PostgreSQL pool query signatures across all repository modules. |
