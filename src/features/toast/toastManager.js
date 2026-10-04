/* ==========================================================================
   DRAGME FEATURE: TOAST NOTIFICATIONS (src/features/toast/toastManager.js)
   Floating toast notification hub with spring animations and auto-dismiss
   ========================================================================== */

import { $ } from '../../utils/domUtils.js';
import { eventBus } from '../../core/eventBus.js';

export class ToastManager {
  constructor(hubId = 'toastHub') {
    this.hubId = hubId;
    this.hub = null;
  }

  init() {
    this.hub = document.getElementById(this.hubId);
    if (!this.hub && typeof document !== 'undefined') {
      this.hub = document.createElement('div');
      this.hub.id = this.hubId;
      this.hub.className = 'toast-hub';
      document.body.appendChild(this.hub);
    }
  }

  show(message, options = {}) {
    if (!this.hub) this.init();
    if (!this.hub) return;

    const {
      type = 'info', // 'success', 'error', 'info', 'warning'
      duration = 3500,
      icon = null
    } = options;

    // Notify Reactive Brand Mascot & other systems
    eventBus.emit('dragme:toast', { type, message });

    const toast = document.createElement('div');
    toast.className = `toast-card toast-${type}`;

    let defaultIcon = 'fa-solid fa-circle-info';
    if (type === 'success') defaultIcon = 'fa-solid fa-circle-check';
    if (type === 'error') defaultIcon = 'fa-solid fa-triangle-exclamation';
    if (type === 'warning') defaultIcon = 'fa-solid fa-bell';

    const iconClass = icon || defaultIcon;

    toast.innerHTML = `
      <div class="toast-icon-wrap">
        <i class="${iconClass}"></i>
      </div>
      <div class="toast-content">
        <p class="toast-message">${message}</p>
      </div>
      <button type="button" class="toast-close-btn" aria-label="Dismiss">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.dismiss(toast);
    });

    this.hub.appendChild(toast);

    // Auto-dismiss timer
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(toast);
      }, duration);
    }

    return toast;
  }

  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 280);
  }

  success(msg, opts = {}) { return this.show(msg, { ...opts, type: 'success' }); }
  error(msg, opts = {}) { return this.show(msg, { ...opts, type: 'error' }); }
  info(msg, opts = {}) { return this.show(msg, { ...opts, type: 'info' }); }
  warning(msg, opts = {}) { return this.show(msg, { ...opts, type: 'warning' }); }
}

export const toast = new ToastManager();
export default toast;
