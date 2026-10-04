/* ==========================================================================
   DRAGME FEATURE: CREATE POST MODAL (src/features/posts/createPostModal.js)
   Apple-Style 8-Category Post Creator, Media Attachment & Server Post Submission
   ========================================================================== */

import { postsApi } from '../../api/postsApi.js';
import { mediaApi } from '../../api/mediaApi.js';
import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';
import { toast } from '../toast/toastManager.js';
import { authManager } from '../auth/authManager.js';
import { LiquidIdentityPill } from './liquidIdentityPill.js';
import { ClientMediaCompressor } from '../../services/clientMediaCompressor.js';
import { eventBus } from '../../core/eventBus.js';

export class CreatePostModal {
  constructor() {
    this.selectedCategory = 'General';
    this.isAnonymous = false;
    this._isOpen = false;
    this._closeTimer = null;
    this.pendingMediaFile = null;
    this.pendingMediaPreviewUrl = null;
  }

  isOpen() {
    return this._isOpen;
  }

  calculateDelta(triggerEl = null) {
    const modal = document.getElementById('create-post-modal');
    if (!modal) return;
    const windowEl = modal.querySelector('.create-modal-window');
    const triggerBtn = triggerEl || document.getElementById('btn-header-create-post') || document.querySelector('.dragme-plus-trigger');

    if (triggerBtn && windowEl) {
      const btnRect = triggerBtn.getBoundingClientRect();
      const btnCenterX = btnRect.left + btnRect.width / 2;
      const btnCenterY = btnRect.top + btnRect.height / 2;

      const winHeight = windowEl.offsetHeight || 380;
      const winRestCenterX = window.innerWidth / 2;
      const winRestCenterY = 58 + 12 + winHeight / 2;

      const deltaX = Math.round(btnCenterX - winRestCenterX);
      const deltaY = Math.round(btnCenterY - winRestCenterY);

      windowEl.style.setProperty('--start-x', `${deltaX}px`);
      windowEl.style.setProperty('--start-y', `${deltaY}px`);
    }
  }

  open(defaultAnon = false, preCategory = 'General', triggerEl = null) {
    const modal = document.getElementById('create-post-modal');
    if (!modal) return;

    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }

    const isAuthed = authManager.isAuthenticated();
    const shouldBeAnon = defaultAnon || !isAuthed;

    this._isOpen = true;
    this.selectedCategory = preCategory;
    this.setMode(shouldBeAnon ? 'anon' : 'me', false);
    this.selectCategory(preCategory, false);

    try { sfx.playOpen(); } catch (e) {}
    try { this.calculateDelta(triggerEl); } catch (e) {}

