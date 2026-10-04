# DRAGME — Product Specification & Feature Contract

## 1. Executive Summary

DRAGME is a premier social entertainment platform centered around dynamic discussions, roasts, community arenas (rooms), multimedia interactions, and the signature **Crown Reaction System**.

---

## 2. Feature Domains & Invariants

### 1. Liquid Identity & Multi-Persona Flow
- **Public Handle**: Standard verified user handle with customized avatar and banner.
- **Anonymous Persona**: Anonymous posting with server-authoritative identity masking. The server tracks the true author internally for abuse moderation and rate limiting, but the public feed and APIs redact the author handle to "Anonymous" with a specialized mask icon.
- **Guest Experience**: Full browse, room exploration, and read capabilities. Write actions (voting, posting, commenting, saving) trigger an unobtrusive modal prompt preserving user context.

---

### 2. The Crown Reaction System
- **Single Tap**: Casts a standard **Crown** reaction with sound synthesis and micro-haptic feedback.
- **Long Press / Hold**: Opens the Super Reaction wheel (`Crown`, `Fire`, `Skull`, `Clown`, `Heart`).
- **Super Crown Upgrade**: Upgrades reaction to high-intensity visual badge with particle bursts.
- **Server Enforcement**: Each user has exactly 1 reaction state per post. Switching reactions updates existing state atomically without duplicating counts.
- **Who Reacted Sheet**: Real-time breakdown of reactors grouped by reaction type.

---

### 3. Media Studio & Video Architecture
- **Standard Ratios**:
  - Avatar: **4:5 Portrait Ratio** (512x640)
  - Banner: **3:1 Aspect Ratio** (1920x640)
- **Animated Avatars & Banners**: Supports smooth MP4/WebM animated loops with auto-generated static WebP poster fallbacks for low-bandwidth networks.
- **In-Browser Compression & Cropper**: Canvas-based client preprocessing before transfer, followed by server-side sharp re-encoding and magic-byte security checks.

---

### 4. Room & Topic Filtering
- **Rooms**: Dynamic topic communities (e.g., *General Arena*, *Tech Beef*, *Gaming Rages*, *Roast Me*, *Shower Thoughts*).
- **Feed Tabs**: Instant switching between *For You*, *Hot Roasts*, *Spicy*, *Trending*, and Room-specific feeds.

---

### 5. Sound & Micro-Animation Design
- **Web Audio API**: Real-time synthesized acoustic cues for taps, upgrades, and errors without external audio asset dependencies.
- **Smooth Physics**: Zero jarring jumps; micro-animations powered by CSS transitions and `requestAnimationFrame`.
