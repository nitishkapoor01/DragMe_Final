/* ==========================================================================
   DRAGME FEATURE: WHO REACTED MODAL (src/features/reactions/whoReactedModal.js)
   Discovery modal displaying reactor user list, roles, badges & reactions
   ========================================================================== */

import { reactionsApi } from '../../api/reactionsApi.js';
import { sfx } from '../../services/sfxService.js';
import { escapeHtml } from '../../utils/domUtils.js';

export const WhoReactedModal = {
  overlay: null,
  listWrap: null,
  activeTab: 'all',
  currentPostId: null,
  data: null,

  init() {
    this.overlay = document.getElementById('whoReactedOverlay');
    this.listWrap = document.getElementById('whoReactedList');

    document.getElementById('btnCloseWhoReacted')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    ['all', 'friends', 'topReactors'].forEach(tab => {
      document.getElementById(`whoTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.addEventListener('click', () => {
        this.switchTab(tab);
      });
    });
  },

  open(postId) {
    this.currentPostId = postId;
    this.activeTab = 'all';
    if (this.overlay) this.overlay.style.display = 'flex';
    sfx.playOpen();

    if (this.listWrap) {
      this.listWrap.innerHTML = `
        <div class="who-reacted-loading">
          <i class="fa-solid fa-spinner fa-spin text-lime"></i>
          <span>Loading reactions...</span>
        </div>
      `;
    }
    this.fetchReactors(postId);
  },

  close() {
    if (this.overlay) this.overlay.style.display = 'none';
    sfx.playClose();
    this.currentPostId = null;
    this.data = null;
  },

  switchTab(tab) {
    this.activeTab = tab;
    sfx.playTap();
    document.querySelectorAll('.who-tab-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`.who-tab-btn[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    this.renderList();
  },

  async fetchReactors(postId) {
    try {
      const res = await reactionsApi.getWhoReacted(postId);
      if (res) {
        this.data = res;
        const countAll = document.getElementById('whoCountAll');
        const countFriends = document.getElementById('whoCountFriends');
        const countTop = document.getElementById('whoCountTop');
        if (countAll) countAll.textContent = res.all?.length || 0;
        if (countFriends) countFriends.textContent = res.friends?.length || 0;
        if (countTop) countTop.textContent = res.topReactors?.length || 0;
        this.renderList();
      }
    } catch (err) {
      if (this.listWrap) {
        this.listWrap.innerHTML = `
          <div class="who-reacted-empty">
            <i class="fa-solid fa-triangle-exclamation text-orange"></i>
            <span>Could not load reactors.</span>
          </div>
        `;
      }
    }
  },

  renderList() {
    if (!this.data || !this.listWrap) return;
    const list = this.data[this.activeTab] || [];

    if (list.length === 0) {
      this.listWrap.innerHTML = `
        <div class="who-reacted-empty">
          <i class="fa-solid fa-crown" style="font-size: 1.5rem; opacity: 0.4;"></i>
          <span>No reactors in this category yet.</span>
        </div>
      `;
      return;
    }

    this.listWrap.innerHTML = list.map(r => `
      <div class="who-reactor-item">
        <div class="who-reactor-left">
          <img src="${escapeHtml(r.avatarUrl)}" alt="${escapeHtml(r.displayName)}" class="who-reactor-avatar" onerror="this.src=window.GUEST_SILHOUETTE_SVG;">
          <div class="who-reactor-info">
            <div class="who-reactor-name-row">
              <span class="who-reactor-name">${escapeHtml(r.displayName)}</span>
              ${r.isSuper ? '<i class="fa-solid fa-bolt who-reactor-super-badge" title="Super Crown Reactor"></i>' : ''}
              ${r.isPremium ? '<i class="fa-solid fa-circle-check text-lime" style="font-size: 0.75rem;"></i>' : ''}
            </div>
            <span class="who-reactor-handle">@${escapeHtml(r.username)} · ${escapeHtml(r.timeAgo)}</span>
          </div>
        </div>
        <div class="who-reactor-badge" style="color: ${r.reactionColor}; border: 1px solid ${r.reactionColor}33;">
          <i class="${escapeHtml(r.reactionIcon)}"></i>
          <span style="font-size: 0.76rem; font-weight: 600;">${escapeHtml(r.reactionLabel)}</span>
        </div>
      </div>
    `).join('');
  }
};
