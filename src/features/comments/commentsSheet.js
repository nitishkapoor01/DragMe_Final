/* ==========================================================================
   DRAGME FEATURE: COMMENTS DRAWER (src/features/comments/commentsSheet.js)
   Slide-Over Discussion Drawer with Thread Ingest & Real-Time Sync
   ========================================================================== */

import { commentsApi } from '../../api/commentsApi.js';
import { store } from '../../app/store.js';
import { AvatarService } from '../../services/avatarService.js';
import { sfx } from '../../services/sfxService.js';
import { toast } from '../toast/toastManager.js';
import { authManager } from '../auth/authManager.js';
import { escapeHtml } from '../../utils/domUtils.js';

export class CommentsSheet {
  constructor() {
    this.drawer = null;
    this.activePostId = null;
    this.isSubmitting = false;
  }

  init() {
    this.drawer = document.getElementById('commentsDrawer');
    this.bindEvents();

    window.addEventListener('dragme:comments:open', (e) => {
      const postId = e.detail?.postId;
      if (postId) this.open(postId);
    });
  }

  bindEvents() {
    const closeBtn = document.getElementById('closeCommentsBtn');
    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.close();
    });

    this.drawer?.addEventListener('click', (e) => {
      if (e.target === this.drawer) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    const form = document.getElementById('drawerCommentSubmitForm');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitComment();
    });
  }

  isOpen() {
    return this.drawer && this.drawer.style.display !== 'none';
  }

  async open(postId) {
    this.activePostId = postId;
    if (!this.drawer) this.drawer = document.getElementById('commentsDrawer');
    if (!this.drawer) return;

    this.drawer.style.display = 'flex';
    sfx.playOpen();

    this.renderPostSummary();
    await this.loadComments();

    setTimeout(() => {
      document.getElementById('drawerCommentInput')?.focus();
    }, 120);
  }

  close() {
    if (this.drawer) {
      this.drawer.style.display = 'none';
      sfx.playClose();
    }
    this.activePostId = null;
  }

  renderPostSummary() {
    const summaryBox = document.getElementById('drawerPostSummary');
    if (!summaryBox || !this.activePostId) return;

    const posts = store.getState().posts || [];
    const post = posts.find(p => p.id === this.activePostId);

    if (post) {
      summaryBox.style.display = 'block';
      summaryBox.innerHTML = `
        <div style="font-weight: 700; color: var(--text-pure); margin-bottom: 4px; font-size: 0.88rem;">
          ${escapeHtml(post.title || 'Discussion Post')}
        </div>
        <div style="display: flex; gap: 8px; font-size: 0.74rem; color: var(--text-low);">
          <span>Posted by <strong style="color: var(--accent-lime);">@${escapeHtml(post.author || post.author_username || 'anonymous')}</strong></span>
          <span>•</span>
          <span>r/${escapeHtml(post.room || 'general')}</span>
        </div>
      `;
    } else {
      summaryBox.style.display = 'none';
    }
  }

  async loadComments() {
    const list = document.getElementById('drawerCommentsList');
    const countEl = document.getElementById('drawerCommentCount');
    if (!list || !this.activePostId) return;

    list.innerHTML = `
      <div style="text-align: center; padding: 40px 16px; color: var(--text-low);">
        <i class="fa-solid fa-spinner fa-spin text-lime" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
        <p style="font-size: 0.85rem;">Loading discussion thread...</p>
      </div>
    `;

    try {
      let comments = [];
      try {
        const res = await commentsApi.getComments(this.activePostId);
        if (res && Array.isArray(res.comments)) {
          comments = res.comments;
        }
      } catch (e) {
        // Fallback to store
        const posts = store.getState().posts || [];
        const post = posts.find(p => p.id === this.activePostId);
        comments = post?.comments || [];
      }

      if (countEl) countEl.textContent = comments.length;

      if (comments.length === 0) {
        list.innerHTML = `
          <div style="text-align: center; padding: 48px 20px; color: var(--text-low);">
            <i class="fa-regular fa-comment-dots" style="font-size: 2.2rem; margin-bottom: 12px; color: #232c3d;"></i>
            <h4 style="color: var(--text-pure); font-size: 0.95rem; margin-bottom: 4px;">No comments yet</h4>
            <p style="font-size: 0.82rem;">Be the first to speak your mind on this drag!</p>
          </div>
        `;
        return;
      }

      list.innerHTML = comments.map(c => {
        const author = c.author || c.author_username || 'Anonymous';
        const avatarUrl = c.authorAvatar || c.author_avatar || AvatarService.get(author);
        return `
          <div class="reddit-comment-bubble">
            <div class="comment-meta-row">
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(author)}" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover;" onerror="this.src=window.GUEST_SILHOUETTE_SVG;">
                <span class="comment-user-bold">@${escapeHtml(author)}</span>
              </div>
              <span style="color: var(--text-low);">${escapeHtml(c.timeAgo || 'Recently')}</span>
            </div>
            <div class="comment-body-text">${escapeHtml(c.text || '')}</div>
          </div>
        `;
      }).join('');

      list.scrollTop = list.scrollHeight;
    } catch (err) {
      console.error('Error loading comments:', err);
      list.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--red-cooked);">
          <p>Failed to load discussion.</p>
        </div>
      `;
    }
  }

  async submitComment() {
    const input = document.getElementById('drawerCommentInput');
    const text = input?.value?.trim();
    if (!text || !this.activePostId || this.isSubmitting) return;

    if (!authManager.isAuthenticated()) {
      authManager.requireAuth({ type: 'comment', postId: this.activePostId }, 'Sign in to join the discussion and post comments.');
      return;
    }

    this.isSubmitting = true;
    try {
      sfx.playTap();
      const res = await commentsApi.addComment(this.activePostId, text);
      if (input) input.value = '';

      // Update store
      const posts = store.getState().posts || [];
      const post = posts.find(p => p.id === this.activePostId);
      if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(res.comment);
        post.commentCount = res.commentCount;
        post.comment_count = res.commentCount;
        store.updatePost(this.activePostId, {
          comments: post.comments,
          commentCount: res.commentCount,
          comment_count: res.commentCount
        });
      }

      // Re-render list
      await this.loadComments();
      toast.success('Comment posted!');
      sfx.playSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to post comment.');
    } finally {
      this.isSubmitting = false;
    }
  }
}

export const commentsSheet = new CommentsSheet();
export default commentsSheet;