    modal.classList.remove('closing');
    modal.style.display = 'flex';
    modal.style.pointerEvents = 'auto';
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      if (this._isOpen) {
        modal.classList.add('open');
        setTimeout(() => {
          if (this._isOpen) {
            document.getElementById('composer-content-input')?.focus();
          }
        }, 80);
      }
    });
  }

  close() {
    const modal = document.getElementById('create-post-modal');
    if (!modal || !this._isOpen) return;

    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }

    this._isOpen = false;
    modal.classList.add('closing');
    modal.classList.remove('open');
    document.body.style.overflow = '';

    try { sfx.playClose(); } catch (e) {}

    this._closeTimer = setTimeout(() => {
      if (!this._isOpen) {
        modal.classList.remove('closing');
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
      }
      this._closeTimer = null;
    }, 140);
  }

  toggle(triggerEl = null) {
    if (this.isOpen()) this.close();
    else this.open(false, 'General', triggerEl);
  }

  setMode(mode, playSound = true) {
    const isAnon = mode === 'anon' || mode === 'anonymous';
    this.isAnonymous = isAnon;
    const modal = document.getElementById('create-post-modal');
    modal?.classList.toggle('mode-anonymous', isAnon);

    if (LiquidIdentityPill.element && LiquidIdentityPill.mode !== (isAnon ? 'anonymous' : 'me')) {
      LiquidIdentityPill.setMode(isAnon ? 'anonymous' : 'me', playSound);
    }

    const hint = document.getElementById('create-identity-hint-text');
    if (hint) {
      hint.textContent = isAnon ? 'Your identity stays private outside this thread.' : 'Post as yourself.';
    }
  }

  selectCategory(categoryName, playSound = true) {
    const cards = document.querySelectorAll('.create-cat-card');
    cards.forEach(card => {
      const match = (card.dataset.category || '').toLowerCase() === categoryName.toLowerCase() ||
                    (card.dataset.catId || '').toLowerCase() === categoryName.toLowerCase();
      if (match) {
        card.classList.add('active');
        this.selectedCategory = card.dataset.category || categoryName;
        const label = card.dataset.label;
        const publicBtn = document.getElementById('btn-slanted-text-public');
        if (publicBtn && label) publicBtn.textContent = label;
      } else {
        card.classList.remove('active');
      }
    });

    if (playSound) {
      try { sfx.playTap(); } catch (e) {}
    }

    if (categoryName.toLowerCase().includes('confession')) {
      this.setMode('anonymous', playSound);
    }
  }

  init() {
    LiquidIdentityPill.init();

    eventBus.on('dragme:modal:createPost:open', (data) => {
      this.open(data?.isAnon || false, data?.category || 'General');
    });

    window.addEventListener('dragme:identity-change', (e) => {
      const mode = e.detail.mode;
      const isAnon = mode === 'anonymous';
      this.isAnonymous = isAnon;
      const modal = document.getElementById('create-post-modal');
      modal?.classList.toggle('mode-anonymous', isAnon);
      const hint = document.getElementById('create-identity-hint-text');
      if (hint) {
        hint.textContent = isAnon ? 'Your identity stays private outside this thread.' : 'Post as yourself.';
      }
    });

    // Trigger buttons
    document.querySelectorAll('#btn-header-create-post, .dragme-plus-trigger, .btn-trigger-create-post, #mobNavPlusTrigger, #mobCreateFab').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle(e.currentTarget);
      };
    });

    // Quick trigger inputs & avatar
    document.getElementById('quickCreateTriggerInput')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.open(false, 'General', e.currentTarget);
    });

    document.getElementById('quickCreateAvatar')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (authManager.isAuthenticated()) {
        import('../../app/router.js').then(({ router }) => {
          router.navigate(`profile/${authManager.currentUser.username}`);
        });
      } else {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to access your profile arena.');
      }
    });

    document.querySelectorAll('.create-type-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = pill.dataset.label || pill.dataset.catId || 'General';
        const isAnon = cat.toLowerCase().includes('confession');
        this.open(isAnon, cat, pill);
      });
    });

    document.getElementById('quickImgBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.open(false, 'General', e.currentTarget);
      setTimeout(() => document.getElementById('composerFileInput')?.click(), 150);
    });

    document.getElementById('quickVidBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.open(false, 'General', e.currentTarget);
      setTimeout(() => document.getElementById('composerFileInput')?.click(), 150);
    });

    document.getElementById('quickLinkBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.open(false, 'General', e.currentTarget);
    });

    // Close buttons & backdrop
    document.getElementById('btn-create-modal-close')?.addEventListener('click', () => this.close());
    document.getElementById('btn-create-modal-cancel')?.addEventListener('click', () => this.close());

    document.getElementById('create-post-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'create-post-modal') this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    // Category Card Selection
    const cards = document.querySelectorAll('.create-cat-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const cat = card.dataset.category || card.dataset.catId || 'General';
        this.selectCategory(cat, true);
      });
    });

    // File input handling
    const fileInput = document.getElementById('composerFileInput');
    const attachBtn = document.getElementById('btnComposerAttachMedia');
    const removeMediaBtn = document.getElementById('btnComposerRemoveMedia');
    const mediaPreviewBox = document.getElementById('composerMediaPreviewBox');
    const previewImg = document.getElementById('composerMediaPreviewImg');
    const previewVid = document.getElementById('composerMediaPreviewVid');
    const mediaNameEl = document.getElementById('composerMediaName');
    const mediaMetaEl = document.getElementById('composerMediaMeta');

    attachBtn?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      this.pendingMediaFile = file;
      const isVid = file.type.startsWith('video/');
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      const objUrl = URL.createObjectURL(file);
      this.pendingMediaPreviewUrl = objUrl;

      if (mediaNameEl) mediaNameEl.textContent = file.name;
      if (mediaMetaEl) mediaMetaEl.textContent = `${isVid ? 'Video Clip' : 'Image'} • ${mb} MB`;

      if (isVid) {
        if (previewVid) {
          previewVid.src = objUrl;
          previewVid.style.display = 'block';
        }
        if (previewImg) previewImg.style.display = 'none';
      } else {
        if (previewImg) {
          previewImg.src = objUrl;
          previewImg.style.display = 'block';
        }
        if (previewVid) previewVid.style.display = 'none';
      }

      if (mediaPreviewBox) mediaPreviewBox.style.display = 'flex';
    });

    removeMediaBtn?.addEventListener('click', () => {
      this.pendingMediaFile = null;
      if (this.pendingMediaPreviewUrl) {
        URL.revokeObjectURL(this.pendingMediaPreviewUrl);
        this.pendingMediaPreviewUrl = null;
      }
      if (fileInput) fileInput.value = '';
      if (mediaPreviewBox) mediaPreviewBox.style.display = 'none';
      if (previewImg) previewImg.src = '';
      if (previewVid) previewVid.src = '';
    });

    // Form submission
    const form = document.getElementById('create-post-main-form');
    const submitPost = async () => {
      const contentInput = document.getElementById('composer-content-input');
      const titleInput = document.getElementById('composer-title-input');
      const submitBtn = document.getElementById('btn-create-submit');
      const text = contentInput?.value?.trim() || '';
      const customTitle = titleInput?.value?.trim() || '';

      if (!text) {
        toast.warning('Please type your thoughts before sharing!');
        contentInput?.focus();
        return;
      }

      if (!authManager.isAuthenticated()) {
        if (!authManager.requireAuth({ type: 'create_post' }, 'Sign in to publish posts or share anonymous confessions.', 'Publish Post')) {
          return;
        }
      }

      let uploadedMediaUrl = null;

      if (this.pendingMediaFile) {
        try {
          if (submitBtn) submitBtn.disabled = true;
          toast.info('Optimizing and uploading media...');
          const isVid = this.pendingMediaFile.type.startsWith('video/');
          const uploadType = isVid ? 'postVideo' : 'postImage';

          const compressed = await ClientMediaCompressor.compress(this.pendingMediaFile, uploadType);
          const reader = new FileReader();
          const base64Data = await new Promise((res, rej) => {
            reader.onload = () => res(reader.result);
            reader.onerror = rej;
            reader.readAsDataURL(compressed);
          });

          const uploadRes = await mediaApi.uploadMedia({
            data: base64Data,
            filename: this.pendingMediaFile.name,
            type: uploadType
          });

          if (uploadRes && uploadRes.url) {
            uploadedMediaUrl = uploadRes.url;
          }
        } catch (uploadErr) {
          console.error('Post media upload failed:', uploadErr);
          toast.error('Media upload error: ' + uploadErr.message);
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
      }

      try {
        if (submitBtn) submitBtn.disabled = true;

        const res = await postsApi.createPost({
          content: text,
          title: customTitle || (text.length > 70 ? text.substring(0, 70) + '...' : text),
          category: this.selectedCategory,
          isAnonymous: this.isAnonymous,
          attachedFile: uploadedMediaUrl
        });

        if (res && res.post) {
          store.addPost(res.post);
          eventBus.emit('dragme:post:created', { post: res.post });
        }

        if (contentInput) contentInput.value = '';
        if (titleInput) titleInput.value = '';
        if (fileInput) fileInput.value = '';
        this.pendingMediaFile = null;
        if (this.pendingMediaPreviewUrl) {
          URL.revokeObjectURL(this.pendingMediaPreviewUrl);
          this.pendingMediaPreviewUrl = null;
        }
        if (mediaPreviewBox) mediaPreviewBox.style.display = 'none';

        sfx.playSuccess();
        this.close();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success(this.isAnonymous ? 'Confession shared anonymously!' : 'Post published to the feed!');
      } catch (err) {
        toast.error(err.message || 'Failed to create post.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      submitPost();
    });

    document.getElementById('btn-create-submit')?.addEventListener('click', (e) => {
      e.preventDefault();
      submitPost();
    });
  }
}

export const createPostModal = new CreatePostModal();
export default createPostModal;
