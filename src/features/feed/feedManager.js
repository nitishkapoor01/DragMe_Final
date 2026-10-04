/* ==========================================================================
   DRAGME FEATURE: FEED MANAGER (src/features/feed/feedManager.js)
   Renders feed post cards, video autoplay/posters, reactions & bookmark hooks
   ========================================================================== */

import { postsApi } from '../../api/postsApi.js';
import { store } from '../../app/store.js';
import { AvatarService } from '../../services/avatarService.js';
import { sfx } from '../../services/sfxService.js';
import { toast } from '../toast/toastManager.js';
import { authManager } from '../auth/authManager.js';
import { WhoReactedModal } from '../reactions/whoReactedModal.js';
import { escapeHtml, triggerEvent } from '../../utils/domUtils.js';

export class FeedManager {
  constructor() {
    this.postsStream = null;
    this.isLoading = false;
  }

  init() {
    this.postsStream = document.getElementById('postsStream');
    if (!this.postsStream) return;

    this.bindGlobals();
    this.bindEvents();

    // Subscribe to store updates
    store.subscribe('posts', () => this.renderFeed(false));
    store.subscribe('room', () => this.fetchFeed());
    store.subscribe('sort', () => this.fetchFeed());
    store.subscribe('search', () => this.fetchFeed());

    // Initial feed fetch
    this.fetchFeed();
  }

  bindGlobals() {
    window.playPostVideo = (overlayEl) => {
      if (!overlayEl) return;
      const wrap = overlayEl.closest('.post-video-player-wrap');
      const video = wrap ? wrap.querySelector('.post-video-element') : null;
      if (!video) return;

      if (video.paused) {
        sfx.playTap();
        video.muted = false;
        video.play().then(() => {
          overlayEl.style.opacity = '0';
          overlayEl.style.pointerEvents = 'none';
        }).catch(() => {
          video.muted = true;
          video.play().then(() => {
            overlayEl.style.opacity = '0';
            overlayEl.style.pointerEvents = 'none';
          }).catch(e => console.warn('Autoplay failed:', e));
        });
      } else {
        video.pause();
        overlayEl.style.opacity = '1';
        overlayEl.style.pointerEvents = 'auto';
      }
    };
  }

  async fetchFeed() {
    const { currentRoom, currentSort, searchQuery } = store.getState();
    this.isLoading = true;

    try {
      const data = await postsApi.getFeed({
        room: currentRoom,
        sort: currentSort,
        search: searchQuery
      });

      if (data && Array.isArray(data.posts)) {
        store.setPosts(data.posts);
      }
    } catch (err) {
      console.warn('Feed fetch fallback to local store:', err.message);
      this.renderFeed(true);
    } finally {
      this.isLoading = false;
    }
  }

  bindEvents() {
    // Delegated click handling on postsStream
    this.postsStream?.addEventListener('click', async (e) => {
      const authorGroup = e.target.closest('.meta-left-group[data-author]');
      if (authorGroup) {
        const author = authorGroup.dataset.author;
        if (author && author !== 'Anonymous' && author !== 'Masked Persona') {
          e.preventDefault();
          e.stopPropagation();
          import('../../app/router.js').then(({ router }) => {
            router.navigate(`profile/${author}`);
          });
          return;
        }
      }

      const voteWrap = e.target.closest('.vote-count-wrap');
      if (voteWrap) {
        e.preventDefault();
        e.stopPropagation();
        const postId = voteWrap.dataset.postId || voteWrap.closest('[data-id]')?.dataset.id;
        if (postId) {
          WhoReactedModal.open(postId);
          return;
        }
      }

      const btn = e.target.closest('button');
      if (!btn) return;

      const action = btn.dataset.action;
      const postId = btn.dataset.id;
      if (!action || !postId) return;

      if (action === 'save') {
        e.preventDefault();
        e.stopPropagation();
        this.handleSave(postId, btn);
      } else if (action === 'comment') {
        e.preventDefault();
        e.stopPropagation();
        triggerEvent('dragme:comments:open', { postId });
      } else if (action === 'share') {
        e.preventDefault();
        e.stopPropagation();
        this.handleShare(postId);
      }
    });
  }

  async handleSave(postId, btn) {
    if (!authManager.isAuthenticated()) {
      authManager.requireAuth({ type: 'save', postId }, 'Sign in to save and bookmark posts to your profile.');
      return;
    }

    try {
      sfx.playTap();
      const res = await postsApi.savePost(postId);
      store.updatePost(postId, { isSaved: res.isSaved });
      toast.success(res.isSaved ? 'Saved to bookmarks!' : 'Removed from bookmarks.');
    } catch (err) {
      toast.error(err.message || 'Failed to update bookmark.');
    }
  }

