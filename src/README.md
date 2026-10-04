# DRAGME Frontend Architecture (`src/`)

This directory contains the canonical client-side application for DRAGME, built using standard ES Modules and Vanilla CSS.

---

## Structure & Responsibilities

```
src/
├── main.js                 # Canonical entrypoint bootstrapped by index.html
├── app/                    # Application kernel
│   ├── config.js           # Environment & client runtime settings
│   ├── router.js           # Client-side hash/history SPA router
│   └── store.js            # Central reactive pub/sub state manager
├── core/                   # Platform detection & decoupled event bus
│   ├── platform.js         # Viewport/device breakpoint detector
│   ├── eventBus.js         # Decoupled typed event emitter
│   └── index.js            # Core barrel export
├── state/                  # Canonical state access point
│   └── index.js            # Re-exports reactive store instance
├── api/                    # Typed backend API client modules
│   ├── apiClient.js        # Base fetch client with JWT injection & error handling
│   ├── authApi.js          # Authentication & session endpoints
│   ├── postsApi.js         # Posts, feeds, and bookmark endpoints
│   ├── commentsApi.js      # Discussion & comment endpoints
│   ├── mediaApi.js         # Upload & media studio endpoints
│   ├── reactionsApi.js     # Crown & super crown reaction endpoints
│   ├── profilesApi.js      # User profile & settings endpoints
│   ├── roomsApi.js         # Active community rooms endpoints
│   └── index.js            # API barrel export
├── features/               # Shared Domain Feature Modules
│   ├── auth/               # Login, signup, session checking, auth prompts
│   ├── feed/               # Feed tabs, post card rendering, infinite scroll
│   ├── posts/              # Spring modal post creator, identity pill
│   ├── comments/           # Discussion drawer & optimistic replies
│   ├── reactions/          # Crown reaction engine, who-reacted modal
│   ├── profile/            # Profile drawer, edit profile, media studio
│   ├── navigation/         # Navigation bars & sidebar drawer
│   └── toast/              # Spring notification toasts
├── platforms/              # Device-Specific Presentation Layers
│   ├── desktop/            # Desktop keyboard shortcuts (/), 3-col layout
│   └── mobile/             # Mobile bottom nav dock, drawer backdrop, FAB
├── services/               # Client-Side Compute Services
│   ├── animationScheduler.js # Viewport-based video & animation scheduler
│   ├── avatarService.js    # Identity avatar resolver (video/svg/dicebear)
│   ├── clientMediaCompressor.js # In-browser WebP canvas compressor
│   ├── mediaPreviewEngine.js # Ephemeral media preview resolver
│   └── sfxService.js       # Audio synthesizer & micro-sound effects
├── utils/                  # Safe DOM & formatting helpers
│   ├── domUtils.js         # XSS escaping (escapeHtml) & event dispatch
│   └── timeUtils.js        # Relative time-ago formatting
└── constants/              # Static constants
    ├── categories.js       # Post categories & flair color badges
    ├── reactions.js        # Reaction icons & palette definitions
    ├── rooms.js            # Active rooms & channel catalog
    └── seedPosts.js        # Offline fallback seed dataset
```

---

## Key Development Rules
1. **Never write DOM-mutating logic directly inside API clients.**
2. **Never duplicate API calls between Desktop and Mobile.** Shared logic belongs in `src/features/` or `src/api/`.
3. **Always use `escapeHtml()` when rendering user-generated text into the DOM.**
