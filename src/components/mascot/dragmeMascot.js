/* ==========================================================================
   DRAGME COMPONENT: MASCOT (src/components/mascot/dragmeMascot.js)
   Desktop Left Sidebar Brand Mascot Companion — Standalone Locked Character
   ========================================================================== */

/**
 * Generates the pure, standalone SVG character for the DRAGME Mascot.
 * Faithfully constructed from the locked design specification:
 * - 3D faceted origami neon-lime crown body (#A4F13E, #C9FF5A, #6CC41A)
 * - Deep obsidian inner face visor mask (#0B0F0B)
 * - Glowing angled neon-lime LED eyes (#FFFFFF / #C9FF5A)
 * - Rounded 3D minimal hands and subtle feet resting at base
 * - Soft ground ambient pool (#1A2E0A) and contact shadows
 * - Ambient 4-point sparkle star accents
 * - 100% transparent background with ZERO board frames, titles, or text
 * 
 * @returns {string} SVG markup string
 */
export function getDragmeMascotSvg() {
  return `
<svg class="dragme-sidebar-mascot-svg" viewBox="0 0 240 210" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="DRAGME Mascot Companion">
  <defs>
    <!-- Facet Gradients matching exact locked palette -->
    <linearGradient id="dg-grad-apex" x1="0%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#E7FF70" />
      <stop offset="45%" stop-color="#C9FF5A" />
      <stop offset="100%" stop-color="#A4F13E" />
    </linearGradient>

    <linearGradient id="dg-grad-left-wing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D9FF42" />
      <stop offset="55%" stop-color="#A4F13E" />
      <stop offset="100%" stop-color="#6CC41A" />
    </linearGradient>

    <linearGradient id="dg-grad-right-wing" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D9FF42" />
      <stop offset="55%" stop-color="#98EB31" />
      <stop offset="100%" stop-color="#5EAA14" />
    </linearGradient>

    <linearGradient id="dg-grad-left-base" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8ACF18" />
      <stop offset="100%" stop-color="#3E700B" />
    </linearGradient>

    <linearGradient id="dg-grad-right-base" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#7CB814" />
      <stop offset="100%" stop-color="#335C06" />
    </linearGradient>

    <linearGradient id="dg-grad-center-rhombus" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#C9FF5A" />
      <stop offset="45%" stop-color="#A4F13E" />
      <stop offset="100%" stop-color="#6CC41A" />
    </linearGradient>

    <linearGradient id="dg-grad-back-left" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#72B512" />
      <stop offset="100%" stop-color="#385C08" />
    </linearGradient>

    <linearGradient id="dg-grad-back-right" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#65A30D" />
      <stop offset="100%" stop-color="#2D4D04" />
    </linearGradient>

    <!-- Obsidian Facial Visor Mask Gradient -->
    <linearGradient id="dg-grad-mask" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#05080A" />
      <stop offset="50%" stop-color="#0B0F0B" />
      <stop offset="100%" stop-color="#040608" />
    </linearGradient>

    <!-- Glowing LED Eye Gradient -->
    <linearGradient id="dg-grad-eye" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="35%" stop-color="#E8FF75" />
      <stop offset="100%" stop-color="#C9FF5A" />
    </linearGradient>

    <!-- 3D Hand Spheres -->
    <radialGradient id="dg-grad-hand-l" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#E8FF80" />
      <stop offset="50%" stop-color="#A4F13E" />
      <stop offset="100%" stop-color="#4D8508" />
    </radialGradient>

    <radialGradient id="dg-grad-hand-r" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#E8FF80" />
      <stop offset="50%" stop-color="#98EB31" />
      <stop offset="100%" stop-color="#447507" />
    </radialGradient>

    <!-- Ground Contact Glow & Shadows -->
    <radialGradient id="dg-ground-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#A4F13E" stop-opacity="0.32" />
      <stop offset="40%" stop-color="#6CC41A" stop-opacity="0.15" />
      <stop offset="80%" stop-color="#1A2E0A" stop-opacity="0.04" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Eye Glow Filter -->
    <filter id="dg-eye-glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.4" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <!-- Sparkle Glow Filter -->
    <filter id="dg-sparkle-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- 1. AMBIENT GROUND GLOW & CONTACT SHADOW -->
  <g class="dg-mascot-ground">
    <!-- Green ground emission pool -->
    <ellipse cx="120" cy="188" rx="92" ry="16" fill="url(#dg-ground-glow)" />
    <!-- Dark contact shadow under base -->
    <ellipse cx="120" cy="186" rx="66" ry="8" fill="rgba(0,0,0,0.65)" />
    <!-- Hand contact shadows -->
    <ellipse cx="44" cy="186" rx="18" ry="5" fill="rgba(0,0,0,0.55)" />
    <ellipse cx="196" cy="186" rx="18" ry="5" fill="rgba(0,0,0,0.55)" />
  </g>

  <!-- 2. AMBIENT 4-POINT SPARKLE STARS (✦) -->
  <g class="dg-mascot-sparkles" filter="url(#dg-sparkle-glow)">
    <path d="M 26 44 Q 26 54 16 54 Q 26 54 26 64 Q 26 54 36 54 Q 26 54 26 44 Z" fill="#E8FF75" opacity="0.9" />
    <path d="M 14 108 Q 14 114 8 114 Q 14 114 14 120 Q 14 114 20 114 Q 14 114 14 108 Z" fill="#C9FF5A" opacity="0.75" />
    <path d="M 220 74 Q 220 82 212 82 Q 220 82 220 90 Q 220 82 228 82 Q 220 82 220 74 Z" fill="#E8FF75" opacity="0.85" />
    <circle cx="206" cy="116" r="1.8" fill="#C9FF5A" opacity="0.65" />
    <circle cx="38" cy="30" r="1.4" fill="#E8FF75" opacity="0.75" />
  </g>

  <!-- 3. REAR DEPTH GEOMETRY -->
  <g class="dg-mascot-back">
    <polygon points="120,24 76,78 36,52" fill="url(#dg-grad-back-left)" />
    <polygon points="120,24 164,78 204,52" fill="url(#dg-grad-back-right)" />
  </g>

  <!-- 4. FEET NUBS -->
  <g class="dg-mascot-feet">
    <ellipse cx="98" cy="180" rx="13" ry="8" fill="#5A940C" stroke="rgba(255,255,255,0.2)" stroke-width="0.6" />
    <ellipse cx="142" cy="180" rx="13" ry="8" fill="#52870A" stroke="rgba(255,255,255,0.2)" stroke-width="0.6" />
  </g>

  <!-- 5. MAIN 3D FACETED CROWN BODY -->
  <g class="dg-mascot-body">
    <!-- Center Apex Facets -->
    <polygon points="120,24 72,106 120,126" fill="url(#dg-grad-apex)" />
    <polygon points="120,24 168,106 120,126" fill="url(#dg-grad-apex)" opacity="0.9" />

    <!-- Left Wing Crown Facets -->
    <polygon points="36,52 120,24 72,106" fill="url(#dg-grad-left-wing)" />
    <polygon points="36,52 72,106 24,166" fill="url(#dg-grad-left-base)" />
    <polygon points="72,106 120,178 24,166" fill="url(#dg-grad-left-base)" opacity="0.88" />

    <!-- Right Wing Crown Facets -->
    <polygon points="204,52 120,24 168,106" fill="url(#dg-grad-right-wing)" />
    <polygon points="204,52 168,106 216,166" fill="url(#dg-grad-right-base)" />
    <polygon points="168,106 120,178 216,166" fill="url(#dg-grad-right-base)" opacity="0.88" />

    <!-- Center Lower Facet -->
    <polygon points="72,106 120,126 168,106 120,178" fill="url(#dg-grad-center-rhombus)" />

    <!-- Specular Ridge Highlights (Glossy Polished Facet Edges) -->
    <polyline points="36,52 120,24 204,52" fill="none" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" />
    <polyline points="120,24 120,126 120,178" fill="none" stroke="#FFFFFF" stroke-width="0.9" opacity="0.38" />
    <polyline points="120,24 72,106 24,166" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.35" />
    <polyline points="120,24 168,106 216,166" fill="none" stroke="#FFFFFF" stroke-width="0.8" opacity="0.35" />
  </g>

  <!-- 6. OBSIDIAN FACIAL MASK VISOR -->
  <g class="dg-mascot-face">
    <!-- Dark Inset Face Area -->
    <polygon points="120,78 66,114 120,150 174,114" fill="url(#dg-grad-mask)" stroke="rgba(164,241,62,0.28)" stroke-width="1.2" stroke-linejoin="round" />
    <!-- Inner Depth Layer -->
    <polygon points="120,83 72,114 120,145 168,114" fill="#020405" opacity="0.65" />
  </g>

  <!-- 7. GLOWING ANGLED NEON-LIME LED EYES -->
  <g class="dg-mascot-eyes" filter="url(#dg-eye-glow)">
    <!-- Left Sharp Angled Eye -->
    <polygon points="82,106 104,112 101,123 81,118" fill="url(#dg-grad-eye)" stroke="#FFFFFF" stroke-width="0.6" stroke-linejoin="round" />
    <!-- Right Sharp Angled Eye -->
    <polygon points="158,106 136,112 139,123 159,118" fill="url(#dg-grad-eye)" stroke="#FFFFFF" stroke-width="0.6" stroke-linejoin="round" />

    <!-- Pure White Specular Eye Core Glints -->
    <polygon points="85,108 95,111 93,116 84,114" fill="#FFFFFF" opacity="0.9" />
    <polygon points="155,108 145,111 147,116 156,114" fill="#FFFFFF" opacity="0.9" />
  </g>

  <!-- 8. ROUNDED 3D HANDS RESTING ON BASE -->
  <g class="dg-mascot-hands">
    <!-- Left Rounded Hand -->
    <g transform="translate(42, 168) rotate(-8)">
      <ellipse cx="0" cy="0" rx="17" ry="13" fill="url(#dg-grad-hand-l)" stroke="rgba(255,255,255,0.4)" stroke-width="0.9" />
      <ellipse cx="-2" cy="-4" rx="10" ry="4.5" fill="#FFFFFF" opacity="0.45" />
    </g>

    <!-- Right Rounded Hand -->
    <g transform="translate(198, 168) rotate(8)">
      <ellipse cx="0" cy="0" rx="17" ry="13" fill="url(#dg-grad-hand-r)" stroke="rgba(255,255,255,0.35)" stroke-width="0.9" />
      <ellipse cx="2" cy="-4" rx="10" ry="4.5" fill="#FFFFFF" opacity="0.45" />
    </g>
  </g>
</svg>
`;
}

/**
 * DragmeMascot Component (Phase 1 — Pure Standalone Visual Companion)
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
    this.container.innerHTML = `
      <div class="dragme-mascot-wrapper" id="dragmeSidebarMascot" aria-hidden="true">
        ${getDragmeMascotSvg()}
      </div>
    `;
  }
}

export const dragmeMascot = new DragmeMascot('#sidebarMascotZone');
export default dragmeMascot;
