/* ==========================================================================
   DRAGME FEATURE: DEDICATED PFP & BANNER MEDIA STUDIOS (src/features/profile/mediaStudioManager.js)
   Two separate interactive studios:
   1. Normal Photo Studio (4:5 PFP / 3:1 Banner) -> STRICTLY STATIC IMAGES ONLY
   2. Nitro Motion Studio (4:5 Video PFP / 3:1 Video Banner) -> EXCLUSIVELY FOR @NITISH / NITRO
   ========================================================================== */

import { mediaApi } from '../../api/mediaApi.js';
import { profilesApi } from '../../api/profilesApi.js';
import { authManager } from '../auth/authManager.js';
import { sfx } from '../../services/sfxService.js';
import { toast } from '../toast/toastManager.js';
import { AvatarService } from '../../services/avatarService.js';

export class MediaStudioManager {
  constructor() {
    this.activeStudio = null; // 'avatar' | 'banner'
    this.isMotionMode = false; // true ONLY when triggered from Nitro Motion triggers

    // Avatar Transform State (4:5 Portrait)
    this.pfp = {
      file: null,
      previewUrl: null,
      isVideo: false,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      videoDuration: 0,
      trimStart: 0,
      trimEnd: 3.0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0
    };

    // Banner Transform State (3:1 Widescreen)
    this.banner = {
      file: null,
      previewUrl: null,
      isVideo: false,
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      videoDuration: 0,
      trimStart: 0,
      trimEnd: 4.0,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0
    };

    this.isApplying = false;
  }

  /**
   * Check if paid / nitro features are unlocked for current user.
   * @nitish is given Nitro/Paid Tier access by default.
   */
  isMotionUnlocked() {
    const user = authManager.currentUser;
    if (!user) return false;
    const uname = (user.username || '').toLowerCase();
    return uname === 'nitish' || Boolean(user.is_premium || user.is_nitro || user.role === 'admin');
  }

  init() {
    // Listen for custom trigger events
    window.addEventListener('dragme:studio:open', (e) => {
      const mode = e.detail?.mode || 'avatar';
      const file = e.detail?.file || null;
      const isMotion = Boolean(e.detail?.isMotion);
      this.open(mode, file, isMotion);
    });

    // 1. PFP Studio Controls Wiring
    this.bindPfpStudio();

    // 2. Banner Studio Controls Wiring
    this.bindBannerStudio();
  }

