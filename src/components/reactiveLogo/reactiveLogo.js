/* ==========================================================================
   DRAGME COMPONENT: REACTIVE LOGO / MASCOT SYSTEM (src/components/reactiveLogo/reactiveLogo.js)
   Official DRAGME Origami Crown Brand Mascot & Micro-Expression Engine
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
  SETTLE: 'behavior-settle'
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
      size: options.size || 'md', // 'sm' (22px), 'md' (36px), 'lg' (64px), 'xl' (96px)
      enableIdle: options.enableIdle !== false,
      enableEvents: options.enableEvents !== false,
      interactive: options.interactive !== false,
      initialExpression: options.initialExpression || EXPRESSIONS.NORMAL,
      ...options
    };

    this.currentExpression = this.options.initialExpression;
    this.currentBehavior = null;
    this.activePriority = 0;
    this.reactionTimeout = null;
    this.idleTimer = null;
    this.isDestroyed = false;
    this.prefersReducedMotion = false;

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

    if (this.options.enableIdle && !this.prefersReducedMotion) {
      this.startIdleLoop();
    }

    // React to visibility changes so background tabs don't waste timers
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopIdleLoop();
      } else if (this.options.enableIdle && !this.prefersReducedMotion) {
        this.startIdleLoop();
      }
    });
  }

  checkReducedMotion() {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.prefersReducedMotion = mediaQuery.matches;
      mediaQuery.addEventListener?.('change', (e) => {
        this.prefersReducedMotion = e.matches;
        if (this.prefersReducedMotion) {
          this.stopIdleLoop();
          this.clearBehavior();
        } else if (this.options.enableIdle) {
          this.startIdleLoop();
        }
      });
    }
  }

  getSvgTemplate() {
    return `
      <div class="reactive-logo-wrap size-${this.options.size}" data-expression="${this.currentExpression}">
        <svg class="reactive-crown-svg" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <!-- Ambient Glow Filter -->
            <filter id="crownNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            <!-- Origami Facet Linear Gradients -->
            <linearGradient id="facetCenterGrad" x1="60" y1="8" x2="60" y2="78" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#E2FF66" />
              <stop offset="60%" stop-color="#B7FF3C" />
              <stop offset="100%" stop-color="#84CC16" />
            </linearGradient>

            <linearGradient id="facetLeftGrad" x1="10" y1="24" x2="60" y2="78" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#C8FF4D" />
              <stop offset="100%" stop-color="#4D7C0F" />
            </linearGradient>

            <linearGradient id="facetRightGrad" x1="110" y1="24" x2="60" y2="78" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#B7FF3C" />
              <stop offset="100%" stop-color="#3F6212" />
            </linearGradient>

            <linearGradient id="facetFoldGrad" x1="60" y1="62" x2="60" y2="92" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#B7FF3C" />
              <stop offset="100%" stop-color="#65A30D" />
            </linearGradient>

            <!-- Radial Aura -->
            <radialGradient id="haloPulseGrad" cx="60" cy="50" r="45" gradientUnits="userSpaceOnUse">
              <stop offset="60%" stop-color="rgba(183, 255, 60, 0)" />
              <stop offset="100%" stop-color="rgba(183, 255, 60, 0.45)" />
            </radialGradient>
          </defs>

          <!-- Outer Pulsing Aura Ring (For Loading/Achievements) -->
          <circle class="crown-aura-ring" cx="60" cy="50" r="46" stroke="url(#haloPulseGrad)" stroke-width="2" stroke-dasharray="8 6" opacity="0" />

          <!-- Back Point / Left Wing -->
          <polygon class="origami-facet facet-left-wing" points="10,24 24,62 18,90" fill="url(#facetLeftGrad)" stroke="#D9FF66" stroke-width="1.2" stroke-linejoin="round" />

          <!-- Back Point / Right Wing -->
          <polygon class="origami-facet facet-right-wing" points="110,24 96,62 102,90" fill="url(#facetRightGrad)" stroke="#D9FF66" stroke-width="1.2" stroke-linejoin="round" />

          <!-- Center Facet / Main Face Plane -->
          <polygon class="origami-facet facet-center-body" points="60,8 24,62 60,78 96,62" fill="url(#facetCenterGrad)" stroke="#F0FF99" stroke-width="1.5" stroke-linejoin="round" filter="url(#crownNeonGlow)" />

          <!-- Bottom Fold Plate -->
          <polygon class="origami-facet facet-bottom-fold" points="18,90 24,62 60,78 96,62 102,90 60,86" fill="url(#facetFoldGrad)" stroke="#A3E635" stroke-width="1.2" stroke-linejoin="round" />

          <!-- ==========================================================
               EMBEDDED MASCOT MICRO-EXPRESSION FACE GROUP
               ========================================================== -->
          <g class="mascot-face-group" transform="translate(0, 0)">
            
            <!-- Cheek Blushes (Visible in happy, love, excited, nervous) -->
            <g class="mascot-blush-group" opacity="0">
              <ellipse cx="40" cy="62" rx="4" ry="2.2" fill="#FF4757" opacity="0.6" />
              <ellipse cx="80" cy="62" rx="4" ry="2.2" fill="#FF4757" opacity="0.6" />
            </g>

            <!-- Eyes Layer -->
            <g class="mascot-eyes-group">
              <!-- Normal / Dot Eyes (Default) -->
              <g class="eye-shape shape-normal">
                <circle class="eye-left" cx="48" cy="54" r="3.2" fill="#080B0F" />
                <circle class="eye-right" cx="72" cy="54" r="3.2" fill="#080B0F" />
                <!-- Sparkle highlights -->
                <circle cx="49.2" cy="52.8" r="1.1" fill="#FFFFFF" />
                <circle cx="73.2" cy="52.8" r="1.1" fill="#FFFFFF" />
              </g>

              <!-- Happy / Arcs Eyes (^^) -->
              <g class="eye-shape shape-happy" opacity="0">
                <path d="M 44 56 Q 48 49 52 56" stroke="#080B0F" stroke-width="2.6" stroke-linecap="round" fill="none" />
                <path d="M 68 56 Q 72 49 76 56" stroke="#080B0F" stroke-width="2.6" stroke-linecap="round" fill="none" />
              </g>

              <!-- Excited / Sparkle Star Eyes -->
              <g class="eye-shape shape-excited" opacity="0">
                <path d="M 48 50 L 49.5 53.5 L 53 54 L 49.5 54.5 L 48 58 L 46.5 54.5 L 43 54 L 46.5 53.5 Z" fill="#080B0F" />
                <path d="M 72 50 L 73.5 53.5 L 77 54 L 73.5 54.5 L 72 58 L 70.5 54.5 L 67 54 L 70.5 53.5 Z" fill="#080B0F" />
              </g>

              <!-- Wink Eyes (> •) -->
              <g class="eye-shape shape-wink" opacity="0">
                <path d="M 44 52 L 52 55 L 44 58" stroke="#080B0F" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                <circle cx="72" cy="54" r="3.2" fill="#080B0F" />
                <circle cx="73.2" cy="52.8" r="1.1" fill="#FFFFFF" />
              </g>

              <!-- Sleepy / Chill Eyes (- -) -->
              <g class="eye-shape shape-sleepy" opacity="0">
                <line x1="44" y1="54" x2="52" y2="54" stroke="#080B0F" stroke-width="2.4" stroke-linecap="round" />
                <line x1="68" y1="54" x2="76" y2="54" stroke="#080B0F" stroke-width="2.4" stroke-linecap="round" />
              </g>

              <!-- Surprised / Wide Eyes (O O) -->
              <g class="eye-shape shape-surprised" opacity="0">
                <circle cx="48" cy="53" r="4.5" fill="#080B0F" />
                <circle cx="72" cy="53" r="4.5" fill="#080B0F" />
                <circle cx="49" cy="51.5" r="1.6" fill="#FFFFFF" />
                <circle cx="73" cy="51.5" r="1.6" fill="#FFFFFF" />
              </g>

              <!-- Angry / Intense Eyes (\ /) -->
              <g class="eye-shape shape-angry" opacity="0">
                <path d="M 44 51 L 52 56" stroke="#080B0F" stroke-width="2.8" stroke-linecap="round" />
                <path d="M 76 51 L 68 56" stroke="#080B0F" stroke-width="2.8" stroke-linecap="round" />
              </g>

              <!-- Sad / Drooping Eyes -->
              <g class="eye-shape shape-sad" opacity="0">
                <path d="M 44 56 Q 48 60 52 56" stroke="#080B0F" stroke-width="2.4" stroke-linecap="round" fill="none" />
                <path d="M 68 56 Q 72 60 76 56" stroke="#080B0F" stroke-width="2.4" stroke-linecap="round" fill="none" />
              </g>

              <!-- Cool / Dark Sunglasses -->
              <g class="eye-shape shape-cool" opacity="0">
                <path d="M 40 50 L 55 50 L 53 58 L 42 58 Z" fill="#080B0F" rx="2" />
                <path d="M 65 50 L 80 50 L 78 58 L 67 58 Z" fill="#080B0F" rx="2" />
                <line x1="55" y1="52" x2="65" y2="52" stroke="#080B0F" stroke-width="2" />
                <!-- Sunglasses glass glare -->
                <line x1="43" y1="52" x2="49" y2="56" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity="0.7" />
                <line x1="68" y1="52" x2="74" y2="56" stroke="#FFFFFF" stroke-width="1" stroke-linecap="round" opacity="0.7" />
              </g>

              <!-- Love / Heart Eyes -->
              <g class="eye-shape shape-love" opacity="0">
                <path d="M 48 51 C 45 47, 41 51, 48 58 C 55 51, 51 47, 48 51 Z" fill="#FF4757" />
                <path d="M 72 51 C 69 47, 65 51, 72 58 C 79 51, 75 47, 72 51 Z" fill="#FF4757" />
              </g>

              <!-- Squint / Focus Eyes (> <) -->
              <g class="eye-shape shape-squint" opacity="0">
                <path d="M 44 52 L 51 55 L 44 58" stroke="#080B0F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
                <path d="M 76 52 L 69 55 L 76 58" stroke="#080B0F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none" />
              </g>
            </g>

            <!-- Mouth Layer -->
            <g class="mascot-mouth-group">
              <!-- Normal / Subtle Smile (Default) -->
              <path class="mouth-shape mouth-normal" d="M 56 64 Q 60 67 64 64" stroke="#080B0F" stroke-width="2" stroke-linecap="round" fill="none" />
              
              <!-- Big Smile / Laughing -->
              <path class="mouth-shape mouth-laugh" d="M 55 63 Q 60 70 65 63 Z" fill="#080B0F" opacity="0" />
              
              <!-- Surprised / Round Open Mouth (o) -->
              <ellipse class="mouth-shape mouth-open" cx="60" cy="65" rx="3" ry="3.8" fill="#080B0F" opacity="0" />
              
              <!-- Frown / Sad -->
              <path class="mouth-shape mouth-frown" d="M 56 66 Q 60 62 64 66" stroke="#080B0F" stroke-width="2" stroke-linecap="round" fill="none" opacity="0" />

              <!-- Playful Cat / 3-mouth -->
              <path class="mouth-shape mouth-playful" d="M 54 64 Q 57 67 60 64 Q 63 67 66 64" stroke="#080B0F" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0" />
            </g>

          </g>

          <!-- ==========================================================
               FLOATING EMOTE / ACCESSORY BADGES
               ========================================================== -->
          <g class="mascot-accessories-group">
            <!-- Curious Question Mark (?) -->
            <g class="accessory-badge badge-curious" opacity="0" transform="translate(86, 12)">
              <circle cx="8" cy="8" r="9" fill="rgba(11, 15, 23, 0.9)" stroke="#B7FF3C" stroke-width="1.2" />
              <text x="8" y="12" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="11" fill="#B7FF3C" text-anchor="middle">?</text>
            </g>

            <!-- Confused Squiggle (~) -->
            <g class="accessory-badge badge-confused" opacity="0" transform="translate(86, 12)">
              <circle cx="8" cy="8" r="9" fill="rgba(11, 15, 23, 0.9)" stroke="#F59E0B" stroke-width="1.2" />
              <text x="8" y="11" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="12" fill="#F59E0B" text-anchor="middle">~</text>
            </g>

            <!-- Thinking Dots (...) -->
            <g class="accessory-badge badge-thinking" opacity="0" transform="translate(84, 12)">
              <rect x="0" y="2" width="22" height="12" rx="6" fill="rgba(11, 15, 23, 0.9)" stroke="#94A3B8" stroke-width="1.2" />
              <circle cx="5" cy="8" r="1.5" fill="#B7FF3C" />
              <circle cx="11" cy="8" r="1.5" fill="#B7FF3C" />
              <circle cx="17" cy="8" r="1.5" fill="#B7FF3C" />
            </g>

            <!-- Angry Mark (💢) -->
            <g class="accessory-badge badge-angry" opacity="0" transform="translate(88, 14)">
              <path d="M 3 3 L 7 7 M 7 3 L 3 7 M 1 5 L 9 5 M 5 1 L 5 9" stroke="#FF4757" stroke-width="2.2" stroke-linecap="round" />
            </g>

            <!-- Sleepy Zzz -->
            <g class="accessory-badge badge-sleepy" opacity="0" transform="translate(86, 6)">
              <text x="0" y="8" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="8" fill="#94A3B8">z</text>
              <text x="5" y="5" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="10" fill="#B7FF3C">Z</text>
              <text x="12" y="1" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="12" fill="#E2FF66">z</text>
            </g>

            <!-- Notification Alert Mark (!) -->
            <g class="accessory-badge badge-notif" opacity="0" transform="translate(86, 12)">
              <circle cx="8" cy="8" r="9" fill="#FF4757" stroke="#FFFFFF" stroke-width="1.5" filter="drop-shadow(0 0 6px rgba(255, 71, 87, 0.8))" />
              <text x="8" y="12" font-family="'Plus Jakarta Sans', sans-serif" font-weight="900" font-size="11" fill="#FFFFFF" text-anchor="middle">!</text>
            </g>

            <!-- Achievement Gold Halo / Star Crown (👑✨) -->
            <g class="accessory-badge badge-achievement" opacity="0" transform="translate(48, -12)">
              <path d="M 4 10 L 8 4 L 12 8 L 16 4 L 20 10 Z" fill="#F59E0B" stroke="#FDE047" stroke-width="1.2" filter="drop-shadow(0 0 8px rgba(245, 158, 11, 0.9))" />
              <circle cx="2" cy="3" r="1.2" fill="#FFFFFF" />
              <circle cx="22" cy="3" r="1.2" fill="#FFFFFF" />
            </g>

            <!-- Sweat Drop (💧) -->
            <g class="accessory-badge badge-nervous" opacity="0" transform="translate(88, 16)">
              <path d="M 6 0 C 6 0, 1 7, 1 10 C 1 12.8, 3.2 15, 6 15 C 8.8 15, 11 12.8, 11 10 C 11 7, 6 0, 6 0 Z" fill="#06B6D4" opacity="0.9" />
            </g>
          </g>

        </svg>
      </div>
    `;
  }

  render() {
    this.container.innerHTML = this.getSvgTemplate();
    this.wrapperEl = this.container.querySelector('.reactive-logo-wrap');
    this.svgEl = this.container.querySelector('.reactive-crown-svg');
    this.applyExpression(this.currentExpression);
  }

  bindDOMEvents() {
    if (!this.options.interactive || !this.wrapperEl) return;

    this.wrapperEl.addEventListener('mouseenter', () => {
      this.triggerReaction(EXPRESSIONS.HAPPY, 1200, PRIORITY.NORMAL);
      this.triggerBehavior(BEHAVIORS.HOVER, 800);
    });

    this.wrapperEl.addEventListener('mousedown', () => {
      this.triggerReaction(EXPRESSIONS.EXCITED, 600, PRIORITY.NORMAL);
    });

    this.wrapperEl.addEventListener('click', (e) => {
      this.triggerReaction(EXPRESSIONS.LAUGHING, 1000, PRIORITY.NORMAL);
    });
  }

  bindSystemEvents() {
    // 1. Post Creation Celebration
    eventBus.on('dragme:post:created', () => {
      this.triggerReaction(EXPRESSIONS.EXCITED, 2800, PRIORITY.HIGH);
      this.triggerBehavior(BEHAVIORS.SPIN, 900);
    });

    // 2. System Toast Notifications
    eventBus.on('dragme:toast', (data) => {
      const type = data?.type || 'info';
      if (type === 'error') {
        this.triggerReaction(EXPRESSIONS.ANGRY, 2400, PRIORITY.HIGH);
      } else if (type === 'success') {
        this.triggerReaction(EXPRESSIONS.HAPPY, 2000, PRIORITY.HIGH);
      } else if (type === 'warning') {
        this.triggerReaction(EXPRESSIONS.SURPRISED, 2000, PRIORITY.HIGH);
      } else {
        this.triggerReaction(EXPRESSIONS.CURIOUS, 1800, PRIORITY.NORMAL);
      }
    });

    // 3. New Notification or Direct Message
    eventBus.on('dragme:notification:new', () => {
      this.triggerReaction(EXPRESSIONS.SURPRISED, 2500, PRIORITY.HIGH);
      this.showBadge('notif', 2500);
    });

    eventBus.on('dragme:message:received', () => {
      this.triggerReaction(EXPRESSIONS.CURIOUS, 2200, PRIORITY.HIGH);
    });

    // 4. Milestone Reactions & Super Crowns
    eventBus.on('dragme:reaction:supercrown', () => {
      this.triggerReaction(EXPRESSIONS.EXCITED, 3000, PRIORITY.CRITICAL);
      this.triggerBehavior(BEHAVIORS.SPIN, 1200);
      this.showBadge('achievement', 3000);
    });

    // 5. App Loaded / Welcome Intro
    eventBus.on('dragme:app:loaded', () => {
      this.triggerReaction(EXPRESSIONS.HAPPY, 2200, PRIORITY.NORMAL);
      this.triggerBehavior(BEHAVIORS.BREATHING, 2000);
    });
  }

  /* -------------------------------------------------------------
     EXPRESSION STATE MACHINE
     ------------------------------------------------------------- */
  setExpression(expressionName, priority = PRIORITY.NORMAL) {
    if (this.isDestroyed || !this.wrapperEl) return;
    if (priority < this.activePriority) return; // Discard lower priority

    this.currentExpression = expressionName;
    this.applyExpression(expressionName);
  }

  applyExpression(expr) {
    if (!this.wrapperEl) return;
    this.wrapperEl.setAttribute('data-expression', expr);

    // Hide all eye shapes, show target
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
        this.showElement('.shape-happy');
        this.showElement('.mouth-laugh');
        if (blush) blush.setAttribute('opacity', '1');
        break;

      case EXPRESSIONS.CURIOUS:
        this.showElement('.shape-normal');
        this.showElement('.mouth-playful');
        this.showElement('.badge-curious');
        break;

      case EXPRESSIONS.CONFUSED:
        this.showElement('.shape-wink');
        this.showElement('.mouth-frown');
        this.showElement('.badge-confused');
        break;

      case EXPRESSIONS.THINKING:
        this.showElement('.shape-squint');
        this.showElement('.mouth-normal');
        this.showElement('.badge-thinking');
        break;

      case EXPRESSIONS.SAD:
        this.showElement('.shape-sad');
        this.showElement('.mouth-frown');
        break;

      case EXPRESSIONS.ANGRY:
        this.showElement('.shape-angry');
        this.showElement('.mouth-frown');
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
        this.showElement('.mouth-playful');
        break;

      case EXPRESSIONS.LOVE:
        this.showElement('.shape-love');
        this.showElement('.mouth-laugh');
        if (blush) blush.setAttribute('opacity', '1');
        break;

      case EXPRESSIONS.NERVOUS:
        this.showElement('.shape-squint');
        this.showElement('.mouth-frown');
        this.showElement('.badge-nervous');
        if (blush) blush.setAttribute('opacity', '1');
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
        if (badge) badge.setAttribute('opacity', '0');
      }, duration);
    }
  }

  /* -------------------------------------------------------------
     TEMPORARY EVENT REACTION (With Priority Queue & Auto-Restore)
     ------------------------------------------------------------- */
  triggerReaction(expressionName, durationMs = 2000, priority = PRIORITY.NORMAL) {
    if (this.isDestroyed || !this.wrapperEl) return;
    if (priority < this.activePriority) return; // Cannot interrupt higher priority

    // Clear previous pending restore timeout
    if (this.reactionTimeout) {
      clearTimeout(this.reactionTimeout);
      this.reactionTimeout = null;
    }

    const prevExpression = this.currentExpression;
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

    // Random interval between 8 and 20 seconds
    const randomDelay = Math.floor(Math.random() * (20000 - 8000 + 1)) + 8000;

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
    // Breathing (35%), Hover (25%), Look Around (20%), Stretch (10%), Rotate (7%), Spin (3%)
    const roll = Math.random() * 100;

    if (roll < 35) {
      this.triggerBehavior(BEHAVIORS.BREATHING, 2200);
    } else if (roll < 60) {
      this.triggerBehavior(BEHAVIORS.HOVER, 1000);
      // Quick blink micro-expression
      this.showElement('.shape-wink');
      setTimeout(() => this.applyExpression(this.currentExpression), 220);
    } else if (roll < 80) {
      this.triggerBehavior(BEHAVIORS.LOOK_AROUND, 1600);
    } else if (roll < 90) {
      this.triggerBehavior(BEHAVIORS.STRETCH, 1100);
    } else if (roll < 97) {
      this.triggerBehavior(BEHAVIORS.ROTATE, 1400);
    } else {
      this.triggerBehavior(BEHAVIORS.SPIN, 1200);
      this.triggerReaction(EXPRESSIONS.HAPPY, 1400, PRIORITY.LOW);
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.stopIdleLoop();
    if (this.reactionTimeout) clearTimeout(this.reactionTimeout);
    if (this.container) this.container.innerHTML = '';
  }

  // Static Factory Helper
  static mount(container, options = {}) {
    return new ReactiveLogo(container, options);
  }
}

export default ReactiveLogo;
