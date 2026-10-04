/* ==========================================================================
   DRAGME COMPONENT: REACTIVE LOGO / MASCOT SYSTEM (src/components/reactiveLogo/reactiveLogo.js)
   Official DRAGME Origami Crown Brand Mascot & Advanced Micro-Expression Engine
   Preserves 100% authentic 3D neon crown visual identity with layered vector expressions
   ========================================================================== */

import { eventBus } from '../../core/eventBus.js';

export const EXPRESSIONS = {
  NORMAL: 'normal',
  HAPPY: 'happy',
  EXCITED: 'excited',
  LAUGHING: 'laughing',
  CURIOUS: 'curious',
  CONFUSED: 'confused',
  THINKING: 'thinking',
  SAD: 'sad',
  ANGRY: 'angry',
  SURPRISED: 'surprised',
  SLEEPY: 'sleepy',
  COOL: 'cool',
  LOVE: 'love',
  NERVOUS: 'nervous'
};

export const BEHAVIORS = {
  BREATHING: 'behavior-breathing',
  HOVER: 'behavior-hover',
  ROTATE: 'behavior-rotate',
  LOOK_AROUND: 'behavior-look',
  STRETCH: 'behavior-stretch',
  SPIN: 'behavior-spin',
  SETTLE: 'behavior-settle',
  GLITCH: 'behavior-glitch',
  CELEBRATE: 'behavior-celebrate'
};

export const PRIORITY = {
  LOW: 1,      // Idle behaviors (easily interrupted)
  NORMAL: 2,   // Hover, clicks, route transitions
  HIGH: 3,     // Post created, notifications, messages, errors
  CRITICAL: 4  // Achievements, milestone crown bursts, app intro
};

export class ReactiveLogo {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.options = {
      size: options.size || 'md', // 'sm' (24px), 'md' (36px), 'lg' (64px), 'xl' (96px), 'hero' (128px)
      enableIdle: options.enableIdle !== false,
      enableEvents: options.enableEvents !== false,
      interactive: options.interactive !== false,
      enableEyeTracking: options.enableEyeTracking !== false,
      enableBlinking: options.enableBlinking !== false,
      initialExpression: options.initialExpression || EXPRESSIONS.NORMAL,
      ...options
    };

    this.currentExpression = this.options.initialExpression;
    this.currentBehavior = null;
    this.activePriority = 0;
    this.reactionTimeout = null;
    this.idleTimer = null;
    this.blinkTimer = null;
    this.isBlinking = false;
    this.isDestroyed = false;
    this.prefersReducedMotion = false;

    // Eye Tracking & 3D Tilt State
    this.targetEyeX = 0;
    this.targetEyeY = 0;
    this.currentEyeX = 0;
    this.currentEyeY = 0;
    this.targetTiltX = 0;
    this.targetTiltY = 0;
    this.currentTiltX = 0;
    this.currentTiltY = 0;
    this.rafId = null;
    this.lastPointerMoveTime = Date.now();

