/* ==========================================================================
   DRAGME FEATURE: BOTTOM NAV (src/features/navigation/bottomNav.js)
   Mobile bottom dock navigation and mobile center create FAB
   ========================================================================== */

import { router } from '../../app/router.js';
import { sfx } from '../../services/sfxService.js';
import { authManager } from '../auth/authManager.js';

export class BottomNavController {
  constructor() {
    this.bottomNav = null;
    this.navItems = [];
    this.fabBtn = null;
  }

  init() {
    this.bottomNav = document.getElementById('mobileBottomNav');
    this.navItems = Array.from(document.querySelectorAll('.mob-nav-item'));
    this.fabBtn = document.getElementById('mobNavPlusTrigger') || document.getElementById('mobCreateFab');

    this.bindEvents();
    this.bindScrollCollapse();
  }

  bindEvents() {
    // Tap on collapsed docked capsule re-expands it smoothly first
    this.bottomNav?.addEventListener('click', (e) => {
      if (this.bottomNav.classList.contains('nav-collapsed')) {
        e.preventDefault();
        e.stopPropagation();
        this.bottomNav.classList.remove('nav-collapsed');
        sfx.playTap();
      }
    }, true);

    this.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        if (this.bottomNav?.classList.contains('nav-collapsed')) return;

        const target = item.dataset.nav || item.dataset.target;
        if (!target) return;

        sfx.playTap();
        this.setActive(item);

        if (target === 'home' || target === 'feed') {
          document.getElementById('topNav')?.classList.remove('top-nav-scrolled');
          this.bottomNav?.classList.remove('nav-collapsed');
          router.navigate('feed');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (target === 'search') {
          const searchOverlay = document.getElementById('mobileSearchOverlay');
          if (searchOverlay) {
            searchOverlay.style.display = 'block';
            setTimeout(() => document.getElementById('mobileSearchInput')?.focus(), 80);
          }
        } else if (target === 'rooms') {
          const drawer = document.getElementById('leftNavDrawer');
          const backdrop = document.getElementById('sidebarMobileBackdrop');
          drawer?.classList.add('open', 'mobile-open');
          backdrop?.classList.add('active');
          const toggleBtn = document.getElementById('toggleSidebarBtn');
          if (toggleBtn) toggleBtn.classList.add('active', 'is-open');
        } else if (target === 'messages') {
          toast.info('💬 Direct Messages & Live Room Chat active.');
        } else if (target === 'profile') {
          if (!authManager.isAuthenticated()) {
            authManager.requireAuth({ type: 'profile' }, 'Sign in to view and customize your DRAGME arena profile.');
          } else {
            const profileDrawer = document.getElementById('dragmeProfileDrawerHub');
            if (profileDrawer) {
              authManager.updateUserSessionUI();
              profileDrawer.classList.add('active', 'open');
              profileDrawer.setAttribute('aria-hidden', 'false');
              sfx.playOpen();
            } else {
              router.navigate(`profile/${authManager.currentUser.username}`);
            }
          }
        }
      });
    });

    this.fabBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      sfx.playOpen();
      import('../../core/eventBus.js').then(({ eventBus }) => {
        eventBus.emit('dragme:modal:createPost:open');
      });
    });
  }

  bindScrollCollapse() {
    let lastScrollY = window.scrollY || 0;
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || 0;
          const topNav = document.getElementById('topNav');
          const isMobile = window.innerWidth <= 860;

          if (isMobile) {
            // Header scroll effect threshold
            if (currentScrollY > 40) {
              topNav?.classList.add('top-nav-scrolled');
            } else {
              topNav?.classList.remove('top-nav-scrolled');
            }

            // Bottom bar collapse into docked profile capsule
            const diff = currentScrollY - lastScrollY;
            if (diff > 12 && currentScrollY > 70) {
              // Scrolling down
              if (this.bottomNav && !this.bottomNav.classList.contains('nav-collapsed')) {
                this.bottomNav.classList.add('nav-collapsed');
              }
            } else if (diff < -8 || currentScrollY <= 40) {
              // Scrolling up or near top
              if (this.bottomNav && this.bottomNav.classList.contains('nav-collapsed')) {
                this.bottomNav.classList.remove('nav-collapsed');
              }
            }
          } else {
            topNav?.classList.remove('top-nav-scrolled');
            this.bottomNav?.classList.remove('nav-collapsed');
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  setActive(targetItem) {
    this.navItems.forEach(i => i.classList.remove('active'));
    if (targetItem) targetItem.classList.add('active');
  }
}

export const bottomNav = new BottomNavController();
export default bottomNav;
