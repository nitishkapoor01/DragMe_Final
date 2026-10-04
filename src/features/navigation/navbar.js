/* ==========================================================================
   DRAGME FEATURE: NAVBAR (src/features/navigation/navbar.js)
   Top application bar, drawer toggle, search input and branding
   ========================================================================== */

import { router } from '../../app/router.js';
import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';
import { authManager } from '../auth/authManager.js';
import { toast } from '../toast/toastManager.js';
import { ReactiveLogo, EXPRESSIONS, BEHAVIORS } from '../../components/reactiveLogo/reactiveLogo.js';

export class NavbarController {
  constructor() {
    this.topNav = null;
    this.toggleBtn = null;
    this.brandLogo = null;
    this.reactiveLogo = null;
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

    // Mount Reactive Brand Logo Mascot
    const crownWrap = document.querySelector('#brandLogo .logo-crown-wrap');
    if (crownWrap) {
      this.reactiveLogo = ReactiveLogo.mount(crownWrap, { size: 'sm', enableIdle: true, enableEvents: true });
    }

    this.bindEvents();
    this.bindProfileDrawer();
  }

  bindEvents() {
    // Brand Logo -> Go Home / Feed & Direct Top Scroll
    this.brandLogo?.addEventListener('click', (e) => {
      e.preventDefault();
      sfx.playTap();

      this.reactiveLogo?.triggerReaction(EXPRESSIONS.LAUGHING, 1200);
      this.reactiveLogo?.triggerBehavior(BEHAVIORS.SPIN, 800);

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
    const heroCard = document.getElementById('drawerUserHeroCard');
    const btnMyProfile = document.getElementById('btnDrawerMyProfile');
    const btnMobViewProfile = document.getElementById('btnMobViewProfile');
    const btnEditProfile = document.getElementById('btnDrawerEditProfile');
    const btnDrafts = document.getElementById('btnDrawerDrafts');
    const btnAchievements = document.getElementById('btnDrawerAchievements');
    const btnBookmarks = document.getElementById('btnDrawerBookmarks');
    const btnActivity = document.getElementById('btnDrawerActivity');
    const btnAppearance = document.getElementById('btnDrawerAppearance');
    const btnSettings = document.getElementById('btnDrawerSettings');
    const btnHelp = document.getElementById('btnDrawerHelp');
    const btnSignIn = document.getElementById('btnDrawerSignIn');
    const btnSignUp = document.getElementById('btnDrawerSignUp');
    const btnLogOut = document.getElementById('btnDrawerLogOut');
    const panel = document.getElementById('dragmeProfileDrawerPanel');

    this.drawerMascot = null;
    const drawerMascotWrap = document.getElementById('drawerMascotLogoWrap');
    if (drawerMascotWrap) {
      this.drawerMascot = ReactiveLogo.mount(drawerMascotWrap, { size: 'xl', enableIdle: true, enableEvents: true });
    }

    // Bind Mascot Mood Pills Controller
    const moodPills = document.querySelectorAll('.btn-mascot-mood-pill');
    moodPills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        sfx.playTap();
        const mood = pill.dataset.mood;
        moodPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        if (this.drawerMascot) {
          this.drawerMascot.setExpression(mood, 3);
          this.drawerMascot.triggerBehavior(BEHAVIORS.HOVER, 600);
        }
        if (this.reactiveLogo) {
          this.reactiveLogo.setExpression(mood, 3);
        }
      });
    });

    // Clicking Drawer Mascot triggers spin & confetti
    drawerMascotWrap?.addEventListener('click', (e) => {
      e.stopPropagation();
      sfx.playTap();
      this.drawerMascot?.triggerReaction(EXPRESSIONS.LAUGHING, 1400);
      this.drawerMascot?.triggerBehavior(BEHAVIORS.SPIN, 1000);
      this.drawerMascot?.triggerSparkles(16);
    });

    const openDrawer = () => {
      if (this.profileDrawer) {
        authManager.updateUserSessionUI();
        this.profileDrawer.classList.add('active', 'open');
        this.profileDrawer.setAttribute('aria-hidden', 'false');
        sfx.playOpen();

        if (this.drawerMascot) {
          this.drawerMascot.triggerReaction(EXPRESSIONS.HAPPY, 1800);
          this.drawerMascot.triggerBehavior(BEHAVIORS.HOVER, 800);
        }
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

    // Mobile Swipe-Down to Dismiss Bottom Sheet
    let touchStartY = 0;
    let touchCurrentY = 0;
    let isSwiping = false;

    panel?.addEventListener('touchstart', (e) => {
      if (window.innerWidth <= 860) {
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
      }
    }, { passive: true });

    panel?.addEventListener('touchmove', (e) => {
      if (!isSwiping || window.innerWidth > 860) return;
      touchCurrentY = e.touches[0].clientY;
      const diffY = touchCurrentY - touchStartY;
      if (diffY > 0 && panel.scrollTop <= 0) {
        panel.style.transform = `translateY(${diffY}px)`;
      }
    }, { passive: true });

    panel?.addEventListener('touchend', () => {
      if (!isSwiping || window.innerWidth > 860) return;
      isSwiping = false;
      const diffY = touchCurrentY - touchStartY;
      if (diffY > 80 && panel.scrollTop <= 0) {
        panel.style.transform = '';
        closeDrawer();
      } else {
        panel.style.transform = '';
      }
      touchStartY = 0;
      touchCurrentY = 0;
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
    btnMyProfile?.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateToUserProfile();
    });
    btnMobViewProfile?.addEventListener('click', navigateToUserProfile);

    btnEditProfile?.addEventListener('click', () => {
      closeDrawer();
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to edit your profile.');
      } else {
        router.navigate('edit-profile');
      }
    });

    btnDrafts?.addEventListener('click', () => {
      closeDrawer();
      toast.info('Drafts (3) — Offline post drafts available in compose modal.');
    });

    btnAchievements?.addEventListener('click', () => {
      closeDrawer();
      if (authManager.isAuthenticated()) {
        router.navigate(`profile/${authManager.currentUser.username}`);
      } else {
        toast.info('DRAGME Achievements: 8 badges unlocked.');
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

    btnAppearance?.addEventListener('click', () => {
      toast.success('Appearance: DRAGME Obsidian Dark (Default)');
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
