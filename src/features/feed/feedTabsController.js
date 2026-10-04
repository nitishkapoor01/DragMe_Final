/* ==========================================================================
   DRAGME FEATURE: FEED TABS (src/features/feed/feedTabsController.js)
   Two-Tier Social Feed Tab Slider animation with spring physics and sort filtering
   ========================================================================== */

import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';

export class FeedTabsController {
  constructor() {
    this.slider = null;
    this.tabs = [];
    this.initialized = false;
  }

  init() {
    this.slider = document.getElementById('feedTabSlider');
    this.tabs = Array.from(document.querySelectorAll('.feed-tab'));
    if (!this.tabs.length) return;

    // Initial positioning after DOM layout settles
    requestAnimationFrame(() => {
      this.updateSliderPosition(false);
      setTimeout(() => this.updateSliderPosition(false), 80);
    });

    // Window resize handler
    window.addEventListener('resize', () => {
      this.updateSliderPosition(false);
    });

    this.tabs.forEach(tab => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');

      const handlePress = () => { tab.style.transform = 'scale(0.96)'; };
      const handleRelease = () => { tab.style.transform = ''; };
      tab.addEventListener('mousedown', handlePress);
      tab.addEventListener('touchstart', handlePress, { passive: true });
      tab.addEventListener('mouseup', handleRelease);
      tab.addEventListener('mouseleave', handleRelease);
      tab.addEventListener('touchend', handleRelease);

      tab.addEventListener('click', (e) => {
        e.preventDefault();
        this.switchTab(tab);
      });
    });

    this.initialized = true;
  }

  updateSliderPosition(animated = true) {
    if (!this.slider) return;
    const activeTab = document.querySelector('.feed-tab.active') || this.tabs[0];
    if (!activeTab || activeTab.offsetWidth === 0) return;

    const targetWidth = Math.max(32, activeTab.offsetWidth * 0.76);
    const targetOffset = activeTab.offsetLeft + (activeTab.offsetWidth - targetWidth) / 2;

    if (!animated) {
      this.slider.style.transition = 'none';
      this.slider.style.width = `${targetWidth}px`;
      this.slider.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
      this.slider.style.opacity = '1';
    } else {
      this.slider.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), width 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease';
      this.slider.style.width = `${targetWidth}px`;
      this.slider.style.transform = `translate3d(${targetOffset}px, 0, 0)`;
      this.slider.style.opacity = '1';
    }
  }

  switchTab(tab) {
    const prevActive = document.querySelector('.feed-tab.active');
    if (tab === prevActive) return;

    sfx.playTap();

    this.tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    this.updateSliderPosition(true);

    const sort = tab.dataset.sort || 'hot';
    store.setSort(sort);
  }
}

export const feedTabs = new FeedTabsController();
export default feedTabs;