  handleShare(postId) {
    const url = `${window.location.origin}/#post/${postId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        sfx.playSuccess();
        toast.success('Post link copied to clipboard!');
      }).catch(() => {
        toast.info(url);
      });
    } else {
      toast.info(url);
    }
  }

  renderFeed(animate = true) {
    if (!this.postsStream) return;

    const posts = store.getState().posts;

    if (animate) {
      this.postsStream.classList.remove('feed-animate-enter');
      void this.postsStream.offsetWidth;
      this.postsStream.classList.add('feed-animate-enter');
    }

    if (posts.length === 0) {
      this.postsStream.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 48px 20px; text-align: center; color: var(--text-low);">
          <i class="fa-solid fa-layer-group" style="font-size: 2.5rem; margin-bottom: 12px; color: #232c3d;"></i>
          <h3 style="color: var(--text-pure); font-size: 1.1rem; margin-bottom: 6px;">No posts in this arena</h3>
          <p style="font-size: 0.84rem;">Tap the + button to drop the first drag!</p>
        </div>
      `;
      return;
    }

    this.postsStream.innerHTML = posts.map(post => {
      let mediaMarkup = '';
      if (post.imageUrl) {
        const isVideo = AvatarService.isVideoUrl(post.imageUrl);
        if (isVideo) {
          const posterUrl = post.posterUrl || post.imageUrl.replace(/\.(mp4|webm)$/i, '.webp').replace('/post/', '/posters/poster_');
          mediaMarkup = `
            <div class="post-video-player-wrap" data-video-src="${escapeHtml(post.imageUrl)}">
              <video class="post-video-element" playsinline loop muted preload="none" poster="${escapeHtml(posterUrl)}">
                <source src="${escapeHtml(post.imageUrl)}" type="video/mp4">
              </video>
              <div class="post-video-poster-overlay" onclick="window.playPostVideo && window.playPostVideo(this)" title="Click to Play Video">
                <div class="post-video-play-badge"><i class="fa-solid fa-play"></i></div>
              </div>
            </div>
          `;
        } else {
          mediaMarkup = `
            <div class="post-media-frame">
              <img src="${escapeHtml(post.imageUrl)}" alt="Post attachment" class="post-media-img" loading="lazy" decoding="async">
            </div>
          `;
        }
      }

      const resolvedAvatarUrl = AvatarService.get(post.isAnonymous ? 'Masked Persona' : (post.avatar || post.author), post.isAnonymous);
      const authorAvatar = post.isAnonymous
        ? `<div class="post-pfp-frame post-pfp-ghost" title="Anonymous Persona">
             <i class="fa-solid fa-mask"></i>
           </div>`
        : `<div class="post-pfp-frame">
             <img src="${escapeHtml(resolvedAvatarUrl)}" alt="${escapeHtml(post.author)}" class="post-pfp-img" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=window.GUEST_SILHOUETTE_SVG;">
           </div>`;

      const displayName = post.author || post.author_username || 'Anonymous';
      const isVerified = Boolean(post.isVerified || post.is_verified || ['DevZero', 'chip_drill', 'Riya', 'Tester Supreme'].includes(displayName));
      const verifiedBadge = isVerified ? `<i class="fa-solid fa-circle-check verified-badge-mini"></i>` : '';
      const usernameHandle = post.isAnonymous ? '' : (post.handle || `@${displayName.toLowerCase().replace(/\s+/g, '')}`);

      let flairTagClass = 'tag-roast';
      let flairIcon = '<i class="fa-solid fa-fire text-orange"></i>';
      let flairText = post.flair || '';
      if (flairText) {
        const fLower = flairText.toLowerCase();
        if (fLower.includes('hot take') || fLower.includes('hottake')) {
          flairTagClass = 'tag-hot-take';
          flairIcon = '<i class="fa-solid fa-bolt text-red"></i>';
          flairText = 'Hot Take';
        } else if (fLower.includes('roast')) {
          flairTagClass = 'tag-roast';
          flairIcon = '<i class="fa-solid fa-fire text-orange"></i>';
          flairText = 'Roast';
        } else if (fLower.includes('question')) {
          flairTagClass = 'tag-question';
          flairIcon = '<i class="fa-solid fa-circle-question text-blue"></i>';
          flairText = 'Question';
        } else if (fLower.includes('confession')) {
          flairTagClass = 'tag-confession';
          flairIcon = '<i class="fa-solid fa-mask text-purple"></i>';
          flairText = 'Confession';
        } else if (fLower.includes('discuss') || fLower.includes('conversation')) {
          flairTagClass = 'tag-conversation';
          flairIcon = '<i class="fa-regular fa-comments text-gray"></i>';
          flairText = 'Discussion';
        } else if (fLower.includes('tech') || fLower.includes('ai')) {
          flairTagClass = 'tag-tech';
          flairIcon = '<i class="fa-solid fa-microchip text-cyan"></i>';
          flairText = 'Tech/AI';
        }
      }

      const reactionType = post.reactionType || 'crown';
      const isSuper = Boolean(post.isSuper);
      const reactionClass = post.hasVoted ? `reaction-${reactionType}` : '';
      const superClass = isSuper ? 'is-super' : '';
      const isVoted = Boolean(post.hasVoted);

      return `
        <article class="reddit-post-card" data-post-id="${post.id}">
          <div class="post-meta-line">
            <div class="meta-left-group" ${post.isAnonymous ? '' : `data-author="${escapeHtml(post.author_username || post.author || '')}" style="cursor: pointer;"`}>
              ${authorAvatar}
              <div class="post-header-details">
                <div class="post-author-name-row">
                  <span class="meta-author-name">${escapeHtml(displayName)}</span>
                  ${verifiedBadge}
                </div>
                <div class="post-author-sub-row">
                  ${usernameHandle ? `<span class="post-handle-text">${escapeHtml(usernameHandle)}</span>` : ''}
                  <span class="post-time-dot">·</span>
                  <span class="post-timestamp-str">${post.timeAgo || 'Just now'}</span>
                </div>
              </div>
            </div>
            <div class="meta-right-group">
              ${flairText ? `<span class="post-category-tag ${flairTagClass}">${flairIcon} <span>${escapeHtml(flairText)}</span></span>` : ''}
              <button class="btn-post-menu" title="Options" type="button"><i class="fa-solid fa-ellipsis"></i></button>
            </div>
          </div>

          ${post.title ? `<h2 class="post-headline-title">${escapeHtml(post.title)}</h2>` : ''}
          ${post.content ? `<div class="post-text-body">${escapeHtml(post.content)}</div>` : ''}
          ${mediaMarkup}

          <div class="post-bottom-actions">
            <div class="post-actions-left">
              <button class="post-action-btn drag-crown-btn ${isVoted ? 'voted' : ''} ${reactionClass} ${superClass}" 
                      data-action="crown" 
                      data-id="${post.id}" 
                      data-reaction="${escapeHtml(reactionType)}"
                      data-is-super="${isSuper ? '1' : '0'}"
                      aria-label="${isVoted ? 'Remove crown from this post' : 'Crown this post'}"
                      aria-pressed="${isVoted ? 'true' : 'false'}"
                      title="Tap: Crown • Hold: Reactions • Double Tap: Super Crown" 
                      type="button">
                <span class="crown-svg-wrap">
                  <svg class="crown-svg" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                    <path class="crown-stroke" d="M3 18h18v2H3v-2zm1.5-12l3.5 6 4-8 4 8 3.5-6L21 16H3l1.5-10z"/>
                    <path class="crown-fill" d="M3 18h18v2H3v-2zm1.5-12l3.5 6 4-8 4 8 3.5-6L21 16H3l1.5-10z"/>
                  </svg>
                </span>
                <span class="vote-count-wrap" data-post-id="${post.id}">
                  <span class="vote-count-digit" id="crownCount-${post.id}">${post.dragCount || 0}</span>
                </span>
              </button>

              <button class="post-action-btn post-comment-btn" data-action="comment" data-id="${post.id}" title="Comments" type="button">
                <i class="fa-regular fa-comment"></i>
                <span>${post.commentCount || 0}</span>
              </button>

              <button class="post-action-btn post-share-btn" data-action="share" data-id="${post.id}" title="Share Link" type="button">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </button>
            </div>

            <div class="post-actions-right">
              <button class="post-action-btn post-save-btn ${post.isSaved ? 'saved' : ''}" data-action="save" data-id="${post.id}" title="${post.isSaved ? 'Saved' : 'Save Post'}" type="button">
                <i class="${post.isSaved ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }
}

export const feedManager = new FeedManager();
export default feedManager;
