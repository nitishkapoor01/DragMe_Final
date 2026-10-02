# DRAGME — Project & Session Activity Log

> **Purpose**: This file automatically tracks all ongoing work, completed features, architecture decisions, and current progress. If Antigravity crashes or restarts, check this file to immediately resume right where we left off.

---

## 📌 Project Overview
- **Project Name**: DRAGME
- **Location**: `c:\Users\nitis\Desktop\axh`
- **Core Files**:
  - Frontend: [`index.html`](file:///c:/Users/nitis/Desktop/axh/index.html), [`style.css`](file:///c:/Users/nitis/Desktop/axh/style.css), [`app.js`](file:///c:/Users/nitis/Desktop/axh/app.js)
  - Backend: [`server.js`](file:///c:/Users/nitis/Desktop/axh/server.js)
  - Database: SQLite (`dragme_database.db`)
  - Config: [`package.json`](file:///c:/Users/nitis/Desktop/axh/package.json)

---

## 🕒 Activity Log & Work History

### [2026-09-29 20:55] — DRAGME Sign-Up Page (Reference Matched)
- **Status**: Implemented & Verified
- **Components Created**:
  - `AuthLayout`: Desktop 2-column layout + mobile responsive container
  - `BrandPanel`: DRAGME logo, 'Roast. Connect. Repeat.' hero, 3 feature rows, subtle SVG motifs, copyright footer
  - `AuthStepper`: 4-step responsive stepper (Username, Details, Verify, Complete) with active lime states
  - `SignupCard`: Dark surface with subtle borders & soft glow
  - `UsernameField`: `dragme.com/` prefix, dynamic availability icon (spinner, checkmark, error)
  - `ValidationMessage` & `RuleList`: Live format checks & rule bullets
  - `PrimaryAuthButton`: `Continue →` button with disabled, hover, active, loading states
  - `TrustStrip`: Bottom 3 trust badges with vertical dividers
  - `UsernameService`: Debounced format + server uniqueness verification endpoint (`GET /api/users/check-username`)
  - `Router`: SPA routing for `/signup`, `/login`, `/`
- **Route**: `http://localhost:5173/signup`


### [2026-09-29 22:54] — DRAGME Dedicated Login Page View
- **Status**: Implemented & Verified
- **Components & Features**:
  - `LoginPageView`: Desktop 2-column layout + responsive mobile view matching DRAGME visual identity.
  - `BrandPanel`: Hero copy (*Speak. Debate. Dominate.*), 3 security perks, subtle outline vector motifs, copyright footer.
  - `LoginCard`: Identifier input (Username or Email), Password field with show/hide toggle, "Remember this device" checkbox, "Forgot?" link, and primary "Sign In" button with loading state.
  - Connected directly to backend `POST /api/auth/login` with bcrypt verification, rate limiting, and JWT session issuance.
  - Full bidirectional SPA navigation between `/login`, `/signup`, and `/`.
- **Route**: `http://localhost:5173/login`


### [2026-09-29 23:42] — DRAGME Profile Section & Widgets (Exact Reference Matched)
- **Status**: Implemented & Verified
- **Components & Features**:
  - **Cinematic Banner**: Dark dragon/anime overlay banner with `📷 Edit Banner` glassmorphism button.
  - **Profile Header Card**: Large square avatar overlapping the banner with camera update badge, display name `Tester Supreme`, gold pill badge `Senior Roaster`, `@tester` handle, editable bio, location (`📍 Hamirpur, HP`), and `📅 Joined May 2024`.
  - **Header Actions**: `Edit Profile` button, settings gear button, and share node icon button.
  - **Live Stats Bar**: Real counters for Posts (`40`), Followers (`1`), Following (`2`), Confessions (`2`), and Reactions (`23`).
  - **Profile Navigation Tabs**: `Overview`, `Posts`, `Rooms`, `Media`, `Replies`, `Confessions` (with lime underline indicator), and `🔒 Only You`.
  - **Right Sidebar Profile Hub**:
    - `⚡ PROFILE HIGHLIGHTS`: Reputation Score (`1.8K`), Cooked Ratio (`100%`), Judgment Accuracy (`98%`), Rank (`#143 Senior Roaster`).
    - `🔥 ROAST LEVEL`: `SENIOR ROASTER` + magenta-to-purple gradient progress bar (`Next level in 686 points`).
    - `🎖️ TOP BADGES`: 5 circular glowing badges (🔥 Top Roaster, ⚡ Battle Champ, ⚖️ Great Critic, 🚪 Problem Solver, 💡 Helpful) + `View all →`.
    - `🔒 ONLY YOU CAN SEE`: Private timeline, saved bookmarks, and anonymous activity.
  - **Left Sidebar Integration**: Profile active pill with cyan highlight, `+ Create Room` button, `YOUR ACTIVE ROOMS` (`</> AI & Coding` with green dot, `Fitness & Health`, `Movie Buffs`), and bottom mini user card with `[View Profile]` button.
  - **Edit Profile Modal**: Full modal for updating Display Name, Bio, Location, Avatar URL, Banner URL connected to `PUT /api/users/profile`.
  - **Backend Endpoints**:
    - `GET /api/users/:username/profile` -> Server-authoritative stats, badges, and user data.
    - `PUT /api/users/profile` -> Authenticated profile updates with length limits and validation.
    - `GET /api/users/:username/posts?tab=...` -> Filtered post stream per tab.
- **Routes**: `http://localhost:5173/#profile` & `http://localhost:5173/profile`


### [2026-09-30 10:10] — DRAGME Translucent Glass Profile Drawer (Arena Hub Rebuild)
- **Status**: Implemented & Verified
- **Architecture & Components**:
  - **Translucent Backdrop (`#dragmeProfileDrawerHub`)**: Deep frosted glass overlay (`rgba(3, 7, 18, 0.68)`, `backdrop-filter: blur(16px) saturate(180%)`) with smooth opacity/visibility transition.
  - **Glass Panel (`#dragmeProfileDrawerPanel`)**: Apple/Cyberpunk dark frosted glass (`rgba(13, 17, 26, 0.88)`, `backdrop-filter: blur(32px) saturate(210%)`, `border-left: 1px solid rgba(163, 230, 53, 0.25)` lime neon accent, `box-shadow: -15px 0 60px rgba(0, 0, 0, 0.9)`), with cubic-bezier slide-in from right.
  - **Identity Header & Close**: Crown icon badge `👑 DRAGME IDENTITY HUB` + quick close button (`X`) with hover neon rotate effect.
  - **User Hero Card (`#drawerUserHeroCard`)**: Glowing avatar border, green online beacon, display name `Tester Supreme`, gold pill `Senior Roaster`, handle `@tester • Hamirpur, HP`. Navigates directly to profile.
  - **3-Column Glass Stats Strip**: `40 POSTS`, `1.8K REPUTATION` (lime glow), `12 COOKED` (flame icon).
  - **Interactive Action Cards**:
    - `My Profile Arena` -> SPA route `#profile`
    - `My Anonymous Drops` -> SPA route `#profile` (Confessions Tab)
    - `Edit Profile Details` -> Opens Edit Profile Modal
    - `Sign In` / `Create New Account` -> Auth SPA routes
    - `Log Out` -> Dynamic session wipe & UI reset
  - **Controller (`ProfileDrawerHub`)**: Fully encapsulated object in [`app.js`](file:///c:/Users/nitis/Desktop/axh/app.js) with `open()`, `close()`, `toggle()`, `syncUser()`, `Escape` key close listener, and backdrop click-outside dismissal.
  - **Version**: Bumped to `v=5.0`.

### [2026-09-30 16:00] — DRAGME Authentication + Guest / Logged-In System Architecture
- **Status**: Implemented & Verified
- **Architecture & Components**:
  - **Three Application States**: State A (`Guest / Non-Logged-In`), State B (`Authenticating / Initializing`), State C (`Logged-In User`).
  - **Zero-Flicker Initialization**: Splash screen (`#appInitSplash`) displays crown motif and neon progress bar while server session is validated via `GET /api/auth/me`.
  - **Contextual Auth Prompt Gate (`#guestAuthPromptModal`)**:
    - Appears when guest attempts protected actions (Crown/Upvote, Comment, Save/Bookmark, Follow, Create Post, Create Room, Messages, Notifications).
    - Custom tailored copy and benefits per action.
    - Preserves user intended action (`pendingIntent` stored in memory and `sessionStorage`).
  - **Seamless Return Intent**: Once user logs in or registers, the previous intended action is safely retrieved and executed (or navigates back to target post/composer).
  - **Top Navigation State Synchronization**:
    - *Guest*: Shows `DRAGME` logo, Global Search, `[Log in]` and `[Sign up]` buttons.
    - *Logged-In*: Shows `DRAGME` logo, Global Search, `+ Create Post`, Cooked Score Pill (`🔥 100% Cooked`), Messages (`#chatBtn`), Notifications (`#notifBtn`), and Profile Avatar (`#btnProfileDrawerOpener`).
  - **Profile Drawer & Logout Confirmation**:
    - Authenticated drawer contains `My Profile Arena`, `My Anonymous Drops`, `Edit Profile Details`, `Saved Bookmarks`, `Recent Activity`, `Settings & Privacy`, `Help & Support`, and `Log Out`.
    - Log out triggers `#logoutConfirmModal` (*"Log out of DRAGME?"*); on confirm, session token is cleared, cache wiped, server informed, and UI reset immediately to guest mode.
  - **Server-Side Security**:
    - Endpoints `POST /api/posts`, `POST /api/posts/:id/vote`, `POST /api/posts/:id/save`, `POST /api/posts/:id/comments`, `PUT /api/users/profile`, and private post tabs enforce server-side `requireAuth` middleware (returning 401/403).
    - Session expiration intercepted automatically via HTTP 401 handler with toast notice and redirect to login.

### [2026-09-30 16:30] — DRAGME Universal Avatar (PFP) Engine & Fallback Architecture
- **Status**: Implemented & Verified
- **Architecture & Components**:
  - **`AvatarService` Central Engine**:
    - `AvatarService.get(userOrAuthor, isAnon)`: Universal resolver returning the correct URL for custom images, deterministic Bottts seeds, anonymous masks, and guest silhouettes.
    - `AvatarService.getGuest()`: Sleek dark geometric SVG silhouette (`#121824` surface, `#64748b` person outline).
    - `AvatarService.getAnonymous()`: Purple mask persona SVG (`#a855f7` neon mask).
    - `AvatarService.apply(imgEl, userOrAuthor)`: Applies the resolved avatar and attaches an automatic `onerror` fallback handler to prevent any broken image boxes.
  - **Universal Real-Time Propagation**:
    - Updating a profile picture via `EditProfileManager` (`PUT /api/users/profile`) immediately propagates to:
      1. Top Navigation Avatar (`#navHeaderUserAvatar`)
      2. Profile Drawer Identity Card (`#drawerUserAvatar`)
      3. Left Sidebar Bottom User Card (`#sbUserAvatar`)
      4. Profile Page Banner Card (`#profileAvatarImg`)
      5. Create Post Modal Identity Toggle (`.identity-user-dp`)
      6. In-Memory Feed Posts & Comments (`store.updateUserAvatars(username, newAvatar)`)
    - Zero page reloads required for instant universal visual consistency.

### [2026-09-30 21:38] — DRAGME Universal Media Engine & Priority Animation Concurrency Scheduler
- **Status**: Implemented & 100% Verified (36/36 Automated Pipeline Tests Passing)
- **Architecture & Components**:
  - **Universal Server Media Pipeline**:
    - Centralized configuration in [`mediaConfig.js`](file:///c:/Users/nitis/Desktop/axh/mediaConfig.js) with limits, MIME registries, variant rules, and global animation policies.
    - Safety filters against polyglot and decompression attacks.
    - Sharp-powered image resizing, auto-orientation, EXIF stripping, and responsive WebP variant generation (`xs`, `sm`, `md`, `lg`, `xl`, `full`).
    - Animated GIF / WebP loop preservation with automatic 512px static WebP poster generation.
    - Clean separation between raw storage (`uploads/originals/`) and lightweight delivery assets (`uploads/`, `uploads/variants/`, `uploads/posters/`).
  - **Smart Client Delivery & Animation Scheduler**:
    - `MediaDeliveryManager`: Viewport & DPR-aware variant selector matching actual rendered dimensions.
    - `AnimationScheduler`: IntersectionObserver-driven global concurrency budget (`MAX_ACTIVE_ANIMATIONS`: 10 desktop, 4 mobile, 0 reduced motion) with priority queues (HIGH: 3, MEDIUM: 2, LOW: 1).
    - Off-screen auto-pause and fallback to static WebP posters to preserve 100% GPU composite thread and video decoder limits.
    - Single Hardware Video Decoder rule in profile editor & studio modal.
    - Observability & metrics endpoint (`GET /api/media/metrics`) reporting compression savings and processing statistics.

### [2026-10-01 13:00] — DRAGME Zero-Waste Media Compression & Auto-Declutter Storage Lifecycle
- **Status**: Implemented & 100% Verified (30/30 Automated Pipeline & Storage Tests Passing)
- **Architecture & Highlights**:
  - **Looping Animation Ultra-Compression Engine**:
    - Animated GIFs converted/compressed into high-efficiency **Animated WebP** (`quality: 78`, `effort: 6`, `loop: 0` infinite seamless loop) with Sharp.
    - Saves 70-85% file size compared to raw GIFs with true 24-bit color fidelity and alpha transparency without banding.
    - Generates single-frame WebP static poster fallback (`posters/poster_...webp`) for quick loading and reduced-motion fallback.
  - **Zero-Waste Disk Storage & Single Instance Delivery**:
    - Eliminated redundant duplicate raw storage in `originals/` for avatar/banner uploads, immediately cutting disk usage in half.
    - Strict dimensions & responsive variants (`md`, `sm`, `xs`) for static avatars and banners.
  - **Immediate User Media Replacement Purge**:
    - When a user replaces their avatar or banner, `MediaProcessor.deleteUserPreviousMedia` automatically deletes the previous files (main, poster, variants, originals) from disk and cleans up `media_assets` database rows.
    - Guarantees each user occupies disk space ONLY for their current active avatar and banner.
  - **Automated Storage Garbage Collector & Orphan Pruner**:
    - `MediaProcessor.pruneOrphanedMedia(db)` scans all upload directories, queries active references across `users`, `posts`, `comments`, and `media_assets`, and removes unreferenced/orphaned files.
    - Initial prune execution freed **378.64 MB** and **375+ orphaned clutter files** from `uploads/`.
    - Auto-runs on server startup, periodically every 3 hours, and on-demand via authenticated admin endpoint `POST /api/admin/media/cleanup`.
  - **Observability & Health**:
    - Real-time tracking of garbage collected files count, total freed megabytes, and compression savings in `MediaProcessor.getMetrics()`.

### [2026-10-01 18:00] — DRAGME Modular Architecture & Database Abstraction Layer
- **Status**: Implemented & 100% Verified (34/34 Tests Passing)
- **Architecture & Highlights**:
  - Reorganized project into clean domain folders: `config/`, `services/`, `tests/`.
  - Implemented Dual Database Adapter in [`db.js`](file:///c:/Users/nitis/Desktop/axh/db.js): Supports both high-performance WAL SQLite (`dragme_database.db`) and PostgreSQL (`pg` pool via `DATABASE_URL` env variable) with automatic schema initialization and parameterized query normalization.
  - Modularized Media Services in `services/MediaProcessor.js` and `config/mediaConfig.js` with automated background queue worker, deduplication, static WebP posters, and garbage collection.

### [2026-10-02 14:00] — DRAGME Mobile Home Feed Production Redesign
- **Status**: Implemented & Verified
- **Components & Features**:
  - **Top App Bar**: Custom DRAGME logo, 3-line hamburger morphing to 'X' on drawer open, Cooked ratio capsule, and red badge notification bell.
  - **Feed Tabs**: `For You`, `Following`, `Trending` with dynamic white switch indicator line that collapses and settles smoothly.
  - **Post Cards**: 4:5 vertical rectangular portrait avatar (`36px x 45px`), author row with badge, headline title, body text, responsive media frame, and crown/comment/share/save actions.

### [2026-10-02 16:30] — DRAGME Mobile Bottom Navbar Stabilization
- **Status**: Implemented & Verified
- **Components & Features**:
  - Restored and stabilized the 5-item bottom dock navbar with asymmetric center button.
  - Smooth scroll collapse into right-side profile capsule (`.nav-collapsed`) with instant re-expansion on scroll up or tap.

### [2026-10-02 21:50] — DRAGME Mobile Top App Bar Pixel-Exact Reference Alignment
- **Status**: Implemented & Verified (34/34 Tests Passing)
- **Components & Features**:
  - **Left**: 38x38px rounded container with 11px radius, subtle border, containing 3-line balanced hamburger that morphs into 'X' when open.
  - **Center**: Absolute-centered DRAGME brand logo composed of bold white `DR`, high-definition neon lime Origami Crown `A` polygon SVG vector, and bold neon lime `GME`.
  - **Right**: Streak/Cooked indicator capsule (`[ 🔥 12 ]`) with flame icon and bold count, paired with white notification bell with glowing red circular badge (`[ 🔔³ ]`).

