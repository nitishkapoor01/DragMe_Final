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









