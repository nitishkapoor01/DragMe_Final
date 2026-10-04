/* ==========================================================================
   DRAGME FEATURE: AUTH MANAGER (src/features/auth/authManager.js)
   Server-Authoritative Session Lifecycle, Intent Persistence & Interceptors
   ========================================================================== */

import { authApi } from '../../api/authApi.js';
import { store } from '../../app/store.js';
import { toast } from '../toast/toastManager.js';
import { AvatarService } from '../../services/avatarService.js';
import { triggerEvent } from '../../utils/domUtils.js';

export class AuthManager {
  constructor() {
    this.currentUser = null;
    this.authStatus = 'loading'; // 'loading' | 'authenticated' | 'unauthenticated' | 'error'
    this.pendingIntent = null;
  }

  isAuthenticated() {
    return this.authStatus === 'authenticated' && Boolean(this.currentUser);
  }

  getAuthStatus() {
    return this.authStatus;
  }

  setPendingIntent(intent) {
    this.pendingIntent = intent;
    try {
      if (intent) {
        sessionStorage.setItem('dragme_auth_intent', JSON.stringify(intent));
      } else {
        sessionStorage.removeItem('dragme_auth_intent');
      }
    } catch (e) {}
  }

  getPendingIntent() {
    if (this.pendingIntent) return this.pendingIntent;
    try {
      const saved = sessionStorage.getItem('dragme_auth_intent');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  clearPendingIntent() {
    this.pendingIntent = null;
    try {
      sessionStorage.removeItem('dragme_auth_intent');
    } catch (e) {}
  }

  setSession(token, user) {
    this.currentUser = user;
    this.authStatus = 'authenticated';
    store.setUser(user);
    this.updateUserSessionUI();
    this.executePendingIntent();
    triggerEvent('dragme:auth:success', { user });
  }

  clearSession() {
    authApi.logout();
    this.currentUser = null;
    this.authStatus = 'unauthenticated';
    store.setUser(null);
    this.clearPendingIntent();
    this.updateUserSessionUI();
    triggerEvent('dragme:auth:logout');
  }

  async checkSession() {
    this.authStatus = 'loading';
    try {
      const data = await authApi.getSession();
      if (data && data.user) {
        this.currentUser = data.user;
        this.authStatus = 'authenticated';
        store.setUser(data.user);
      } else {
        this.currentUser = null;
        this.authStatus = 'unauthenticated';
        store.setUser(null);
      }
    } catch (err) {
      this.currentUser = null;
      this.authStatus = 'unauthenticated';
      store.setUser(null);
    } finally {
      this.updateUserSessionUI();
      // Remove splash loader once auth check finishes
      const splash = document.getElementById('appInitSplash');
      if (splash) {
        splash.classList.add('splash-fade-out');
        setTimeout(() => splash.remove(), 400);
      }
    }
  }

  updateUserSessionUI() {
    const user = this.currentUser;
    const guestNav = document.getElementById('guestNavRight');
    const authNav = document.getElementById('authNavRight');
    const navAvatar = document.getElementById('navHeaderUserAvatar');
    const mobAvatar = document.getElementById('mobNavUserAvatar');
    const quickAvatar = document.getElementById('quickCreateAvatar');
    const mobIdentityAvatar = document.getElementById('mobIdentityAvatar');
    const navScore = document.getElementById('userCookedVal') || document.getElementById('userCookedScore');
    const sbName = document.getElementById('sbUserName');
    const sbHandle = document.getElementById('sbUserHandle') || document.getElementById('sbUserTag');
    const sbAvatar = document.getElementById('sbUserAvatar');
    const sbBadge = document.getElementById('sbUserBadgeMini');

    // Drawer elements
    const drawerAvatar = document.getElementById('drawerUserAvatar');
    const drawerName = document.getElementById('drawerUserName');
    const drawerBadge = document.getElementById('drawerUserBadge');
    const drawerHandle = document.getElementById('drawerUserHandle');
    const glassStatCooked = document.getElementById('glassStatCooked');
    const glassStatStreak = document.getElementById('glassStatStreak');
    const btnDrawerLogOut = document.getElementById('btnDrawerLogOut');
    const btnDrawerSignIn = document.getElementById('btnDrawerSignIn');
    const btnDrawerSignUp = document.getElementById('btnDrawerSignUp');

    if (user) {
      if (guestNav) guestNav.style.display = 'none';
      if (authNav) authNav.style.display = 'flex';

      if (navAvatar) AvatarService.apply(navAvatar, user);
      if (mobAvatar) AvatarService.apply(mobAvatar, user);
      if (quickAvatar) AvatarService.apply(quickAvatar, user);
      if (mobIdentityAvatar) AvatarService.apply(mobIdentityAvatar, user);
      if (sbAvatar) AvatarService.apply(sbAvatar, user);
      if (drawerAvatar) AvatarService.apply(drawerAvatar, user);

      const cookedVal = user.cooked_ratio !== undefined ? user.cooked_ratio : (user.cookedRatio !== undefined ? user.cookedRatio : 82);
      const streakVal = user.streak !== undefined ? user.streak : 14;
      if (navScore) navScore.textContent = cookedVal;
      if (glassStatCooked) glassStatCooked.innerHTML = `${cookedVal} <span class="stat-arrow-up">↑</span>`;
      if (glassStatStreak) glassStatStreak.innerHTML = `${streakVal} <span class="stat-arrow-up">↑</span>`;

      const dName = user.display_name || user.displayName || user.username || 'Nitish Kapoor';
      if (sbName) sbName.textContent = dName;
      if (sbHandle) sbHandle.textContent = `@${user.username}`;
      if (sbBadge) {
        sbBadge.textContent = user.role === 'admin' ? 'ADMIN' : (user.is_premium || user.is_nitro ? 'VIP' : 'PRO');
      }
      if (drawerName) drawerName.textContent = dName;
      if (drawerBadge) drawerBadge.textContent = user.rank_title || user.rankTitle || 'Senior Roaster';
      if (drawerHandle) drawerHandle.textContent = `@${user.username}`;

      if (btnDrawerLogOut) btnDrawerLogOut.style.display = 'flex';
      if (btnDrawerSignIn) btnDrawerSignIn.style.display = 'none';
      if (btnDrawerSignUp) btnDrawerSignUp.style.display = 'none';
    } else {
      if (guestNav && window.innerWidth > 768) guestNav.style.display = 'flex';
      if (authNav) authNav.style.display = 'none';

      if (navAvatar) AvatarService.apply(navAvatar, null);
      if (mobAvatar) AvatarService.apply(mobAvatar, null);
      if (quickAvatar) AvatarService.apply(quickAvatar, null);
      if (mobIdentityAvatar) AvatarService.apply(mobIdentityAvatar, null);
      if (sbAvatar) AvatarService.apply(sbAvatar, null);
      if (drawerAvatar) AvatarService.apply(drawerAvatar, null);

      if (sbName) sbName.textContent = 'Guest Visitor';
      if (sbHandle) sbHandle.textContent = 'Join arena';
      if (sbBadge) sbBadge.textContent = 'GUEST';
      if (drawerName) drawerName.textContent = 'Guest Visitor';
      if (drawerBadge) drawerBadge.textContent = 'Explorer';
      if (drawerHandle) drawerHandle.textContent = '@guest';
      if (glassStatCooked) glassStatCooked.innerHTML = `0 <span class="stat-arrow-up">↑</span>`;
      if (glassStatStreak) glassStatStreak.innerHTML = `0 <span class="stat-arrow-up">↑</span>`;

      if (btnDrawerLogOut) btnDrawerLogOut.style.display = 'none';
      if (btnDrawerSignIn) btnDrawerSignIn.style.display = 'flex';
      if (btnDrawerSignUp) btnDrawerSignUp.style.display = 'flex';
    }
  }

  requireAuth(intent, subtitle = 'Create an account or log in to interact on DRAGME.', title = 'Join the conversation') {
    if (this.isAuthenticated()) {
      return true;
    }
    this.setPendingIntent(intent);
    triggerEvent('dragme:auth:prompt', { title, subtitle, intent });
    return false;
  }

  executePendingIntent() {
    const intent = this.getPendingIntent();
    if (!intent) return;
    this.clearPendingIntent();

    setTimeout(() => {
      triggerEvent('dragme:intent:execute', { intent });
    }, 150);
  }
}

export const authManager = new AuthManager();
export default authManager;
