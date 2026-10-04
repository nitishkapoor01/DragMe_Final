/* ==========================================================================
   DRAGME FEATURE: PROFILE MANAGER (src/features/profile/profileManager.js)
   Renders user profile banner, avatar, permanent Cooked metric, stats & tabs
   ========================================================================== */

import { profilesApi } from '../../api/profilesApi.js';
import { postsApi } from '../../api/postsApi.js';
import { AvatarService } from '../../services/avatarService.js';
import { sfx } from '../../services/sfxService.js';
import { toast } from '../toast/toastManager.js';
import { authManager } from '../auth/authManager.js';
import { router } from '../../app/router.js';
import { escapeHtml } from '../../utils/domUtils.js';

export class ProfileManager {
  constructor() {
    this.activeUsername = null;
    this.activeTab = 'posts';
    this.currentProfile = null;
  }

  init() {
    // Tab switching inside profile
    const tabButtons = document.querySelectorAll('.profile-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab || 'posts';
        this.switchTab(tab);
      });
    });

    // Profile Edit button & Settings button
    document.querySelectorAll('#btnOpenEditProfile, #btnOpenEditProfileModal, #btnProfileSettings').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (!authManager.isAuthenticated()) {
          authManager.requireAuth({ type: 'profile' }, 'Sign in to edit your profile.');
          return;
        }
        router.navigate('edit-profile');
      });
    });

    // Share Profile button
    const btnShare = document.getElementById('btnProfileShare');
    btnShare?.addEventListener('click', async (e) => {
      e.preventDefault();
      sfx.playTap();
      const profileUrl = this.activeUsername 
        ? `${window.location.origin}/#profile/${this.activeUsername}`
        : window.location.href;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(profileUrl);
          toast.success('Profile link copied to clipboard!');
        } else {
          toast.info(`Profile: ${profileUrl}`);
        }
      } catch (err) {
        toast.info(`Profile: ${profileUrl}`);
      }
    });

    // Change Avatar camera button -> Open Media Studio
    const btnChangeAvatar = document.getElementById('btnChangeAvatar');
    btnChangeAvatar?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to change your avatar.');
        return;
      }
      import('./mediaStudioManager.js').then(({ mediaStudioManager }) => {
        mediaStudioManager.open('avatar');
      });
    });

    // Edit Banner button -> Open Media Studio
    const btnEditBanner = document.getElementById('btnEditBanner');
    btnEditBanner?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to customize your banner.');
        return;
      }
      import('./mediaStudioManager.js').then(({ mediaStudioManager }) => {
        mediaStudioManager.open('banner');
      });
    });

    // Listen to profile refresh events
    window.addEventListener('dragme:profile:refresh', () => {
      if (this.activeUsername) {
        this.loadProfile(this.activeUsername);
      }
    });

    window.addEventListener('dragme:auth:success', (e) => {
      const user = e.detail?.user;
      if (user && this.activeUsername === user.username) {
        this.loadProfile(user.username);
      }
    });
  }

  async loadProfile(username = null) {
    const targetUser = username || (authManager.currentUser ? authManager.currentUser.username : null);
    if (!targetUser) {
      authManager.requireAuth({ type: 'profile' }, 'Sign in to access your personal DRAGME profile arena.');
      router.navigate('feed');
      return;
    }

    this.activeUsername = targetUser;

    try {
      const res = await profilesApi.getProfile(targetUser);
      if (res && res.profile) {
        this.currentProfile = res.profile;
        this.renderProfileHeader(res.profile);
        await this.loadTabContent(targetUser, this.activeTab);
      }
    } catch (err) {
      console.warn('Profile lookup fallback for user:', targetUser, err.message);
      const stream = document.getElementById('profilePostsStream');
      if (stream) {
        stream.innerHTML = `
          <div style="text-align: center; padding: 60px 20px; color: var(--text-low); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-top: 16px;">
            <i class="fa-solid fa-user-slash" style="font-size: 2.2rem; margin-bottom: 12px; color: #232c3d;"></i>
            <h3 style="color: var(--text-pure); font-size: 1.05rem; margin-bottom: 4px;">User profile not found</h3>
            <p style="font-size: 0.82rem;">The user "@${escapeHtml(targetUser)}" has not created an arena account yet.</p>
          </div>
        `;
      }
    }
  }

  renderProfileHeader(profile) {
    const isOwner = Boolean(
      authManager.currentUser && 
      authManager.currentUser.username && 
      authManager.currentUser.username.toLowerCase() === profile.username.toLowerCase()
    );

    // Banner
    const bannerWrap = document.getElementById('profileBannerMedia') || document.querySelector('.profile-banner-wrapper .profile-banner-media');
    const bannerUrl = profile.bannerUrl || profile.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80';
    const isBannerVideo = AvatarService.isVideoUrl(bannerUrl);

    if (bannerWrap) {
      let currentBanner = bannerWrap.querySelector('#profileBannerImg, .profile-banner-img');
      if (isBannerVideo) {
        if (!currentBanner || currentBanner.tagName !== 'VIDEO') {
          const videoEl = document.createElement('video');
          videoEl.id = 'profileBannerImg';
          videoEl.className = 'profile-banner-img';
          videoEl.autoplay = true;
          videoEl.loop = true;
          videoEl.muted = true;
          videoEl.playsInline = true;
          videoEl.setAttribute('playsinline', '');
          videoEl.src = bannerUrl;
          if (currentBanner) bannerWrap.replaceChild(videoEl, currentBanner);
          else bannerWrap.insertBefore(videoEl, bannerWrap.firstChild);
          videoEl.play().catch(() => {});
        } else {
          currentBanner.src = bannerUrl;
          currentBanner.play().catch(() => {});
        }
      } else {
        if (!currentBanner || currentBanner.tagName !== 'IMG') {
          const imgEl = document.createElement('img');
          imgEl.id = 'profileBannerImg';
          imgEl.className = 'profile-banner-img';
          imgEl.alt = 'Banner';
          imgEl.src = bannerUrl;
          if (currentBanner) bannerWrap.replaceChild(imgEl, currentBanner);
          else bannerWrap.insertBefore(imgEl, bannerWrap.firstChild);
        } else {
          currentBanner.src = bannerUrl;
        }
      }
    }

    // Avatar
    const avatarTarget = document.getElementById('profileAvatarImg');
    if (avatarTarget) {
      AvatarService.apply(avatarTarget, profile);
    }

    // Text details
    const nameEl = document.getElementById('profileDisplayName');
    if (nameEl) nameEl.textContent = profile.displayName || profile.username;

    const handleEl = document.getElementById('profileHandle') || document.getElementById('profileUsernameHandle');
    if (handleEl) handleEl.textContent = `@${profile.username}`;

    const bioEl = document.getElementById('profileBioText');
    if (bioEl) bioEl.textContent = profile.bio || 'Same people. Different minds.';

    const locationEl = document.getElementById('profileLocationText');
    if (locationEl) locationEl.textContent = profile.location || 'Hamirpur, HP';

    const joinDateEl = document.getElementById('profileJoinedText') || document.getElementById('profileJoinedDate');
    if (joinDateEl) joinDateEl.textContent = profile.joinedDate || 'Joined Recently';

    const rankBadgeEl = document.getElementById('profileRankBadge') || document.getElementById('profileRankTitle');
    if (rankBadgeEl) rankBadgeEl.textContent = profile.rankTitle || 'Senior Roaster';

    // Stats
    const postCountEl = document.getElementById('profileStatPosts');
    if (postCountEl) postCountEl.textContent = profile.stats?.posts || 0;

    const followersEl = document.getElementById('profileStatFollowers');
    if (followersEl) followersEl.textContent = profile.stats?.followers || 0;

    const followingEl = document.getElementById('profileStatFollowing');
    if (followingEl) followingEl.textContent = profile.stats?.following || 0;

    const confessionsEl = document.getElementById('profileStatConfessions');
    if (confessionsEl) confessionsEl.textContent = profile.stats?.confessions || 0;

    const reactionsEl = document.getElementById('profileStatReactions');
    if (reactionsEl) reactionsEl.textContent = profile.stats?.reactions || 0;

    const cookedEl = document.getElementById('profileCookedScore');
    if (cookedEl) cookedEl.textContent = profile.cookedRatio || 100;

    const repEl = document.getElementById('profileRepScore');
    if (repEl) repEl.textContent = profile.reputationScore || 1800;

    // Owner only controls
    const btnEditBanner = document.getElementById('btnEditBanner');
    if (btnEditBanner) btnEditBanner.style.display = isOwner ? 'flex' : 'none';

    const btnChangeAvatar = document.getElementById('btnChangeAvatar');
    if (btnChangeAvatar) btnChangeAvatar.style.display = isOwner ? 'flex' : 'none';

    const btnEditProfile = document.getElementById('btnOpenEditProfileModal') || document.getElementById('btnOpenEditProfile');
    if (btnEditProfile) btnEditProfile.style.display = isOwner ? 'inline-flex' : 'none';

    const btnProfileSettings = document.getElementById('btnProfileSettings');
    if (btnProfileSettings) btnProfileSettings.style.display = isOwner ? 'inline-flex' : 'none';
  }

  switchTab(tab) {
    this.activeTab = tab;
    sfx.playTap();

    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    if (this.activeUsername) {
      this.loadTabContent(this.activeUsername, tab);
    }
  }

  async loadTabContent(username, tab) {
    const container = document.getElementById('profilePostsStream') || document.getElementById('profileTabContent');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-low);">
        <i class="fa-solid fa-spinner fa-spin text-lime" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
        <p>Loading ${tab}...</p>
      </div>
    `;

    try {
      const isOwner = Boolean(
        authManager.currentUser && 
        authManager.currentUser.username && 
        authManager.currentUser.username.toLowerCase() === username.toLowerCase()
      );

      let posts = [];

      if (tab === 'saved') {
        if (!isOwner) {
          container.innerHTML = `
            <div style="text-align: center; padding: 48px 20px; color: var(--text-low); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <i class="fa-solid fa-lock" style="font-size: 2rem; margin-bottom: 10px; color: var(--accent-gold);"></i>
              <h4 style="color: var(--text-pure); margin-bottom: 4px;">Private Saved Items</h4>
              <p style="font-size: 0.84rem;">Only this account owner can view their saved bookmarks.</p>
            </div>
          `;
          return;
        }
        const savedRes = await postsApi.getSavedPosts();
        posts = (savedRes && savedRes.posts) ? savedRes.posts : [];
      } else {
        const data = await postsApi.getFeed({ search: username });
        const allPosts = (data && data.posts) ? data.posts : [];

        if (tab === 'confessions') {
          posts = allPosts.filter(p => 
            (p.is_anonymous || p.isAnonymous || (p.room && p.room.toLowerCase() === 'confessions')) &&
            (p.author?.toLowerCase() === username.toLowerCase() || p.author_username?.toLowerCase() === username.toLowerCase())
          );
        } else if (tab === 'media') {
          posts = allPosts.filter(p => 
            (p.image_url || p.imageUrl) &&
            (p.author?.toLowerCase() === username.toLowerCase() || p.author_username?.toLowerCase() === username.toLowerCase())
          );
        } else if (tab === 'rooms') {
          posts = allPosts.filter(p => 
            p.room && p.room !== 'general' &&
            (p.author?.toLowerCase() === username.toLowerCase() || p.author_username?.toLowerCase() === username.toLowerCase())
          );
        } else {
          // 'posts' or 'overview' or default
          posts = allPosts.filter(p => 
            p.author?.toLowerCase() === username.toLowerCase() || 
            p.author_username?.toLowerCase() === username.toLowerCase()
          );
        }
      }

      if (!posts || posts.length === 0) {
        container.innerHTML = `
          <div style="text-align: center; padding: 48px 20px; color: var(--text-low); background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 10px; color: #232c3d;"></i>
            <h4 style="color: var(--text-pure); margin-bottom: 4px;">No ${tab} to display</h4>
            <p style="font-size: 0.84rem;">Activity in this section will appear here.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = posts.map(p => `
        <div class="reddit-post-card" style="margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-low);">
              <span style="color: var(--accent-lime); font-weight: 600;">r/${escapeHtml(p.room_display_name || p.room || 'general')}</span>
              <span>•</span>
              <span>${escapeHtml(p.timeAgo || 'Recently')}</span>
            </div>
            ${p.flair ? `<span class="post-flair ${p.flair_class || 'flair-blue'}">${escapeHtml(p.flair)}</span>` : ''}
          </div>
          <h3 style="color: var(--text-pure); font-size: 1.05rem; margin-bottom: 6px;">${escapeHtml(p.title || '')}</h3>
          ${p.content ? `<p style="color: var(--text-med); font-size: 0.9rem; line-height: 1.5; margin-bottom: 10px;">${escapeHtml(p.content)}</p>` : ''}
          ${p.image_url ? `<div style="margin: 10px 0; border-radius: 8px; overflow: hidden; max-height: 400px; background: #000;"><img src="${escapeHtml(p.image_url)}" alt="" style="width: 100%; object-fit: contain; max-height: 400px;"></div>` : ''}
          <div style="display: flex; gap: 16px; margin-top: 12px; font-size: 0.82rem; color: var(--text-low);">
            <span style="color: var(--accent-lime); font-weight: 600;"><i class="fa-solid fa-crown"></i> ${p.drag_count || p.dragCount || 0}</span>
            <span><i class="fa-regular fa-comment"></i> ${p.comment_count || p.commentCount || 0} comments</span>
            <span><i class="fa-solid fa-fire text-orange"></i> ${p.heat_percent || 85}% Heat</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Error rendering tab content:', err);
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--red-cooked);">
          <p>Failed to load ${tab} content.</p>
        </div>
      `;
    }
  }
}

export const profileManager = new ProfileManager();
export default profileManager;
