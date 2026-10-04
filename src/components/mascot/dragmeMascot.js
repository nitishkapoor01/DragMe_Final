/* ==========================================================================
   DRAGME COMPONENT: MASCOT (src/components/mascot/dragmeMascot.js)
   Desktop Left Sidebar Brand Mascot Companion — Isolated Locked Asset
   ========================================================================== */

/**
 * Returns the HTML markup for the official isolated DRAGME Crown Mascot.
 * Directly renders the authentic 3D/glossy locked mascot character on a transparent background:
 * - Pure DRAGME crown silhouette with multiple origami peaks
 * - Dark inner face visor with glowing LED eyes
 * - Rounded minimal hands emerging naturally at base
 * - Ambient green contact pool
 * - ZERO card frames, ZERO labels, ZERO surrounding board artwork
 * 
 * @returns {string} HTML markup string
 */
export function getDragmeMascotMarkup() {
  return `
    <div class="dragme-mascot-wrapper" id="dragmeSidebarMascot" aria-hidden="true">
      <div class="dragme-mascot-ground-glow" aria-hidden="true"></div>
      <picture class="dragme-mascot-picture">
        <source srcset="dragme_mascot_isolated.webp" type="image/webp">
        <img 
          src="dragme_mascot_isolated.png" 
          alt="DRAGME Mascot" 
          class="dragme-sidebar-mascot-img"
          width="180"
          height="144"
          loading="eager"
          decoding="async"
        />
      </picture>
    </div>
  `;
}

/**
 * DragmeMascot Component (Phase 1 — Static Visual Companion)
 */
export class DragmeMascot {
  constructor(target = '#sidebarMascotZone') {
    this.targetSelector = target;
    this.container = null;
  }

  init() {
    this.container = typeof this.targetSelector === 'string'
      ? document.querySelector(this.targetSelector)
      : this.targetSelector;

    if (!this.container) return;
    this.render();
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = getDragmeMascotMarkup();
  }
}

export const dragmeMascot = new DragmeMascot('#sidebarMascotZone');
export default dragmeMascot;
