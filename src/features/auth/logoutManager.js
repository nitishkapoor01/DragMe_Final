/* ==========================================================================
   DRAGME FEATURE: LOGOUT (src/features/auth/logoutManager.js)
   Logout confirmation dialog and clean session teardown
   ========================================================================== */

import { authManager } from './authManager.js';
import { sfx } from '../../services/sfxService.js';
import { toast } from '../toast/toastManager.js';
import { router } from '../../app/router.js';

export const LogoutManager = {
  modal: null,

  init() {
    this.modal = document.getElementById('logoutConfirmModal');

    const cancelBtn = document.getElementById('btnCancelLogout');
    cancelBtn?.addEventListener('click', () => this.close());

    const confirmBtn = document.getElementById('btnConfirmLogout');
    confirmBtn?.addEventListener('click', () => this.confirm());

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    document.querySelectorAll('#btnDrawerLogOut, #sbLogoutBtn, .btn-trigger-logout, .btn-logout').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.open();
      });
    });
  },

  open() {
    if (this.modal) this.modal.style.display = 'flex';
    sfx.playOpen();
  },

  close() {
    if (this.modal) this.modal.style.display = 'none';
    sfx.playClose();
  },

  confirm() {
    this.close();
    authManager.clearSession();
    router.navigate('feed');
    toast.success('Logged out successfully.');
  }
};
