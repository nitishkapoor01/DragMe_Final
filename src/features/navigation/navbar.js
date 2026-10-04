/* ==========================================================================
   DRAGME FEATURE: NAVBAR (src/features/navigation/navbar.js)
   Top application bar, drawer toggle, search input and branding
   ========================================================================== */

import { router } from '../../app/router.js';
import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';
import { authManager } from '../auth/authManager.js';
import { toast } from '../toast/toastManager.js';

export class NavbarController {
  constructor() {
    this.topNav = null;
    this.toggleBtn = null;
    this.brandLogo = null;
    this.searchInput = null;
    this.clearSearchBtn = null;
    this.createBtn = null;
    this.profileDrawer = null;
  }

  init() {
    this.topNav = document.getElementById('topNav');
    this.toggleBtn = document.getElementById('toggleSidebarBtn');
    this.brandLogo = document.getElementById('brandLogo');
    this.searchInput = document.getElementById('globalSearchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.createBtn = document.getElementById('btn-header-create-post');
    this.profileDrawer = document.getElementById('dragmeProfileDrawerHub');

    this.bindEvents();
    this.bindProfileDrawer();
  }

  bindEvents() {
    // Brand Logo -> Go Home / Feed & Direct Top Scroll
    this.brandLogo?.addEventListener('click', (e) => {
      e.preventDefault();
      sfx.playTap();

      // Clear any mobile touch focus so monochromatic state returns cleanly
      this.brandLogo?.blur();
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }

      // Reset collapsed header & bottom nav states
      document.getElementById('topNav')?.classList.remove('top-nav-scrolled');
      document.getElementById('mobileBottomNav')?.classList.remove('nav-collapsed');

      // Close open mobile drawer & search overlay if active
      document.getElementById('leftNavDrawer')?.classList.remove('open', 'mobile-open');
      document.getElementById('sidebarMobileBackdrop')?.classList.remove('active');
      document.getElementById('toggleSidebarBtn')?.classList.remove('active', 'is-open');
      const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
      if (mobileSearchOverlay) mobileSearchOverlay.style.display = 'none';

      // Smoothly scroll directly to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Navigate to feed
      router.navigate('feed');
    });

    // Guest Header Buttons
    document.getElementById('btnGuestHeaderLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      sfx.playTap();
      router.navigate('login');
    });

    document.getElementById('btnGuestHeaderSignup')?.addEventListener('click', (e) => {
      e.preventDefault();
      sfx.playTap();
      router.navigate('signup');
    });

    // Header Badges / Buttons
    document.getElementById('cookedMeterBadge')?.addEventListener('click', () => {
      sfx.playTap();
      const user = authManager.currentUser;
      const score = user ? (user.cooked_ratio || 100) : 12;
      toast.info(`🔥 Cooked Meter: ${score}% • High-energy battle reputation score.`);
    });

    document.getElementById('chatBtn')?.addEventListener('click', () => {
      sfx.playTap();
      toast.info('💬 Direct Messages & Live Room Chat active.');
    });

    document.getElementById('notifBtn')?.addEventListener('click', () => {
      sfx.playTap();
      toast.info('🔔 You are up to date! 3 unread activity mentions.');
    });

    // Toggle Left Drawer / Sidebar
    this.toggleBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const drawer = document.getElementById('leftNavDrawer');
      const backdrop = document.getElementById('sidebarMobileBackdrop');
      if (!drawer) return;

