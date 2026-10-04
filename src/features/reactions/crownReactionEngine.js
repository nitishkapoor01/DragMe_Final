/* ==========================================================================
   DRAGME FEATURE: CROWN REACTION ENGINE (src/features/reactions/crownReactionEngine.js)
   Server-Authoritative Crown & Super Crown Reactions, Picker Pill & Physics
   ========================================================================== */

import { reactionsApi } from '../../api/reactionsApi.js';
import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';
import { toast } from '../toast/toastManager.js';
import { authManager } from '../auth/authManager.js';
import { triggerEvent } from '../../utils/domUtils.js';
import { CROWN_STATES } from '../../constants/reactions.js';

export const CrownReactionEngine = {
  states: {},
  longPressTimer: null,
  longPressTriggered: false,
  activePicker: null,
  lastTapTimes: {},
  inFlight: {},

  reactionMeta: {
    crown: { icon: 'fa-solid fa-crown', label: 'Crown', color: '#B7FF3C' },
    fire: { icon: 'fa-solid fa-fire', label: 'Fire', color: '#FF7043' },
    insightful: { icon: 'fa-solid fa-lightbulb', label: 'Insightful', color: '#29B6F6' },
    support: { icon: 'fa-solid fa-handshake', label: 'Support', color: '#5C6BC0' },
    heartfelt: { icon: 'fa-solid fa-heart', label: 'Heartfelt', color: '#AB47BC' },
    mindblown: { icon: 'fa-solid fa-brain', label: 'Mind Blown', color: '#FFCA28' }
  },

  init() {
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.reaction-picker-pill') && !e.target.closest('.drag-crown-btn')) {
        this.closePicker();
      }
    });

    const postsStream = document.getElementById('postsStream');
    if (!postsStream) return;

    postsStream.addEventListener('pointerdown', (e) => {
      const crownBtn = e.target.closest('.drag-crown-btn');
      if (crownBtn) {
        const postId = crownBtn.dataset.id;
        crownBtn.classList.add('is-pressing');
        this.longPressTriggered = false;

        this.longPressTimer = setTimeout(() => {
          crownBtn.classList.remove('is-pressing');
          this.openPicker(crownBtn, postId);
        }, 450);
      }
    });

    const clearCrownPress = (e) => {
      const crownBtn = e.target.closest('.drag-crown-btn');
      if (crownBtn) {
        crownBtn.classList.remove('is-pressing');
      }
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    };

    postsStream.addEventListener('pointerup', clearCrownPress);
    postsStream.addEventListener('pointercancel', clearCrownPress);
    postsStream.addEventListener('pointerleave', clearCrownPress);

    postsStream.addEventListener('click', (e) => {
      const crownBtn = e.target.closest('.drag-crown-btn');
      if (!crownBtn) return;

      e.preventDefault();
      e.stopPropagation();

      if (this.longPressTriggered) {
        this.longPressTriggered = false;
        return;
      }

      const postId = crownBtn.dataset.id;
      if (!postId) return;

      const now = Date.now();
      const lastTap = this.lastTapTimes[postId] || 0;
      const isDoubleTap = now - lastTap < 320;
      this.lastTapTimes[postId] = now;

      if (isDoubleTap) {
        this.handleSuperCrownTap(crownBtn, postId);
      } else {
        setTimeout(() => {
          if (Date.now() - (this.lastTapTimes[postId] || 0) >= 300) {
            this.handleSingleTap(crownBtn, postId);
          }
        }, 310);
      }
    });
  },

  closePicker() {
    if (this.activePicker) {
      this.activePicker.classList.add('closing');
      setTimeout(() => {
        this.activePicker?.remove();
        this.activePicker = null;
      }, 180);
    }
  },

  spawnActivationRipple(btn) {
    const ripple = document.createElement('div');
    ripple.className = 'crown-activation-ripple';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 320);
  },

  spawnParticles(btn, isSuper = false, isGold = true) {
    const container = document.createElement('div');
    container.className = 'crown-particles-anchor';
    btn.appendChild(container);

    const count = isSuper ? 6 : 4;
    const angleStep = 360 / count;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = `crown-float-particle ${isGold || isSuper ? 'gold' : ''}`;
      particle.innerHTML = '<i class="fa-solid fa-crown"></i>';

      const angle = (angleStep * i) + (Math.random() * 20 - 10);
      const rad = (angle * Math.PI) / 180;
      const dist = isSuper ? 38 + Math.random() * 12 : 24 + Math.random() * 8;
      const tx = Math.cos(rad) * dist;
      const ty = Math.sin(rad) * dist - 16;
      const rot = (Math.random() * 50 - 25);

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.style.setProperty('--rot', `${rot}deg`);

      container.appendChild(particle);
    }

    setTimeout(() => container.remove(), 500);
  },

  spawnShockwave(btn) {
    const ring = document.createElement('div');
    ring.className = 'crown-shockwave-ring';
    btn.appendChild(ring);
    setTimeout(() => ring.remove(), 500);
  },

  showSupportFeedback(btn, message = 'You showed support.') {
    const existing = btn.querySelector('.support-feedback-pill');
    if (existing) existing.remove();

    const pill = document.createElement('div');
    pill.className = 'support-feedback-pill';
    pill.textContent = message;
    btn.appendChild(pill);
    setTimeout(() => pill.remove(), 1600);
  },

  rollCount(postId, newCount, isIncrement) {
    const countEl = document.getElementById(`crownCount-${postId}`);
    if (!countEl) return;
    countEl.classList.remove('roll-up', 'roll-down');
    void countEl.offsetWidth;
    countEl.textContent = newCount;
    countEl.classList.add(isIncrement ? 'roll-up' : 'roll-down');
  },

  updateButtonDOM(btn, { isVoted, reactionType = 'crown', isSuper = false, count }) {
    if (!btn) return;

    btn.classList.toggle('voted', isVoted);
    btn.classList.toggle('is-super', isSuper && isVoted);
    btn.setAttribute('aria-pressed', isVoted ? 'true' : 'false');
    btn.setAttribute('aria-label', isVoted ? 'Remove crown from this post' : 'Crown this post');

    Object.keys(this.reactionMeta).forEach(t => btn.classList.remove(`reaction-${t}`));
    if (isVoted) btn.classList.add(`reaction-${reactionType}`);

    if (count !== undefined) {
      const countEl = document.getElementById(`crownCount-${btn.dataset.id}`);
      if (countEl) countEl.textContent = count;
    }
  },

  openPicker(btn, postId) {
    this.closePicker();
    this.longPressTriggered = true;

    const picker = document.createElement('div');
    picker.className = 'reaction-picker-pill';
    picker.setAttribute('role', 'toolbar');
    picker.setAttribute('aria-label', 'Reaction picker');

    const reactions = ['crown', 'fire', 'insightful', 'support', 'heartfelt', 'mindblown'];
    picker.innerHTML = reactions.map(type => {
      const meta = this.reactionMeta[type];
      return `
        <button type="button" class="reaction-picker-item item-${type}" data-reaction="${type}" title="${meta.label}" aria-label="${meta.label}">
          <i class="${meta.icon}"></i>
        </button>
      `;
    }).join('');

    picker.querySelectorAll('.reaction-picker-item').forEach(item => {
      item.addEventListener('mouseenter', () => {
        sfx.playCrownTap();
        sfx.triggerHaptic('light');
      });

      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const reactionType = item.dataset.reaction || 'crown';
        this.closePicker();
        await this.handleReactionSelection(btn, postId, reactionType);
      });
    });

    btn.parentNode.style.position = 'relative';
    btn.parentNode.appendChild(picker);
    this.activePicker = picker;
    sfx.playTap();
  },

  async handleSingleTap(btn, postId) {
    if (this.inFlight[postId]) return;

    if (!authManager.isAuthenticated()) {
      authManager.requireAuth({ type: 'vote', postId }, 'Sign in to award crowns and boost community creators.');
      return;
    }

    const posts = store.getState().posts;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const currentlyVoted = Boolean(post.hasVoted);
    const targetVoted = !currentlyVoted;
    const prevCount = post.dragCount || 0;
    const newCount = targetVoted ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Optimistic UI update
    this.updateButtonDOM(btn, { isVoted: targetVoted, reactionType: 'crown', isSuper: false, count: newCount });
    this.rollCount(postId, newCount, targetVoted);

    if (targetVoted) {
      sfx.playCrownBurst();
      sfx.triggerHaptic('medium');
      this.spawnActivationRipple(btn);
      this.spawnParticles(btn, false, true);
    } else {
      sfx.playTap();
      sfx.triggerHaptic('light');
    }

    this.inFlight[postId] = true;
    try {
      const res = await reactionsApi.reactToPost(postId, {
        reactionType: 'crown',
        isSuper: false,
        remove: !targetVoted
      });

      store.updatePost(postId, {
        hasVoted: res.hasVoted,
        reactionType: res.reactionType,
        isSuper: res.isSuper,
        dragCount: res.dragCount,
        heatPercent: res.heatPercent
      });
    } catch (err) {
      // Rollback
      this.updateButtonDOM(btn, { isVoted: currentlyVoted, reactionType: post.reactionType || 'crown', isSuper: post.isSuper, count: prevCount });
      this.rollCount(postId, prevCount, !targetVoted);
      toast.error('Could not update crown reaction.');
    } finally {
      this.inFlight[postId] = false;
    }
  },

  async handleSuperCrownTap(btn, postId) {
    if (this.inFlight[postId]) return;

    if (!authManager.isAuthenticated()) {
      authManager.requireAuth({ type: 'vote', postId }, 'Sign in to award Super Crowns.');
      return;
    }

    const posts = store.getState().posts;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const prevCount = post.dragCount || 0;
    const newCount = post.hasVoted ? prevCount : prevCount + 1;

    // Optimistic UI
    this.updateButtonDOM(btn, { isVoted: true, reactionType: post.reactionType || 'fire', isSuper: true, count: newCount });
    sfx.playSuperCrown();
    sfx.triggerHaptic('super');
    this.spawnShockwave(btn);
    this.spawnParticles(btn, true, true);
    this.showSupportFeedback(btn, 'Super Crown Awarded! ⚡');

    this.inFlight[postId] = true;
    try {
      const res = await reactionsApi.reactToPost(postId, {
        reactionType: post.reactionType || 'fire',
        isSuper: true,
        switchOnly: true
      });

      store.updatePost(postId, {
        hasVoted: res.hasVoted,
        reactionType: res.reactionType,
        isSuper: res.isSuper,
        dragCount: res.dragCount,
        heatPercent: res.heatPercent
      });
    } catch (err) {
      toast.error('Could not award Super Crown.');
    } finally {
      this.inFlight[postId] = false;
    }
  },

  async handleReactionSelection(btn, postId, reactionType) {
    if (this.inFlight[postId]) return;

    if (!authManager.isAuthenticated()) {
      authManager.requireAuth({ type: 'vote', postId }, 'Sign in to react.');
      return;
    }

    const posts = store.getState().posts;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const prevCount = post.dragCount || 0;
    const newCount = post.hasVoted ? prevCount : prevCount + 1;

    this.updateButtonDOM(btn, { isVoted: true, reactionType, isSuper: false, count: newCount });
    sfx.playCrownBurst();
    sfx.triggerHaptic('medium');
    this.spawnActivationRipple(btn);
    this.spawnParticles(btn, false, reactionType === 'crown');

    this.inFlight[postId] = true;
    try {
      const res = await reactionsApi.reactToPost(postId, {
        reactionType,
        isSuper: false,
        switchOnly: true
      });

      store.updatePost(postId, {
        hasVoted: res.hasVoted,
        reactionType: res.reactionType,
        isSuper: res.isSuper,
        dragCount: res.dragCount,
        heatPercent: res.heatPercent
      });
    } catch (err) {
      toast.error('Could not apply reaction.');
    } finally {
      this.inFlight[postId] = false;
    }
  }
};
