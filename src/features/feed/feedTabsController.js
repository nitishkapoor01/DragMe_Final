/* ==========================================================================
   DRAGME FEATURE: FEED TABS (src/features/feed/feedTabsController.js)
   Top feed tab slider animation with spring physics and sort filtering
   ========================================================================== */

import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';

export class FeedTabsController {
  constructor() {
    this.slider = null;
    this.tabs = [];
    this.collapseTimer = null;
  }

  init() {
    this.slider = document.getElementById('feedTabSlider');
    this.tabs = Array.from(document.querySelectorAll('.feed-tab'));
    if (!this.tabs.length) return;

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
  }

  switchTab(tab) {
    const prevActive = document.querySelector('.feed-tab.active');
    if (tab === prevActive) return;

    sfx.playTap();

    if (this.slider && prevActive) {
      if (this.collapseTimer) clearTimeout(this.collapseTimer);

      const prevWidth = Math.max(36, Math.min(prevActive.offsetWidth * 0.68, 64));
      const prevOffset = prevActive.offsetLeft + (prevActive.offsetWidth - prevWidth) / 2;

      this.slider.style.transition = 'none';
      this.slider.style.width = `${prevWidth}px`;
      this.slider.style.transform = `translate3d(${prevOffset}px, 0, 0) scaleX(1)`;
      this.slider.style.opacity = '1';
      this.slider.classList.add('sliding');
      void this.slider.offsetWidth;

      const targetWidth = Math.max(36, Math.min(tab.offsetWidth * 0.68, 64));
      const targetOffset = tab.offsetLeft + (tab.offsetWidth - targetWidth) / 2;

      this.slider.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), width 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease';
      this.slider.style.width = `${targetWidth}px`;
      this.slider.style.transform = `translate3d(${targetOffset}px, 0, 0) scaleX(1)`;

      this.collapseTimer = setTimeout(() => {
        if (this.slider) {
          this.slider.style.transition = 'transform 0.24s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s ease';
          this.slider.style.transform = `translate3d(${targetOffset}px, 0, 0) scaleX(0.2)`;
          this.slider.style.opacity = '0';
          this.slider.classList.remove('sliding');
        }
      }, 340);
    }

    this.tabs.forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });

    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    const sort = tab.dataset.sort || 'hot';
    store.setSort(sort);
  }
}

export const feedTabs = new FeedTabsController();
export default feedTabs;
