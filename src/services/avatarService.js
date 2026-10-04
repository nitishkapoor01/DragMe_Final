/* ==========================================================================
   DRAGME CLIENT SERVICE: AVATAR & IDENTITY RESOLVER (src/services/avatarService.js)
   Resolves Dicebear, uploaded avatars, animated videos, guest & anonymous masks
   ========================================================================== */

export const GUEST_SILHOUETTE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><rect width="100%" height="100%" fill="%230d121c"/><circle cx="50" cy="50" r="47" fill="%23141b29" stroke="%23253145" stroke-width="2.5"/><circle cx="50" cy="38" r="16" fill="%2364748b"/><path d="M22,82 C22,64 34,58 50,58 C66,58 78,64 78,82 Z" fill="%2364748b"/></svg>`;

export const ANONYMOUS_MASK_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><rect width="100%" height="100%" fill="%23171026"/><circle cx="50" cy="50" r="47" fill="%23231438" stroke="%23a855f7" stroke-width="2.5"/><path d="M25,42 Q50,30 75,42 Q78,65 50,78 Q22,65 25,42 Z" fill="%23a855f7" opacity="0.35"/><ellipse cx="38" cy="48" rx="6" ry="4" fill="%23c084fc"/><ellipse cx="62" cy="48" rx="6" ry="4" fill="%23c084fc"/></svg>`;

export const AvatarService = {
  isVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const clean = url.split('?')[0].split('#')[0].toLowerCase();
    return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.endsWith('.m4v');
  },

  isSameUrl(el, newUrl) {
    if (!el || !newUrl) return false;
    if (el.dataset?.activeSrc === newUrl) return true;
    if (el.getAttribute('src') === newUrl) return true;
    if (el.src === newUrl) return true;
    try {
      const absNew = new URL(newUrl, window.location.origin).href;
      const absCurrent = new URL(el.src || '', window.location.origin).href;
      return absNew === absCurrent;
    } catch (e) {
      return false;
    }
  },

  get(userOrAuthor, isAnon = false) {
    if (isAnon || userOrAuthor === 'Masked Persona') {
      return ANONYMOUS_MASK_SVG;
    }
    if (!userOrAuthor) {
      return GUEST_SILHOUETTE_SVG;
    }

    if (typeof userOrAuthor === 'string') {
      const lower = userOrAuthor.trim().toLowerCase();
      if (lower === 'masked persona' || lower === 'anonymous') return ANONYMOUS_MASK_SVG;
      if (lower === 'guest' || lower === 'guest visitor') return GUEST_SILHOUETTE_SVG;
      if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/uploads/') || lower.startsWith('data:') || lower.startsWith('blob:') || lower.startsWith('/')) {
        return userOrAuthor.trim();
      }
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userOrAuthor.trim())}`;
    }

    if (userOrAuthor.isAnonymous || userOrAuthor.is_anonymous) {
      return ANONYMOUS_MASK_SVG;
    }

    const custom = userOrAuthor.avatar_url || userOrAuthor.avatar || userOrAuthor.avatarUrl;
    if (custom && typeof custom === 'string' && custom.trim() !== '') {
      return custom.trim();
    }

    const username = userOrAuthor.username || userOrAuthor.author || userOrAuthor.displayName || 'dragme';
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
  },

  getGuest() {
    return GUEST_SILHOUETTE_SVG;
  },

  getAnonymous() {
    return ANONYMOUS_MASK_SVG;
  },

  apply(el, userOrAuthor, isAnon = false) {
    if (!el) return null;
    const url = this.get(userOrAuthor, isAnon);
    const isVideo = this.isVideoUrl(url);

    const getFallbackUrl = () => {
      if (isAnon) return ANONYMOUS_MASK_SVG;
      if (!userOrAuthor) return GUEST_SILHOUETTE_SVG;
      const uname = (typeof userOrAuthor === 'object' && userOrAuthor)
        ? (userOrAuthor.username || userOrAuthor.author || userOrAuthor.displayName || 'user')
        : String(userOrAuthor);
      return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(uname.trim())}`;
    };

    if (isVideo) {
      if (el.tagName === 'IMG') {
        const video = document.createElement('video');
        video.id = el.id;
        video.className = el.className;
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'auto');
        video.src = url;
        video.dataset.activeSrc = url;

        video.onerror = () => {
          const fallbackImg = document.createElement('img');
          fallbackImg.id = video.id;
          fallbackImg.className = video.className;
          fallbackImg.src = getFallbackUrl();
          fallbackImg.alt = 'Avatar';
          if (video.parentNode) {
            video.parentNode.replaceChild(fallbackImg, video);
          }
        };

        if (el.parentNode) {
          el.parentNode.replaceChild(video, el);
        }
        video.play().catch(() => {});
        return video;
      } else if (el.tagName === 'VIDEO') {
        if (!this.isSameUrl(el, url)) {
          el.src = url;
          el.dataset.activeSrc = url;
          el.load();
          el.play().catch(() => {});
        }
        el.onerror = () => {
          const fallbackImg = document.createElement('img');
          fallbackImg.id = el.id;
          fallbackImg.className = el.className;
          fallbackImg.src = getFallbackUrl();
          fallbackImg.alt = 'Avatar';
          if (el.parentNode) {
            el.parentNode.replaceChild(fallbackImg, el);
          }
        };
        return el;
      }
    } else {
      if (el.tagName === 'VIDEO') {
        const img = document.createElement('img');
        img.id = el.id;
        img.className = el.className;
        img.src = url;
        img.alt = 'Avatar';
        img.dataset.activeSrc = url;
        img.onerror = () => {
          img.onerror = null;
          img.src = getFallbackUrl();
        };
        if (el.parentNode) {
          el.parentNode.replaceChild(img, el);
        }
        return img;
      } else {
        if (!this.isSameUrl(el, url)) {
          el.src = url;
          el.dataset.activeSrc = url;
        }
        el.onerror = () => {
          el.onerror = null;
          el.src = getFallbackUrl();
        };
        return el;
      }
    }
    return el;
  }
};