      const isMobile = window.innerWidth <= 860;
      if (isMobile) {
        const isOpen = drawer.classList.contains('open') || drawer.classList.contains('mobile-open');
        if (isOpen) {
          drawer.classList.remove('open', 'mobile-open');
          backdrop?.classList.remove('active');
          this.toggleBtn?.classList.remove('active', 'is-open');
          sfx.playClose();
        } else {
          drawer.classList.add('open', 'mobile-open');
          backdrop?.classList.add('active');
          this.toggleBtn?.classList.add('active', 'is-open');
          sfx.playOpen();
        }
      } else {
        const isCollapsed = drawer.classList.contains('collapsed');
        if (isCollapsed) {
          drawer.classList.remove('collapsed');
          this.toggleBtn?.classList.remove('active', 'is-open');
          sfx.playOpen();
        } else {
          drawer.classList.add('collapsed');
          this.toggleBtn?.classList.add('active', 'is-open');
          sfx.playClose();
        }
      }
    });

    // Global Search Input with debounce
    let searchDebounce = null;
    this.searchInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (this.clearSearchBtn) {
        this.clearSearchBtn.style.display = val.length > 0 ? 'inline-flex' : 'none';
      }
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        store.setSearchQuery(val);
      }, 250);
    });

    this.clearSearchBtn?.addEventListener('click', () => {
      if (this.searchInput) {
        this.searchInput.value = '';
        this.searchInput.focus();
      }
      if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none';
      store.setSearchQuery('');
    });

    // Keyboard shortcut /
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== this.searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        this.searchInput?.focus();
      }
    });
  }

  bindProfileDrawer() {
    const dropdownBtn = document.getElementById('userProfileDropdown');
    const closeBtn = document.getElementById('btnCloseGlassProfileDrawer');
    const heroCard = document.getElementById('drawerUserHeroCard');
    const btnMyProfile = document.getElementById('btnDrawerMyProfile');
    const btnMyConfessions = document.getElementById('btnDrawerMyConfessions');
    const btnEditProfile = document.getElementById('btnDrawerEditProfile');
    const btnBookmarks = document.getElementById('btnDrawerBookmarks');
    const btnActivity = document.getElementById('btnDrawerActivity');
    const btnSettings = document.getElementById('btnDrawerSettings');
    const btnHelp = document.getElementById('btnDrawerHelp');
    const btnSignIn = document.getElementById('btnDrawerSignIn');
    const btnSignUp = document.getElementById('btnDrawerSignUp');
    const btnLogOut = document.getElementById('btnDrawerLogOut');

    const openDrawer = () => {
      if (this.profileDrawer) {
        authManager.updateUserSessionUI();
        this.profileDrawer.classList.add('active', 'open');
        this.profileDrawer.setAttribute('aria-hidden', 'false');
        sfx.playOpen();
      }
    };

    const closeDrawer = () => {
      if (this.profileDrawer) {
        this.profileDrawer.classList.remove('active', 'open');
        this.profileDrawer.setAttribute('aria-hidden', 'true');
        sfx.playClose();
      }
    };

    dropdownBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDrawer();
    });

    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
    });

    this.profileDrawer?.addEventListener('click', (e) => {
      if (e.target === this.profileDrawer) {
        closeDrawer();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && (this.profileDrawer?.classList.contains('open') || this.profileDrawer?.classList.contains('active'))) {
        closeDrawer();
      }
    });

    const navigateToUserProfile = () => {
      closeDrawer();
      if (authManager.isAuthenticated()) {
        router.navigate(`profile/${authManager.currentUser.username}`);
      } else {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to access your profile arena.');
      }
    };

    heroCard?.addEventListener('click', navigateToUserProfile);
    btnMyProfile?.addEventListener('click', navigateToUserProfile);

    btnMyConfessions?.addEventListener('click', () => {
      closeDrawer();
      store.setRoom('confessions');
      router.navigate('feed');
      toast.info('Switched to Anonymous Confessions arena.');
    });

    btnEditProfile?.addEventListener('click', () => {
      closeDrawer();
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to edit your profile.');
      } else {
        router.navigate('edit-profile');
      }
    });

    btnBookmarks?.addEventListener('click', () => {
      closeDrawer();
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to view your bookmarks.');
      } else {
        router.navigate(`profile/${authManager.currentUser.username}`);
        const savedTabBtn = document.querySelector('.profile-tab-btn[data-tab="saved"]');
        if (savedTabBtn) savedTabBtn.click();
      }
    });

    btnActivity?.addEventListener('click', () => {
      closeDrawer();
      if (authManager.isAuthenticated()) {
        router.navigate(`profile/${authManager.currentUser.username}`);
      }
    });

    btnSettings?.addEventListener('click', () => {
      closeDrawer();
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to access settings.');
      } else {
        router.navigate('edit-profile');
      }
    });

    btnHelp?.addEventListener('click', () => {
      closeDrawer();
      toast.info('DRAGME Help: Share roasts, drop unfiltered hot takes, or post anonymously!');
    });

    btnSignIn?.addEventListener('click', () => {
      closeDrawer();
      router.navigate('login');
    });

    btnSignUp?.addEventListener('click', () => {
      closeDrawer();
      router.navigate('signup');
    });

    btnLogOut?.addEventListener('click', () => {
      closeDrawer();
      const logoutModal = document.getElementById('logoutConfirmModal');
      if (logoutModal) {
        logoutModal.style.display = 'flex';
        sfx.playOpen();
      }
    });
  }
}

export const navbar = new NavbarController();
export default navbar;
