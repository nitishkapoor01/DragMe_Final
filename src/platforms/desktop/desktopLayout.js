/* ==========================================================================
   DRAGME PLATFORM: DESKTOP LAYOUT CONTROLLER (src/platforms/desktop/desktopLayout.js)
   Desktop-specific presentation, 3-column arena grid & keyboard navigation
   ========================================================================== */

import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';
import { eventBus } from '../../core/eventBus.js';

export class DesktopLayoutController {
  constructor() {
    this.searchInput = null;
    this.clearSearchBtn = null;
    this.createBtn = null;
    this.profileDropdownBtn = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    this.searchInput = document.getElementById('globalSearchInput');
    this.clearSearchBtn = document.getElementById('clearSearchBtn');
    this.createBtn = document.getElementById('btn-header-create-post');
    this.profileDropdownBtn = document.getElementById('userProfileDropdown');

    this.bindKeyboardShortcuts();
    this.bindSearch();

    this.isInitialized = true;
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Global '/' focus search shortcut (desktop only, ignored when typing in inputs)
      if (e.key === '/' && document.activeElement !== this.searchInput && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        this.searchInput?.focus();
      }

      // 'Escape' key closes open modals / clears search
      if (e.key === 'Escape') {
        if (document.activeElement === this.searchInput && this.searchInput?.value) {
          this.searchInput.value = '';
          store.setSearchQuery('');
          if (this.clearSearchBtn) this.clearSearchBtn.style.display = 'none';
        }
      }
    });
  }

  bindSearch() {
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
  }
}

export const desktopLayout = new DesktopLayoutController();
export default desktopLayout;
