/* ==========================================================================
   DRAGME FEATURE: EDIT PROFILE (src/features/profile/editProfileManager.js)
   Live interactive preview, field sanitization, social links, nitro & customization
   ========================================================================== */

import { profilesApi } from '../../api/profilesApi.js';
import { mediaApi } from '../../api/mediaApi.js';
import { authManager } from '../auth/authManager.js';
import { toast } from '../toast/toastManager.js';
import { sfx } from '../../services/sfxService.js';
import { AvatarService, DEFAULT_AVATAR_SVG } from '../../services/avatarService.js';
import { ClientMediaCompressor } from '../../services/clientMediaCompressor.js';
import { mediaStudioManager } from './mediaStudioManager.js';
import { router } from '../../app/router.js';
import { escapeHtml } from '../../utils/domUtils.js';

export class EditProfileManager {
  constructor() {
    this.savedProfile = null;
    this.draftProfile = null;
    this.isDirty = false;
    this.pendingAvatarData = null;
    this.pendingBannerData = null;
    this.pageView = null;
    this.modalView = null;
  }

  init() {
    this.pageView = document.getElementById('editProfilePageView');
    this.modalView = document.getElementById('editProfileModal');

    window.addEventListener('dragme:profile:edit:open', () => {
      router.navigate('edit-profile');
    });

    // Back & Discard buttons
    document.getElementById('btnEditProfileBack')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.close();
    });

    document.getElementById('btnEditorDiscard')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.discardChanges();
    });

    // Save button
    document.getElementById('btnEditorSave')?.addEventListener('click', async (e) => {
      e.preventDefault();
      await this.saveProfile();
    });

    // Modal close/cancel buttons
    document.getElementById('closeEditProfileModalBtn')?.addEventListener('click', () => this.closeModal());
    document.getElementById('btnCancelEditProfile')?.addEventListener('click', () => this.closeModal());
    document.getElementById('editProfileForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveModalProfile();
    });

    // Listen to global profile and auth refresh events
    window.addEventListener('dragme:profile:refresh', () => {
      if (authManager.currentUser && this.draftProfile) {
        const freshAv = authManager.currentUser.avatarUrl || authManager.currentUser.avatar_url;
        const freshBan = authManager.currentUser.bannerUrl || authManager.currentUser.banner_url;
        if (freshAv) {
          this.draftProfile.avatarUrl = freshAv;
          this.draftProfile.avatar_url = freshAv;
          this.updateAvatarPreview(freshAv);
        }
        if (freshBan) {
          this.draftProfile.bannerUrl = freshBan;
          this.draftProfile.banner_url = freshBan;
          this.updateBannerPreview(freshBan);
        }
      }
    });

    window.addEventListener('dragme:auth:success', (e) => {
      const user = e.detail?.user;
      if (user && this.draftProfile) {
        const freshAv = user.avatarUrl || user.avatar_url;
        const freshBan = user.bannerUrl || user.banner_url;
        if (freshAv) {
          this.draftProfile.avatarUrl = freshAv;
          this.draftProfile.avatar_url = freshAv;
          this.updateAvatarPreview(freshAv);
        }
        if (freshBan) {
          this.draftProfile.bannerUrl = freshBan;
          this.draftProfile.banner_url = freshBan;
          this.updateBannerPreview(freshBan);
        }
      }
    });

    // Tabs switcher (General vs Nitro)
    this.bindTabSwitcher();

    // Inputs & Presets
    this.bindFormInputs();
    this.bindAppearancePresets();
    this.bindNitroPerks();
    this.bindFileUploads();
  }

  bindTabSwitcher() {
    const tabGeneral = document.getElementById('tabSwitchGeneral');
    const tabNitro = document.getElementById('tabSwitchNitro');
    const viewGeneral = document.getElementById('viewGeneralSettings');
    const viewNitro = document.getElementById('viewNitroSettings');

    tabGeneral?.addEventListener('click', () => {
      sfx.playTap();
      tabGeneral.classList.add('active');
      tabNitro?.classList.remove('active');
      if (viewGeneral) viewGeneral.style.display = 'block';
      if (viewNitro) viewNitro.style.display = 'none';
    });

    tabNitro?.addEventListener('click', () => {
      sfx.playTap();
      tabNitro.classList.add('active');
      tabGeneral?.classList.remove('active');
      if (viewGeneral) viewGeneral.style.display = 'none';
      if (viewNitro) viewNitro.style.display = 'block';
    });
  }

  bindFormInputs() {
    // Display Name
    const nameInp = document.getElementById('editorDisplayNameInput');
    nameInp?.addEventListener('input', (e) => {
      if (!this.draftProfile) return;
      this.draftProfile.displayName = e.target.value;
      const lpName = document.getElementById('lpDisplayName');
      if (lpName) lpName.textContent = e.target.value || this.draftProfile.username || 'Anonymous';
      this.markDirty(true);
    });

    // Username (view/edit)
    const usernameInp = document.getElementById('editorUsernameInput');
    usernameInp?.addEventListener('input', (e) => {
      const cleanVal = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
      e.target.value = cleanVal;
      const lpHan = document.getElementById('lpHandle');
      if (lpHan) lpHan.textContent = `@${cleanVal || 'user'}`;
      const previewSpan = document.querySelector('#editorDomainPreview span');
      if (previewSpan) previewSpan.textContent = cleanVal || 'user';
      this.markDirty(true);
    });

    // Bio & Counter
    const bioInp = document.getElementById('editorBioInput');
    bioInp?.addEventListener('input', (e) => {
      if (!this.draftProfile) return;
      this.draftProfile.bio = e.target.value;
      const counter = document.getElementById('editorBioCounter');
      if (counter) counter.textContent = `${e.target.value.length}/150`;
      const lpBio = document.getElementById('lpBio');
      if (lpBio) lpBio.textContent = e.target.value || 'Same people. Different minds.';
      this.markDirty(true);
    });

    // Location
    const locInp = document.getElementById('editorLocationInput');
    locInp?.addEventListener('input', (e) => {
      if (!this.draftProfile) return;
      this.draftProfile.location = e.target.value;
      const lpLoc = document.getElementById('lpLocationText');
      if (lpLoc) lpLoc.textContent = e.target.value || 'Hamirpur, HP';
      this.markDirty(true);
    });

    document.getElementById('btnClearLocation')?.addEventListener('click', () => {
      if (locInp) locInp.value = '';
      if (this.draftProfile) this.draftProfile.location = '';
      const lpLoc = document.getElementById('lpLocationText');
      if (lpLoc) lpLoc.textContent = 'Not specified';
      this.markDirty(true);
    });

    // Date of Birth
    const dobInp = document.getElementById('editorDobInput');
    dobInp?.addEventListener('input', (e) => {
      if (!this.draftProfile) return;
      this.draftProfile.dateOfBirth = e.target.value;
      const lpDob = document.getElementById('lpDobText');
      if (lpDob) lpDob.textContent = e.target.value || '15 / 03 / 2005';
      this.markDirty(true);
    });

    // Gender
    const genderSel = document.getElementById('editorGenderSelect');
    genderSel?.addEventListener('change', (e) => {
      if (!this.draftProfile) return;
      this.draftProfile.gender = e.target.value;
      const lpGender = document.getElementById('lpGenderText');
      if (lpGender) lpGender.textContent = e.target.value || 'Male';
      this.markDirty(true);
    });

    // Social inputs
    const socialIds = [
      { id: 'socialInstagramInput', key: 'instagram', icon: 'fa-brands fa-instagram', bg: 'bg-instagram' },
      { id: 'socialYoutubeInput', key: 'youtube', icon: 'fa-brands fa-youtube', bg: 'bg-youtube' },
      { id: 'socialTwitterInput', key: 'twitter', icon: 'fa-brands fa-x-twitter', bg: 'bg-x' },
      { id: 'socialDiscordInput', key: 'discord', icon: 'fa-brands fa-discord', bg: 'bg-discord' }
    ];

    socialIds.forEach(({ id, key }) => {
      const inp = document.getElementById(id);
      inp?.addEventListener('input', (e) => {
        if (!this.draftProfile) return;
        if (!this.draftProfile.socialLinks) this.draftProfile.socialLinks = {};
        this.draftProfile.socialLinks[key] = e.target.value.trim();
        this.updateLiveSocialPills();
        this.markDirty(true);
      });
    });

    document.querySelectorAll('.btn-clear-social').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetInp = document.getElementById(targetId);
        if (targetInp) {
          targetInp.value = '';
          const match = socialIds.find(s => s.id === targetId);
          if (match && this.draftProfile?.socialLinks) {
            delete this.draftProfile.socialLinks[match.key];
            this.updateLiveSocialPills();
            this.markDirty(true);
          }
        }
      });
    });

    // Visibility
    const visSel = document.getElementById('editorVisibilitySelect');
    visSel?.addEventListener('change', (e) => {
      if (!this.draftProfile) return;
      this.draftProfile.visibility = e.target.value;
      this.markDirty(true);
    });
  }

  updateLiveSocialPills() {
    const row = document.getElementById('lpSocialLinksRow');
    if (!row) return;

    const links = this.draftProfile?.socialLinks || {};
    const iconsMap = {
      instagram: 'fa-brands fa-instagram',
      youtube: 'fa-brands fa-youtube',
      twitter: 'fa-brands fa-x-twitter',
      discord: 'fa-brands fa-discord'
    };

    const activeKeys = Object.keys(links).filter(k => links[k] && links[k].trim().length > 0);
    if (activeKeys.length === 0) {
      row.innerHTML = '';
      return;
    }

    row.innerHTML = activeKeys.map(k => `
      <span class="lp-social-pill" title="${escapeHtml(k)}: ${escapeHtml(links[k])}">
        <i class="${iconsMap[k] || 'fa-solid fa-link'}"></i>
        <span>${escapeHtml(k)}</span>
      </span>
    `).join('');
  }

  bindAppearancePresets() {
    // Banner wallpaper presets
    document.querySelectorAll('#bannerPresetsGrid .preset-strip-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        sfx.playTap();
        document.querySelectorAll('#bannerPresetsGrid .preset-strip-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const src = pill.dataset.src;
        if (src && this.draftProfile) {
          this.draftProfile.bannerUrl = src;
          this.pendingBannerData = null;
          this.updateBannerPreview(src);
          this.markDirty(true);
        }
      });
    });

    // Avatar bubble presets
    document.querySelectorAll('#avatarPresetsGrid .preset-av-bubble').forEach(bubble => {
      bubble.addEventListener('click', () => {
        sfx.playTap();
        document.querySelectorAll('#avatarPresetsGrid .preset-av-bubble').forEach(b => b.classList.remove('active'));
        bubble.classList.add('active');
        const src = bubble.dataset.src;
        if (src && this.draftProfile) {
          this.draftProfile.avatarUrl = src;
          this.pendingAvatarData = null;
          this.updateAvatarPreview(src);
          this.markDirty(true);
        }
      });
    });

    // Remove Banner
    document.getElementById('btnRemoveBannerPhoto')?.addEventListener('click', () => {
      sfx.playTap();
      const defaultBanner = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80';
      if (this.draftProfile) {
        this.draftProfile.bannerUrl = defaultBanner;
        this.pendingBannerData = null;
        this.updateBannerPreview(defaultBanner);
        this.markDirty(true);
      }
    });

    // Remove Avatar
    document.getElementById('btnRemoveAvatarPhoto')?.addEventListener('click', () => {
      sfx.playTap();
      const defaultAvatar = DEFAULT_AVATAR_SVG;
      if (this.draftProfile) {
        this.draftProfile.avatarUrl = '';
        this.pendingAvatarData = null;
        this.updateAvatarPreview(defaultAvatar);
        this.markDirty(true);
      }
    });
  }

  bindNitroPerks() {
    // Nitro animated avatar presets
    document.querySelectorAll('#nitroAvatarPresetsGrid .nitro-media-card').forEach(card => {
      card.addEventListener('click', () => {
        sfx.playTap();
        document.querySelectorAll('#nitroAvatarPresetsGrid .nitro-media-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const src = card.dataset.src;
        if (src && this.draftProfile) {
          this.draftProfile.avatarUrl = src;
          this.pendingAvatarData = null;
          this.updateAvatarPreview(src);
          this.markDirty(true);
          toast.success('Nitro animated avatar preview applied!');
        }
      });
    });

    // Nitro motion banner presets
    document.querySelectorAll('#nitroBannerPresetsGrid .nitro-banner-card').forEach(card => {
      card.addEventListener('click', () => {
        sfx.playTap();
        document.querySelectorAll('#nitroBannerPresetsGrid .nitro-banner-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const src = card.dataset.src;
        if (src && this.draftProfile) {
          this.draftProfile.bannerUrl = src;
          this.pendingBannerData = null;
          this.updateBannerPreview(src);
          this.markDirty(true);
          toast.success('Nitro motion banner preview applied!');
        }
      });
    });

    // Nitro Avatar Frames
    document.querySelectorAll('#nitroFramesGrid .frame-card').forEach(card => {
      card.addEventListener('click', () => {
        sfx.playTap();
        document.querySelectorAll('#nitroFramesGrid .frame-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const frame = card.dataset.frame || 'none';
        if (this.draftProfile) {
          this.draftProfile.avatarFrame = frame;
          this.markDirty(true);
          toast.info(`Frame selected: ${frame}`);
        }
      });
    });

    // Nitro Themes
    document.querySelectorAll('#nitroThemesGrid .theme-card').forEach(card => {
      card.addEventListener('click', () => {
        sfx.playTap();
        document.querySelectorAll('#nitroThemesGrid .theme-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const theme = card.dataset.theme || 'default';
        if (this.draftProfile) {
          this.draftProfile.profileTheme = theme;
          this.markDirty(true);
          toast.info(`Theme selected: ${theme}`);
        }
      });
    });

    // Upgrade CTA
    document.getElementById('btnNitroUpgradeCTA')?.addEventListener('click', () => {
      sfx.playTap();
      toast.success('DRAGME Nitro perks unlocked for your account preview!');
    });
  }

  bindFileUploads() {
    // Normal Static Photo Banner Upload -> STRICTLY Photo Studio
    const triggerBannerBtn = document.getElementById('btnTriggerBannerUpload');
    const openBannerStudioBtn = document.getElementById('btnOpenBannerStudio');
    triggerBannerBtn?.addEventListener('click', () => mediaStudioManager.open('banner', null, false));
    openBannerStudioBtn?.addEventListener('click', () => mediaStudioManager.open('banner', null, false));

    // Normal Static Photo Avatar Upload -> STRICTLY Photo Studio
    const triggerAvatarBtn = document.getElementById('btnTriggerAvatarUpload');
    const triggerAvatarBtn2 = document.getElementById('btnTriggerAvatarUpload2');
    const openAvatarStudioBtn = document.getElementById('btnOpenAvatarStudio');
    triggerAvatarBtn?.addEventListener('click', () => mediaStudioManager.open('avatar', null, false));
    triggerAvatarBtn2?.addEventListener('click', () => mediaStudioManager.open('avatar', null, false));
    openAvatarStudioBtn?.addEventListener('click', () => mediaStudioManager.open('avatar', null, false));

    // Nitro Animated Clip & Video Trimmer triggers Media Studio (Gated for @nitish / Nitro)
    document.getElementById('btnTriggerNitroAvatar')?.addEventListener('click', () => {
      if (!mediaStudioManager.isMotionUnlocked()) {
        toast.error('Motion Video Avatars are exclusively unlocked for @nitish (Founder / Nitro). Standard accounts can upload PNG, JPEG, WEBP or GIF.');
        sfx.playError?.();
        return;
      }
      mediaStudioManager.open('avatar', null, true);
    });

    document.getElementById('btnTriggerNitroBanner')?.addEventListener('click', () => {
      if (!mediaStudioManager.isMotionUnlocked()) {
        toast.error('Motion Video Banners are exclusively unlocked for @nitish (Founder / Nitro). Standard accounts can upload PNG, JPEG, WEBP or GIF.');
        sfx.playError?.();
        return;
      }
      mediaStudioManager.open('banner', null, true);
    });
  }

  updateBannerPreview(url) {
    const editorImg = document.getElementById('editorBannerPreview');
    if (editorImg) AvatarService.apply(editorImg, url);
    const lpImg = document.getElementById('lpBannerImg');
    if (lpImg) AvatarService.apply(lpImg, url);
  }

  updateAvatarPreview(url) {
    const editorImg = document.getElementById('editorAvatarPreview');
    if (editorImg) AvatarService.apply(editorImg, url);
    const lpImg = document.getElementById('lpAvatarImg');
    if (lpImg) AvatarService.apply(lpImg, url);
  }

  async open() {
    if (!authManager.isAuthenticated()) {
      authManager.requireAuth({ type: 'profile' }, 'Please sign in to edit your profile arena.');
      return;
    }

    try {
      const res = await profilesApi.getProfile(authManager.currentUser.username);
      this.savedProfile = res.profile || authManager.currentUser;
      this.draftProfile = JSON.parse(JSON.stringify(this.savedProfile));
      this.pendingAvatarData = null;
      this.pendingBannerData = null;

      this.populateForm();

      if (this.pageView) {
        this.pageView.style.display = 'flex';
        this.pageView.classList.add('open');
      }
      sfx.playOpen();
    } catch (err) {
      console.error('Error opening profile editor:', err);
      toast.error('Failed to load profile for editing.');
    }
  }

  close() {
    if (this.pageView) {
      this.pageView.style.display = 'none';
      this.pageView.classList.remove('open');
    }
    sfx.playClose();
    if (authManager.currentUser?.username) {
      router.navigate(`profile/${authManager.currentUser.username}`);
    } else {
      router.navigate('feed');
    }
  }

  discardChanges() {
    if (this.savedProfile) {
      this.draftProfile = JSON.parse(JSON.stringify(this.savedProfile));
      this.pendingAvatarData = null;
      this.pendingBannerData = null;
      this.populateForm();
      this.markDirty(false);
      toast.info('Changes discarded.');
    }
    this.close();
  }

  populateForm() {
    if (!this.draftProfile) return;
    const d = this.draftProfile;

    // Inputs
    const nameInp = document.getElementById('editorDisplayNameInput');
    if (nameInp) nameInp.value = d.displayName || d.username || '';

    const usernameInp = document.getElementById('editorUsernameInput');
    if (usernameInp) usernameInp.value = d.username || '';

    const previewSpan = document.querySelector('#editorDomainPreview span');
    if (previewSpan) previewSpan.textContent = d.username || '';

    const bioInp = document.getElementById('editorBioInput');
    if (bioInp) {
      bioInp.value = d.bio || '';
      const counter = document.getElementById('editorBioCounter');
      if (counter) counter.textContent = `${(d.bio || '').length}/150`;
    }

    const locInp = document.getElementById('editorLocationInput');
    if (locInp) locInp.value = d.location || '';

    const dobInp = document.getElementById('editorDobInput');
    if (dobInp) dobInp.value = d.dateOfBirth || '';

    const genderSel = document.getElementById('editorGenderSelect');
    if (genderSel) genderSel.value = d.gender || 'Male';

    const visSel = document.getElementById('editorVisibilitySelect');
    if (visSel) visSel.value = d.visibility || 'public';

    // Social links
    const links = d.socialLinks || {};
    const igInp = document.getElementById('socialInstagramInput');
    if (igInp) igInp.value = links.instagram || '';

    const ytInp = document.getElementById('socialYoutubeInput');
    if (ytInp) ytInp.value = links.youtube || '';

    const twInp = document.getElementById('socialTwitterInput');
    if (twInp) twInp.value = links.twitter || '';

    const dcInp = document.getElementById('socialDiscordInput');
    if (dcInp) dcInp.value = links.discord || '';

    // Live Preview elements
    const lpName = document.getElementById('lpDisplayName');
    if (lpName) lpName.textContent = d.displayName || d.username || 'Tester';

    const lpRank = document.getElementById('lpRankBadge');
    if (lpRank) lpRank.textContent = d.rankTitle || 'Senior Roaster';

    const lpHan = document.getElementById('lpHandle');
    if (lpHan) lpHan.textContent = `@${d.username || 'user'}`;

    const lpBio = document.getElementById('lpBio');
    if (lpBio) lpBio.textContent = d.bio || 'Same people. Different minds.';

    const lpLoc = document.getElementById('lpLocationText');
    if (lpLoc) lpLoc.textContent = d.location || 'Hamirpur, HP';

    const lpDob = document.getElementById('lpDobText');
    if (lpDob) lpDob.textContent = d.dateOfBirth || '15 / 03 / 2005';

    const lpGender = document.getElementById('lpGenderText');
    if (lpGender) lpGender.textContent = d.gender || 'Male';

    const lpStatPosts = document.getElementById('lpStatPosts');
    if (lpStatPosts) lpStatPosts.textContent = d.stats?.posts || 40;

    const lpStatRep = document.getElementById('lpStatRep');
    if (lpStatRep) lpStatRep.textContent = d.reputationScore ? `${(d.reputationScore/1000).toFixed(1)}K` : '1.8K';

    const lpStatCooked = document.getElementById('lpStatCooked');
    if (lpStatCooked) lpStatCooked.innerHTML = `<i class="fa-solid fa-fire"></i> ${d.cookedRatio || 12}`;

    const lpStatBadges = document.getElementById('lpStatBadges');
    if (lpStatBadges) lpStatBadges.innerHTML = `<i class="fa-solid fa-crown"></i> ${d.stats?.badges || 5}`;

    // Images
    const bannerUrl = d.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80';
    this.updateBannerPreview(bannerUrl);

    const avatarUrl = AvatarService.get(d);
    this.updateAvatarPreview(avatarUrl);

    this.updateLiveSocialPills();
    this.markDirty(false);
  }

  markDirty(isDirty) {
    this.isDirty = Boolean(isDirty);
  }

  async saveProfile() {
    if (!this.draftProfile) return;

    const btnSave = document.getElementById('btnEditorSave');
    const saveText = btnSave?.querySelector('.btn-save-text');
    const saveSpinner = btnSave?.querySelector('.btn-save-spinner');

    if (saveText) saveText.style.display = 'none';
    if (saveSpinner) saveSpinner.style.display = 'inline-block';
    if (btnSave) btnSave.disabled = true;

    try {
      let finalAvatarUrl = this.draftProfile.avatarUrl || this.draftProfile.avatar_url;
      let finalBannerUrl = this.draftProfile.bannerUrl || this.draftProfile.banner_url;

      // If pending avatar upload
      if (this.pendingAvatarData) {
        try {
          const upRes = await mediaApi.uploadMedia(this.pendingAvatarData);
          const upUrl = upRes?.url || upRes?.mediaUrl || upRes?.originalUrl || upRes?.asset?.storage_url;
          if (upUrl) {
            finalAvatarUrl = upUrl;
          }
        } catch (e) {
          console.warn('Avatar direct upload fallback:', e);
        }
      }

      // If pending banner upload
      if (this.pendingBannerData) {
        try {
          const upRes = await mediaApi.uploadMedia(this.pendingBannerData);
          const upUrl = upRes?.url || upRes?.mediaUrl || upRes?.originalUrl || upRes?.asset?.storage_url;
          if (upUrl) {
            finalBannerUrl = upUrl;
          }
        } catch (e) {
          console.warn('Banner direct upload fallback:', e);
        }
      }

      const updatePayload = {
        displayName: this.draftProfile.displayName,
        bio: this.draftProfile.bio,
        location: this.draftProfile.location,
        dateOfBirth: this.draftProfile.dateOfBirth,
        gender: this.draftProfile.gender,
        socialLinks: this.draftProfile.socialLinks || {},
        visibility: this.draftProfile.visibility || 'public',
        avatarUrl: finalAvatarUrl,
        avatar_url: finalAvatarUrl,
        bannerUrl: finalBannerUrl,
        banner_url: finalBannerUrl,
        avatarFrame: this.draftProfile.avatarFrame || 'none',
        avatarShape: this.draftProfile.avatarShape || 'rectangular',
        profileTheme: this.draftProfile.profileTheme || 'default',
        profileAccent: this.draftProfile.profileAccent || 'lime',
        profileBadge: this.draftProfile.profileBadge || 'senior_roaster',
        profileEffects: this.draftProfile.profileEffects || 'none'
      };

      const res = await profilesApi.updateProfile(updatePayload);

      if (res && res.user) {
        authManager.currentUser = {
          ...authManager.currentUser,
          ...res.user,
          avatarUrl: finalAvatarUrl,
          avatar_url: finalAvatarUrl,
          bannerUrl: finalBannerUrl,
          banner_url: finalBannerUrl
        };
        authManager.updateUserSessionUI();
      }

      // Sync active profile
      try {
        const { profileManager } = await import('./profileManager.js');
        if (profileManager && profileManager.currentProfile) {
          profileManager.currentProfile = {
            ...profileManager.currentProfile,
            ...(res.user || {}),
            avatarUrl: finalAvatarUrl,
            avatar_url: finalAvatarUrl,
            bannerUrl: finalBannerUrl,
            banner_url: finalBannerUrl
          };
        }
      } catch (_) {}

      // Update DOM
      document.querySelectorAll('#profileAvatarImg, #navHeaderUserAvatar, #mobNavUserAvatar, #mobIdentityAvatar, #sbUserAvatar, #drawerUserAvatar, #lpAvatarImg, #editorAvatarPreview, #quickCreateAvatar').forEach(el => {
        AvatarService.apply(el, finalAvatarUrl);
      });
      document.querySelectorAll('#profileBannerMedia, #profileBannerImg, #lpBannerImg, #editorBannerPreview').forEach(el => {
        AvatarService.apply(el, finalBannerUrl);
      });

      toast.success('Profile saved successfully!');
      sfx.playSuccess();
      this.close();
      window.dispatchEvent(new CustomEvent('dragme:profile:refresh'));
      window.dispatchEvent(new CustomEvent('dragme:auth:success', { detail: { user: authManager.currentUser } }));
    } catch (err) {
      console.error('Error saving profile:', err);
      toast.error(err.message || 'Failed to save profile.');
    } finally {
      if (saveText) saveText.style.display = 'inline-block';
      if (saveSpinner) saveSpinner.style.display = 'none';
      if (btnSave) btnSave.disabled = false;
      this.markDirty(false);
    }
  }

  // Compact fallback modal
  openModal() {
    if (!authManager.isAuthenticated()) {
      authManager.requireAuth({ type: 'profile' }, 'Sign in to edit your profile.');
      return;
    }
    const d = authManager.currentUser || {};
    const nameInp = document.getElementById('editDisplayNameInput');
    if (nameInp) nameInp.value = d.displayName || d.username || '';
    const bioInp = document.getElementById('editBioInput');
    if (bioInp) bioInp.value = d.bio || '';
    const locInp = document.getElementById('editLocationInput');
    if (locInp) locInp.value = d.location || '';
    const avInp = document.getElementById('editAvatarUrlInput');
    if (avInp) avInp.value = d.avatarUrl || '';
    const banInp = document.getElementById('editBannerUrlInput');
    if (banInp) banInp.value = d.bannerUrl || '';

    if (this.modalView) this.modalView.style.display = 'flex';
    sfx.playOpen();
  }

  closeModal() {
    if (this.modalView) this.modalView.style.display = 'none';
    sfx.playClose();
  }

  async saveModalProfile() {
    const nameInp = document.getElementById('editDisplayNameInput');
    const bioInp = document.getElementById('editBioInput');
    const locInp = document.getElementById('editLocationInput');
    const avInp = document.getElementById('editAvatarUrlInput');
    const banInp = document.getElementById('editBannerUrlInput');

    try {
      const res = await profilesApi.updateProfile({
        displayName: nameInp?.value || '',
        bio: bioInp?.value || '',
        location: locInp?.value || '',
        avatarUrl: avInp?.value || '',
        bannerUrl: banInp?.value || ''
      });

      if (res && res.user) {
        authManager.currentUser = { ...authManager.currentUser, ...res.user };
        authManager.updateUserSessionUI();
      }

      toast.success('Profile updated!');
      sfx.playSuccess();
      this.closeModal();
      window.dispatchEvent(new CustomEvent('dragme:profile:refresh'));
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    }
  }
}

export const editProfileManager = new EditProfileManager();
export default editProfileManager;
