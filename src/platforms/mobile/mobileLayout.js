/* ==========================================================================
   DRAGME PLATFORM: MOBILE LAYOUT CONTROLLER (src/platforms/mobile/mobileLayout.js)
   Mobile-specific bottom dock navigation, gesture drawer & viewport adaptation
   ========================================================================== */

import { router } from '../../app/router.js';
import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';
import { authManager } from '../../features/auth/authManager.js';
import { eventBus } from '../../core/eventBus.js';
import { toast } from '../../features/toast/toastManager.js';

export class MobileLayoutController {
  constructor() {
    this.bottomNav = null;
    this.navItems = [];
    this.fabBtn = null;
    this.toggleBtn = null;
    this.drawer = null;
    this.backdrop = null;
    this.searchOverlay = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    this.searchOverlay = document.getElementById('mobileSearchOverlay');
    this.bindMobileSearch();

    this.isInitialized = true;
  }

  bindMobileSearch() {
    const searchInput = document.getElementById('mobileSearchInput');
    const clearBtn = document.getElementById('mobClearSearchBtn');
    const closeBtn = document.getElementById('mobSearchCloseBtn');

    closeBtn?.addEventListener('click', () => {
      this.closeMobileSearch();
    });

    let debounceTimer = null;
    searchInput?.addEventListener('input', (e) => {
      const val = e.target.value;
      if (clearBtn) clearBtn.style.display = val ? 'block' : 'none';
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        store.setSearchQuery(val);
      }, 250);
    });

    clearBtn?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      if (clearBtn) clearBtn.style.display = 'none';
      store.setSearchQuery('');
    });
  }

  openMobileSearch() {
    if (this.searchOverlay) {
      this.searchOverlay.style.display = 'block';
      sfx.playOpen();
      const input = document.getElementById('mobileSearchInput');
      setTimeout(() => input?.focus(), 80);
    }
  }

  closeMobileSearch() {
    if (this.searchOverlay) {
      this.searchOverlay.style.display = 'none';
      sfx.playClose();
    }
  }

  setActiveItem(targetItem) {
    this.navItems.forEach(i => i.classList.remove('active'));
    if (targetItem) targetItem.classList.add('active');
  }
}

export const mobileLayout = new MobileLayoutController();
export default mobileLayout;
