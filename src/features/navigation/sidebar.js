/* ==========================================================================
   DRAGME FEATURE: SIDEBAR & ROOMS (src/features/navigation/sidebar.js)
   Left navigation drawer, active live rooms and profile drawer toggle
   ========================================================================== */

import { store } from '../../app/store.js';
import { sfx } from '../../services/sfxService.js';
import { router } from '../../app/router.js';
import { authManager } from '../auth/authManager.js';
import { roomsApi } from '../../api/roomsApi.js';
import { toast } from '../toast/toastManager.js';
import { escapeHtml } from '../../utils/domUtils.js';

export class SidebarController {
  constructor() {
    this.drawer = null;
    this.backdrop = null;
    this.createRoomModal = null;
  }

  init() {
    this.drawer = document.getElementById('leftNavDrawer');
    this.backdrop = document.getElementById('sidebarMobileBackdrop');
    this.createRoomModal = document.getElementById('createRoomModal');

    this.bindEvents();
    this.bindCreateRoomModal();
  }

  bindEvents() {
    this.backdrop?.addEventListener('click', () => {
      this.close();
    });

    // Nav Rows
    document.getElementById('navHome')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('topNav')?.classList.remove('top-nav-scrolled');
      document.getElementById('mobileBottomNav')?.classList.remove('nav-collapsed');
      router.navigate('feed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.close();
    });

    document.getElementById('navDiscover')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('topNav')?.classList.remove('top-nav-scrolled');
      document.getElementById('mobileBottomNav')?.classList.remove('nav-collapsed');
      router.navigate('feed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.close();
    });

    // Profile & Edit Profile in left sidebar
    document.getElementById('navProfile')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to access your profile arena.');
      } else {
        this.close();
        router.navigate(`profile/${authManager.currentUser.username}`);
      }
    });

    document.getElementById('navEditProfile')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'profile' }, 'Sign in to edit your profile.');
      } else {
        this.close();
        window.dispatchEvent(new CustomEvent('dragme:profile:edit:open'));
      }
    });

    document.getElementById('navConfessions')?.addEventListener('click', (e) => {
      e.preventDefault();
      sfx.playTap();
      store.setRoom('confessions');
      router.navigate('feed');
      this.close();
      toast.info('Switched to Anonymous Confessions arena.');
    });

    // Main Navigation Rows
    const navMenuItems = [
      { id: 'navCommunities', filter: 'General' },
      { id: 'navRooms', filter: 'all' },
      { id: 'navStories', filter: 'stories' }
    ];
    navMenuItems.forEach(({ id, filter }) => {
      document.getElementById(id)?.addEventListener('click', (e) => {
        e.preventDefault();
        sfx.playTap();
        document.querySelectorAll('.sidebar-menu-row').forEach(r => r.classList.remove('active'));
        document.getElementById(id)?.classList.add('active');
        store.setFilter(filter);
        router.navigate('feed');
        this.close();
      });
    });

    // Room item selection in left drawer
    const bindRoomPills = () => {
      const roomItems = document.querySelectorAll('.active-room-pill, .room-item, .community-item');
      roomItems.forEach(item => {
        item.onclick = (e) => {
          e.preventDefault();
          const roomId = item.dataset.room || item.dataset.category || item.textContent.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
          sfx.playTap();
          document.querySelectorAll('.active-room-pill').forEach(p => p.classList.remove('active-selection'));
          item.classList.add('active-selection');
          store.setRoom(roomId);
          router.navigate('feed');
          this.close();
        };
      });
    };
    bindRoomPills();

    // Left sidebar user profile trigger (if present)
    const sbUserCard = document.getElementById('sbUserCard');
    const btnSbViewProfile = document.getElementById('btnSidebarViewProfile');
    [sbUserCard, btnSbViewProfile].forEach(el => {
      el?.addEventListener('click', (e) => {
        if (e.target.closest('.sb-more-btn')) return;
        e.preventDefault();
        if (!authManager.isAuthenticated()) {
          authManager.requireAuth({ type: 'profile' }, 'Sign in to access your profile.');
        } else {
          this.close();
          router.navigate(`profile/${authManager.currentUser.username}`);
        }
      });
    });

    // View all rooms
    document.getElementById('btnViewAllRooms')?.addEventListener('click', (e) => {
      e.preventDefault();
      toast.info('Viewing all active community arenas.');
    });
  }

  bindCreateRoomModal() {
    const btnCreateRoom = document.getElementById('btnSidebarCreateRoom');
    const closeBtn = document.getElementById('closeRoomModalBtn');
    const cancelBtn = document.getElementById('cancelRoomModalBtn');
    const form = document.getElementById('createRoomForm');

    const openModal = () => {
      if (!authManager.isAuthenticated()) {
        authManager.requireAuth({ type: 'create_room' }, 'Sign in to create an arena community room.');
        return;
      }
      if (this.createRoomModal) {
        this.createRoomModal.style.display = 'flex';
        sfx.playOpen();
      }
    };

    const closeModal = () => {
      if (this.createRoomModal) {
        this.createRoomModal.style.display = 'none';
        sfx.playClose();
      }
    };

    btnCreateRoom?.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });

    closeBtn?.addEventListener('click', () => closeModal());
    cancelBtn?.addEventListener('click', () => closeModal());
    this.createRoomModal?.addEventListener('click', (e) => {
      if (e.target === this.createRoomModal) closeModal();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('newRoomNameInput');
      const tagInput = document.getElementById('newRoomEmojiInput');
      const descInput = document.getElementById('newRoomDescInput');

      const name = nameInput?.value?.trim();
      const tag = tagInput?.value?.trim();
      const desc = descInput?.value?.trim();

      if (!name) {
        toast.warning('Please enter a room name.');
        return;
      }

      try {
        const res = await roomsApi.createRoom({ name, tag, desc });
        if (res && res.room) {
          toast.success(`Room "${res.room.name}" created!`);
          sfx.playSuccess();
          closeModal();

          // Add pill to sidebar
          const roomsList = document.querySelector('.active-rooms-list');
          if (roomsList) {
            const pill = document.createElement('a');
            pill.href = '#';
            pill.className = 'active-room-pill active-selection';
            pill.dataset.room = res.room.id;
            pill.innerHTML = `
              <span class="room-code-tag">${escapeHtml(res.room.symbol || 'ARENA')}</span>
              <span class="room-name-text">${escapeHtml(res.room.name)}</span>
              <span class="room-glow-dot"></span>
            `;
            roomsList.insertBefore(pill, roomsList.firstChild);
            pill.onclick = () => {
              store.setRoom(res.room.id);
              router.navigate('feed');
            };
          }

          store.setRoom(res.room.id);
          if (nameInput) nameInput.value = '';
          if (descInput) descInput.value = '';
        }
      } catch (err) {
        toast.error(err.message || 'Failed to create room.');
      }
    });
  }

  close() {
    if (this.drawer) {
      this.drawer.classList.remove('open', 'mobile-open');
    }
    if (this.backdrop) this.backdrop.classList.remove('active');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if (toggleBtn) toggleBtn.classList.remove('active', 'is-open');
    sfx.playClose();
  }

  open() {
    if (this.drawer) {
      this.drawer.classList.add('open', 'mobile-open');
    }
    if (this.backdrop) this.backdrop.classList.add('active');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if (toggleBtn) toggleBtn.classList.add('active', 'is-open');
    sfx.playOpen();
  }
}

export const sidebar = new SidebarController();
export default sidebar;
