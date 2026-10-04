# ADR-002: Desktop vs Mobile Architecture and Shared Core

## Status
Accepted

## Context
DRAGME has intentionally distinct user experiences for desktop and mobile devices:
- **Desktop:** Persistent 3-column layout (Left Sidebar + Center Feed + Right Widgets), top navigation bar with search input and keyboard shortcut (`/`), hover micro-interactions, modal dialogs.
- **Mobile:** Streamlined top bar with cooked badge, bottom dock navigation dock with floating action button (FAB) for post creation, swipeable/sliding left drawer with backdrop overlay, bottom sheet comment drawers.

These are not simply a single responsive CSS breakpoint; they are tailored interaction patterns. However, duplicating business logic, validation rules, API calls, or state management across device platforms creates bugs, state divergence, and double maintenance.

## Decision
We enforce a **Shared Core + Platform Presentation** architectural pattern:

```
                    DRAGME CORE
                         │
                 ┌───────┴───────┐
                 │               │
          platforms/desktop/  platforms/mobile/
          (3-col, keyboard)  (bottom nav, drawer)
                 │               │
                 └───────┬───────┘
                         │
                     SAME API
                         │
                   SAME BACKEND
```

1. **Shared Layers (`src/`)**:
   - `src/core/`: Platform detection (`PlatformDetector`), decoupled typed event bus (`eventBus`).
   - `src/state/` & `src/app/store.js`: Unified reactive pub/sub store for posts, users, active rooms, sort modes, and modal states.
   - `src/api/`: Typed API client modules (`postsApi`, `authApi`, `commentsApi`, `mediaApi`, `reactionsApi`).
   - `src/services/`: Client compute services (audio effects, avatar resolver, media compressor).
   - `src/features/`: Domain controllers handling business logic (`feedManager`, `createPostModal`, `commentsSheet`, `crownReactionEngine`, `profileManager`, `authManager`).
2. **Device-Specific Presentation Layers (`src/platforms/`)**:
   - `src/platforms/desktop/desktopLayout.js`: Desktop keyboard shortcuts (`/`, `Escape`), desktop search bar, desktop 3-column layout.
   - `src/platforms/mobile/mobileLayout.js`: Mobile bottom dock navigation, left drawer backdrop dismissal, mobile FAB post creation.

## Alternatives Considered
1. **Completely Separate Codebases (e.g. `m.dragme.gg` vs `dragme.gg`)**:
   - *Rejected:* Causes logic drift, duplicate API integrations, and synchronization issues.
2. **Pure CSS Media Queries with Single DOM Structure for Everything**:
   - *Rejected:* Leads to messy CSS hacks and forces mobile to render hidden desktop components and vice versa.

## Consequences
### Positive
- Zero duplication of backend API calls, validation rules, or reactive store state.
- Developers immediately know where code belongs: shared logic in `src/features/` or `src/core/`, platform presentation in `src/platforms/`.
- Fast and responsive rendering tailored to device form factor.

### Negative / Trade-offs
- Developers must use `PlatformDetector` or platform controllers rather than hardcoding viewport assumptions into feature logic.
