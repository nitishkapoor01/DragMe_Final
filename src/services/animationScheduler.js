/* ==========================================================================
   DRAGME CLIENT SERVICE: ANIMATION & MEDIA SCHEDULER (src/services/animationScheduler.js)
   Viewport Intersection, Priority Concurrency Budgeting & Dynamic Video Control
   ========================================================================== */

import { AvatarService } from './avatarService.js';

export const MediaDeliveryManager = {
  isMobile: typeof window !== 'undefined' && (window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)),
  prefersReducedMotion: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,

  getMaxActiveAnimations() {
    if (this.prefersReducedMotion) return 0;
    return this.isMobile ? 4 : 10;
  },

  getOptimalUrl(variants, containerWidth = 512) {
    if (!variants) return null;
    if (typeof variants === 'string') return variants;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const effectiveWidth = Math.round(containerWidth * Math.min(dpr, 2));

    if (effectiveWidth <= 64 && variants.xs) return variants.xs;
    if (effectiveWidth <= 128 && (variants.sm || variants.xs)) return variants.sm || variants.xs;
    if (effectiveWidth <= 256 && (variants.md || variants.sm)) return variants.md || variants.sm;
    if (effectiveWidth <= 512 && (variants.md || variants.full)) return variants.md || variants.full;
    if (effectiveWidth <= 1080 && (variants.lg || variants.full)) return variants.lg || variants.full;
    if (effectiveWidth <= 1440 && (variants.xl || variants.full)) return variants.xl || variants.full;

    return variants.full || variants.original || variants.md || variants.sm || Object.values(variants)[0];
  }
};

export const AnimationScheduler = {
  registry: new Map(),
  observer: null,
  isScheduled: false,

  PRIORITIES: {
    HIGH: 3,    // Hero banner, focused modal, active studio preview
    MEDIUM: 2,  // Visible feed cards, nearby avatars
    LOW: 1      // Partially visible elements, decorative cosmetics
  },

  init() {
    if (this.observer || typeof IntersectionObserver === 'undefined') return;

    if (typeof window !== 'undefined' && window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery.addEventListener('change', (e) => {
        MediaDeliveryManager.prefersReducedMotion = e.matches;
        this.requestSchedule();
      });
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.registry.forEach(entry => {
            if (entry.isActive && entry.isVideo && entry.el instanceof HTMLMediaElement) {
              entry.el.pause();
            }
          });
        } else {
          this.requestSchedule();
        }
      });
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const item = this.registry.get(entry.target);
        if (!item) return;

        item.isVisible = entry.isIntersecting;
        item.ratio = entry.intersectionRatio;
      });
      this.requestSchedule();
    }, {
      threshold: [0.0, 0.2, 0.5, 0.8, 1.0],
      rootMargin: '80px 0px 80px 0px'
    });
  },

  register(el, options = {}) {
    if (!el || !(el instanceof Element)) return;
    if (!this.observer) this.init();

    const priority = options.priority !== undefined ? options.priority : this.PRIORITIES.MEDIUM;
    const isVideo = el.tagName === 'VIDEO' || Boolean(options.isVideo);
    const posterUrl = options.posterUrl || el.getAttribute('poster') || el.dataset?.posterUrl || null;
    const animUrl = options.animUrl || el.dataset?.animUrl || (isVideo ? el.src : null);

    const entry = {
      el,
      priority,
      posterUrl,
      animUrl,
      isVideo,
      isVisible: false,
      isActive: false,
      ratio: 0
    };

    this.registry.set(el, entry);
    if (this.observer) this.observer.observe(el);
    this.requestSchedule();
  },

  unregister(el) {
    if (!el || !this.registry.has(el)) return;
    if (this.observer) this.observer.unobserve(el);
    this.registry.delete(el);
    this.requestSchedule();
  },

  requestSchedule() {
    if (this.isScheduled) return;
    this.isScheduled = true;
    requestAnimationFrame(() => {
      this.isScheduled = false;
      this.runBudgetCycle();
    });
  },

  runBudgetCycle() {
    const maxBudget = MediaDeliveryManager.getMaxActiveAnimations();
    const visibleCandidates = [];

    this.registry.forEach(item => {
      if (item.isVisible && item.ratio > 0.05) {
        const score = (item.priority * 10) + item.ratio;
        visibleCandidates.push({ item, score });
      } else {
        this.deactivate(item);
      }
    });

    visibleCandidates.sort((a, b) => b.score - a.score);

    visibleCandidates.forEach((candidate, index) => {
      if (index < maxBudget) {
        this.activate(candidate.item);
      } else {
        this.deactivate(candidate.item);
      }
    });
  },

  activate(item) {
    if (item.isActive) {
      if (item.isVideo && item.el instanceof HTMLMediaElement && item.el.paused) {
        item.el.play().catch(() => {});
      }
      return;
    }

    item.isActive = true;

    if (item.isVideo && item.el instanceof HTMLMediaElement) {
      item.el.autoplay = true;
      item.el.loop = true;
      item.el.muted = true;
      item.el.playsInline = true;
      if (item.animUrl && !AvatarService.isSameUrl(item.el, item.animUrl)) {
        item.el.src = item.animUrl;
        item.el.dataset.activeSrc = item.animUrl;
        item.el.load();
      }
      item.el.play().catch(() => {});
    } else if (item.el.tagName === 'IMG') {
      if (item.animUrl && !AvatarService.isSameUrl(item.el, item.animUrl)) {
        item.el.src = item.animUrl;
        item.el.dataset.activeSrc = item.animUrl;
      }
    }
  },

  deactivate(item) {
    if (!item.isActive) return;
    item.isActive = false;

    if (item.isVideo && item.el instanceof HTMLMediaElement) {
      item.el.pause();
    } else if (item.el.tagName === 'IMG') {
      if (item.posterUrl && !AvatarService.isSameUrl(item.el, item.posterUrl)) {
        item.el.src = item.posterUrl;
        item.el.dataset.activeSrc = item.posterUrl;
      }
    }
  }
};

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AnimationScheduler.init());
  } else {
    AnimationScheduler.init();
  }
}
