/* ==========================================================================
   DRAGME COMPONENT: MASCOT (src/components/mascot/dragmeMascot.js)
   Desktop Left Sidebar Brand Mascot Companion — Phase 1 Locked Visual Design
   ========================================================================== */

/**
 * Returns the HTML markup for the official locked DRAGME Mascot Companion.
 * Faithfully matches the locked design reference sheet (01 Front View Default):
 * - 3D glossy faceted origami neon-lime crown body (#A4F13E, #C9FF5A, #6CC41A)
 * - Obsidian dark inner face mask (#0B0F0B)
 * - Expressive glowing neon-lime LED eyes (#FFFFFF / #C9FF5A)
 * - Rounded minimal hands resting on surface
 * - Ground ambient green emission and soft contact shadow (#1A2E0A)
 * - 4-point sparkle star accents
 * 
 * @returns {string} HTML markup string
 */
export function getDragmeMascotMarkup() {
  return `
    <div class="dragme-mascot-wrapper" id="dragmeSidebarMascot" aria-hidden="true">
      <div class="dragme-mascot-ground-glow" aria-hidden="true"></div>
      <picture class="dragme-mascot-picture">
        <source srcset="dragme_mascot_front.webp" type="image/webp">
        <img 
          src="dragme_mascot_front.png" 
          alt="DRAGME Mascot Companion" 
          class="dragme-sidebar-mascot-img"
          width="190"
          height="144"
          loading="eager"
          decoding="async"
        />
      </picture>
    </div>
  `;
}

/**
 * DragmeMascot Controller (Phase 1 — Static Visual Companion)
 */
export class DragmeMascot {
  /**
   * @param {HTMLElement|string} target Container element or selector
   */
  constructor(target = '#sidebarMascotZone') {
    this.targetSelector = target;
    this.container = null;
  }

  /**
   * Initializes the static mascot.
   */
  init() {
    this.container = typeof this.targetSelector === 'string' 
      ? document.querySelector(this.targetSelector) 
      : this.targetSelector;

    if (!this.container) return;
    this.render();
  }

  /**
   * Renders the mascot container markup.
   */
  render() {
    if (!this.container) return;
    this.container.innerHTML = getDragmeMascotMarkup();
  }
}

export const dragmeMascot = new DragmeMascot('#sidebarMascotZone');
export default dragmeMascot;
