/* ==========================================================================
   DRAGME CLIENT SERVICE: SOUND EFFECTS & HAPTICS (src/services/sfxService.js)
   Web Audio API Procedural SFX Engine & Tactical Feedback (DISABLED/MUTED)
   ========================================================================== */

export const AppSFX = {
  ctx: null,
  muted: true,

  getContext() {
    return null;
  },

  // 1. Plus Button Sound (Mechanical snap + resonant ping)
  playPlusClick() {},

  // 2. Identity Switch Sound (Me vs Anonymous)
  playSwitchIdentity(targetMode) {},

  // --- Aliases and tactile UI micro-sounds ---
  playOpen() {},
  playClose() {},
  playTap() {},
  playMeMode() {},
  playGhostMode() {},
  playSuccess() {},
  playVote() {},
  playCrownTap() {},
  playCrownBurst() {},
  playSuperCrown() {},
  playError() {},
  playNotification() {},

  triggerHaptic(type = 'light') {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      if (type === 'light') navigator.vibrate(8);
      else if (type === 'medium') navigator.vibrate(16);
      else if (type === 'super') navigator.vibrate([24, 40, 36]);
    } catch (e) {}
  }
};

// Singleton export aliases
export const sfx = AppSFX;
export default AppSFX;

