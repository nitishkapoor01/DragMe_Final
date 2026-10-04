/* ==========================================================================
   DRAGME FEATURE: LIQUID IDENTITY PILL (src/features/posts/liquidIdentityPill.js)
   Fluid SVG membrane morphing identity switch with canvas spark particles
   ========================================================================== */

import { sfx } from '../../services/sfxService.js';
import { triggerEvent } from '../../utils/domUtils.js';

export const LiquidIdentityPill = {
  element: null,
  membranePath: null,
  mode: 'me',
  isAnimating: false,

  getMorphPath(fromMode, toMode, p) {
    p = Math.max(0, Math.min(1, p));
    const isToAnon = toMode === 'anonymous';

    if (isToAnon) {
      const frontP = Math.min(1, p * 1.35);
      const backP = Math.max(0, (p - 0.25) * 1.33);
      const x1 = 4.5 + (98 - 4.5) * backP;
      const x2 = 92 + (215.5 - 92) * frontP;
      const waistPinch = Math.sin(p * Math.PI) * 9.5;
      const midX = (x1 + x2) / 2;
      return `M ${x1 + 18} 4 Q ${midX} ${4 + waistPinch} ${x2 - 18} 4 A 18 18 0 0 1 ${x2} 22 A 18 18 0 0 1 ${x2 - 18} 40 Q ${midX} ${40 - waistPinch} ${x1 + 18} 40 A 18 18 0 0 1 ${x1} 22 A 18 18 0 0 1 ${x1 + 18} 4 Z`;
    } else {
      const frontP = Math.min(1, p * 1.35);
      const backP = Math.max(0, (p - 0.25) * 1.33);
      const x1 = 98 - (98 - 4.5) * frontP;
      const x2 = 215.5 - (215.5 - 92) * backP;
      const waistPinch = Math.sin(p * Math.PI) * 9.5;
      const midX = (x1 + x2) / 2;
      return `M ${x1 + 18} 4 Q ${midX} ${4 + waistPinch} ${x2 - 18} 4 A 18 18 0 0 1 ${x2} 22 A 18 18 0 0 1 ${x2 - 18} 40 Q ${midX} ${40 - waistPinch} ${x1 + 18} 40 A 18 18 0 0 1 ${x1} 22 A 18 18 0 0 1 ${x1 + 18} 4 Z`;
    }
  },

  easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  spawnSparks(newMode) {
    const container = document.getElementById('identityParticles');
    if (!container) return;
    const isAnon = newMode === 'anonymous';
    const color = isAnon ? '#c084fc' : '#C8FF00';
    const originX = isAnon ? 150 : 60;

    for (let i = 0; i < 6; i++) {
      const spark = document.createElement('div');
      spark.className = 'identity-spark';
      spark.style.backgroundColor = color;
      spark.style.left = `${originX + (Math.random() * 20 - 10)}px`;
      spark.style.top = `${21 + (Math.random() * 10 - 5)}px`;
      spark.style.setProperty('--tx', `${(Math.random() * 36 - 18).toFixed(1)}px`);
      spark.style.setProperty('--ty', `${(Math.random() * 24 - 12).toFixed(1)}px`);
      container.appendChild(spark);
      setTimeout(() => spark.remove(), 400);
    }
  },

  setMode(newMode, playSound = true) {
    if (this.isAnimating || this.mode === newMode) return;

    const prevMode = this.mode;
    this.mode = newMode;
    this.isAnimating = true;

    if (playSound) {
      if (newMode === 'anonymous') sfx.playGhostMode();
      else sfx.playMeMode();
    }
    sfx.triggerHaptic('light');

    const duration = 440;
    const startTime = performance.now();
    this.element?.classList.add('is-morphing');
    let sparksSpawned = false;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, Math.max(0, elapsed / duration));
      const eased = this.easeInOut(progress);

      if (this.membranePath) {
        this.membranePath.setAttribute('d', this.getMorphPath(prevMode, newMode, eased));

        if (elapsed >= 180) {
          const grad = newMode === 'anonymous' ? 'url(#capsule-grad-anon)' : 'url(#capsule-grad-me)';
          const stroke = newMode === 'anonymous' ? 'url(#capsule-stroke-anon)' : 'url(#capsule-stroke-me)';
          this.membranePath.setAttribute('fill', grad);
          this.membranePath.setAttribute('stroke', stroke);
        }
      }

      if (elapsed >= 180 && !sparksSpawned) {
        sparksSpawned = true;
        this.spawnSparks(newMode);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.element?.classList.remove('is-morphing');
        this.element?.classList.toggle('mode-anonymous', newMode === 'anonymous');
        this.element?.classList.toggle('mode-me', newMode === 'me');
        this.element?.setAttribute('aria-checked', newMode === 'anonymous' ? 'true' : 'false');
        this.isAnimating = false;

        triggerEvent('dragme:identity-change', { mode: newMode });
      }
    };

    requestAnimationFrame(animate);
  },

  init() {
    this.element = document.getElementById('dragmeIdentityToggle');
    if (!this.element) return;
    this.membranePath = this.element.querySelector('.identity-morph-membrane');

    this.element.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSide = e.target.closest('.identity-side-target')?.dataset.side;
      if (targetSide) {
        this.setMode(targetSide);
      } else {
        this.setMode(this.mode === 'me' ? 'anonymous' : 'me');
      }
    });

    this.element.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.setMode(this.mode === 'me' ? 'anonymous' : 'me');
      }
    });
  }
};