  open(mode = 'avatar', file = null, isMotion = false) {
    if (!authManager.isAuthenticated()) {
      authManager.requireAuth({ type: 'profile' }, `Sign in to customize your ${mode === 'avatar' ? 'profile picture' : 'header banner'}.`);
      return;
    }

    this.activeStudio = mode;
    this.isMotionMode = Boolean(isMotion);

    // If attempting to open motion video studio, verify Paid / Nitro access
    if (this.isMotionMode && !this.isMotionUnlocked()) {
      toast.error('Motion Video Avatars & Banners are exclusively unlocked for @nitish (Founder / Nitro). Standard accounts can upload PNG, JPEG, WEBP or GIF.');
      sfx.playError?.();
      return;
    }

    if (mode === 'avatar') {
      const fileInput = document.getElementById('pfpStudioFileInput');
      const titleEl = document.getElementById('pfpStudioTitle');
      const subEl = document.querySelector('#pfpStudioModal .media-studio-sub');

      if (this.isMotionMode) {
        if (titleEl) titleEl.textContent = 'Nitro Motion Avatar Studio (4:5 Loop)';
        if (subEl) subEl.textContent = 'Trim loop (max 3.0s) • Drag to frame • Auto-encoded in WebM/WebP';
        if (fileInput) fileInput.accept = 'video/mp4,video/webm,image/gif,image/webp';
      } else {
        // STRICTLY STATIC PHOTO MODE - NO VIDEOS ALLOWED FOR ANYONE
        if (titleEl) titleEl.textContent = 'Profile Picture Studio (4:5 Portrait)';
        if (subEl) subEl.textContent = 'Drag to position • Pinch or scroll to zoom • Auto-framed in 4:5';
        if (fileInput) fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif,image/avif';
      }

      if (file) {
        this.loadPfpFile(file);
      } else if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      }
    } else {
      const fileInput = document.getElementById('bannerStudioFileInput');
      const titleEl = document.getElementById('bannerStudioTitle');
      const subEl = document.querySelector('#bannerStudioModal .media-studio-sub');

      if (this.isMotionMode) {
        if (titleEl) titleEl.textContent = 'Nitro Motion Banner Studio (3:1 Loop)';
        if (subEl) subEl.textContent = 'Trim loop (max 4.0s) • Drag to frame • Auto-encoded in WebM/WebP';
        if (fileInput) fileInput.accept = 'video/mp4,video/webm,image/gif,image/webp';
      } else {
        // STRICTLY STATIC PHOTO MODE - NO VIDEOS ALLOWED FOR ANYONE
        if (titleEl) titleEl.textContent = 'Header Banner Studio (3:1 Widescreen)';
        if (subEl) subEl.textContent = 'Drag to frame banner • Pinch or scroll to zoom • Responsive 1920x640 frame';
        if (fileInput) fileInput.accept = 'image/png,image/jpeg,image/webp,image/gif,image/avif';
      }

      if (file) {
        this.loadBannerFile(file);
      } else if (fileInput) {
        fileInput.value = '';
        fileInput.click();
      }
    }
  }

  // =========================================================================
  // 1. PFP STUDIO (4:5 PORTRAIT)
  // =========================================================================
  bindPfpStudio() {
    const fileInput = document.getElementById('pfpStudioFileInput');

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.loadPfpFile(file);
    });

    document.getElementById('btnClosePfpStudio')?.addEventListener('click', () => this.closePfp());
    document.getElementById('btnCancelPfpStudio')?.addEventListener('click', () => this.closePfp());
    document.getElementById('btnApplyPfpStudio')?.addEventListener('click', () => this.applyPfp());

    // Zoom Slider
    const zoomSlider = document.getElementById('pfpZoomSlider');
    zoomSlider?.addEventListener('input', (e) => {
      this.pfp.zoom = parseFloat(e.target.value) || 1.0;
      this.updatePfpTransformUI();
    });

    document.getElementById('btnPfpZoomIn')?.addEventListener('click', () => {
      this.pfp.zoom = Math.min(4.0, this.pfp.zoom + 0.2);
      this.updatePfpTransformUI();
      sfx.playTap();
    });

    document.getElementById('btnPfpZoomOut')?.addEventListener('click', () => {
      this.pfp.zoom = Math.max(1.0, this.pfp.zoom - 0.2);
      this.updatePfpTransformUI();
      sfx.playTap();
    });

    // Zoom Presets
    document.querySelectorAll('.btn-pfp-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        this.pfp.zoom = parseFloat(btn.dataset.scale) || 1.0;
        document.querySelectorAll('.btn-pfp-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updatePfpTransformUI();
        sfx.playTap();
      });
    });

    // D-Pad Pan
    const step = 20;
    document.getElementById('btnPfpPanUp')?.addEventListener('click', () => { this.pfp.panY -= step; this.updatePfpTransformUI(); sfx.playTap(); });
    document.getElementById('btnPfpPanDown')?.addEventListener('click', () => { this.pfp.panY += step; this.updatePfpTransformUI(); sfx.playTap(); });
    document.getElementById('btnPfpPanLeft')?.addEventListener('click', () => { this.pfp.panX -= step; this.updatePfpTransformUI(); sfx.playTap(); });
    document.getElementById('btnPfpPanRight')?.addEventListener('click', () => { this.pfp.panX += step; this.updatePfpTransformUI(); sfx.playTap(); });
    document.getElementById('btnPfpPanCenter')?.addEventListener('click', () => { this.pfp.panX = 0; this.pfp.panY = 0; this.updatePfpTransformUI(); sfx.playTap(); });

    // Rotate & Flip
    document.getElementById('btnPfpRotateRight')?.addEventListener('click', () => {
      this.pfp.rotation = (this.pfp.rotation + 90) % 360;
      this.updatePfpTransformUI();
      sfx.playTap();
    });
    document.getElementById('btnPfpRotateLeft')?.addEventListener('click', () => {
      this.pfp.rotation = (this.pfp.rotation - 90 + 360) % 360;
      this.updatePfpTransformUI();
      sfx.playTap();
    });
    document.getElementById('btnPfpFlipH')?.addEventListener('click', () => {
      this.pfp.flipH = !this.pfp.flipH;
      this.updatePfpTransformUI();
      sfx.playTap();
    });
    document.getElementById('btnPfpFlipV')?.addEventListener('click', () => {
      this.pfp.flipV = !this.pfp.flipV;
      this.updatePfpTransformUI();
      sfx.playTap();
    });
    document.getElementById('btnPfpReset')?.addEventListener('click', () => {
      this.resetPfpTransforms();
      sfx.playTap();
    });

    // Stage Gestures (Drag & Pinch)
    const stage = document.getElementById('pfpStudioStage');
    if (stage) {
      stage.addEventListener('mousedown', (e) => {
        this.pfp.isDragging = true;
        this.pfp.dragStartX = e.clientX - this.pfp.panX;
        this.pfp.dragStartY = e.clientY - this.pfp.panY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.pfp.isDragging) return;
        this.pfp.panX = e.clientX - this.pfp.dragStartX;
        this.pfp.panY = e.clientY - this.pfp.dragStartY;
        this.updatePfpTransformUI();
      });

      window.addEventListener('mouseup', () => { this.pfp.isDragging = false; });

      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.pfp.isDragging = true;
          this.pfp.dragStartX = e.touches[0].clientX - this.pfp.panX;
          this.pfp.dragStartY = e.touches[0].clientY - this.pfp.panY;
        }
      }, { passive: true });

      stage.addEventListener('touchmove', (e) => {
        if (this.pfp.isDragging && e.touches.length === 1) {
          this.pfp.panX = e.touches[0].clientX - this.pfp.dragStartX;
          this.pfp.panY = e.touches[0].clientY - this.pfp.dragStartY;
          this.updatePfpTransformUI();
        }
      }, { passive: true });

      stage.addEventListener('touchend', () => { this.pfp.isDragging = false; });

      stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.pfp.zoom = Math.min(4.0, Math.max(1.0, this.pfp.zoom + delta));
        this.updatePfpTransformUI();
      }, { passive: false });
    }

    // Video Playback & Timeline
    const video = document.getElementById('pfpStudioVideoPlayer');
    const btnPlay = document.getElementById('btnTogglePfpVideoPlayback');
    btnPlay?.addEventListener('click', () => {
      if (!video) return;
      if (video.paused) {
        video.play();
        const icon = document.getElementById('iconPfpVideoPlay');
        if (icon) icon.className = 'fa-solid fa-pause';
      } else {
        video.pause();
        const icon = document.getElementById('iconPfpVideoPlay');
        if (icon) icon.className = 'fa-solid fa-play';
      }
    });

    if (video) {
      video.ontimeupdate = () => {
        if (video.currentTime >= this.pfp.trimEnd || video.currentTime < this.pfp.trimStart) {
          video.currentTime = this.pfp.trimStart;
          video.play().catch(() => {});
        }
        const timer = document.getElementById('pfpVideoTimer');
        if (timer) {
          timer.textContent = `0:${(video.currentTime || 0).toFixed(1).padStart(4, '0')} / 0:${(this.pfp.videoDuration || 0).toFixed(1).padStart(4, '0')}`;
        }
      };
    }

    document.getElementById('pfpStartSlider')?.addEventListener('input', (e) => {
      const pct = parseFloat(e.target.value) / 100;
      let newStart = pct * this.pfp.videoDuration;
      if (newStart >= this.pfp.trimEnd - 0.5) newStart = Math.max(0, this.pfp.trimEnd - 0.5);
      if (this.pfp.trimEnd - newStart > 3.0) this.pfp.trimEnd = Math.min(this.pfp.videoDuration, newStart + 3.0);
      this.pfp.trimStart = newStart;
      if (video) video.currentTime = this.pfp.trimStart;
      this.updatePfpTrimUI();
    });

    document.getElementById('pfpEndSlider')?.addEventListener('input', (e) => {
      const pct = parseFloat(e.target.value) / 100;
      let newEnd = pct * this.pfp.videoDuration;
      if (newEnd <= this.pfp.trimStart + 0.5) newEnd = Math.min(this.pfp.videoDuration, this.pfp.trimStart + 0.5);
      if (newEnd - this.pfp.trimStart > 3.0) this.pfp.trimStart = Math.max(0, newEnd - 3.0);
      this.pfp.trimEnd = newEnd;
      if (video) video.currentTime = this.pfp.trimStart;
      this.updatePfpTrimUI();
    });
  }

  loadPfpFile(file) {
    if (!file) return;

    const isVideo = file.type.startsWith('video/');

    // Enforce Static vs Nitro Motion boundary
    if (isVideo && !this.isMotionMode) {
      toast.error('Normal Avatar Studio is for static photos only. To upload a motion video loop, use the DRAGME Nitro section.');
      sfx.playError?.();
      return;
    }

    if (isVideo && !this.isMotionUnlocked()) {
      toast.error('Motion Video Avatars are exclusively unlocked for @nitish (Founder / Nitro). Standard accounts can upload PNG, JPEG, WEBP or GIF.');
      sfx.playError?.();
      return;
    }

    this.pfp.file = file;
    this.pfp.isVideo = isVideo;
    this.resetPfpTransforms();

    if (this.pfp.previewUrl) URL.revokeObjectURL(this.pfp.previewUrl);
    this.pfp.previewUrl = URL.createObjectURL(file);

    const imgWrap = document.getElementById('pfpStudioImageWrap');
    const vidWrap = document.getElementById('pfpStudioVideoWrap');
    const vidControls = document.getElementById('pfpVideoControls');
    const cropImg = document.getElementById('pfpStudioCropImg');
    const videoPlayer = document.getElementById('pfpStudioVideoPlayer');

    if (this.pfp.isVideo) {
      if (imgWrap) imgWrap.style.display = 'none';
      if (vidWrap) vidWrap.style.display = 'flex';
      if (vidControls) vidControls.style.display = 'block';

      if (videoPlayer) {
        videoPlayer.src = this.pfp.previewUrl;
        videoPlayer.onloadedmetadata = () => {
          this.pfp.videoDuration = videoPlayer.duration || 3.0;
          this.pfp.trimStart = 0;
          this.pfp.trimEnd = Math.min(this.pfp.videoDuration, 3.0);
          this.updatePfpTrimUI();
        };
        videoPlayer.play().catch(() => {});
      }
    } else {
      if (vidWrap) vidWrap.style.display = 'none';
      if (vidControls) vidControls.style.display = 'none';
      if (imgWrap) imgWrap.style.display = 'flex';

      if (cropImg) cropImg.src = this.pfp.previewUrl;
    }

    const modal = document.getElementById('pfpStudioModal');
    if (modal) modal.style.display = 'flex';
    sfx.playOpen();
    this.updatePfpTransformUI();
  }

  resetPfpTransforms() {
    this.pfp.zoom = 1.0;
    this.pfp.panX = 0;
    this.pfp.panY = 0;
    this.pfp.rotation = 0;
    this.pfp.flipH = false;
    this.pfp.flipV = false;
    this.updatePfpTransformUI();
  }

  updatePfpTransformUI() {
    const transformStr = `translate(${this.pfp.panX}px, ${this.pfp.panY}px) scale(${this.pfp.zoom}) rotate(${this.pfp.rotation}deg) scaleX(${this.pfp.flipH ? -1 : 1}) scaleY(${this.pfp.flipV ? -1 : 1})`;

    const cropImg = document.getElementById('pfpStudioCropImg');
    const videoPlayer = document.getElementById('pfpStudioVideoPlayer');
    if (cropImg) cropImg.style.transform = transformStr;
    if (videoPlayer) videoPlayer.style.transform = transformStr;

    const zoomSlider = document.getElementById('pfpZoomSlider');
    if (zoomSlider) zoomSlider.value = this.pfp.zoom;

    const zText = document.getElementById('pfpZoomLevelText');
    if (zText) zText.textContent = `${Math.round(this.pfp.zoom * 100)}%`;

    const pText = document.getElementById('pfpPanPosText');
    if (pText) pText.textContent = `${Math.round(this.pfp.panX)}, ${Math.round(this.pfp.panY)}`;

    const rText = document.getElementById('pfpRotationText');
    if (rText) rText.textContent = `${this.pfp.rotation}°`;
  }

  updatePfpTrimUI() {
    const startVal = document.getElementById('pfpValStart');
    const endVal = document.getElementById('pfpValEnd');
    const durVal = document.getElementById('pfpValDuration');
    const highlight = document.getElementById('pfpRangeHighlight');
    const startSlider = document.getElementById('pfpStartSlider');
    const endSlider = document.getElementById('pfpEndSlider');

    if (startVal) startVal.textContent = `0:${this.pfp.trimStart.toFixed(1).padStart(4, '0')}`;
    if (endVal) endVal.textContent = `0:${this.pfp.trimEnd.toFixed(1).padStart(4, '0')}`;
    if (durVal) durVal.textContent = `Clip: ${(this.pfp.trimEnd - this.pfp.trimStart).toFixed(1)}s`;

    if (this.pfp.videoDuration > 0) {
      const leftPct = (this.pfp.trimStart / this.pfp.videoDuration) * 100;
      const rightPct = 100 - (this.pfp.trimEnd / this.pfp.videoDuration) * 100;
      if (highlight) {
        highlight.style.left = `${leftPct}%`;
        highlight.style.right = `${rightPct}%`;
      }
      if (startSlider) startSlider.value = leftPct.toFixed(1);
      if (endSlider) endSlider.value = (100 - rightPct).toFixed(1);
    }
  }

  closePfp() {
    const modal = document.getElementById('pfpStudioModal');
    if (modal) modal.style.display = 'none';
    const video = document.getElementById('pfpStudioVideoPlayer');
    if (video) { video.pause(); video.src = ''; }
    if (this.pfp.previewUrl) {
      URL.revokeObjectURL(this.pfp.previewUrl);
      this.pfp.previewUrl = null;
    }
    this.pfp.file = null;
    sfx.playClose();
  }

  async applyPfp() {
    if (!this.pfp.file || this.isApplying) return;
    const btn = document.getElementById('btnApplyPfpStudio');
    const btnText = document.getElementById('btnApplyPfpText');

    this.isApplying = true;
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    toast.info('Encoding 4:5 portrait avatar...');

    try {
      let base64Data;
      const uploadType = this.pfp.isVideo ? 'animatedAvatar' : 'avatar';

      if (this.pfp.isVideo) {
        base64Data = await this.encodeVideoWebM(this.pfp, 512, 640, 800000);
      } else {
        base64Data = await this.encodeImageWebP(this.pfp, 512, 640);
      }

      const uploadRes = await mediaApi.uploadMedia({
        data: base64Data,
        filename: this.pfp.file.name.replace(/\.[^.]+$/, this.pfp.isVideo ? '.webm' : '.webp'),
        type: uploadType
      });

      const serverUrl = uploadRes?.url || uploadRes?.mediaUrl || uploadRes?.originalUrl;
      if (!serverUrl) throw new Error('Upload failed to return avatar URL.');

      // Save to backend database
      const profileRes = await profilesApi.updateProfile({ avatarUrl: serverUrl, avatar_url: serverUrl });
      if (profileRes && profileRes.user) {
        authManager.currentUser = {
          ...authManager.currentUser,
          ...profileRes.user,
          avatarUrl: serverUrl,
          avatar_url: serverUrl
        };
        authManager.updateUserSessionUI();
      }

      // Sync Edit Profile draft if active
      try {
        const { editProfileManager } = await import('./editProfileManager.js');
        if (editProfileManager) {
          if (editProfileManager.draftProfile) {
            editProfileManager.draftProfile.avatarUrl = serverUrl;
            editProfileManager.draftProfile.avatar_url = serverUrl;
          }
          if (editProfileManager.savedProfile) {
            editProfileManager.savedProfile.avatarUrl = serverUrl;
            editProfileManager.savedProfile.avatar_url = serverUrl;
          }
          editProfileManager.updateAvatarPreview(serverUrl);
        }
      } catch (_) {}

      // Sync Profile page if active
      try {
        const { profileManager } = await import('./profileManager.js');
        if (profileManager && profileManager.currentProfile) {
          profileManager.currentProfile.avatarUrl = serverUrl;
          profileManager.currentProfile.avatar_url = serverUrl;
        }
      } catch (_) {}

      // Live DOM updates across all avatar containers
      document.querySelectorAll('#profileAvatarImg, #navHeaderUserAvatar, #mobNavUserAvatar, #mobIdentityAvatar, #sbUserAvatar, #drawerUserAvatar, #lpAvatarImg, #editorAvatarPreview, #quickCreateAvatar').forEach(el => {
        AvatarService.apply(el, serverUrl);
      });

      sfx.playSuccess();
      toast.success('Profile picture saved successfully!');
      this.closePfp();
      window.dispatchEvent(new CustomEvent('dragme:profile:refresh'));
      window.dispatchEvent(new CustomEvent('dragme:auth:success', { detail: { user: authManager.currentUser } }));
    } catch (err) {
      console.error('PFP apply error:', err);
      toast.error(err.message || 'Failed to save avatar.');
    } finally {
      this.isApplying = false;
      if (btn) btn.disabled = false;
      if (btnText) btnText.innerHTML = 'Save Avatar';
    }
  }


  // =========================================================================
  // 2. BANNER STUDIO (3:1 WIDESCREEN)
  // =========================================================================
  bindBannerStudio() {
    const fileInput = document.getElementById('bannerStudioFileInput');

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.loadBannerFile(file);
    });

    document.getElementById('btnCloseBannerStudio')?.addEventListener('click', () => this.closeBanner());
    document.getElementById('btnCancelBannerStudio')?.addEventListener('click', () => this.closeBanner());
    document.getElementById('btnApplyBannerStudio')?.addEventListener('click', () => this.applyBanner());

    // Zoom Slider
    const zoomSlider = document.getElementById('bannerZoomSlider');
    zoomSlider?.addEventListener('input', (e) => {
      this.banner.zoom = parseFloat(e.target.value) || 1.0;
      this.updateBannerTransformUI();
    });

    document.getElementById('btnBannerZoomIn')?.addEventListener('click', () => {
      this.banner.zoom = Math.min(4.0, this.banner.zoom + 0.2);
      this.updateBannerTransformUI();
      sfx.playTap();
    });

    document.getElementById('btnBannerZoomOut')?.addEventListener('click', () => {
      this.banner.zoom = Math.max(1.0, this.banner.zoom - 0.2);
      this.updateBannerTransformUI();
      sfx.playTap();
    });

    // Zoom Presets
    document.querySelectorAll('.btn-banner-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        this.banner.zoom = parseFloat(btn.dataset.scale) || 1.0;
        document.querySelectorAll('.btn-banner-preset').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.updateBannerTransformUI();
        sfx.playTap();
      });
    });

    // D-Pad Pan
    const step = 20;
    document.getElementById('btnBannerPanUp')?.addEventListener('click', () => { this.banner.panY -= step; this.updateBannerTransformUI(); sfx.playTap(); });
    document.getElementById('btnBannerPanDown')?.addEventListener('click', () => { this.banner.panY += step; this.updateBannerTransformUI(); sfx.playTap(); });
    document.getElementById('btnBannerPanLeft')?.addEventListener('click', () => { this.banner.panX -= step; this.updateBannerTransformUI(); sfx.playTap(); });
    document.getElementById('btnBannerPanRight')?.addEventListener('click', () => { this.banner.panX += step; this.updateBannerTransformUI(); sfx.playTap(); });
    document.getElementById('btnBannerPanCenter')?.addEventListener('click', () => { this.banner.panX = 0; this.banner.panY = 0; this.updateBannerTransformUI(); sfx.playTap(); });

    // Rotate & Flip
    document.getElementById('btnBannerRotateRight')?.addEventListener('click', () => {
      this.banner.rotation = (this.banner.rotation + 90) % 360;
      this.updateBannerTransformUI();
      sfx.playTap();
    });
    document.getElementById('btnBannerRotateLeft')?.addEventListener('click', () => {
      this.banner.rotation = (this.banner.rotation - 90 + 360) % 360;
      this.updateBannerTransformUI();
      sfx.playTap();
    });
    document.getElementById('btnBannerFlipH')?.addEventListener('click', () => {
      this.banner.flipH = !this.banner.flipH;
      this.updateBannerTransformUI();
      sfx.playTap();
    });
    document.getElementById('btnBannerFlipV')?.addEventListener('click', () => {
      this.banner.flipV = !this.banner.flipV;
      this.updateBannerTransformUI();
      sfx.playTap();
    });
    document.getElementById('btnBannerReset')?.addEventListener('click', () => {
      this.resetBannerTransforms();
      sfx.playTap();
    });

    // Stage Gestures (Drag & Pinch)
    const stage = document.getElementById('bannerStudioStage');
    if (stage) {
      stage.addEventListener('mousedown', (e) => {
        this.banner.isDragging = true;
        this.banner.dragStartX = e.clientX - this.banner.panX;
        this.banner.dragStartY = e.clientY - this.banner.panY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.banner.isDragging) return;
        this.banner.panX = e.clientX - this.banner.dragStartX;
        this.banner.panY = e.clientY - this.banner.dragStartY;
        this.updateBannerTransformUI();
      });

      window.addEventListener('mouseup', () => { this.banner.isDragging = false; });

      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          this.banner.isDragging = true;
          this.banner.dragStartX = e.touches[0].clientX - this.banner.panX;
          this.banner.dragStartY = e.touches[0].clientY - this.banner.panY;
        }
      }, { passive: true });

      stage.addEventListener('touchmove', (e) => {
        if (this.banner.isDragging && e.touches.length === 1) {
          this.banner.panX = e.touches[0].clientX - this.banner.dragStartX;
          this.banner.panY = e.touches[0].clientY - this.banner.dragStartY;
          this.updateBannerTransformUI();
        }
      }, { passive: true });

      stage.addEventListener('touchend', () => { this.banner.isDragging = false; });

      stage.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.banner.zoom = Math.min(4.0, Math.max(1.0, this.banner.zoom + delta));
        this.updateBannerTransformUI();
      }, { passive: false });
    }

    // Video Playback & Timeline
    const video = document.getElementById('bannerStudioVideoPlayer');
    const btnPlay = document.getElementById('btnToggleBannerVideoPlayback');
    btnPlay?.addEventListener('click', () => {
      if (!video) return;
      if (video.paused) {
        video.play();
        const icon = document.getElementById('iconBannerVideoPlay');
        if (icon) icon.className = 'fa-solid fa-pause';
      } else {
        video.pause();
        const icon = document.getElementById('iconBannerVideoPlay');
        if (icon) icon.className = 'fa-solid fa-play';
      }
    });

    if (video) {
      video.ontimeupdate = () => {
        if (video.currentTime >= this.banner.trimEnd || video.currentTime < this.banner.trimStart) {
          video.currentTime = this.banner.trimStart;
          video.play().catch(() => {});
        }
        const timer = document.getElementById('bannerVideoTimer');
        if (timer) {
          timer.textContent = `0:${(video.currentTime || 0).toFixed(1).padStart(4, '0')} / 0:${(this.banner.videoDuration || 0).toFixed(1).padStart(4, '0')}`;
        }
      };
    }

    document.getElementById('bannerStartSlider')?.addEventListener('input', (e) => {
      const pct = parseFloat(e.target.value) / 100;
      let newStart = pct * this.banner.videoDuration;
      if (newStart >= this.banner.trimEnd - 0.5) newStart = Math.max(0, this.banner.trimEnd - 0.5);
      if (this.banner.trimEnd - newStart > 4.0) this.banner.trimEnd = Math.min(this.banner.videoDuration, newStart + 4.0);
      this.banner.trimStart = newStart;
      if (video) video.currentTime = this.banner.trimStart;
      this.updateBannerTrimUI();
    });

    document.getElementById('bannerEndSlider')?.addEventListener('input', (e) => {
      const pct = parseFloat(e.target.value) / 100;
      let newEnd = pct * this.banner.videoDuration;
      if (newEnd <= this.banner.trimStart + 0.5) newEnd = Math.min(this.banner.videoDuration, this.banner.trimStart + 0.5);
      if (newEnd - this.banner.trimStart > 4.0) this.banner.trimStart = Math.max(0, newEnd - 4.0);
      this.banner.trimEnd = newEnd;
      if (video) video.currentTime = this.banner.trimStart;
      this.updateBannerTrimUI();
    });
  }

  loadBannerFile(file) {
    if (!file) return;

    const isVideo = file.type.startsWith('video/');

    // Enforce Static vs Nitro Motion boundary
    if (isVideo && !this.isMotionMode) {
      toast.error('Normal Banner Studio is for static photos only. To upload a motion video loop, use the DRAGME Nitro section.');
      sfx.playError?.();
      return;
    }

    if (isVideo && !this.isMotionUnlocked()) {
      toast.error('Motion Video Banners are exclusively unlocked for @nitish (Founder / Nitro). Standard accounts can upload PNG, JPEG, WEBP or GIF.');
      sfx.playError?.();
      return;
    }

    this.banner.file = file;
    this.banner.isVideo = isVideo;
    this.resetBannerTransforms();

    if (this.banner.previewUrl) URL.revokeObjectURL(this.banner.previewUrl);
    this.banner.previewUrl = URL.createObjectURL(file);

    const imgWrap = document.getElementById('bannerStudioImageWrap');
    const vidWrap = document.getElementById('bannerStudioVideoWrap');
    const vidControls = document.getElementById('bannerVideoControls');
    const cropImg = document.getElementById('bannerStudioCropImg');
    const videoPlayer = document.getElementById('bannerStudioVideoPlayer');

    if (this.banner.isVideo) {
      if (imgWrap) imgWrap.style.display = 'none';
      if (vidWrap) vidWrap.style.display = 'flex';
      if (vidControls) vidControls.style.display = 'block';

      if (videoPlayer) {
        videoPlayer.src = this.banner.previewUrl;
        videoPlayer.onloadedmetadata = () => {
          this.banner.videoDuration = videoPlayer.duration || 4.0;
          this.banner.trimStart = 0;
          this.banner.trimEnd = Math.min(this.banner.videoDuration, 4.0);
          this.updateBannerTrimUI();
        };
        videoPlayer.play().catch(() => {});
      }
    } else {
      if (vidWrap) vidWrap.style.display = 'none';
      if (vidControls) vidControls.style.display = 'none';
      if (imgWrap) imgWrap.style.display = 'flex';

      if (cropImg) cropImg.src = this.banner.previewUrl;
    }

    const modal = document.getElementById('bannerStudioModal');
    if (modal) modal.style.display = 'flex';
    sfx.playOpen();
    this.updateBannerTransformUI();
  }

  resetBannerTransforms() {
    this.banner.zoom = 1.0;
    this.banner.panX = 0;
    this.banner.panY = 0;
    this.banner.rotation = 0;
    this.banner.flipH = false;
    this.banner.flipV = false;
    this.updateBannerTransformUI();
  }

  updateBannerTransformUI() {
    const transformStr = `translate(${this.banner.panX}px, ${this.banner.panY}px) scale(${this.banner.zoom}) rotate(${this.banner.rotation}deg) scaleX(${this.banner.flipH ? -1 : 1}) scaleY(${this.banner.flipV ? -1 : 1})`;

    const cropImg = document.getElementById('bannerStudioCropImg');
    const videoPlayer = document.getElementById('bannerStudioVideoPlayer');
    if (cropImg) cropImg.style.transform = transformStr;
    if (videoPlayer) videoPlayer.style.transform = transformStr;

    const zoomSlider = document.getElementById('bannerZoomSlider');
    if (zoomSlider) zoomSlider.value = this.banner.zoom;

    const zText = document.getElementById('bannerZoomLevelText');
    if (zText) zText.textContent = `${Math.round(this.banner.zoom * 100)}%`;

    const pText = document.getElementById('bannerPanPosText');
    if (pText) pText.textContent = `${Math.round(this.banner.panX)}, ${Math.round(this.banner.panY)}`;

    const rText = document.getElementById('bannerRotationText');
    if (rText) rText.textContent = `${this.banner.rotation}°`;
  }

  updateBannerTrimUI() {
    const startVal = document.getElementById('bannerValStart');
    const endVal = document.getElementById('bannerValEnd');
    const durVal = document.getElementById('bannerValDuration');
    const highlight = document.getElementById('bannerRangeHighlight');
    const startSlider = document.getElementById('bannerStartSlider');
    const endSlider = document.getElementById('bannerEndSlider');

    if (startVal) startVal.textContent = `0:${this.banner.trimStart.toFixed(1).padStart(4, '0')}`;
    if (endVal) endVal.textContent = `0:${this.banner.trimEnd.toFixed(1).padStart(4, '0')}`;
    if (durVal) durVal.textContent = `Clip: ${(this.banner.trimEnd - this.banner.trimStart).toFixed(1)}s`;

    if (this.banner.videoDuration > 0) {
      const leftPct = (this.banner.trimStart / this.banner.videoDuration) * 100;
      const rightPct = 100 - (this.banner.trimEnd / this.banner.videoDuration) * 100;
      if (highlight) {
        highlight.style.left = `${leftPct}%`;
        highlight.style.right = `${rightPct}%`;
      }
      if (startSlider) startSlider.value = leftPct.toFixed(1);
      if (endSlider) endSlider.value = (100 - rightPct).toFixed(1);
    }
  }

  closeBanner() {
    const modal = document.getElementById('bannerStudioModal');
    if (modal) modal.style.display = 'none';
    const video = document.getElementById('bannerStudioVideoPlayer');
    if (video) { video.pause(); video.src = ''; }
    if (this.banner.previewUrl) {
      URL.revokeObjectURL(this.banner.previewUrl);
      this.banner.previewUrl = null;
    }
    this.banner.file = null;
    sfx.playClose();
  }

  async applyBanner() {
    if (!this.banner.file || this.isApplying) return;
    const btn = document.getElementById('btnApplyBannerStudio');
    const btnText = document.getElementById('btnApplyBannerText');

    this.isApplying = true;
    if (btn) btn.disabled = true;
    if (btnText) btnText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';
    toast.info('Encoding 3:1 panoramic banner...');

    try {
      let base64Data;
      const uploadType = this.banner.isVideo ? 'animatedBanner' : 'banner';

      if (this.banner.isVideo) {
        base64Data = await this.encodeVideoWebM(this.banner, 1280, 426, 1500000);
      } else {
        base64Data = await this.encodeImageWebP(this.banner, 1920, 640);
      }

      const uploadRes = await mediaApi.uploadMedia({
        data: base64Data,
        filename: this.banner.file.name.replace(/\.[^.]+$/, this.banner.isVideo ? '.webm' : '.webp'),
        type: uploadType
      });

      const serverUrl = uploadRes?.url || uploadRes?.mediaUrl || uploadRes?.originalUrl;
      if (!serverUrl) throw new Error('Upload failed to return banner URL.');

      // Save to backend database
      const profileRes = await profilesApi.updateProfile({ bannerUrl: serverUrl, banner_url: serverUrl });
      if (profileRes && profileRes.user) {
        authManager.currentUser = {
          ...authManager.currentUser,
          ...profileRes.user,
          bannerUrl: serverUrl,
          banner_url: serverUrl
        };
        authManager.updateUserSessionUI();
      }

      // Sync Edit Profile draft if active
      try {
        const { editProfileManager } = await import('./editProfileManager.js');
        if (editProfileManager) {
          if (editProfileManager.draftProfile) {
            editProfileManager.draftProfile.bannerUrl = serverUrl;
            editProfileManager.draftProfile.banner_url = serverUrl;
          }
          if (editProfileManager.savedProfile) {
            editProfileManager.savedProfile.bannerUrl = serverUrl;
            editProfileManager.savedProfile.banner_url = serverUrl;
          }
          editProfileManager.updateBannerPreview(serverUrl);
        }
      } catch (_) {}

      // Sync Profile page if active
      try {
        const { profileManager } = await import('./profileManager.js');
        if (profileManager && profileManager.currentProfile) {
          profileManager.currentProfile.bannerUrl = serverUrl;
          profileManager.currentProfile.banner_url = serverUrl;
        }
      } catch (_) {}

      // Live DOM updates for banner containers
      const bannerWrap = document.getElementById('profileBannerMedia') || document.querySelector('.profile-banner-wrapper .profile-banner-media');
      if (bannerWrap) {
        let currentBanner = bannerWrap.querySelector('#profileBannerImg, .profile-banner-img');
        if (AvatarService.isVideoUrl(serverUrl)) {
          if (!currentBanner || currentBanner.tagName !== 'VIDEO') {
            const vid = document.createElement('video');
            vid.id = 'profileBannerImg';
            vid.className = 'profile-banner-img';
            vid.autoplay = true;
            vid.loop = true;
            vid.muted = true;
            vid.playsInline = true;
            vid.setAttribute('playsinline', '');
            vid.src = serverUrl;
            if (currentBanner) bannerWrap.replaceChild(vid, currentBanner);
            else bannerWrap.insertBefore(vid, bannerWrap.firstChild);
            vid.play().catch(() => {});
          } else {
            currentBanner.src = serverUrl;
            currentBanner.play().catch(() => {});
          }
        } else {
          if (!currentBanner || currentBanner.tagName !== 'IMG') {
            const img = document.createElement('img');
            img.id = 'profileBannerImg';
            img.className = 'profile-banner-img';
            img.src = serverUrl;
            img.alt = 'Banner';
            if (currentBanner) bannerWrap.replaceChild(img, currentBanner);
            else bannerWrap.insertBefore(img, bannerWrap.firstChild);
          } else {
            currentBanner.src = serverUrl;
          }
        }
      }

      document.querySelectorAll('#lpBannerImg, #editorBannerPreview').forEach(el => {
        AvatarService.apply(el, serverUrl);
      });

      sfx.playSuccess();
      toast.success('Header banner saved successfully!');
      this.closeBanner();
      window.dispatchEvent(new CustomEvent('dragme:profile:refresh'));
      window.dispatchEvent(new CustomEvent('dragme:auth:success', { detail: { user: authManager.currentUser } }));
    } catch (err) {
      console.error('Banner apply error:', err);
      toast.error(err.message || 'Failed to save banner.');
    } finally {
      this.isApplying = false;
      if (btn) btn.disabled = false;
      if (btnText) btnText.innerHTML = 'Save Banner';
    }
  }


  // =========================================================================
  // UNIVERSAL HIGH-EFFICIENCY ROBUST ENCODERS
  // =========================================================================
  async encodeImageWebP(state, targetW, targetH) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('Image framing timed out. Please try again.'));
        }
      }, 7000);

      const doRender = (img) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Could not create canvas 2D context.'));

          ctx.fillStyle = '#0e1117';
          ctx.fillRect(0, 0, targetW, targetH);

          ctx.save();
          ctx.translate(targetW / 2, targetH / 2);
          ctx.rotate((state.rotation * Math.PI) / 180);
          ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);

          const natW = img.naturalWidth || img.width || targetW;
          const natH = img.naturalHeight || img.height || targetH;
          const scaleFactor = Math.max(targetW / natW, targetH / natH) * state.zoom;
          const drawW = natW * scaleFactor;
          const drawH = natH * scaleFactor;
          const drawX = -drawW / 2 + state.panX * (targetW / 360);
          const drawY = -drawH / 2 + state.panY * (targetH / 360);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, drawX, drawY, drawW, drawH);
          ctx.restore();

          let dataUrl = canvas.toDataURL('image/webp', 0.9);
          if (!dataUrl || !dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      const img = new Image();
      if (state.previewUrl && state.previewUrl.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => doRender(img);
      img.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          reject(new Error('Failed to load image for cropping.'));
        }
      };

      img.src = state.previewUrl;
      if (img.complete && img.naturalWidth > 0) {
        doRender(img);
      }
    });
  }

  async encodeVideoWebM(state, targetW, targetH, targetBitrate = 1200000) {
    const durationSec = Math.max(0.5, Math.min((state.trimEnd || 3.0) - (state.trimStart || 0), 10));

    return new Promise(async (resolve, reject) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          if (state.file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Video encoding timed out.'));
            reader.readAsDataURL(state.file);
          } else {
            reject(new Error('Video encoding timed out. Please try a shorter duration clip.'));
          }
        }
      }, 10000);

      try {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        if (state.previewUrl && state.previewUrl.startsWith('http')) {
          video.crossOrigin = 'anonymous';
        }

        await new Promise((res) => {
          video.onloadedmetadata = () => res();
          video.onerror = () => res();
          video.src = state.previewUrl;
          if (video.readyState >= 1) res();
          setTimeout(res, 2000);
        });

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          clearTimeout(timeoutId);
          if (state.file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(state.file);
            return;
          }
          return reject(new Error('Could not create canvas context for video export.'));
        }

        const stream = canvas.captureStream ? canvas.captureStream(30) : null;
        let mimeType = 'video/webm;codecs=vp9';
        if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        if (!stream || typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported(mimeType)) {
          if (state.file) {
            const reader = new FileReader();
            reader.onload = () => {
              if (!settled) {
                settled = true;
                clearTimeout(timeoutId);
                resolve(reader.result);
              }
            };
            reader.readAsDataURL(state.file);
            return;
          }
        }

        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: targetBitrate });
        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          try {
            const blob = new Blob(chunks, { type: 'video/webm' });
            if (blob.size < 100 && state.file) {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(state.file);
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to read encoded video file.'));
            reader.readAsDataURL(blob);
          } catch (err) {
            reject(err);
          }
        };

        if (state.trimStart && Math.abs(video.currentTime - state.trimStart) > 0.05) {
          video.currentTime = state.trimStart;
          await new Promise(r => {
            video.onseeked = () => r();
            setTimeout(r, 600);
          });
        }

        try {
          await video.play();
        } catch (_) {}

        recorder.start(100);
        const startTime = performance.now();

        const renderFrame = () => {
          if (settled) return;
          const elapsed = (performance.now() - startTime) / 1000;
          if (elapsed >= durationSec || video.ended || video.paused) {
            if (recorder.state === 'recording') recorder.stop();
            video.pause();
            return;
          }

          ctx.fillStyle = '#0e1117';
          ctx.fillRect(0, 0, targetW, targetH);

          ctx.save();
          ctx.translate(targetW / 2, targetH / 2);
          ctx.rotate((state.rotation * Math.PI) / 180);
          ctx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);

          const vidW = video.videoWidth || targetW;
          const vidH = video.videoHeight || targetH;
          const scaleFactor = Math.max(targetW / vidW, targetH / vidH) * state.zoom;
          const drawW = vidW * scaleFactor;
          const drawH = vidH * scaleFactor;
          const drawX = -drawW / 2 + state.panX * (targetW / 360);
          const drawY = -drawH / 2 + state.panY * (targetH / 360);

          ctx.drawImage(video, drawX, drawY, drawW, drawH);
          ctx.restore();

          requestAnimationFrame(renderFrame);
        };

        requestAnimationFrame(renderFrame);
      } catch (err) {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          if (state.file) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(state.file);
          } else {
            reject(err);
          }
        }
      }
    });
  }
}

export const mediaStudioManager = new MediaStudioManager();
export default mediaStudioManager;
