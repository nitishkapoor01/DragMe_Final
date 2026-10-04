/* ==========================================================================
   DRAGME CORE: CANONICAL APPLICATION ENTRY POINT (src/main.js)
   Server-Authoritative, Modular, Scalable & Enterprise-Grade Frontend Bootstrap
   ========================================================================== */

// 1. Core State & Router
import { store } from './app/store.js';
import { router } from './app/router.js';
import { apiClient } from './api/apiClient.js';

// 2. Services
import { AvatarService, GUEST_SILHOUETTE_SVG, ANONYMOUS_MASK_SVG } from './services/avatarService.js';
import { sfx } from './services/sfxService.js';
import { AnimationScheduler, MediaDeliveryManager } from './services/animationScheduler.js';

// 3. Features & Components
import { authManager, AuthPromptManager, LoginManager, SignupManager, LogoutManager } from './features/auth/index.js';
import { navbar, bottomNav, sidebar } from './features/navigation/index.js';
import { feedManager, feedTabs } from './features/feed/index.js';
import { createPostModal } from './features/posts/index.js';
import { commentsSheet } from './features/comments/index.js';
import { CrownReactionEngine, WhoReactedModal } from './features/reactions/index.js';
import { profileManager, editProfileManager, mediaStudioManager } from './features/profile/index.js';
import { toast } from './features/toast/toastManager.js';
import { dragmeMascot } from './components/index.js';

// 4. Platform Layers (Desktop & Mobile)
import { desktopLayout } from './platforms/desktop/index.js';
import { mobileLayout } from './platforms/mobile/index.js';
import { PlatformDetector } from './core/index.js';

class DragmeApplication {
  constructor() {
    this.store = store;
    this.router = router;
    this.api = apiClient;
    this.sfx = sfx;
    this.toast = toast;
    this.auth = authManager;
  }

  async init() {
    console.log('⚡ [DRAGME Engine] Bootstrapping Unified Enterprise Social Arena v5.0...');

    // 1. Expose globals for backward-compatibility & inline DOM handlers
    this.bindGlobals();

    // 2. Initialize Navigation & Layout Controllers
    navbar.init();
    bottomNav.init();
    sidebar.init();
    desktopLayout.init();
    mobileLayout.init();
    dragmeMascot.init();
    toast.init();

    // 3. Initialize Auth Subsystems
    AuthPromptManager.init();
    LoginManager.init();
    SignupManager.init();
    LogoutManager.init();

    // 4. Initialize Core Feed, Post, Comments & Reaction Subsystems
    feedTabs.init();
    feedManager.init();
    createPostModal.init();
    commentsSheet.init();
    CrownReactionEngine.init();
    WhoReactedModal.init();

    // 5. Initialize Profile Subsystems
    profileManager.init();
    editProfileManager.init();
    mediaStudioManager.init();

    // 6. Register Application Routes
    this.registerRoutes();

    // 7. Check User Session & Remove Splash
    await authManager.checkSession();

    // 8. Start Router
    router.init();

    console.log('✅ [DRAGME Engine] Application Architecture Initialized Successfully.');
  }

  registerRoutes() {
    const homeFeed = document.getElementById('homeFeedContainer');
    const profileView = document.getElementById('profileViewContainer');
    const loginView = document.getElementById('loginPageView');
    const signupView = document.getElementById('signupPageView');
    const editProfileView = document.getElementById('editProfilePageView');
    const appLayoutGrid = document.getElementById('appLayoutGrid');
    const topNav = document.getElementById('topNav');
    const mobileBottomNav = document.getElementById('mobileBottomNav');

    const showArenaView = (viewType) => {
      // Show main arena layout and navbars
      if (appLayoutGrid) appLayoutGrid.style.display = 'flex';
      if (topNav) topNav.style.display = 'flex';
      if (mobileBottomNav) mobileBottomNav.style.display = '';

      // Hide standalone fullscreen pages
      if (loginView) loginView.style.display = 'none';
      if (signupView) signupView.style.display = 'none';
      if (editProfileView) editProfileView.style.display = 'none';

      // Switch between Home Feed and Profile Arena inside main content flow
      if (viewType === 'profile') {
        if (homeFeed) homeFeed.style.display = 'none';
        if (profileView) profileView.style.display = 'block';
      } else {
        if (homeFeed) homeFeed.style.display = 'block';
        if (profileView) profileView.style.display = 'none';
      }
    };

    const showStandaloneView = (viewElement) => {
      // Hide arena layout and top/bottom bars for standalone fullscreen pages
      if (appLayoutGrid) appLayoutGrid.style.display = 'none';
      if (topNav) topNav.style.display = 'none';
      if (mobileBottomNav) mobileBottomNav.style.display = 'none';

      [loginView, signupView, editProfileView].forEach(v => {
        if (v) v.style.display = 'none';
      });
      if (viewElement) viewElement.style.display = 'flex';
    };

    router.on('feed', () => {
      showArenaView('feed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    router.on('home', () => {
      showArenaView('feed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    router.on('profile/:username', (params) => {
      showArenaView('profile');
      profileManager.loadProfile(params.username);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    router.on('profile', () => {
      if (authManager.isAuthenticated()) {
        router.navigate(`profile/${authManager.currentUser.username}`);
      } else {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to access your profile arena.');
      }
    });

    router.on('edit-profile', () => {
      if (authManager.isAuthenticated()) {
        showStandaloneView(editProfileView);
        editProfileManager.open();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to edit your profile arena.');
      }
    });

    router.on('login', () => {
      showStandaloneView(loginView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    router.on('signup', () => {
      showStandaloneView(signupView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  bindGlobals() {
    if (typeof window !== 'undefined') {
      window.DRAGME_APP = this;
      window.DRAGME_STORE = this.store;
      window.GUEST_SILHOUETTE_SVG = GUEST_SILHOUETTE_SVG;
      window.ANONYMOUS_MASK_SVG = ANONYMOUS_MASK_SVG;
      window.AvatarService = AvatarService;
      window.sfx = sfx;
      window.showToast = (msg, opts) => toast.info(msg, opts);
      window.CreatePostModal = createPostModal;
      window.AuthManager = authManager;
      window.Router = router;
      window.renderFeed = () => feedManager.renderFeed(true);
      window.openCommentsDrawer = (postId) => commentsSheet.open(postId);
    }
  }
}

export const app = new DragmeApplication();

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }
}

export default app;