    this.init();
  }

  init() {
    if (!this.container) return;

    this.checkReducedMotion();
    this.render();
    this.bindDOMEvents();

    if (this.options.enableEvents) {
      this.bindSystemEvents();
    }

    if (this.options.enableBlinking && !this.prefersReducedMotion) {
      this.startBlinkLoop();
    }

    if (this.options.enableIdle && !this.prefersReducedMotion) {
      this.startIdleLoop();
    }

    if (this.options.enableEyeTracking && !this.prefersReducedMotion) {
      this.startAnimationLoop();
      this.bindPointerTracking();
    }

    // React to visibility changes so background tabs don't waste timers
    this.visibilityHandler = () => {
      if (document.hidden) {
        this.stopIdleLoop();
        this.stopBlinkLoop();
      } else {
        if (this.options.enableIdle && !this.prefersReducedMotion) this.startIdleLoop();
        if (this.options.enableBlinking && !this.prefersReducedMotion) this.startBlinkLoop();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  checkReducedMotion() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = mediaQuery.matches;
      mediaQuery.addEventListener?.('change', (e) => {
        this.prefersReducedMotion = e.matches;
        if (this.prefersReducedMotion) {
          this.stopIdleLoop();
          this.stopBlinkLoop();
          this.clearBehavior();
        } else {
          if (this.options.enableIdle) this.startIdleLoop();
          if (this.options.enableBlinking) this.startBlinkLoop();
        }
      });
    }
  }

  getMarkupTemplate() {
    return `
      <div class="reactive-logo-wrap size-${this.options.size}" data-expression="${this.currentExpression}" tabindex="0" role="img" aria-label="DRAGME Mascot Logo">
        
        <!-- Outer Orbiting Aura Ring (For Loading, Super Crowns & Milestones) -->
        <div class="reactive-aura-ring" aria-hidden="true"></div>

        <!-- 3D Perspective Body Container -->
        <div class="reactive-crown-body">
          
          <!-- Master Authentic 3D DRAGME Neon Origami Crown Image (Preserves 100% Brand Identity) -->
          <img src="crown_icon.png" alt="DRAGME Crown" class="reactive-crown-img" draggable="false" loading="eager" />

          <!-- Superimposed Vector Micro-Expression & Feature Overlay -->
          <svg class="reactive-expression-overlay" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            
            <!-- Cheek Blushes (Visible in happy, love, excited, laughing, nervous) -->
            <g class="mascot-blush-group" opacity="0">
              <ellipse cx="34" cy="59" rx="4.2" ry="2.4" fill="#FF4757" opacity="0.75" />
              <ellipse cx="66" cy="59" rx="4.2" ry="2.4" fill="#FF4757" opacity="0.75" />
            </g>

            <!-- Interactive Eye-Tracking Layer -->
            <g class="eye-tracking-layer">
              
              <!-- 1. Normal / Glossy Shiny Eyes (Default State) -->
              <g class="eye-shape shape-normal">
                <!-- Left Eye -->
                <g class="eye-unit eye-left">
                  <circle cx="42" cy="53" r="3.6" fill="#06090e" />
                  <circle cx="43.3" cy="51.7" r="1.3" fill="#FFFFFF" />
                  <circle cx="41.1" cy="54.2" r="0.6" fill="#FFFFFF" opacity="0.8" />
                </g>
                <!-- Right Eye -->
                <g class="eye-unit eye-right">
                  <circle cx="58" cy="53" r="3.6" fill="#06090e" />
                  <circle cx="59.3" cy="51.7" r="1.3" fill="#FFFFFF" />
                  <circle cx="57.1" cy="54.2" r="0.6" fill="#FFFFFF" opacity="0.8" />
                </g>
              </g>

              <!-- 2. Happy / Smiling Arcs (^^) -->
              <g class="eye-shape shape-happy" opacity="0">
                <path d="M 38 55 Q 42 48 46 55" stroke="#06090e" stroke-width="2.6" stroke-linecap="round" fill="none" />
                <path d="M 54 55 Q 58 48 62 55" stroke="#06090e" stroke-width="2.6" stroke-linecap="round" fill="none" />
              </g>

              <!-- 3. Excited / Sparkle Star Eyes (✦✦) -->
              <g class="eye-shape shape-excited" opacity="0">
                <path d="M 42 48.5 L 43.5 52.2 L 47 53 L 43.5 53.8 L 42 57.5 L 40.5 53.8 L 37 53 L 40.5 52.2 Z" fill="#06090e" />
                <circle cx="42" cy="53" r="1.1" fill="#FFFFFF" />
                <path d="M 58 48.5 L 59.5 52.2 L 63 53 L 59.5 53.8 L 58 57.5 L 56.5 53.8 L 53 53 L 56.5 52.2 Z" fill="#06090e" />
                <circle cx="58" cy="53" r="1.1" fill="#FFFFFF" />
              </g>

              <!-- 4. Laughing / Squint Eyes (> <) -->
              <g class="eye-shape shape-laughing" opacity="0">
                <path d="M 38 50.5 L 45 53.5 L 38 56.5" stroke="#06090e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                <path d="M 62 50.5 L 55 53.5 L 62 56.5" stroke="#06090e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </g>

              <!-- 5. Curious / Sideways Glance Eyes -->
              <g class="eye-shape shape-curious" opacity="0">
                <g class="eye-unit eye-left">
                  <circle cx="44.5" cy="52.5" r="3.6" fill="#06090e" />
                  <circle cx="45.8" cy="51.2" r="1.3" fill="#FFFFFF" />
                </g>
                <g class="eye-unit eye-right">
                  <circle cx="60.5" cy="52.5" r="3.6" fill="#06090e" />
                  <circle cx="61.8" cy="51.2" r="1.3" fill="#FFFFFF" />
                </g>
              </g>

              <!-- 6. Confused / Asymmetrical Wink (o ~ O) -->
              <g class="eye-shape shape-confused" opacity="0">
                <path d="M 38 51.5 L 45 54 L 38 56.5" stroke="#06090e" stroke-width="2.4" stroke-linecap="round" fill="none" />
                <circle cx="58" cy="52.5" r="4.2" fill="#06090e" />
                <circle cx="59.2" cy="51" r="1.5" fill="#FFFFFF" />
              </g>

              <!-- 7. Thinking / Upward Glance Eyes -->
              <g class="eye-shape shape-thinking" opacity="0">
                <g class="eye-unit eye-left">
                  <circle cx="44" cy="50" r="3.4" fill="#06090e" />
                  <circle cx="45.2" cy="48.8" r="1.2" fill="#FFFFFF" />
                </g>
                <g class="eye-unit eye-right">
                  <circle cx="60" cy="50" r="3.4" fill="#06090e" />
                  <circle cx="61.2" cy="48.8" r="1.2" fill="#FFFFFF" />
                </g>
              </g>

              <!-- 8. Sad / Droopy Eyes (\ /) -->
              <g class="eye-shape shape-sad" opacity="0">
                <path d="M 38 55 Q 42 59 46 55" stroke="#06090e" stroke-width="2.4" stroke-linecap="round" fill="none" />
                <path d="M 54 55 Q 58 59 62 55" stroke="#06090e" stroke-width="2.4" stroke-linecap="round" fill="none" />
              </g>

              <!-- 9. Angry / Sharp Slanted Eyes (\ /) -->
              <g class="eye-shape shape-angry" opacity="0">
                <path d="M 38 50 L 46 55.5" stroke="#06090e" stroke-width="2.8" stroke-linecap="round" />
                <path d="M 62 50 L 54 55.5" stroke="#06090e" stroke-width="2.8" stroke-linecap="round" />
              </g>

              <!-- 10. Surprised / Wide Round Eyes (O O) -->
              <g class="eye-shape shape-surprised" opacity="0">
                <circle cx="42" cy="52.5" r="4.8" fill="#06090e" />
                <circle cx="43.5" cy="50.8" r="1.8" fill="#FFFFFF" />
                <circle cx="58" cy="52.5" r="4.8" fill="#06090e" />
                <circle cx="59.5" cy="50.8" r="1.8" fill="#FFFFFF" />
              </g>

              <!-- 11. Sleepy / Peaceful Closed Eyes (- -) -->
              <g class="eye-shape shape-sleepy" opacity="0">
                <line x1="38" y1="53.5" x2="46" y2="53.5" stroke="#06090e" stroke-width="2.4" stroke-linecap="round" />
                <line x1="54" y1="53.5" x2="62" y2="53.5" stroke="#06090e" stroke-width="2.4" stroke-linecap="round" />
              </g>

              <!-- 12. Cool / Sleek Sunglasses with Glass Reflection -->
              <g class="eye-shape shape-cool" opacity="0">
                <polygon points="34,48 48,48 46,57 36,57" fill="#06090e" />
                <polygon points="52,48 66,48 64,57 54,57" fill="#06090e" />
                <line x1="48" y1="50" x2="52" y2="50" stroke="#06090e" stroke-width="2.2" stroke-linecap="round" />
                <!-- Glass Specular Glint -->
                <line x1="37" y1="50" x2="42" y2="55" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.85" />
                <line x1="55" y1="50" x2="60" y2="55" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" opacity="0.85" />
              </g>

              <!-- 13. Love / Glowing Heart Eyes (♥ ♥) -->
              <g class="eye-shape shape-love" opacity="0">
                <path d="M 42 50 C 39.5 46.5, 35.5 50, 42 56.5 C 48.5 50, 44.5 46.5, 42 50 Z" fill="#FF4757" filter="drop-shadow(0 0 3px rgba(255, 71, 87, 0.8))" />
                <path d="M 58 50 C 55.5 46.5, 51.5 50, 58 56.5 C 64.5 50, 60.5 46.5, 58 50 Z" fill="#FF4757" filter="drop-shadow(0 0 3px rgba(255, 71, 87, 0.8))" />
              </g>

              <!-- 14. Nervous / Jittery Sideways Glance -->
              <g class="eye-shape shape-nervous" opacity="0">
                <g class="eye-unit eye-left">
                  <circle cx="40" cy="53" r="3.2" fill="#06090e" />
                  <circle cx="41.2" cy="51.8" r="1.1" fill="#FFFFFF" />
                </g>
                <g class="eye-unit eye-right">
                  <circle cx="56" cy="53" r="3.2" fill="#06090e" />
                  <circle cx="57.2" cy="51.8" r="1.1" fill="#FFFFFF" />
                </g>
              </g>

            </g> <!-- /eye-tracking-layer -->

            <!-- Mouth Layer -->
            <g class="mascot-mouth-group">
              <!-- 1. Normal Subtle Smile (Default) -->
              <path class="mouth-shape mouth-normal" d="M 47 63.5 Q 50 66 53 63.5" stroke="#06090e" stroke-width="1.9" stroke-linecap="round" fill="none" />
              
              <!-- 2. Excited / Laughing Open Mouth -->
              <path class="mouth-shape mouth-laugh" d="M 46 62.5 Q 50 68.5 54 62.5 Z" fill="#06090e" opacity="0" />
              
              <!-- 3. Surprised Round Open Mouth (o) -->
              <ellipse class="mouth-shape mouth-open" cx="50" cy="63.5" rx="2.5" ry="3.2" fill="#06090e" opacity="0" />
              
              <!-- 4. Frown / Sad -->
              <path class="mouth-shape mouth-frown" d="M 47 65 Q 50 62 53 65" stroke="#06090e" stroke-width="1.9" stroke-linecap="round" fill="none" opacity="0" />

              <!-- 5. Playful Cat / 3-Mouth -->
              <path class="mouth-shape mouth-playful" d="M 46 63.5 Q 48 65.5 50 63.5 Q 52 65.5 54 63.5" stroke="#06090e" stroke-width="1.7" stroke-linecap="round" fill="none" opacity="0" />

              <!-- 6. Smirk Mouth (Cool) -->
              <path class="mouth-shape mouth-smirk" d="M 48 64 Q 52 64.5 54 62" stroke="#06090e" stroke-width="1.9" stroke-linecap="round" fill="none" opacity="0" />

              <!-- 7. Wavy Uneasy Mouth (Nervous/Confused) -->
              <path class="mouth-shape mouth-wavy" d="M 46 63.5 Q 48 61.5 50 63.5 Q 52 65.5 54 63.5" stroke="#06090e" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0" />
            </g>

            <!-- ==========================================================
                 FLOATING EMOTE / ACCESSORY BADGES
                 ========================================================== -->
            <g class="mascot-accessories-group">
              
              <!-- 1. Curious Question Mark (?) -->
              <g class="accessory-badge badge-curious" opacity="0" transform="translate(72, 14)">
                <circle cx="7" cy="7" r="7.5" fill="#0A0F17" stroke="#B7FF3C" stroke-width="1.2" filter="drop-shadow(0 0 5px rgba(183, 255, 60, 0.6))" />
                <text x="7" y="10.5" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="9.5" fill="#B7FF3C" text-anchor="middle">?</text>
              </g>

              <!-- 2. Confused Squiggle (~) -->
              <g class="accessory-badge badge-confused" opacity="0" transform="translate(72, 14)">
                <circle cx="7" cy="7" r="7.5" fill="#0A0F17" stroke="#F59E0B" stroke-width="1.2" filter="drop-shadow(0 0 5px rgba(245, 158, 11, 0.6))" />
                <text x="7" y="10.2" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="10.5" fill="#F59E0B" text-anchor="middle">~</text>
              </g>

              <!-- 3. Thinking Dots (...) -->
              <g class="accessory-badge badge-thinking" opacity="0" transform="translate(68, 14)">
                <rect x="0" y="1" width="18" height="10" rx="5" fill="#0A0F17" stroke="#94A3B8" stroke-width="1.1" />
                <circle class="think-dot dot-1" cx="4.5" cy="6" r="1.3" fill="#B7FF3C" />
                <circle class="think-dot dot-2" cx="9" cy="6" r="1.3" fill="#B7FF3C" />
                <circle class="think-dot dot-3" cx="13.5" cy="6" r="1.3" fill="#B7FF3C" />
              </g>

              <!-- 4. Angry Vein Mark (💢) -->
              <g class="accessory-badge badge-angry" opacity="0" transform="translate(73, 14)">
                <path d="M 2 2 L 6 6 M 6 2 L 2 6 M 0 4 L 8 4 M 4 0 L 4 8" stroke="#FF4757" stroke-width="2" stroke-linecap="round" filter="drop-shadow(0 0 5px rgba(255, 71, 87, 0.8))" />
              </g>

              <!-- 5. Sleepy Zzz Drift -->
              <g class="accessory-badge badge-sleepy" opacity="0" transform="translate(71, 8)">
                <text class="zzz-letter z-1" x="0" y="8" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="7" fill="#94A3B8">z</text>
                <text class="zzz-letter z-2" x="4.5" y="5" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="9" fill="#B7FF3C">Z</text>
                <text class="zzz-letter z-3" x="11" y="1" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="11" fill="#E2FF66">z</text>
              </g>

              <!-- 6. Notification Alert Mark (!) -->
              <g class="accessory-badge badge-notif" opacity="0" transform="translate(72, 14)">
                <circle cx="7" cy="7" r="7.5" fill="#FF4757" stroke="#FFFFFF" stroke-width="1.3" filter="drop-shadow(0 0 6px rgba(255, 71, 87, 0.85))" />
                <text x="7" y="10.5" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="9.5" fill="#FFFFFF" text-anchor="middle">!</text>
              </g>

              <!-- 7. Achievement Gold Star Crown (👑) -->
              <g class="accessory-badge badge-achievement" opacity="0" transform="translate(41, -2)">
                <path d="M 3 10 L 7 4 L 11 8 L 15 4 L 19 10 Z" fill="#F59E0B" stroke="#FDE047" stroke-width="1.2" filter="drop-shadow(0 0 7px rgba(245, 158, 11, 0.9))" />
                <circle cx="1" cy="4" r="1.1" fill="#FFFFFF" />
                <circle cx="21" cy="4" r="1.1" fill="#FFFFFF" />
              </g>

              <!-- 8. Nervous Sweat Drop (💧) -->
              <g class="accessory-badge badge-nervous" opacity="0" transform="translate(73, 16)">
                <path d="M 5 0 C 5 0, 1 6, 1 8.5 C 1 10.8, 2.8 12.5, 5 12.5 C 7.2 12.5, 9 10.8, 9 8.5 C 9 6, 5 0, 5 0 Z" fill="#06B6D4" opacity="0.95" filter="drop-shadow(0 0 4px rgba(6, 182, 212, 0.7))" />
              </g>

            </g> <!-- /mascot-accessories-group -->

          </svg> <!-- /reactive-expression-overlay -->

        </div> <!-- /reactive-crown-body -->

        <!-- Micro Particle Canvas / Emitter Box -->
        <div class="mascot-particles-container" aria-hidden="true"></div>

      </div>
    `;
  }

  render() {
    this.container.innerHTML = this.getMarkupTemplate();
    this.wrapperEl = this.container.querySelector('.reactive-logo-wrap');
    this.bodyEl = this.container.querySelector('.reactive-crown-body');
    this.overlaySvg = this.container.querySelector('.reactive-expression-overlay');
    this.eyeTrackingLayer = this.container.querySelector('.eye-tracking-layer');
    this.particlesContainer = this.container.querySelector('.mascot-particles-container');

    this.applyExpression(this.currentExpression);
  }

  /* -------------------------------------------------------------
     INTERACTIVE POINTER & 3D PERSPECTIVE TRACKING
     ------------------------------------------------------------- */
  bindPointerTracking() {
    this.pointerMoveHandler = (e) => {
      if (this.isDestroyed || this.prefersReducedMotion || !this.wrapperEl) return;

      const rect = this.wrapperEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      this.lastPointerMoveTime = Date.now();

      // Within 500px radius, eyes follow smoothly
      if (dist < 500) {
        const angle = Math.atan2(deltaY, deltaX);
        const maxEyeDist = Math.min(dist / 100, 2.6); // max 2.6px displacement
        this.targetEyeX = Math.cos(angle) * maxEyeDist;
        this.targetEyeY = Math.sin(angle) * maxEyeDist;

        // Subtle 3D perspective tilt
        if (dist < 250) {
          this.targetTiltX = Math.max(Math.min(-deltaY * 0.04, 10), -10);
          this.targetTiltY = Math.max(Math.min(deltaX * 0.04, 10), -10);
        } else {
          this.targetTiltX = 0;
          this.targetTiltY = 0;
        }
      } else {
        this.targetEyeX = 0;
        this.targetEyeY = 0;
        this.targetTiltX = 0;
        this.targetTiltY = 0;
      }
    };

    window.addEventListener('pointermove', this.pointerMoveHandler, { passive: true });
  }

  startAnimationLoop() {
    const update = () => {
      if (this.isDestroyed) return;

      // Auto-return eyes to center after 3s idle pointer
      if (Date.now() - this.lastPointerMoveTime > 3000) {
        this.targetEyeX = 0;
        this.targetEyeY = 0;
        this.targetTiltX = 0;
        this.targetTiltY = 0;
      }

      // Smooth Spring Lerp interpolation
      const lerpFactor = 0.14;
      this.currentEyeX += (this.targetEyeX - this.currentEyeX) * lerpFactor;
      this.currentEyeY += (this.targetEyeY - this.currentEyeY) * lerpFactor;
      this.currentTiltX += (this.targetTiltX - this.currentTiltX) * lerpFactor;
      this.currentTiltY += (this.targetTiltY - this.currentTiltY) * lerpFactor;

      if (this.eyeTrackingLayer && !this.isBlinking) {
        this.eyeTrackingLayer.style.transform = `translate(${this.currentEyeX.toFixed(2)}px, ${this.currentEyeY.toFixed(2)}px)`;
      }

      if (this.bodyEl) {
        this.bodyEl.style.transform = `perspective(500px) rotateX(${this.currentTiltX.toFixed(2)}deg) rotateY(${this.currentTiltY.toFixed(2)}deg)`;
      }

      this.rafId = requestAnimationFrame(update);
    };

    this.rafId = requestAnimationFrame(update);
  }

  /* -------------------------------------------------------------
     NATURAL RANDOMIZED BLINKING ENGINE
     ------------------------------------------------------------- */
  startBlinkLoop() {
    if (this.isDestroyed || this.prefersReducedMotion) return;
    this.stopBlinkLoop();

    // Random interval between 3.2s and 6.5s
    const delay = Math.floor(Math.random() * 3300) + 3200;

    this.blinkTimer = setTimeout(() => {
      this.performBlink();
      this.startBlinkLoop();
    }, delay);
  }

  stopBlinkLoop() {
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
  }

  performBlink() {
    // Only blink if current expression has open eyes (normal, excited, curious, thinking, surprised, cool, nervous)
    const nonBlinkable = [EXPRESSIONS.HAPPY, EXPRESSIONS.LAUGHING, EXPRESSIONS.SLEEPY, EXPRESSIONS.CONFUSED];
    if (nonBlinkable.includes(this.currentExpression) || this.isBlinking || !this.eyeTrackingLayer) return;

    this.isBlinking = true;
    this.eyeTrackingLayer.classList.add('mascot-blinking');

    const isDoubleBlink = Math.random() < 0.22; // 22% chance of double-blink

    setTimeout(() => {
      this.eyeTrackingLayer?.classList.remove('mascot-blinking');
      this.isBlinking = false;

      if (isDoubleBlink) {
        setTimeout(() => {
          this.isBlinking = true;
          this.eyeTrackingLayer?.classList.add('mascot-blinking');
          setTimeout(() => {
            this.eyeTrackingLayer?.classList.remove('mascot-blinking');
            this.isBlinking = false;
          }, 110);
        }, 80);
      }
    }, 130);
  }

  /* -------------------------------------------------------------
     DOM INTERACTION BINDINGS
     ------------------------------------------------------------- */
  bindDOMEvents() {
    if (!this.options.interactive || !this.wrapperEl) return;

    this.wrapperEl.addEventListener('mouseenter', () => {
      if (this.activePriority <= PRIORITY.NORMAL) {
        this.triggerReaction(EXPRESSIONS.HAPPY, 1200, PRIORITY.NORMAL);
        this.triggerBehavior(BEHAVIORS.HOVER, 800);
      }
    });

    this.wrapperEl.addEventListener('mousedown', () => {
      if (this.activePriority <= PRIORITY.NORMAL) {
        this.triggerReaction(EXPRESSIONS.EXCITED, 600, PRIORITY.NORMAL);
      }
    });

    this.wrapperEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.triggerReaction(EXPRESSIONS.LAUGHING, 1200, PRIORITY.NORMAL);
      this.triggerBehavior(BEHAVIORS.SPIN, 900);
      this.triggerSparkles(8);
    });

    this.wrapperEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.triggerReaction(EXPRESSIONS.EXCITED, 1000, PRIORITY.NORMAL);
        this.triggerBehavior(BEHAVIORS.SPIN, 900);
      }
    });
  }

  bindSystemEvents() {
    // 1. Post Creation Celebration
    eventBus.on('dragme:post:created', () => {
      this.triggerReaction(EXPRESSIONS.EXCITED, 3200, PRIORITY.HIGH);
      this.triggerBehavior(BEHAVIORS.CELEBRATE, 1400);
      this.triggerSparkles(20);
    });

    // 2. System Toast Notifications
    eventBus.on('dragme:toast', (data) => {
      const type = data?.type || 'info';
      if (type === 'error') {
        this.triggerReaction(EXPRESSIONS.ANGRY, 2600, PRIORITY.HIGH);
        this.triggerBehavior(BEHAVIORS.GLITCH, 900);
      } else if (type === 'success') {
        this.triggerReaction(EXPRESSIONS.HAPPY, 2200, PRIORITY.HIGH);
        this.triggerSparkles(10);
      } else if (type === 'warning') {
        this.triggerReaction(EXPRESSIONS.SURPRISED, 2200, PRIORITY.HIGH);
      } else {
        this.triggerReaction(EXPRESSIONS.CURIOUS, 2000, PRIORITY.NORMAL);
      }
    });

    // 3. New Notification or Direct Message
    eventBus.on('dragme:notification:new', () => {
      this.triggerReaction(EXPRESSIONS.SURPRISED, 2600, PRIORITY.HIGH);
      this.showBadge('notif', 2600);
      this.triggerBehavior(BEHAVIORS.HOVER, 800);
    });

    eventBus.on('dragme:message:received', () => {
      this.triggerReaction(EXPRESSIONS.CURIOUS, 2400, PRIORITY.HIGH);
    });

    // 4. Milestone Reactions & Super Crowns
    eventBus.on('dragme:reaction:supercrown', () => {
      this.triggerReaction(EXPRESSIONS.EXCITED, 3500, PRIORITY.CRITICAL);
      this.triggerBehavior(BEHAVIORS.CELEBRATE, 1600);
      this.showBadge('achievement', 3500);
      this.triggerSparkles(24);
    });

    // 5. App Loaded / Welcome Intro
    eventBus.on('dragme:app:loaded', () => {
      this.triggerReaction(EXPRESSIONS.HAPPY, 2400, PRIORITY.NORMAL);
      this.triggerBehavior(BEHAVIORS.BREATHING, 2200);
    });
  }

  /* -------------------------------------------------------------
     EXPRESSION STATE MACHINE (Full Spectrum of 14 Moods)
     ------------------------------------------------------------- */
  setExpression(expressionName, priority = PRIORITY.NORMAL) {
    if (this.isDestroyed || !this.wrapperEl) return;
    if (priority < this.activePriority) return; // Discard lower priority

    // Clear any pending temporary reaction timeouts when setting explicit expression
    if (this.reactionTimeout) {
      clearTimeout(this.reactionTimeout);
      this.reactionTimeout = null;
    }

    this.activePriority = priority;
    this.currentExpression = expressionName;
    this.applyExpression(expressionName);
  }

  applyExpression(expr) {
    if (!this.wrapperEl) return;
    this.wrapperEl.setAttribute('data-expression', expr);

    // Hide all eye shapes
    const eyeShapes = this.wrapperEl.querySelectorAll('.eye-shape');
    eyeShapes.forEach(el => el.setAttribute('opacity', '0'));

    // Hide all mouth shapes
    const mouthShapes = this.wrapperEl.querySelectorAll('.mouth-shape');
    mouthShapes.forEach(el => el.setAttribute('opacity', '0'));

    // Reset blush & badges
    const blush = this.wrapperEl.querySelector('.mascot-blush-group');
    if (blush) blush.setAttribute('opacity', '0');

    const badges = this.wrapperEl.querySelectorAll('.accessory-badge');
    badges.forEach(b => b.setAttribute('opacity', '0'));

    // Select matching features based on expression
    switch (expr) {
      case EXPRESSIONS.HAPPY:
        this.showElement('.shape-happy');
        this.showElement('.mouth-normal');
        if (blush) blush.setAttribute('opacity', '1');
        break;

      case EXPRESSIONS.EXCITED:
        this.showElement('.shape-excited');
        this.showElement('.mouth-laugh');
        if (blush) blush.setAttribute('opacity', '1');
        break;

      case EXPRESSIONS.LAUGHING:
        this.showElement('.shape-laughing');
        this.showElement('.mouth-laugh');
        if (blush) blush.setAttribute('opacity', '1');
        break;

      case EXPRESSIONS.CURIOUS:
        this.showElement('.shape-curious');
        this.showElement('.mouth-playful');
        this.showElement('.badge-curious');
        break;

      case EXPRESSIONS.CONFUSED:
        this.showElement('.shape-confused');
        this.showElement('.mouth-wavy');
        this.showElement('.badge-confused');
        break;

      case EXPRESSIONS.THINKING:
        this.showElement('.shape-thinking');
        this.showElement('.mouth-normal');
        this.showElement('.badge-thinking');
        break;

      case EXPRESSIONS.SAD:
        this.showElement('.shape-sad');
        this.showElement('.mouth-frown');
        break;

      case EXPRESSIONS.ANGRY:
        this.showElement('.shape-angry');
        this.showElement('.mouth-wavy');
        this.showElement('.badge-angry');
        break;

      case EXPRESSIONS.SURPRISED:
        this.showElement('.shape-surprised');
        this.showElement('.mouth-open');
        break;

      case EXPRESSIONS.SLEEPY:
        this.showElement('.shape-sleepy');
        this.showElement('.mouth-normal');
        this.showElement('.badge-sleepy');
        break;

      case EXPRESSIONS.COOL:
        this.showElement('.shape-cool');
        this.showElement('.mouth-smirk');
        break;

      case EXPRESSIONS.LOVE:
        this.showElement('.shape-love');
        this.showElement('.mouth-laugh');
        if (blush) blush.setAttribute('opacity', '1');
        break;

      case EXPRESSIONS.NERVOUS:
        this.showElement('.shape-nervous');
        this.showElement('.mouth-wavy');
        this.showElement('.badge-nervous');
        if (blush) blush.setAttribute('opacity', '0.8');
        break;

      case EXPRESSIONS.NORMAL:
      default:
        this.showElement('.shape-normal');
        this.showElement('.mouth-normal');
        break;
    }
  }

  showElement(selector) {
    if (!this.wrapperEl) return;
    const el = this.wrapperEl.querySelector(selector);
    if (el) el.setAttribute('opacity', '1');
  }

  showBadge(badgeName, duration = 2000) {
    if (!this.wrapperEl) return;
    const badge = this.wrapperEl.querySelector(`.badge-${badgeName}`);
    if (badge) {
      badge.setAttribute('opacity', '1');
      setTimeout(() => {
        if (badge && !this.isDestroyed) badge.setAttribute('opacity', '0');
      }, duration);
    }
  }

  /* -------------------------------------------------------------
     TEMPORARY EVENT REACTION (Priority Guarded Auto-Restore)
     ------------------------------------------------------------- */
  triggerReaction(expressionName, durationMs = 2000, priority = PRIORITY.NORMAL) {
    if (this.isDestroyed || !this.wrapperEl) return;
    if (priority < this.activePriority) return; // Cannot interrupt higher priority

    if (this.reactionTimeout) {
      clearTimeout(this.reactionTimeout);
      this.reactionTimeout = null;
    }

    this.activePriority = priority;
    this.setExpression(expressionName, priority);

    this.reactionTimeout = setTimeout(() => {
      this.activePriority = 0;
      this.setExpression(EXPRESSIONS.NORMAL, PRIORITY.LOW);
    }, durationMs);
  }

  /* -------------------------------------------------------------
     BEHAVIOR MOTION ENGINE
     ------------------------------------------------------------- */
  triggerBehavior(behaviorClass, durationMs = 1200) {
    if (this.isDestroyed || !this.wrapperEl || this.prefersReducedMotion) return;

    this.clearBehavior();
    this.currentBehavior = behaviorClass;
    this.wrapperEl.classList.add(behaviorClass);

    setTimeout(() => {
      this.clearBehavior();
    }, durationMs);
  }

  clearBehavior() {
    if (!this.wrapperEl) return;
    Object.values(BEHAVIORS).forEach(b => this.wrapperEl.classList.remove(b));
    this.currentBehavior = null;
  }

  /* -------------------------------------------------------------
     WEIGHTED IDLE ENGINE
     ------------------------------------------------------------- */
  startIdleLoop() {
    if (this.isDestroyed || this.prefersReducedMotion) return;
    this.stopIdleLoop();

    // Random interval between 7 and 18 seconds
    const randomDelay = Math.floor(Math.random() * (18000 - 7000 + 1)) + 7000;

    this.idleTimer = setTimeout(() => {
      this.playRandomIdleBehavior();
      this.startIdleLoop();
    }, randomDelay);
  }

  stopIdleLoop() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  playRandomIdleBehavior() {
    if (this.activePriority > PRIORITY.LOW || this.prefersReducedMotion) return;

    // Weighted random selection:
    // Breathing (35%), Soft Hover (25%), Look Around (20%), Stretch (10%), Rotate (7%), Spin (3%)
    const roll = Math.random() * 100;

    if (roll < 35) {
      this.triggerBehavior(BEHAVIORS.BREATHING, 2400);
    } else if (roll < 60) {
      this.triggerBehavior(BEHAVIORS.HOVER, 1000);
      this.performBlink();
    } else if (roll < 80) {
      this.triggerBehavior(BEHAVIORS.LOOK_AROUND, 1600);
    } else if (roll < 90) {
      this.triggerBehavior(BEHAVIORS.STRETCH, 1100);
    } else if (roll < 97) {
      this.triggerBehavior(BEHAVIORS.ROTATE, 1400);
    } else {
      this.triggerBehavior(BEHAVIORS.SPIN, 1200);
      this.triggerReaction(EXPRESSIONS.HAPPY, 1400, PRIORITY.LOW);
      this.triggerSparkles(6);
    }
  }

  /* -------------------------------------------------------------
     PARTICLE SPARKLE / CONFETTI EMITTER
     ------------------------------------------------------------- */
  triggerSparkles(count = 12) {
    if (this.isDestroyed || !this.particlesContainer || this.prefersReducedMotion) return;

    const colors = ['#B7FF3C', '#E2FF66', '#FFFFFF', '#F59E0B', '#06B6D4'];

    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'mascot-particle';
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const distance = Math.floor(Math.random() * 28) + 18;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      const size = Math.floor(Math.random() * 3) + 2.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.backgroundColor = color;
      p.style.boxShadow = `0 0 6px ${color}`;
      p.style.setProperty('--tx', `${tx}px`);
      p.style.setProperty('--ty', `${ty}px`);

      this.particlesContainer.appendChild(p);

      setTimeout(() => {
        p.remove();
      }, 700);
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.stopIdleLoop();
    this.stopBlinkLoop();
    if (this.reactionTimeout) clearTimeout(this.reactionTimeout);
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.pointerMoveHandler) window.removeEventListener('pointermove', this.pointerMoveHandler);
    if (this.visibilityHandler) document.removeEventListener('visibilitychange', this.visibilityHandler);
    if (this.container) this.container.innerHTML = '';
  }

  // Static Factory Helper
  static mount(container, options = {}) {
    return new ReactiveLogo(container, options);
  }
}

export default ReactiveLogo;
