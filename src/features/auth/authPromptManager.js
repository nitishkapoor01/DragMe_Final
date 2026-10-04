/* ==========================================================================
   DRAGME FEATURE: AUTH PROMPT (src/features/auth/authPromptManager.js)
   Intercept modal shown to guests attempting authenticated actions
   ========================================================================== */

import { authManager } from './authManager.js';
import { sfx } from '../../services/sfxService.js';
import { router } from '../../app/router.js';

export const AuthPromptManager = {
  modal: null,
  titleEl: null,
  subEl: null,

  init() {
    this.modal = document.getElementById('guestAuthPromptModal');
    this.titleEl = document.getElementById('promptModalTitle');
    this.subEl = document.getElementById('promptModalSubtitle');

    const closeBtn = document.getElementById('closeGuestPromptBtn');
    closeBtn?.addEventListener('click', () => this.close());

    const continueBtn = document.getElementById('btnPromptContinueBrowsing');
    continueBtn?.addEventListener('click', () => this.close());

    const loginBtn = document.getElementById('btnPromptLogin');
    loginBtn?.addEventListener('click', () => {
      this.close();
      router.navigate('login');
    });

    const signupBtn = document.getElementById('btnPromptSignup');
    signupBtn?.addEventListener('click', () => {
      this.close();
      router.navigate('signup');
    });

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    window.addEventListener('dragme:auth:prompt', (e) => {
      const { title, subtitle, intent } = e.detail || {};
      this.open({ title, subtitle, intent });
    });
  },

  open({ title = 'Join the conversation', subtitle = 'Create an account or log in to interact on DRAGME.', intent = null } = {}) {
    if (this.titleEl && title) this.titleEl.textContent = title;
    if (this.subEl && subtitle) this.subEl.textContent = subtitle;
    if (intent) authManager.setPendingIntent(intent);
    if (this.modal) this.modal.style.display = 'flex';
    sfx.playOpen();
  },

  close() {
    if (this.modal) this.modal.style.display = 'none';
    sfx.playClose();
  }
};
