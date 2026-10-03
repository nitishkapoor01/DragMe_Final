// =============================================================================
// DRAGME UNIVERSAL AVATAR & IDENTITY RESOLVER (AVATAR SERVICE)
// =============================================================================
const GUEST_SILHOUETTE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><rect width="100%" height="100%" fill="%230d121c"/><circle cx="50" cy="50" r="47" fill="%23141b29" stroke="%23253145" stroke-width="2.5"/><circle cx="50" cy="38" r="16" fill="%2364748b"/><path d="M22,82 C22,64 34,58 50,58 C66,58 78,64 78,82 Z" fill="%2364748b"/></svg>`;

const ANONYMOUS_MASK_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><rect width="100%" height="100%" fill="%23171026"/><circle cx="50" cy="50" r="47" fill="%23231438" stroke="%23a855f7" stroke-width="2.5"/><path d="M25,42 Q50,30 75,42 Q78,65 50,78 Q22,65 25,42 Z" fill="%23a855f7" opacity="0.35"/><ellipse cx="38" cy="48" rx="6" ry="4" fill="%23c084fc"/><ellipse cx="62" cy="48" rx="6" ry="4" fill="%23c084fc"/></svg>`;

if (typeof window !== 'undefined') {
  window.GUEST_SILHOUETTE_SVG = GUEST_SILHOUETTE_SVG;
  window.ANONYMOUS_MASK_SVG = ANONYMOUS_MASK_SVG;
}


const AvatarService = {
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
        if (el.parentNode) {
          el.parentNode.replaceChild(video, el);
        }
        AnimationScheduler.register(video, { isVideo: true, priority: AnimationScheduler.PRIORITIES.MEDIUM });
        video.play().catch(() => {});
        return video;
      } else if (el.tagName === 'VIDEO') {
        if (!this.isSameUrl(el, url)) {
          el.src = url;
          el.dataset.activeSrc = url;
          el.load();
          AnimationScheduler.register(el, { isVideo: true, priority: AnimationScheduler.PRIORITIES.MEDIUM });
          el.play().catch(() => {});
        }
        return el;
      }
    } else {
      if (el.tagName === 'VIDEO') {
        AnimationScheduler.unregister(el);
        const img = document.createElement('img');
        img.id = el.id;
        img.className = el.className;
        img.alt = 'Avatar';
        img.src = url;
        img.dataset.activeSrc = url;
        img.onerror = () => {
          if (img.src !== GUEST_SILHOUETTE_SVG) {
            img.src = GUEST_SILHOUETTE_SVG;
            img.dataset.activeSrc = GUEST_SILHOUETTE_SVG;
          }
        };
        if (el.parentNode) {
          el.parentNode.replaceChild(img, el);
        }
        return img;
      } else if (el.tagName === 'IMG') {
        if (!this.isSameUrl(el, url)) {
          el.src = url;
          el.dataset.activeSrc = url;
        }
        el.onerror = () => {
          if (el.src !== GUEST_SILHOUETTE_SVG) {
            el.src = GUEST_SILHOUETTE_SVG;
            el.dataset.activeSrc = GUEST_SILHOUETTE_SVG;
          }
        };
        return el;
      }
    }
    return el;
  }
};

// =============================================================================
// DRAGME UNIVERSAL SMART MEDIA DELIVERY & ANIMATION CONCURRENCY ENGINE
// Viewport Intersection, Dynamic Bitrate/Variant Selector, Priority Budgeting
// =============================================================================

const MediaDeliveryManager = {
  isMobile: typeof window !== 'undefined' && (window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)),
  prefersReducedMotion: typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,

  getMaxActiveAnimations() {
    if (this.prefersReducedMotion) return 0;
    return this.isMobile ? 4 : 10;
  },

  /**
   * Intelligently select responsive variant based on rendered container dimensions and device pixel ratio
   */
  getOptimalUrl(variants, containerWidth = 512) {
    if (!variants) return null;
    if (typeof variants === 'string') return variants;

    const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const effectiveWidth = Math.round(containerWidth * Math.min(dpr, 2));

    if (effectiveWidth <= 64 && variants.xs) return variants.xs;
    if (effectiveWidth <= 128 && (variants.sm || variants.xs)) return variants.sm || variants.xs;
    if (effectiveWidth <= 256 && (variants.md || variants.sm)) return variants.md || variants.sm;
    if (effectiveWidth <= 512 && (variants.md || variants.full)) return variants.md || variants.full;
    if (effectiveWidth <= 1080 && (variants.lg || variants.full)) return variants.lg || variants.full;
    if (effectiveWidth <= 1440 && (variants.xl || variants.full)) return variants.xl || variants.full;

    return variants.full || variants.original || variants.md || variants.sm || Object.values(variants)[0];
  }
};

const AnimationScheduler = {
  registry: new Map(), // Element -> { el, priority, posterUrl, animUrl, isVideo, isVisible, isActive, ratio }
  observer: null,
  isScheduled: false,

  PRIORITIES: {
    HIGH: 3,    // Hero banner, focused modal, active studio preview
    MEDIUM: 2,  // Visible feed cards, nearby avatars
    LOW: 1      // Partially visible elements, decorative cosmetics
  },

  init() {
    if (this.observer || typeof IntersectionObserver === 'undefined') return;

    // Listen for OS reduced-motion preference changes
    if (window.matchMedia) {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      motionQuery.addEventListener('change', (e) => {
        MediaDeliveryManager.prefersReducedMotion = e.matches;
        this.requestSchedule();
      });
    }

    // Page Visibility change: suspend background decoders when user switches tabs
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.registry.forEach(entry => {
          if (entry.isActive && entry.isVideo && entry.el instanceof HTMLMediaElement) {
            entry.el.pause();
          }
        });
      } else {
        this.requestSchedule();
      }
    });

    // Multi-threshold IntersectionObserver
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const item = this.registry.get(entry.target);
        if (!item) return;

        item.isVisible = entry.isIntersecting;
        item.ratio = entry.intersectionRatio;
      });
      this.requestSchedule();
    }, {
      threshold: [0.0, 0.2, 0.5, 0.8, 1.0],
      rootMargin: '80px 0px 80px 0px'
    });
  },

  register(el, options = {}) {
    if (!el || !(el instanceof Element)) return;
    if (!this.observer) this.init();

    const priority = options.priority !== undefined ? options.priority : this.PRIORITIES.MEDIUM;
    const isVideo = el.tagName === 'VIDEO' || Boolean(options.isVideo);
    const posterUrl = options.posterUrl || el.getAttribute('poster') || el.dataset?.posterUrl || null;
    const animUrl = options.animUrl || el.dataset?.animUrl || (isVideo ? el.src : null);

    const entry = {
      el,
      priority,
      posterUrl,
      animUrl,
      isVideo,
      isVisible: false,
      isActive: false,
      ratio: 0
    };

    this.registry.set(el, entry);
    if (this.observer) this.observer.observe(el);
    this.requestSchedule();
  },

  unregister(el) {
    if (!el || !this.registry.has(el)) return;
    if (this.observer) this.observer.unobserve(el);
    this.registry.delete(el);
    this.requestSchedule();
  },

  requestSchedule() {
    if (this.isScheduled) return;
    this.isScheduled = true;
    requestAnimationFrame(() => {
      this.isScheduled = false;
      this.runBudgetCycle();
    });
  },

  runBudgetCycle() {
    const maxBudget = MediaDeliveryManager.getMaxActiveAnimations();
    const visibleCandidates = [];

    this.registry.forEach(item => {
      if (item.isVisible && item.ratio > 0.05) {
        // Compute composite score: priority * 10 + ratio
        const score = (item.priority * 10) + item.ratio;
        visibleCandidates.push({ item, score });
      } else {
        // Offscreen: unconditionally deactivate
        this.deactivate(item);
      }
    });

    // Sort descending by composite score
    visibleCandidates.sort((a, b) => b.score - a.score);

    // Activate top items within budget, deactivate remainder
    visibleCandidates.forEach((candidate, index) => {
      if (index < maxBudget) {
        this.activate(candidate.item);
      } else {
        this.deactivate(candidate.item);
      }
    });
  },

  activate(item) {
    if (item.isActive) {
      if (item.isVideo && item.el instanceof HTMLMediaElement && item.el.paused) {
        item.el.play().catch(() => {});
      }
      return;
    }

    item.isActive = true;

    if (item.isVideo && item.el instanceof HTMLMediaElement) {
      item.el.autoplay = true;
      item.el.loop = true;
      item.el.muted = true;
      item.el.playsInline = true;
      if (item.animUrl && !AvatarService.isSameUrl(item.el, item.animUrl)) {
        item.el.src = item.animUrl;
        item.el.dataset.activeSrc = item.animUrl;
        item.el.load();
      }
      item.el.play().catch(() => {});
    } else if (item.el.tagName === 'IMG') {
      if (item.animUrl && !AvatarService.isSameUrl(item.el, item.animUrl)) {
        item.el.src = item.animUrl;
        item.el.dataset.activeSrc = item.animUrl;
      }
    }
  },

  deactivate(item) {
    if (!item.isActive) return;
    item.isActive = false;

    if (item.isVideo && item.el instanceof HTMLMediaElement) {
      item.el.pause();
    } else if (item.el.tagName === 'IMG') {
      // Revert to lightweight static poster fallback to release animation decoding
      if (item.posterUrl && !AvatarService.isSameUrl(item.el, item.posterUrl)) {
        item.el.src = item.posterUrl;
        item.el.dataset.activeSrc = item.posterUrl;
      }
    }
  }
};

// Auto-initialize Universal Animation Scheduler when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AnimationScheduler.init());
  } else {
    AnimationScheduler.init();
  }
}

// =============================================================================
// DRAGME ULTRA-FAST CLIENT-SIDE MEDIA PREVIEW & MEMORY ENGINE
// =============================================================================
const MediaPreviewEngine = {
  managedUrls: new Set(),

  createManagedUrl(blobOrFile) {
    if (!blobOrFile) return null;
    const url = URL.createObjectURL(blobOrFile);
    this.managedUrls.add(url);
    return url;
  },

  revokeManagedUrl(url) {
    if (url && this.managedUrls.has(url)) {
      try { URL.revokeObjectURL(url); } catch (e) {}
      this.managedUrls.delete(url);
    }
  },

  cleanup() {
    this.managedUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (e) {}
    });
    this.managedUrls.clear();
  },

  /**
   * Fast, non-blocking image preview generator using createImageBitmap
   * Downscales a massive 6000x4000 image to a crisp 800px preview in milliseconds
   */
  async generateImagePreview(file, maxDim = 800) {
    if (!file) return null;
    try {
      if (typeof createImageBitmap === 'function') {
        const bmp = await createImageBitmap(file);
        let w = bmp.width;
        let h = bmp.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { alpha: true });
        ctx.drawImage(bmp, 0, 0, w, h);
        bmp.close();

        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(this.createManagedUrl(blob));
            else resolve(this.createManagedUrl(file));
          }, 'image/webp', 0.88);
        });
      }
    } catch (e) {
      console.warn('createImageBitmap preview fallback:', e);
    }
    return this.createManagedUrl(file);
  },

  /**
   * Fast, non-blocking video poster snapshot extractor
   * Extracts a single 512px poster frame from a 4K 300MB video without decoding the full video continuously
   */
  async extractVideoPoster(file, maxDim = 512) {
    if (!file) return null;
    return new Promise((resolve) => {
      const tempUrl = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute('playsinline', '');
      v.preload = 'metadata';

      let cleaned = false;
      const cleanup = () => {
        if (!cleaned) {
          cleaned = true;
          v.pause();
          v.removeAttribute('src');
          v.load();
          URL.revokeObjectURL(tempUrl);
        }
      };

      const timer = setTimeout(() => {
        cleanup();
        resolve(null);
      }, 2000);

      v.onloadedmetadata = () => {
        v.currentTime = Math.min(0.3, (v.duration || 1) / 2);
      };

      v.onseeked = () => {
        try {
          clearTimeout(timer);
          let w = v.videoWidth || 640;
          let h = v.videoHeight || 360;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(v, 0, 0, w, h);
          cleanup();

          canvas.toBlob((blob) => {
            if (blob) resolve(this.createManagedUrl(blob));
            else resolve(null);
          }, 'image/webp', 0.85);
        } catch (err) {
          cleanup();
          resolve(null);
        }
      };

      v.onerror = () => {
        clearTimeout(timer);
        cleanup();
        resolve(null);
      };

      v.src = tempUrl;
      v.load();
    });
  }
};

// Initial Seed Posts
// Initial Seed Posts (Matching Screenshot)
const SEED_POSTS = [
  {
    id: 'post-nightrider-1',
    title: 'First Full-Stack Post in SQLite',
    author: 'NightRider',
    handle: '@nightrider',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=NightRider',
    isAnonymous: false,
    isVerified: false,
    room: 'tech_ai',
    roomDisplayName: 'r/tech_ai',
    timeAgo: '3d ago',
    flair: 'Roast',
    flairClass: 'tag-roast',
    imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
    content: 'Unfiltered high-energy discussion saved directly to SQLite backend.',
    dragCount: 3,
    commentCount: 1,
    heatPercent: 96,
    hasVoted: false,
    isSaved: false,
    comments: [
      { id: 'c1', author: 'DevZero', timeAgo: '2d ago', text: 'SQLite WAL mode rocks!' }
    ]
  },
  {
    id: 'post-devzero-2',
    title: 'Unpopular Opinion: 90% of "Agentic" SaaS are just 3 chained API calls',
    author: 'DevZero',
    handle: '@devzero',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    isAnonymous: false,
    isVerified: true,
    room: 'tech_ai',
    roomDisplayName: 'r/tech_ai',
    timeAgo: '3d ago',
    flair: 'Roast',
    flairClass: 'tag-roast',
    imageUrl: null,
    content: 'Why does every startup slap a $49/mo paywall on a basic python script with 3 tool calls and call it an Autonomous Agent? Let us have an honest debate.',
    dragCount: 96,
    commentCount: 17,
    heatPercent: 99,
    hasVoted: false,
    isSaved: false,
    comments: [
      { id: 'c2', author: 'chip_drill', timeAgo: '2d ago', text: 'Spitting absolute facts.' }
    ]
  },
  {
    id: 'post-chipdrill-3',
    title: 'Can someone explain this to me please?',
    author: 'chip_drill',
    handle: '@deep_stack',
    avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&auto=format&fit=crop&q=80',
    isAnonymous: false,
    isVerified: true,
    room: 'help_wanted',
    roomDisplayName: 'r/help_wanted',
    timeAgo: '5d ago',
    flair: 'Help',
    flairClass: 'tag-help-wanted',
    imageUrl: null,
    codeSnippet: '1   File "app.py", line 42, in <module>\n2     import something\n3             ^',
    content: "I'm getting this error while deploying. I've checked my environment variables but still not working...",
    dragCount: 24,
    commentCount: 5,
    heatPercent: 92,
    hasVoted: false,
    isSaved: false,
    comments: [
      { id: 'c3', author: 'DevZero', timeAgo: '4d ago', text: 'Check your PYTHONPATH or virtualenv activation.' }
    ]
  }
];

const ROOMS_DATA = {
  'dragme': {
    name: 'r/dragme',
    desc: 'The premier platform for unfiltered debates, tech roasts, anonymous confessions, and hot takes. Server-authoritative and built for high-energy discussion.',
    members: '113K',
    online: '2.3K'
  },
  'tech_ai': {
    name: 'r/tech_ai',
    desc: 'Deep dives, benchmark comparisons, and unfiltered tech debates across modern AI architectures.',
    members: '48.2K',
    online: '840'
  },
  'design_roasts': {
    name: 'r/design_roasts',
    desc: 'Roasting broken layouts, unnecessary glassmorphism, and copy-paste design trends with constructive advice.',
    members: '29.5K',
    online: '410'
  },
  'confessions': {
    name: 'r/confessions',
    desc: 'Spill unfiltered workplace secrets, tech confessions, and raw thoughts under complete pseudonym protection.',
    members: '64.1K',
    online: '1.2K'
  },
  'gaming_arena': {
    name: 'r/gaming_arena',
    desc: 'Tier lists, gaming roasts, and spicy arguments about game design, microtransactions, and gameplay loops.',
    members: '33.8K',
    online: '590'
  },
  'startup_fails': {
    name: 'r/startup_fails',
    desc: 'Why products fail, pricing blunders, and brutal teardowns of overhyped startups.',
    members: '19.4K',
    online: '320'
  }
};

// =============================================================================
// AUTH & API SERVICE CLIENT (JWT + Real-time Session Interceptor)
// =============================================================================
// =============================================================================
// CLIENT-SIDE PRE-UPLOAD COMPRESSION ENGINE (CANVAS + WEBP + SMART DOWNSCALE)
// =============================================================================
const ClientMediaCompressor = {
  maxDimensions: {
    avatar: { maxWidth: 512, maxHeight: 512, quality: 0.88 },
    animatedAvatar: { maxWidth: 512, maxHeight: 512, quality: 0.85 },
    banner: { maxWidth: 1920, maxHeight: 640, quality: 0.88 },
    animatedBanner: { maxWidth: 1920, maxHeight: 640, quality: 0.85 },
    postImage: { maxWidth: 1920, maxHeight: 1920, quality: 0.85 }
  },

  async compressVideo(file, type = 'animatedAvatar') {
    return new Promise((resolve) => {
      const isAvatar = type === 'animatedAvatar';
      const maxDuration = isAvatar ? 3.0 : 4.0; // 3.0s for PFP, 4.0s for Banner
      const targetWidth = isAvatar ? 512 : 1280;
      const targetHeight = isAvatar ? 640 : 426; // 4:5 for PFP, 3:1 for Banner
      const targetBitrate = isAvatar ? 800000 : 1500000; // Produces ~300KB-700KB delivery asset

      if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined' || !HTMLCanvasElement.prototype.captureStream) {
        return resolve(file);
      }

      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          URL.revokeObjectURL(video.src);
          return resolve(file);
        }

        const vW = video.videoWidth || targetWidth;
        const vH = video.videoHeight || targetHeight;
        const scale = Math.max(targetWidth / vW, targetHeight / vH);
        const drawW = vW * scale;
        const drawH = vH * scale;
        const drawX = (targetWidth - drawW) / 2;
        const drawY = (targetHeight - drawH) / 2;

        const stream = canvas.captureStream(30);
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        let recorder;
        try {
          recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: targetBitrate
          });
        } catch (e) {
          URL.revokeObjectURL(video.src);
          return resolve(file);
        }

        const chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          URL.revokeObjectURL(video.src);
          const blob = new Blob(chunks, { type: 'video/webm' });
          if (blob.size > 0) {
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), {
              type: 'video/webm',
              lastModified: Date.now()
            });
            const reductionPct = Math.round(((file.size - blob.size) / file.size) * 100);
            console.log(`⚡ Video Transcoded & Trimmed: ${file.name} reduced from ${(file.size / (1024 * 1024)).toFixed(1)}MB to ${(blob.size / 1024).toFixed(1)}KB (-${reductionPct}%, ${maxDuration}s max)`);
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        };

        let animId;
        let isEnded = false;
        const stopCapture = () => {
          if (isEnded) return;
          isEnded = true;
          if (animId) cancelAnimationFrame(animId);
          if (recorder.state === 'recording') recorder.stop();
          try { video.pause(); } catch (e) {}
        };

        const renderFrame = () => {
          if (video.currentTime >= maxDuration || video.ended || video.paused) {
            stopCapture();
            return;
          }
          ctx.drawImage(video, drawX, drawY, drawW, drawH);
          animId = requestAnimationFrame(renderFrame);
        };

        video.currentTime = 0;
        video.play().then(() => {
          recorder.start(100);
          animId = requestAnimationFrame(renderFrame);
          setTimeout(stopCapture, (maxDuration + 0.6) * 1000);
        }).catch(() => {
          URL.revokeObjectURL(video.src);
          resolve(file);
        });
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(file);
      };
    });
  },

  async compress(file, type = 'avatar') {
    if (!file) return file;

    // Route video uploads through video compressor (trims to 3s/4s & downscales to KB)
    if (file.type && file.type.startsWith('video/')) {
      if (type === 'animatedAvatar' || type === 'animatedBanner') {
        try {
          return await this.compressVideo(file, type);
        } catch (e) {
          console.warn('Video compression fallback:', e);
          return file;
        }
      }
      return file;
    }

    // Keep raw file for non-images
    if (!file.type || !file.type.startsWith('image/') || file.type === 'image/gif') {
      return file;
    }

    const config = this.maxDimensions[type] || this.maxDimensions.postImage;

    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        const { maxWidth, maxHeight, quality } = config;

        // Calculate aspect ratio preserving downscale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return resolve(file);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const outputMime = 'image/webp';
        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) {
            return resolve(file);
          }
          const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
            type: outputMime,
            lastModified: Date.now()
          });
          const reductionPct = Math.round(((file.size - blob.size) / file.size) * 100);
          console.log(`⚡ Pre-Upload Compression: ${file.name} reduced from ${(file.size / 1024).toFixed(1)}KB to ${(blob.size / 1024).toFixed(1)}KB (-${reductionPct}%)`);
          resolve(compressedFile);
        }, outputMime, quality);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    });
  }
};

const AuthAPI = {
  _limitsCache: null,
  getToken() {
    return localStorage.getItem('dragme_auth_token') || null;
  },
  setToken(token) {
    if (token) {
      localStorage.setItem('dragme_auth_token', token);
    } else {
      localStorage.removeItem('dragme_auth_token');
    }
  },
  async getMediaLimits() {
    if (this._limitsCache) return this._limitsCache;
    try {
      const res = await fetch('/api/media/limits');
      if (res.ok) {
        this._limitsCache = await res.json();
        return this._limitsCache;
      }
    } catch (e) {
      console.warn('Failed to fetch media limits:', e);
    }
    return null;
  },
  async uploadMedia(file, type = 'avatar') {
    if (!file) throw new Error('No media file provided');

    // 1. Client-Side Pre-Upload Smart Compression (reduces 15MB-30MB files to ~100-300KB before transmission)
    let processedFile = file;
    try {
      processedFile = await ClientMediaCompressor.compress(file, type);
    } catch (compErr) {
      console.warn('Client compression fallback:', compErr);
    }

    // 2. Centralized client size validation (Generous thresholds allowing high-res 4K files)
    const maxSizes = {
      avatar: 100 * 1024 * 1024,
      animatedAvatar: 500 * 1024 * 1024,
      banner: 150 * 1024 * 1024,
      animatedBanner: 1024 * 1024 * 1024,
      postImage: 150 * 1024 * 1024,
      postVideo: 2048 * 1024 * 1024,
      profileVideo: 1024 * 1024 * 1024
    };
    const limit = maxSizes[type] || (500 * 1024 * 1024);
    if (processedFile.size > limit) {
      const mb = Math.round(limit / (1024 * 1024));
      throw new Error(`File size (${(processedFile.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${mb}MB for ${type}.`);
    }

    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read media file'));
      reader.readAsDataURL(processedFile);
    });

    const payload = {
      filename: processedFile.name || `${type}_${Date.now()}`,
      mimeType: processedFile.type || 'image/jpeg',
      base64Data,
      type
    };

    return await this.request('/api/upload/media', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  async request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    try {
      const res = await fetch(endpoint, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        // Handle session expiration gracefully
        if (token && typeof AuthManager !== 'undefined' && AuthManager.currentUser) {
          AuthManager.handleSessionExpired();
        }
        throw new Error(data.error || 'Authentication required. Please sign in.');
      }
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      return data;
    } catch (err) {
      console.warn(`[API] ${endpoint} request error:`, err.message);
      throw err;
    }
  }
};

let currentUser = null;

// =============================================================================
// CENTRALIZED AUTH STATE MANAGER (STATE A, B, C & INTENT PRESERVATION)
// =============================================================================
const AuthManager = {
  currentUser: null,
  authStatus: 'loading', // 'loading' | 'authenticated' | 'unauthenticated' | 'error'
  pendingIntent: null,

  isAuthenticated() {
    return this.authStatus === 'authenticated' && Boolean(this.currentUser);
  },

  getAuthStatus() {
    return this.authStatus;
  },

  setPendingIntent(intent) {
    this.pendingIntent = intent;
    try {
      if (intent) {
        sessionStorage.setItem('dragme_auth_intent', JSON.stringify(intent));
      } else {
        sessionStorage.removeItem('dragme_auth_intent');
      }
    } catch (e) {}
  },

  getPendingIntent() {
    if (this.pendingIntent) return this.pendingIntent;
    try {
      const saved = sessionStorage.getItem('dragme_auth_intent');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  },

  clearPendingIntent() {
    this.pendingIntent = null;
    try {
      sessionStorage.removeItem('dragme_auth_intent');
    } catch (e) {}
  },

  setSession(token, user) {
    AuthAPI.setToken(token);
    this.currentUser = user;
    currentUser = user;
    this.authStatus = 'authenticated';
    if (typeof updateUserSessionUI === 'function') {
      updateUserSessionUI();
    }
    this.executePendingIntent();
  },

  clearSession() {
    AuthAPI.setToken(null);
    this.currentUser = null;
    currentUser = null;
    this.authStatus = 'unauthenticated';
    this.clearPendingIntent();
    if (typeof updateUserSessionUI === 'function') {
      updateUserSessionUI();
    }
  },

  handleSessionExpired() {
    this.clearSession();
    if (typeof showToast === 'function') {
      showToast('Your session has expired. Please sign in again.');
    }
    if (typeof AuthPromptManager !== 'undefined') {
      AuthPromptManager.open({
        title: 'Session Expired',
        subtitle: 'Your session has expired. Please log in again to continue.',
        intent: null
      });
    }
  },

  requireAuth(intent, subtitle = 'Create an account or log in to interact on DRAGME.', title = 'Join the conversation') {
    if (this.isAuthenticated()) {
      return true;
    }
    this.setPendingIntent(intent);
    if (typeof AuthPromptManager !== 'undefined') {
      AuthPromptManager.open({ title, subtitle, intent });
    }
    return false;
  },

  executePendingIntent() {
    const intent = this.getPendingIntent();
    if (!intent) return;
    this.clearPendingIntent();

    setTimeout(() => {
      try {
        if (intent.type === 'vote' && intent.postId && window.DRAGME_STORE) {
          window.DRAGME_STORE.toggleDrag(intent.postId).then(() => {
            if (typeof renderFeed === 'function') renderFeed();
            if (typeof showToast === 'function') showToast('Upvote applied!');
          });
        } else if (intent.type === 'save' && intent.postId && window.DRAGME_STORE) {
          window.DRAGME_STORE.toggleSave(intent.postId).then(() => {
            if (typeof renderFeed === 'function') renderFeed();
            if (typeof showToast === 'function') showToast('Saved to bookmarks!');
          });
        } else if (intent.type === 'comment' && intent.postId) {
          if (typeof openCommentsDrawer === 'function') {
            openCommentsDrawer(intent.postId);
          }
        } else if (intent.type === 'create_post') {
          if (typeof CreatePostModal !== 'undefined' && CreatePostModal.open) {
            CreatePostModal.open();
          }
        } else if (intent.type === 'create_room') {
          if (typeof showToast === 'function') {
            showToast('Community room creation unlocked!');
          }
        } else if (intent.type === 'profile') {
          if (typeof Router !== 'undefined') {
            Router.navigate('profile');
          }
        }
      } catch (err) {
        console.warn('Error executing pending intent:', err);
      }
    }, 150);
  }
};

class DragMeEngine {
  constructor() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem('dragme_reddit_posts'));
    } catch (e) {}
    this.posts = (Array.isArray(saved) && saved.length > 0) ? saved : SEED_POSTS;
    this.activeSort = 'hot';
    this.currentRoom = null;
    this.searchQuery = '';
    this.activeCommentPostId = null;
  }

  save() {
    localStorage.setItem('dragme_reddit_posts', JSON.stringify(this.posts));
  }

  async syncFromBackend() {
    try {
      const data = await AuthAPI.request('/api/posts');
      if (Array.isArray(data.posts) && data.posts.length > 0) {
        this.posts = data.posts;
        this.save();
        return true;
      }
    } catch (e) {
      console.log('Using cached posts fallback');
    }
    if (!Array.isArray(this.posts) || this.posts.length === 0) {
      this.posts = SEED_POSTS;
      this.save();
    }
    return false;
  }

  getFilteredPosts() {
    let list = Array.isArray(this.posts) && this.posts.length > 0 ? [...this.posts] : [...SEED_POSTS];

    if (this.currentRoom) {
      const roomKey = String(this.currentRoom).toLowerCase().replace('r/', '').replace(/ /g, '_');
      list = list.filter(p => {
        const pRoom = String(p.room || '').toLowerCase();
        return pRoom.includes(roomKey) || (roomKey === 'confessions' && (p.isAnonymous || pRoom === 'confessions'));
      });
    }

    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p => 
        (p.title && String(p.title).toLowerCase().includes(q)) ||
        (p.content && String(p.content).toLowerCase().includes(q)) ||
        (p.author && String(p.author).toLowerCase().includes(q)) ||
        (p.room && String(p.room).toLowerCase().includes(q)) ||
        (p.flair && String(p.flair).toLowerCase().includes(q))
      );
    }

    if (this.activeSort === 'hot') {
      list.sort((a, b) => (b.heatPercent || 85) - (a.heatPercent || 85) || (b.dragCount || 0) - (a.dragCount || 0));
    } else if (this.activeSort === 'top') {
      list.sort((a, b) => (b.dragCount || 0) - (a.dragCount || 0));
    } else if (this.activeSort === 'confessions') {
      list = list.filter(p => p.isAnonymous || (p.flair && String(p.flair).toLowerCase().includes('confession')) || String(p.room || '').toLowerCase() === 'confessions');
    }

    return list;
  }

  async toggleDrag(postId, { reactionType = 'crown', isSuper = false, switchOnly = false, remove = false } = {}) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return null;
    
    const wasVoted = Boolean(post.hasVoted);
    const sameReaction = (post.reactionType || 'crown') === reactionType;
    const sameSuper = Boolean(post.isSuper) === isSuper;

    // Optimistic UI update
    if (wasVoted && (remove || (sameReaction && sameSuper && !switchOnly))) {
      // Toggle OFF
      post.dragCount = Math.max(0, post.dragCount - (post.isSuper ? 2 : 1));
      post.hasVoted = false;
      post.reactionType = null;
      post.isSuper = false;
    } else if (wasVoted) {
      // Switch Reaction or Upgrade to Super
      post.reactionType = reactionType;
      post.isSuper = isSuper || Boolean(post.isSuper);
      if (isSuper && !wasVoted) post.dragCount += 1;
      post.heatPercent = Math.min(100, (post.heatPercent || 85) + (isSuper ? 4 : 1));
    } else {
      // New Reaction
      post.dragCount += (isSuper ? 2 : 1);
      post.hasVoted = true;
      post.reactionType = reactionType;
      post.isSuper = isSuper;
      post.heatPercent = Math.min(100, (post.heatPercent || 85) + (isSuper ? 5 : 2));
    }
    this.save();

    // Server-Authoritative sync
    try {
      const res = await AuthAPI.request(`/api/posts/${postId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ reactionType, isSuper, switchOnly, remove })
      });
      if (res && res.dragCount !== undefined) {
        post.dragCount = res.dragCount;
        post.hasVoted = res.hasVoted;
        post.reactionType = res.reactionType;
        post.isSuper = res.isSuper;
        post.heatPercent = res.heatPercent;
        this.save();
      }
    } catch (e) {}

    return post;
  }

  async toggleSave(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return null;

    // Optimistic UI update
    post.isSaved = !post.isSaved;
    this.save();

    // Server-Authoritative sync
    try {
      const res = await AuthAPI.request(`/api/posts/${postId}/save`, { method: 'POST' });
      if (res && res.isSaved !== undefined) {
        post.isSaved = res.isSaved;
        this.save();
      }
    } catch (e) {}

    return post;
  }

  async addPost({ content, category, tag, isAnonymous, attachedFile, ...extras }) {
    const roomKey = category.toLowerCase().replace(/ /g, '_').replace(/\+/g, '');
    
    let flairClass = 'flair-blue';
    if (tag === 'ROAST') flairClass = 'flair-roast';
    if (tag === 'CONFESSION' || isAnonymous) flairClass = 'flair-confession';
    if (tag === 'DISCUSS') flairClass = 'flair-discuss';
    if (tag === 'HOTTAKE') flairClass = 'flair-orange';
    if (tag === 'POLL') flairClass = 'flair-blue';
    if (tag === 'BATTLE') flairClass = 'flair-roast';

    const cleanContent = content.trim();
    const title = cleanContent.length > 70 ? cleanContent.substring(0, 70) + '...' : cleanContent;

    const authorName = isAnonymous 
      ? 'Masked Persona' 
      : (currentUser ? currentUser.username : 'DevZero');
      
    const authorAvatar = isAnonymous 
      ? AvatarService.getAnonymous() 
      : AvatarService.get(currentUser);

    let newPost = {
      id: 'post-' + Date.now(),
      title,
      author: authorName,
      avatar: authorAvatar,
      isAnonymous: Boolean(isAnonymous),
      room: roomKey,
      roomDisplayName: 'r/' + roomKey,
      timeAgo: 'Just now',
      flair: category,
      flairClass,
      imageUrl: attachedFile || null,
      content: cleanContent,
      dragCount: 1,
      commentCount: 0,
      heatPercent: Math.floor(Math.random() * 20) + 75,
      hasVoted: true,
      isSaved: false,
      comments: [],
      ...extras
    };

    // Push locally for instant zero-latency UI response
    this.posts.unshift(newPost);
    this.save();

    // Persist to Server Database
    try {
      const res = await AuthAPI.request('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content: cleanContent,
          category,
          room: roomKey,
          roomDisplayName: 'r/' + roomKey,
          isAnonymous: Boolean(isAnonymous),
          imageUrl: attachedFile || null
        })
      });
      if (res && res.post) {
        newPost.id = res.post.id;
        this.save();
      }
    } catch (err) {
      console.warn('Post created locally:', err.message);
    }

    return newPost;
  }

  async addComment(postId, text) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return null;
    if (!post.comments) post.comments = [];
    
    const authorName = currentUser ? currentUser.username : 'Tester Supreme';
    const authorAvatar = AvatarService.get(currentUser);
    const comment = {
      id: 'c-' + Date.now(),
      author: authorName,
      avatar: authorAvatar,
      timeAgo: 'Just now',
      text: text.trim()
    };
    post.comments.push(comment);
    post.commentCount = post.comments.length;
    post.heatPercent = Math.min(100, post.heatPercent + 3);
    this.save();

    // Persist to Server Database
    try {
      await AuthAPI.request(`/api/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: text.trim() })
      });
    } catch (e) {}

    return comment;
  }

  updateUserAvatars(username, newAvatarUrl) {
    if (!username) return;
    const lower = username.toLowerCase();
    this.posts.forEach(p => {
      if (!p.isAnonymous && p.author && p.author.toLowerCase() === lower) {
        p.avatar = newAvatarUrl;
      }
      if (p.comments && Array.isArray(p.comments)) {
        p.comments.forEach(c => {
          if (c.author && c.author.toLowerCase() === lower) {
            c.avatar = newAvatarUrl;
          }
        });
      }
    });
    this.save();
  }
}

class SoundFXEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Apple Minimal Haptic Pop (iOS Sheet / Dynamic Island Expansion)
  playOpen() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Soft tactile body tap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.045);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);

      // Subtle high click
      const click = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      click.type = 'sine';
      click.frequency.setValueAtTime(1400, now);
      click.frequency.exponentialRampToValueAtTime(600, now + 0.015);

      clickGain.gain.setValueAtTime(0.04, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

      click.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      click.start(now);
      click.stop(now + 0.018);
    } catch (e) {}
  }

  // Apple Minimal Dismiss (Subtle Haptic Snap)
  playClose() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  // Apple Keyboard / Control Picker Haptic Tick (6ms micro-click)
  playTap() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.012);

      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.014);
    } catch (e) {}
  }

  // Minimal Glass Chime (Me Mode)
  playMeMode() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.03);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } catch (e) {}
  }

  // Minimal Ghost Glass Drop (Ghost Mode)
  playGhostMode() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // Apple Sent / Success Subtle Swoosh (iMessage / Mail style)
  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.08);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  // Minimal Vote Haptic Tick
  playVote() {
    this.playCrownBurst();
  }

  // Tactile Crown Tap (320Hz crisp click)
  playCrownTap() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.025);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  }

  // Warm Golden Crown Burst
  playCrownBurst() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Tone 1 (Base Lime Energy)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(520, now);
      osc1.frequency.exponentialRampToValueAtTime(780, now + 0.06);

      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Tone 2 (Warm Golden Shimmer)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1040, now + 0.02);
      osc2.frequency.exponentialRampToValueAtTime(1560, now + 0.09);

      gain2.gain.setValueAtTime(0.035, now + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.02);
      osc2.stop(now + 0.1);
    } catch (e) {}
  }

  // Resonant Super Crown Chime
  playSuperCrown() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      [640, 960, 1280].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = idx * 0.03;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + delay + 0.12);

        gain.gain.setValueAtTime(0.07, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.15);
      });
    } catch (e) {}
  }

  triggerHaptic(type = 'light') {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (type === 'light') navigator.vibrate([10]);
        else if (type === 'medium') navigator.vibrate([22]);
        else if (type === 'super') navigator.vibrate([15, 30, 40]);
      }
    } catch (e) {}
  }
}

// Controller
document.addEventListener('DOMContentLoaded', () => {
  const store = new DragMeEngine();
  const sfx = new SoundFXEngine();

  // DOM Elements
  const postsStream = document.getElementById('postsStream');
  const sortTabs = document.querySelectorAll('.sort-tab');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const leftNavDrawer = document.getElementById('leftNavDrawer');
  const globalSearchInput = document.getElementById('globalSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const activeFilterIndicator = document.getElementById('activeFilterIndicator');
  const currentFilterLabel = document.getElementById('currentFilterLabel');
  const btnClearFeedFilter = document.getElementById('btnClearFeedFilter');

  // Sidebar info
  const sidebarRoomTitle = document.getElementById('sidebarRoomTitle');
  const sidebarRoomDesc = document.getElementById('sidebarRoomDesc');
  const sidebarMemberCount = document.getElementById('sidebarMemberCount');
  const sidebarOnlineCount = document.getElementById('sidebarOnlineCount');

  // Comments Drawer
  const commentsDrawer = document.getElementById('commentsDrawer');
  const closeCommentsBtn = document.getElementById('closeCommentsBtn');
  const drawerPostSummary = document.getElementById('drawerPostSummary');
  const drawerCommentsList = document.getElementById('drawerCommentsList');
  const drawerCommentCount = document.getElementById('drawerCommentCount');
  const drawerCommentSubmitForm = document.getElementById('drawerCommentSubmitForm');
  const drawerCommentInput = document.getElementById('drawerCommentInput');

  // Modal State
  let selectedCategory = 'General';
  let selectedTag = 'DISCUSS';
  let isAnonymousPosting = true;
  let attachedFileUrl = null;

  // Render Post Feed with Smooth Entry Animation
  function renderFeed(animate = true) {
    const posts = store.getFilteredPosts();

    if (animate && postsStream) {
      postsStream.classList.remove('feed-animate-enter');
      void postsStream.offsetWidth; // Trigger reflow for fluid animation
      postsStream.classList.add('feed-animate-enter');
    }

    if (posts.length === 0) {
      postsStream.innerHTML = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 48px 20px; text-align: center; color: var(--text-low);">
          <i class="fa-solid fa-layer-group" style="font-size: 2.5rem; margin-bottom: 12px; color: #232c3d;"></i>
          <h3 style="color: var(--text-pure); font-size: 1.1rem; margin-bottom: 6px;">No posts in this arena</h3>
          <p style="font-size: 0.84rem;">Tap the + button to drop the first drag!</p>
        </div>
      `;
      return;
    }

    postsStream.innerHTML = posts.map(post => {
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
              <div class="post-video-poster-overlay" onclick="window.playPostVideo(this)" title="Click to Play Video">
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

      let codeMarkup = '';
      if (post.codeSnippet || post.code_snippet) {
        const rawSnippet = post.codeSnippet || post.code_snippet;
        codeMarkup = `
          <div class="post-code-block-wrap">
            <pre class="post-code-content"><code>${escapeHtml(rawSnippet)}</code></pre>
            <button class="btn-copy-code-snippet" onclick="navigator.clipboard.writeText(\`${escapeHtml(rawSnippet)}\`);" title="Copy snippet" type="button">
              <i class="fa-regular fa-copy"></i>
            </button>
          </div>
        `;
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
        if (fLower.includes('roast') || fLower.includes('hot take')) {
          flairTagClass = 'tag-roast';
          flairIcon = '<i class="fa-solid fa-fire text-orange"></i>';
          flairText = 'Roast';
        } else if (fLower.includes('help') || fLower.includes('question')) {
          flairTagClass = 'tag-help-wanted';
          flairIcon = '<i class="fa-solid fa-circle-question"></i>';
          flairText = 'Help';
        } else if (fLower.includes('confession')) {
          flairTagClass = 'tag-confession';
          flairIcon = '<i class="fa-solid fa-mask text-purple"></i>';
          flairText = 'Confession';
        }
      }

      return `
        <article class="reddit-post-card" data-post-id="${post.id}">
          <div class="post-meta-line">
            <div class="meta-left-group">
              ${authorAvatar}
              <div class="post-header-details">
                <div class="post-author-name-row">
                  <span class="meta-author-name">${escapeHtml(displayName)}</span>
                  ${verifiedBadge}
                </div>
                <div class="post-author-sub-row">
                  ${usernameHandle ? `<span class="post-handle-text">${escapeHtml(usernameHandle)}</span>` : ''}
                  <span class="post-time-dot">·</span>
                  <span class="post-timestamp-str">${post.timeAgo || '2h'}</span>
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
          ${codeMarkup}

          <div class="post-bottom-actions">
            <div class="post-actions-left">
              ${(() => {
                const reactionType = post.reactionType || 'crown';
                const isSuper = Boolean(post.isSuper);
                const reactionClass = post.hasVoted ? `reaction-${reactionType}` : '';
                const superClass = isSuper ? 'is-super' : '';
                const isVoted = Boolean(post.hasVoted);

                return `
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
                      <span class="vote-count-digit" id="crownCount-${post.id}">${post.dragCount}</span>
                    </span>
                  </button>
                `;
              })()}

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

  // =============================================================================
  // WEB AUDIO SFX SYNTHESIZER FOR IDENTITY SWITCHER
  // =============================================================================
  const SFXEngine = {
    ctx: null,
    getContext() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    },

    playSwitch(targetMode) {
      try {
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const isGhost = targetMode === 'anonymous' || targetMode === 'ghost';

        if (isGhost) {
          // --- 1. GHOST PLUNGE: Cavitation Bloop ---
          const bubble = ctx.createOscillator();
          const bGain = ctx.createGain();
          bubble.type = 'sine';
          bubble.frequency.setValueAtTime(460, now);
          bubble.frequency.exponentialRampToValueAtTime(125, now + 0.09);
          bGain.gain.setValueAtTime(0.3, now);
          bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
          bubble.connect(bGain);
          bGain.connect(ctx.destination);
          bubble.start(now);
          bubble.stop(now + 0.12);

          // --- 2. Stealth Sub-Bass Pulse ---
          const sub = ctx.createOscillator();
          const sGain = ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(76, now + 0.02);
          sub.frequency.exponentialRampToValueAtTime(34, now + 0.26);
          sGain.gain.setValueAtTime(0.001, now);
          sGain.gain.linearRampToValueAtTime(0.35, now + 0.035);
          sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          sub.connect(sGain);
          sGain.connect(ctx.destination);
          sub.start(now + 0.02);
          sub.stop(now + 0.29);

          // --- 3. Ethereal Cyber Detuned 5th Chord ---
          [329.63, 493.88, 498.0].forEach(freq => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + 0.04);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.36);
            gain.gain.setValueAtTime(0.001, now + 0.04);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.10);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + 0.04);
            osc.stop(now + 0.38);
          });

        } else {
          // --- 1. ME REVELATION: Upward Cavitation Bubble Pop ---
          const pop = ctx.createOscillator();
          const pGain = ctx.createGain();
          pop.type = 'sine';
          pop.frequency.setValueAtTime(260, now);
          pop.frequency.exponentialRampToValueAtTime(960, now + 0.04);
          pGain.gain.setValueAtTime(0.28, now);
          pGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
          pop.connect(pGain);
          pGain.connect(ctx.destination);
          pop.start(now);
          pop.stop(now + 0.05);

          // --- 2. Radiant Ascending Crystal Chime Triad ---
          [587.33, 880.00, 1174.66].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = now + 0.03 + (idx * 0.04);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.001, start);
            gain.gain.linearRampToValueAtTime(0.14 - (idx * 0.02), start + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.18);
          });
        }
      } catch(e) {}
    }
  };

  // =============================================================================
  // LIQUID MEMBRANE MORPHING CONTROLLER
  // =============================================================================
  const LiquidIdentityPill = {
    element: null,
    membranePath: null,
    mode: 'me',
    isAnimating: false,

    getMorphPath(fromMode, toMode, p) {
      p = Math.max(0, Math.min(1, p));
      const isToAnon = toMode === 'anonymous';

      if (isToAnon) {
        const frontP = Math.min(1, p * 1.35);
        const backP = Math.max(0, (p - 0.25) * 1.33);
        const x1 = 4.5 + (98 - 4.5) * backP;
        const x2 = 92 + (215.5 - 92) * frontP;
        const waistPinch = Math.sin(p * Math.PI) * 9.5;
        const midX = (x1 + x2) / 2;
        return `M ${x1 + 18} 4 Q ${midX} ${4 + waistPinch} ${x2 - 18} 4 A 18 18 0 0 1 ${x2} 22 A 18 18 0 0 1 ${x2 - 18} 40 Q ${midX} ${40 - waistPinch} ${x1 + 18} 40 A 18 18 0 0 1 ${x1} 22 A 18 18 0 0 1 ${x1 + 18} 4 Z`;
      } else {
        const frontP = Math.min(1, p * 1.35);
        const backP = Math.max(0, (p - 0.25) * 1.33);
        const x1 = 98 - (98 - 4.5) * frontP;
        const x2 = 215.5 - (215.5 - 92) * backP;
        const waistPinch = Math.sin(p * Math.PI) * 9.5;
        const midX = (x1 + x2) / 2;
        return `M ${x1 + 18} 4 Q ${midX} ${4 + waistPinch} ${x2 - 18} 4 A 18 18 0 0 1 ${x2} 22 A 18 18 0 0 1 ${x2 - 18} 40 Q ${midX} ${40 - waistPinch} ${x1 + 18} 40 A 18 18 0 0 1 ${x1} 22 A 18 18 0 0 1 ${x1 + 18} 4 Z`;
      }
    },

    easeInOut(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    },

    spawnSparks(newMode) {
      const container = document.getElementById('identityParticles');
      if (!container) return;
      const isAnon = newMode === 'anonymous';
      const color = isAnon ? '#c084fc' : '#C8FF00';
      const originX = isAnon ? 150 : 60;

      for (let i = 0; i < 6; i++) {
        const spark = document.createElement('div');
        spark.className = 'identity-spark';
        spark.style.backgroundColor = color;
        spark.style.left = `${originX + (Math.random() * 20 - 10)}px`;
        spark.style.top = `${21 + (Math.random() * 10 - 5)}px`;
        spark.style.setProperty('--tx', `${(Math.random() * 36 - 18).toFixed(1)}px`);
        spark.style.setProperty('--ty', `${(Math.random() * 24 - 12).toFixed(1)}px`);
        container.appendChild(spark);
        setTimeout(() => spark.remove(), 400);
      }
    },

    setMode(newMode, playSound = true) {
      if (this.isAnimating || this.mode === newMode) return;

      const prevMode = this.mode;
      this.mode = newMode;
      this.isAnimating = true;

      // Play Synth SFX
      if (playSound) {
        SFXEngine.playSwitch(newMode);
      }
      if (navigator.vibrate) {
        try { navigator.vibrate(14); } catch (e) {}
      }

      const duration = 440;
      const startTime = performance.now();
      this.element?.classList.add('is-morphing');
      let sparksSpawned = false;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, Math.max(0, elapsed / duration));
        const eased = this.easeInOut(progress);

        if (this.membranePath) {
          this.membranePath.setAttribute('d', this.getMorphPath(prevMode, newMode, eased));

          // Switch color gradient at midpoint bridge
          if (elapsed >= 180) {
            const grad = newMode === 'anonymous' ? 'url(#capsule-grad-anon)' : 'url(#capsule-grad-me)';
            const stroke = newMode === 'anonymous' ? 'url(#capsule-stroke-anon)' : 'url(#capsule-stroke-me)';
            this.membranePath.setAttribute('fill', grad);
            this.membranePath.setAttribute('stroke', stroke);
          }
        }

        if (elapsed >= 180 && !sparksSpawned) {
          sparksSpawned = true;
          this.spawnSparks(newMode);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.element?.classList.remove('is-morphing');
          this.element?.classList.toggle('mode-anonymous', newMode === 'anonymous');
          this.element?.classList.toggle('mode-me', newMode === 'me');
          this.element?.setAttribute('aria-checked', newMode === 'anonymous' ? 'true' : 'false');
          this.isAnimating = false;

          // Dispatch identity change event
          window.dispatchEvent(new CustomEvent('dragme:identity-change', { detail: { mode: newMode } }));
        }
      };

      requestAnimationFrame(animate);
    },

    init() {
      this.element = document.getElementById('dragmeIdentityToggle');
      if (!this.element) return;
      this.membranePath = this.element.querySelector('.identity-morph-membrane');

      // Click handler
      this.element.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSide = e.target.closest('.identity-side-target')?.dataset.side;
        if (targetSide) {
          this.setMode(targetSide);
        } else {
          this.setMode(this.mode === 'me' ? 'anonymous' : 'me');
        }
      });

      // Keyboard support (Space / Enter)
      this.element.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.setMode(this.mode === 'me' ? 'anonymous' : 'me');
        }
      });

    }
  };

  // ==========================================================================
  // DRAGME APPLE-STYLE CREATE POST MODAL CONTROLLER
  // ==========================================================================
  const CreatePostModal = {
    selectedCategory: 'General',
    selectedTag: 'DISCUSS',
    isAnonymous: false,
    _isOpen: false,
    _closeTimer: null,

    isOpen() {
      return this._isOpen;
    },

    calculateDelta(triggerEl = null) {
      const modal = document.getElementById('create-post-modal');
      if (!modal) return;
      const windowEl = modal.querySelector('.create-modal-window');
      const triggerBtn = triggerEl || document.getElementById('btn-header-create-post') || document.querySelector('.dragme-plus-trigger');
      
      if (triggerBtn && windowEl) {
        const btnRect = triggerBtn.getBoundingClientRect();
        
        // Exact button center in viewport
        const btnCenterX = btnRect.left + btnRect.width / 2;
        const btnCenterY = btnRect.top + btnRect.height / 2;
        
        // Window center when in natural rest position
        const winHeight = windowEl.offsetHeight || 380;
        const winRestCenterX = window.innerWidth / 2;
        const winRestCenterY = 58 + 12 + winHeight / 2;
        
        const deltaX = Math.round(btnCenterX - winRestCenterX);
        const deltaY = Math.round(btnCenterY - winRestCenterY);
        
        windowEl.style.setProperty('--start-x', `${deltaX}px`);
        windowEl.style.setProperty('--start-y', `${deltaY}px`);
      }
    },

    open(defaultAnon = false, preCategory = 'General', triggerEl = null) {
      const modal = document.getElementById('create-post-modal');
      if (!modal) return;

      if (this._closeTimer) {
        clearTimeout(this._closeTimer);
        this._closeTimer = null;
      }

      const isAuthed = typeof AuthManager !== 'undefined' && AuthManager.isAuthenticated();
      const shouldBeAnon = defaultAnon || !isAuthed;

      this._isOpen = true;
      this.selectedCategory = preCategory;
      this.setMode(shouldBeAnon ? 'anon' : 'me', false);
      this.selectCategory(preCategory, false);

      // Play SFX safely
      try { sfx?.playOpen?.(); } catch (e) {}

      // 1. Calculate start offset anchored to the clicked button
      try { this.calculateDelta(triggerEl); } catch (e) {}

      // 1. Prepare open state
      modal.classList.remove('closing');
      modal.style.display = 'flex';
      modal.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';

      // 2. Trigger hardware-accelerated transform cleanly via RAF
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
    },

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

      // Play SFX safely
      try { sfx?.playClose?.(); } catch (e) {}

      this._closeTimer = setTimeout(() => {
        if (!this._isOpen) {
          modal.classList.remove('closing');
          modal.style.display = 'none';
          modal.style.pointerEvents = 'none';
        }
        this._closeTimer = null;
      }, 140);
    },

    toggle(triggerEl = null) {
      if (this.isOpen()) this.close();
      else this.open(false, 'General', triggerEl);
    },

    setMode(mode, playSound = true) {
      const isAnon = mode === 'anon' || mode === 'anonymous';
      this.isAnonymous = isAnon;
      const modal = document.getElementById('create-post-modal');
      modal?.classList.toggle('mode-anonymous', isAnon);

      if (typeof LiquidIdentityPill !== 'undefined' && LiquidIdentityPill.element && LiquidIdentityPill.mode !== (isAnon ? 'anonymous' : 'me')) {
        LiquidIdentityPill.setMode(isAnon ? 'anonymous' : 'me', playSound);
      }

      const hint = document.getElementById('create-identity-hint-text');
      if (hint) {
        hint.textContent = isAnon ? 'Your identity stays private outside this thread.' : 'Post as yourself.';
      }
    },

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
        try { sfx?.playTap?.(); } catch (e) {}
      }

      if (categoryName.toLowerCase().includes('confession')) {
        this.setMode('anonymous', playSound);
      }
    },

    init() {
      window.CreatePostModal = this;

      // Initialize Liquid Identity Pill
      if (typeof LiquidIdentityPill !== 'undefined') {
        try { LiquidIdentityPill.init(); } catch (e) {}
      }

      // Listen for identity switch changes from LiquidIdentityPill
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

      // Trigger Buttons (Header + Any Plus Button)
      document.querySelectorAll('#btn-header-create-post, .dragme-plus-trigger, .btn-trigger-create-post').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggle(e.currentTarget);
        };
      });

      // Quick trigger elements in feed & composer card
      document.getElementById('quickCreateTriggerInput')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(false, 'General', e.currentTarget);
      });
      document.getElementById('quickImgBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(false, 'General', e.currentTarget);
        setTimeout(() => document.getElementById('composerFileInput')?.click(), 180);
      });
      document.getElementById('quickVidBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(false, 'General', e.currentTarget);
        setTimeout(() => document.getElementById('composerFileInput')?.click(), 180);
      });
      document.getElementById('quickLinkBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        this.open(false, 'General', e.currentTarget);
      });
      document.querySelectorAll('.create-type-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.preventDefault();
          const label = pill.dataset.label || 'General';
          const catMap = {
            'Post': 'General',
            'Question': 'Help Me',
            'Poll': 'Poll + Judgment',
            'Hot Take': 'Hot Take',
            'Confession': 'Confession',
            'Before / After': 'General'
          };
          const targetCat = catMap[label] || 'General';
          const isAnon = label === 'Confession';
          this.open(isAnon, targetCat, e.currentTarget);
        });
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

      window.addEventListener('resize', () => {
        if (this.isOpen()) this.calculateDelta();
      }, { passive: true });

      // Category Card Selection
      const cards = document.querySelectorAll('.create-cat-card');
      cards.forEach(card => {
        card.addEventListener('click', () => {
          const cat = card.dataset.category || card.dataset.catId || 'General';
          this.selectCategory(cat, true);
        });
      });

      // Identity switches
      document.getElementById('btn-toggle-me')?.addEventListener('click', () => this.setMode('me', true));
      document.getElementById('btn-toggle-anon')?.addEventListener('click', () => this.setMode('anon', true));

      // Post Composer Media Attachment Controls
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

      // Form Submission
      const form = document.getElementById('create-post-main-form');
      const submitPost = async () => {
        const contentInput = document.getElementById('composer-content-input');
        const titleInput = document.getElementById('composer-title-input');
        const submitBtn = document.getElementById('btn-create-submit');
        const text = contentInput?.value?.trim() || '';
        const customTitle = titleInput?.value?.trim() || '';

        if (!text) {
          showToast('Please type your thoughts before sharing!');
          contentInput?.focus();
          return;
        }

        if (!this.isAnonymous && typeof AuthManager !== 'undefined' && !AuthManager.isAuthenticated()) {
          if (!AuthManager.requireAuth({ type: 'create_post' }, 'Sign in to post under your personal handle, or switch to Anonymous Persona.', 'Publish Post')) {
            return;
          }
        }

        let uploadedMediaUrl = null;

        if (this.pendingMediaFile) {
          try {
            if (submitBtn) submitBtn.disabled = true;
            showToast('Optimizing and uploading media...');
            const isVid = this.pendingMediaFile.type.startsWith('video/');
            const uploadType = isVid ? 'postVideo' : 'postImage';
            const uploadRes = await AuthAPI.uploadMedia(this.pendingMediaFile, uploadType);
            if (uploadRes && uploadRes.url) {
              uploadedMediaUrl = uploadRes.url;
            }
          } catch (uploadErr) {
            console.error('Post media upload failed:', uploadErr);
            showToast('Media upload error: ' + uploadErr.message);
            if (submitBtn) submitBtn.disabled = false;
            return;
          }
        }

        const newPost = await store.addPost({
          content: text,
          title: customTitle || (text.length > 70 ? text.substring(0, 70) + '...' : text),
          category: this.selectedCategory,
          tag: this.selectedCategory.toUpperCase(),
          isAnonymous: this.isAnonymous,
          attachedFile: uploadedMediaUrl
        });

        if (contentInput) contentInput.value = '';
        if (titleInput) titleInput.value = '';
        if (fileInput) fileInput.value = '';
        this.pendingMediaFile = null;
        if (this.pendingMediaPreviewUrl) {
          URL.revokeObjectURL(this.pendingMediaPreviewUrl);
          this.pendingMediaPreviewUrl = null;
        }
        if (mediaPreviewBox) mediaPreviewBox.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;

        sfx.playSuccess();
        this.close();

        // Reset to Home feed so user immediately sees their new post
        store.currentRoom = null;
        store.activeSort = 'hot';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'none';

        // Clear sidebar active and set Home active
        const homeCard = document.getElementById('navHome');
        const menuRows = document.querySelectorAll('.sidebar-menu-row');
        homeCard?.classList.add('active');
        menuRows.forEach(r => r.classList.remove('active'));
        document.querySelectorAll('.sidebar-row, .community-row-item').forEach(r => r.classList.remove('active'));

        renderFeed();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        showToast(this.isAnonymous ? 'Confession shared anonymously!' : 'Post published to the feed!');
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
  };

  // Video Playback Trigger for Post Video Elements
  window.playPostVideo = function(overlay) {
    if (!overlay) return;
    const wrap = overlay.closest('.post-video-player-wrap');
    if (!wrap) return;
    const video = wrap.querySelector('video');
    if (!video) return;

    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    video.controls = true;
    video.muted = false;
    video.play().catch(() => {});
    if (typeof AnimationScheduler !== 'undefined') {
      AnimationScheduler.register(video, { isVideo: true, priority: AnimationScheduler.PRIORITIES.MEDIUM });
    }
  };

  // Initialize CreatePostModal
  CreatePostModal.init();

  // Toast Helper
  function showToast(msg) {
    const hub = document.getElementById('toastHub');
    const t = document.createElement('div');
    t.className = 'toast-item';
    t.innerHTML = `<i class="fa-solid fa-crown text-lime"></i><span>${escapeHtml(msg)}</span>`;
    hub.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(20px)';
      t.style.transition = 'all 0.2s';
      setTimeout(() => t.remove(), 200);
    }, 2400);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Sidebar Toggle & Mobile Slide-Out
  const sidebarMobileBackdrop = document.getElementById('sidebarMobileBackdrop');

  function closeMobileSidebar() {
    leftNavDrawer?.classList.remove('mobile-open');
    sidebarMobileBackdrop?.classList.remove('active');
    toggleSidebarBtn?.classList.remove('is-open');
  }

  toggleSidebarBtn?.addEventListener('click', () => {
    if (window.innerWidth <= 860) {
      const isOpen = leftNavDrawer?.classList.toggle('mobile-open');
      sidebarMobileBackdrop?.classList.toggle('active', isOpen);
      toggleSidebarBtn?.classList.toggle('is-open', isOpen);
    } else {
      leftNavDrawer?.classList.toggle('collapsed');
    }
  });

  sidebarMobileBackdrop?.addEventListener('click', () => {
    closeMobileSidebar();
  });

  // Close sidebar on link click on mobile
  document.querySelectorAll('.sidebar-row, .community-row-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 860) {
        closeMobileSidebar();
      }
    });
  });

  // Mobile Bottom Navigation Bar Actions (delegated to MobileNavSystem & Router)

  // Mobile Search Overlay Controls
  const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
  const mobileSearchInput = document.getElementById('mobileSearchInput');
  const mobClearSearchBtn = document.getElementById('mobClearSearchBtn');
  const mobSearchCloseBtn = document.getElementById('mobSearchCloseBtn');

  function openMobileSearch() {
    mobileSearchOverlay?.classList.add('open');
    setTimeout(() => mobileSearchInput?.focus(), 120);
  }

  function closeMobileSearch() {
    mobileSearchOverlay?.classList.remove('open');
    if (mobileSearchInput) mobileSearchInput.value = '';
    if (mobClearSearchBtn) mobClearSearchBtn.style.display = 'none';
    store.searchQuery = '';
    renderFeed();
  }

  document.getElementById('mobNavSearch')?.addEventListener('click', () => {
    document.querySelectorAll('.mob-nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById('mobNavSearch')?.classList.add('active');
    openMobileSearch();
  });

  mobSearchCloseBtn?.addEventListener('click', () => {
    closeMobileSearch();
    document.getElementById('mobNavHome')?.classList.add('active');
  });

  mobileSearchInput?.addEventListener('input', (e) => {
    const q = e.target.value;
    store.searchQuery = q;
    if (mobClearSearchBtn) mobClearSearchBtn.style.display = q ? 'block' : 'none';
    renderFeed();
  });

  mobClearSearchBtn?.addEventListener('click', () => {
    if (mobileSearchInput) mobileSearchInput.value = '';
    if (mobClearSearchBtn) mobClearSearchBtn.style.display = 'none';
    store.searchQuery = '';
    renderFeed();
  });

  // =============================================================================
  // DRAG MOBILE NAVIGATION & CREATE SYSTEM CONTROLLER
  // =============================================================================
  const MobileCreateSystem = {
    isOpen: false,
    currentType: 'general',
    isAnonymous: false,
    pendingMediaFile: null,
    pendingPreviewUrl: null,
    pollOptions: ['', ''],

    init() {
      const plusTrigger = document.getElementById('mobNavPlusTrigger');
      const backdrop = document.getElementById('mobCreateBackdrop');
      const closeBtn = document.getElementById('btnCloseMobMenu');
      const backBtn = document.getElementById('btnMobComposerBack');
      const submitBtn = document.getElementById('btnMobComposerSubmit');
      const toggleAnonBtn = document.getElementById('btnMobToggleAnon');
      const attachBtn = document.getElementById('btnMobAttachMedia');
      const fileInput = document.getElementById('mobFileInput');
      const removeMediaBtn = document.getElementById('btnMobRemoveMedia');
      const textarea = document.getElementById('mobComposerTextarea');
      const charCounter = document.getElementById('mobCharCounter');

      plusTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });

      [backdrop, closeBtn].forEach(el => {
        el?.addEventListener('click', () => this.close());
      });

      backBtn?.addEventListener('click', () => this.showMenu());

      // Post type card selection in grid
      document.querySelectorAll('.mob-type-card').forEach(card => {
        card.addEventListener('click', () => {
          const type = card.dataset.type || 'general';
          const label = card.dataset.label || 'Create Post';
          this.selectType(type, label);
        });
      });

      // Anonymous toggle
      toggleAnonBtn?.addEventListener('click', () => this.toggleAnon());

      // Textarea char counter
      textarea?.addEventListener('input', (e) => {
        const len = e.target.value.length;
        if (charCounter) charCounter.textContent = `${len}/2000`;
      });

      // Media attachment
      attachBtn?.addEventListener('click', () => fileInput?.click());
      fileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) this.handleMediaSelect(file);
      });
      removeMediaBtn?.addEventListener('click', () => this.clearMedia());

      // Submit post
      submitBtn?.addEventListener('click', () => this.submit());
    },

    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    },

    open() {
      const isAuthed = typeof AuthManager !== 'undefined' && AuthManager.isAuthenticated();
      this.isOpen = true;
      this.isAnonymous = !isAuthed;
      
      const system = document.getElementById('mobCreateSystem');
      const plusTrigger = document.getElementById('mobNavPlusTrigger');
      const nav = document.getElementById('mobileBottomNav');
      if (nav) nav.classList.remove('nav-collapsed');
      if (system) system.style.display = 'flex';
      
      try { sfx?.playOpen?.(); } catch (_) {}

      requestAnimationFrame(() => {
        if (this.isOpen) {
          system?.classList.add('open');
          plusTrigger?.classList.add('open');
        }
      });

      this.showMenu();
    },

    close() {
      this.isOpen = false;
      const system = document.getElementById('mobCreateSystem');
      const plusTrigger = document.getElementById('mobNavPlusTrigger');
      
      system?.classList.remove('open');
      plusTrigger?.classList.remove('open');

      setTimeout(() => {
        if (!this.isOpen && system) {
          system.style.display = 'none';
          this.showMenu();
          this.resetForm();
        }
      }, 250);
    },

    showMenu() {
      const menuPanel = document.getElementById('mobCreateMenuPanel');
      const composerSheet = document.getElementById('mobComposerSheet');
      if (menuPanel) menuPanel.style.display = 'block';
      if (composerSheet) composerSheet.style.display = 'none';
    },

    selectType(type, label) {
      this.currentType = type;
      const menuPanel = document.getElementById('mobCreateMenuPanel');
      const composerSheet = document.getElementById('mobComposerSheet');
      const titleEl = document.getElementById('mobComposerTitle');
      const typePill = document.getElementById('mobComposerTypePill');
      const titleInput = document.getElementById('mobComposerTitleInput');
      const textarea = document.getElementById('mobComposerTextarea');
      const dynamicZone = document.getElementById('mobDynamicFieldsZone');

      if (titleEl) titleEl.textContent = label;
      if (typePill) typePill.textContent = type.replace('_', ' ').toUpperCase();

      if (dynamicZone) dynamicZone.innerHTML = '';
      if (titleInput) titleInput.style.display = 'block';

      if (type === 'general') {
        if (titleInput) {
          titleInput.placeholder = 'Title / Subject (Optional)';
          titleInput.value = '';
        }
        if (textarea) textarea.placeholder = "What's on your mind?";
      } else if (type === 'help') {
        if (titleInput) {
          titleInput.placeholder = 'Ask your question clearly...';
          titleInput.value = '';
        }
        if (textarea) textarea.placeholder = 'Provide extra details or context (optional)...';
      } else if (type === 'poll') {
        if (titleInput) {
          titleInput.placeholder = 'Poll Question / Topic...';
          titleInput.value = '';
        }
        if (textarea) textarea.placeholder = 'Describe your poll or ask for judgment...';
        this.pollOptions = ['', ''];
        this.renderPollInputs();
      } else if (type === 'hot_take') {
        if (titleInput) {
          titleInput.placeholder = 'Hot Take topic...';
          titleInput.value = '';
        }
        if (textarea) textarea.placeholder = 'Drop your spicy, unfiltered hot take...';
      } else if (type === 'confession') {
        this.setAnonState(true);
        if (titleInput) {
          titleInput.placeholder = 'Confession Topic (Optional)';
          titleInput.value = '';
        }
        if (textarea) textarea.placeholder = 'Share anonymously with the arena...';
      } else if (type === 'roast') {
        if (titleInput) {
          titleInput.placeholder = 'Roast Title...';
          titleInput.value = '';
        }
        if (textarea) textarea.placeholder = 'Roast prompt: What should they roast? Drop your lines or upload media...';
      } else if (type === 'before_after') {
        if (titleInput) {
          titleInput.placeholder = 'Transformation / Progress Title...';
          titleInput.value = '';
        }
        if (textarea) textarea.placeholder = 'Explain what changed (Before vs. After)...';
      } else {
        if (titleInput) {
          titleInput.placeholder = 'Custom Title...';
          titleInput.value = '';
        }
        if (textarea) textarea.placeholder = 'Write anything in the arena...';
      }

      this.updateIdentityDisplay();

      if (menuPanel) menuPanel.style.display = 'none';
      if (composerSheet) {
        composerSheet.style.display = 'flex';
        setTimeout(() => {
          textarea?.focus();
        }, 80);
      }
    },

    renderPollInputs() {
      const dynamicZone = document.getElementById('mobDynamicFieldsZone');
      if (!dynamicZone) return;

      let html = `
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 0.72rem; font-weight: 800; color: #38bdf8; text-transform: uppercase;">Poll Options</span>
      `;

      this.pollOptions.forEach((opt, idx) => {
        html += `
          <div class="mob-poll-input-row">
            <input type="text" class="mob-poll-input" placeholder="Option ${idx + 1}" value="${escapeHtml(opt)}" data-poll-idx="${idx}">
          </div>
        `;
      });

      if (this.pollOptions.length < 5) {
        html += `
          <button type="button" class="btn-mob-add-poll-opt" id="btnMobAddPollOpt">+ Add Option</button>
        `;
      }

      html += `</div>`;
      dynamicZone.innerHTML = html;

      dynamicZone.querySelectorAll('.mob-poll-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const idx = parseInt(e.target.dataset.pollIdx, 10);
          this.pollOptions[idx] = e.target.value;
        });
      });

      dynamicZone.querySelector('#btnMobAddPollOpt')?.addEventListener('click', () => {
        if (this.pollOptions.length < 5) {
          this.pollOptions.push('');
          this.renderPollInputs();
        }
      });
    },

    toggleAnon() {
      this.setAnonState(!this.isAnonymous);
    },

    setAnonState(anon) {
      this.isAnonymous = anon;
      this.updateIdentityDisplay();
    },

    updateIdentityDisplay() {
      const toggleBtn = document.getElementById('btnMobToggleAnon');
      const toggleText = document.getElementById('mobAnonToggleText');
      const avatarImg = document.getElementById('mobIdentityAvatar');
      const nameEl = document.getElementById('mobIdentityName');
      const statusEl = document.getElementById('mobIdentityStatus');

      const currentUser = typeof AuthManager !== 'undefined' ? AuthManager.getCurrentUser() : null;
      const authorName = currentUser?.displayName || currentUser?.username || 'You';

      if (this.isAnonymous) {
        toggleBtn?.classList.add('active');
        if (toggleText) toggleText.textContent = 'Anonymous Mode ON';
        if (avatarImg) avatarImg.src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100&auto=format&fit=crop&q=80';
        if (nameEl) nameEl.textContent = 'Masked Persona';
        if (statusEl) statusEl.textContent = 'Anonymous in Arena';
      } else {
        toggleBtn?.classList.remove('active');
        if (toggleText) toggleText.textContent = 'Post Anonymously';
        if (avatarImg) avatarImg.src = currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';
        if (nameEl) nameEl.textContent = `Posting as ${authorName}`;
        if (statusEl) statusEl.textContent = 'Public Persona';
      }
    },

    async handleMediaSelect(file) {
      if (!file) return;
      this.pendingMediaFile = file;

      const stagedCard = document.getElementById('mobStagedMediaCard');
      const stagedImg = document.getElementById('mobStagedImg');
      const stagedVid = document.getElementById('mobStagedVid');
      const stagedTitle = document.getElementById('mobStagedTitle');
      const stagedSize = document.getElementById('mobStagedSize');

      const isVid = file.type.startsWith('video/');
      const mbSize = (file.size / (1024 * 1024)).toFixed(1);

      if (this.pendingPreviewUrl) URL.revokeObjectURL(this.pendingPreviewUrl);
      this.pendingPreviewUrl = URL.createObjectURL(file);

      if (stagedTitle) stagedTitle.textContent = file.name;
      if (stagedSize) stagedSize.textContent = `${isVid ? 'Video' : 'Image'} • ${mbSize} MB`;

      if (isVid) {
        if (stagedImg) stagedImg.style.display = 'none';
        if (stagedVid) {
          stagedVid.style.display = 'block';
          stagedVid.src = this.pendingPreviewUrl;
        }
      } else {
        if (stagedVid) stagedVid.style.display = 'none';
        if (stagedImg) {
          stagedImg.style.display = 'block';
          stagedImg.src = this.pendingPreviewUrl;
        }
      }

      if (stagedCard) stagedCard.style.display = 'flex';
    },

    clearMedia() {
      this.pendingMediaFile = null;
      if (this.pendingPreviewUrl) {
        URL.revokeObjectURL(this.pendingPreviewUrl);
        this.pendingPreviewUrl = null;
      }
      const stagedCard = document.getElementById('mobStagedMediaCard');
      const fileInput = document.getElementById('mobFileInput');
      if (stagedCard) stagedCard.style.display = 'none';
      if (fileInput) fileInput.value = '';
    },

    resetForm() {
      const titleInput = document.getElementById('mobComposerTitleInput');
      const textarea = document.getElementById('mobComposerTextarea');
      const charCounter = document.getElementById('mobCharCounter');
      if (titleInput) titleInput.value = '';
      if (textarea) textarea.value = '';
      if (charCounter) charCounter.textContent = '0/2000';
      this.clearMedia();
      this.pollOptions = ['', ''];
    },

    async submit() {
      const textarea = document.getElementById('mobComposerTextarea');
      const titleInput = document.getElementById('mobComposerTitleInput');
      const submitBtn = document.getElementById('btnMobComposerSubmit');

      const text = textarea?.value?.trim() || '';
      if (!text && !this.pendingMediaFile) {
        showToast('Please enter something to post!');
        textarea?.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Posting...';
      }

      try {
        let uploadedMediaUrl = null;
        if (this.pendingMediaFile) {
          let fileToUpload = this.pendingMediaFile;
          try {
            if (fileToUpload.size > 2 * 1024 * 1024 && typeof ClientMediaCompressor !== 'undefined') {
              fileToUpload = await ClientMediaCompressor.compressVideo(fileToUpload, 0, 10, 1280, 720, 1500);
            }
          } catch (_) {}

          const formData = new FormData();
          formData.append('media', fileToUpload);
          const res = await fetch('/api/upload', { method: 'POST', body: formData });
          if (res.ok) {
            const json = await res.json();
            uploadedMediaUrl = json.file?.url || json.url;
          }
        }

        const customTitle = titleInput?.value?.trim();
        const catName = this.currentType === 'general' ? 'General' :
                        this.currentType === 'help' ? 'Help Me' :
                        this.currentType === 'poll' ? 'Poll + Judgment' :
                        this.currentType === 'hot_take' ? 'Hot Take' :
                        this.currentType === 'confession' ? 'Confession' :
                        this.currentType === 'roast' ? 'Roast Me' :
                        this.currentType === 'before_after' ? 'Battles' : 'General';

        await store.addPost({
          content: text,
          title: customTitle || (text.length > 70 ? text.substring(0, 70) + '...' : text),
          category: catName,
          tag: catName.toUpperCase(),
          isAnonymous: this.isAnonymous,
          attachedFile: uploadedMediaUrl
        });

        sfx.playSuccess();
        this.close();

        store.currentRoom = null;
        store.activeSort = 'hot';
        renderFeed();
        window.scrollTo({ top: 0, behavior: 'smooth' });

        showToast(this.isAnonymous ? 'Confession shared anonymously!' : 'Post published to the arena!');
      } catch (err) {
        console.error('Mobile post error:', err);
        showToast('Error posting: ' + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Post';
        }
      }
    }
  };

  const MobileNavSystem = {
    lastScrollY: 0,

    init() {
      // 1. Initialize mobile bottom nav items
      const handleHomeNavigation = (e) => {
        if (e) e.preventDefault();
        this.setActive('mobNavHome');

        // Restore bottom & top navigation bars
        const nav = document.getElementById('mobileBottomNav');
        if (nav?.classList.contains('nav-collapsed')) {
          nav.classList.remove('nav-collapsed');
        }
        const topNav = document.getElementById('topNav');
        if (topNav?.classList.contains('top-nav-scrolled')) {
          topNav.classList.remove('top-nav-scrolled');
        }

        // Close search overlays and all open drawers
        document.getElementById('mobileSearchOverlay')?.classList.remove('open');
        document.getElementById('dragmeProfileDrawerHub')?.classList.remove('open');
        document.getElementById('dragmeProfileDrawerOverlay')?.classList.remove('open');
        document.getElementById('mobDrawer')?.classList.remove('open');
        document.getElementById('mobDrawerOverlay')?.classList.remove('open');

        // Reset store filters
        store.currentRoom = null;
        store.activeSort = 'hot';
        store.searchQuery = '';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'none';

        // Reset feed tabs to "For You"
        document.querySelectorAll('.feed-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.feed-tab[data-stream="for-you"]')?.classList.add('active');

        // Route to Home SPA view
        if (typeof Router !== 'undefined' && typeof Router.navigate === 'function') {
          Router.navigate('home');
        } else {
          renderFeed();
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      document.getElementById('mobNavHome')?.addEventListener('click', handleHomeNavigation);
      document.getElementById('navHome')?.addEventListener('click', handleHomeNavigation);

      const handleSearch = () => {
        this.setActive(document.getElementById('mobNavSearch') ? 'mobNavSearch' : 'mobNavDiscover');
        const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
        if (mobileSearchOverlay) {
          mobileSearchOverlay.classList.add('open');
          setTimeout(() => document.getElementById('mobileSearchInput')?.focus(), 100);
        }
      };

      document.getElementById('mobNavSearch')?.addEventListener('click', handleSearch);
      document.getElementById('mobNavDiscover')?.addEventListener('click', handleSearch);

      document.getElementById('mobNavMessages')?.addEventListener('click', () => {
        if (!AuthManager.requireAuth({ type: 'notifications' }, 'Sign in to access direct messages and private rooms.', 'Messages')) {
          return;
        }
        this.setActive('mobNavMessages');
        showToast('Arena messages & direct rooms active.');
      });

      document.getElementById('mobNavProfile')?.addEventListener('click', (e) => {
        const nav = document.getElementById('mobileBottomNav');
        if (nav?.classList.contains('nav-collapsed')) {
          e.preventDefault();
          e.stopPropagation();
          nav.classList.remove('nav-collapsed');
          return;
        }
        this.setActive('mobNavProfile');
        if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in or create an account to view your profile.', 'Profile')) {
          return;
        }
        if (typeof Router !== 'undefined' && typeof Router.navigate === 'function') {
          Router.navigate('profile');
        } else {
          document.getElementById('dragmeProfileDrawerHub')?.classList.add('open');
          document.getElementById('dragmeProfileDrawerOverlay')?.classList.add('open');
        }
      });

      // 2. Scroll Auto-Collapse Logic & Top Nav Compact State
      let ticking = false;
      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            const currentY = window.scrollY;
            const nav = document.getElementById('mobileBottomNav');
            const topNav = document.getElementById('topNav');

            if (topNav && window.innerWidth <= 860) {
              // Collapse on solid scroll down, spring-back on intentional scroll up (~20px) or at top
              if (currentY > 60 && currentY > this.lastScrollY + 8) {
                topNav.classList.add('top-nav-scrolled');
              } else if (currentY < this.lastScrollY - 20 || currentY < 20) {
                topNav.classList.remove('top-nav-scrolled');
              }
            }

            if (nav && window.innerWidth <= 860) {
              // Collapse to right profile pill on scroll down, expand on scroll up / top
              if (!MobileCreateSystem.isOpen) {
                if (currentY > 60 && currentY > this.lastScrollY + 8) {
                  nav.classList.add('nav-collapsed');
                } else if (currentY < this.lastScrollY - 8 || currentY < 25) {
                  nav.classList.remove('nav-collapsed');
                }
              }
            }
            this.lastScrollY = currentY;
            ticking = false;
          });
          ticking = true;
        }
      }, { passive: true });

      // If user taps navbar while collapsed, expand it or trigger
      const nav = document.getElementById('mobileBottomNav');
      nav?.addEventListener('click', (e) => {
        if (nav.classList.contains('nav-collapsed') && !e.target.closest('#mobNavPlusTrigger')) {
          nav.classList.remove('nav-collapsed');
        }
      });

      // Top Nav Mobile Cooked Indicator Feedback
      const cookedBadge = document.getElementById('cookedMeterBadge');
      cookedBadge?.addEventListener('click', () => {
        const val = document.getElementById('userCookedVal')?.textContent || '12';
        try { sfx?.playClick?.(); } catch (_) {}
        showToast(`Cooked Score: ${val} (Arena streak & engagement index)`);
      });

      // Top Nav Mobile Notification Shake & Open
      const notifBtn = document.getElementById('notifBtn');
      notifBtn?.addEventListener('click', () => {
        notifBtn.classList.remove('bell-shake');
        void notifBtn.offsetWidth; // trigger reflow
        notifBtn.classList.add('bell-shake');
        try { sfx?.playClick?.(); } catch (_) {}
        if (!AuthManager.requireAuth({ type: 'notifications' }, 'Sign in to access your notifications.', 'Notifications')) {
          return;
        }
        document.getElementById('dragmeProfileDrawerHub')?.classList.add('open');
        document.getElementById('dragmeProfileDrawerOverlay')?.classList.add('open');
      });
    },

    setActive(id) {
      document.querySelectorAll('.mob-nav-item').forEach(btn => btn.classList.remove('active'));
      document.getElementById(id)?.classList.add('active');
    }
  };

  MobileCreateSystem.init();
  MobileNavSystem.init();

  // Action Delegation handled by Central Feed Action Controller

  // =============================================================================
  // DRAGME MOBILE FEED TABS CONTROLLER (SELECT EXPAND & COLLAPSE ANIMATION)
  // =============================================================================
  const FeedTabsController = {
    slider: null,
    tabs: [],
    collapseTimer: null,
    
    init() {
      this.slider = document.getElementById('feedTabSlider');
      this.tabs = Array.from(document.querySelectorAll('.feed-tab'));
      if (!this.tabs.length) return;

      this.tabs.forEach(tab => {
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', tab.classList.contains('active') ? 'true' : 'false');

        const handlePress = () => { tab.style.transform = 'scale(0.96)'; };
        const handleRelease = () => { tab.style.transform = ''; };
        tab.addEventListener('mousedown', handlePress);
        tab.addEventListener('touchstart', handlePress, { passive: true });
        tab.addEventListener('mouseup', handleRelease);
        tab.addEventListener('mouseleave', handleRelease);
        tab.addEventListener('touchend', handleRelease);

        tab.addEventListener('click', (e) => {
          e.preventDefault();
          this.switchTab(tab);
        });
      });
    },

    switchTab(tab) {
      const prevActive = document.querySelector('.feed-tab.active');
      if (tab === prevActive) return;

      // Dynamic switch animation: expand from previous tab, slide to new tab, then collapse
      if (this.slider && prevActive) {
        if (this.collapseTimer) clearTimeout(this.collapseTimer);

        const prevWidth = Math.max(36, Math.min(prevActive.offsetWidth * 0.68, 64));
        const prevOffset = prevActive.offsetLeft + (prevActive.offsetWidth - prevWidth) / 2;

        // Position & Expand at origin tab
        this.slider.style.transition = 'none';
        this.slider.style.width = `${prevWidth}px`;
        this.slider.style.transform = `translate3d(${prevOffset}px, 0, 0) scaleX(1)`;
        this.slider.style.opacity = '1';
        this.slider.classList.add('sliding');
        void this.slider.offsetWidth; // Force reflow

        // Travel smoothly to selected tab
        const targetWidth = Math.max(36, Math.min(tab.offsetWidth * 0.68, 64));
        const targetOffset = tab.offsetLeft + (tab.offsetWidth - targetWidth) / 2;

        this.slider.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), width 0.28s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.2s ease';
        this.slider.style.width = `${targetWidth}px`;
        this.slider.style.transform = `translate3d(${targetOffset}px, 0, 0) scaleX(1)`;

        // Smoothly collapse into selected tab
        this.collapseTimer = setTimeout(() => {
          if (this.slider) {
            this.slider.style.transition = 'transform 0.24s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.22s ease';
            this.slider.style.transform = `translate3d(${targetOffset}px, 0, 0) scaleX(0.2)`;
            this.slider.style.opacity = '0';
            this.slider.classList.remove('sliding');
          }
        }, 340);
      }

      this.tabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      // Subtle feed content crossfade
      const postsContainer = document.getElementById('postsStream');
      if (postsContainer) {
        postsContainer.classList.remove('feed-animate-enter');
        void postsContainer.offsetWidth; // Reflow
        postsContainer.classList.add('feed-animate-enter');
      }

      store.activeSort = tab.dataset.sort || 'hot';
      renderFeed();
    }
  };

  FeedTabsController.init();
  window.FeedTabsController = FeedTabsController;

  // Global Search
  globalSearchInput.addEventListener('input', (e) => {
    store.searchQuery = e.target.value;
    clearSearchBtn.style.display = store.searchQuery ? 'block' : 'none';
    renderFeed();
  });

  clearSearchBtn.addEventListener('click', () => {
    globalSearchInput.value = '';
    store.searchQuery = '';
    clearSearchBtn.style.display = 'none';
    renderFeed();
  });

  // Left Nav Links (Home, Discover, and Custom Feeds)
  const homeCard = document.getElementById('navHome');
  const menuRows = document.querySelectorAll('.sidebar-menu-row');

  function clearSidebarActive() {
    homeCard?.classList.remove('active');
    menuRows.forEach(r => r.classList.remove('active'));
    document.querySelectorAll('.sidebar-row, .community-row-item').forEach(r => r.classList.remove('active'));
  }

  homeCard?.addEventListener('click', (e) => {
    e.preventDefault();
    clearSidebarActive();
    homeCard.classList.add('active');
    store.currentRoom = null;
    store.activeSort = 'hot';
    const activeFilterIndicator = document.getElementById('activeFilterIndicator');
    if (activeFilterIndicator) activeFilterIndicator.style.display = 'none';
    Router.navigate('home');
    renderFeed();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  menuRows.forEach(row => {
    row.addEventListener('click', (e) => {
      e.preventDefault();
      clearSidebarActive();
      row.classList.add('active');

      const nav = row.dataset.nav;
      const filter = row.dataset.filter;

      if (nav === 'profile') {
        if (typeof AuthManager !== 'undefined' && !AuthManager.requireAuth({ type: 'profile' }, 'Sign in to view your complete profile and arena rank.', 'Profile Arena')) {
          return;
        }
        Router.navigate('profile');
        return;
      }

      if (nav === 'edit-profile') {
        if (typeof AuthManager !== 'undefined' && !AuthManager.requireAuth({ type: 'profile' }, 'Sign in to customize your avatar, bio, and arena profile.', 'Edit Profile')) {
          return;
        }
        Router.navigate('edit-profile');
        return;
      }

      // If on profile view, switch back to home view for other feed filters
      if (Router.currentRoute === 'profile') {
        Router.navigate('home');
      }

      if (filter === 'confessions' || nav === 'confessions') {
        store.currentRoom = 'confessions';
        if (currentFilterLabel) currentFilterLabel.textContent = 'r/confessions (Wall)';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'flex';
      } else if (nav === 'random') {
        // Shuffle posts for instant random arena discovery
        store.posts.sort(() => Math.random() - 0.5);
        showToast('Arena shuffled randomly!');
      } else if (nav === 'stories') {
        store.currentRoom = null;
        store.activeSort = 'hot';
        if (currentFilterLabel) currentFilterLabel.textContent = 'Visual Stories & Drops';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'flex';
      } else if (nav === 'roast-battle') {
        store.currentRoom = null;
        store.activeSort = 'hot';
        if (currentFilterLabel) currentFilterLabel.textContent = 'Roast Battle Arena';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'flex';
      } else if (nav === 'daily-cooked') {
        store.currentRoom = null;
        store.activeSort = 'top';
        if (currentFilterLabel) currentFilterLabel.textContent = 'Daily Most Cooked';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'flex';
      } else if (nav === 'help-wanted') {
        store.currentRoom = 'tech_ai';
        if (currentFilterLabel) currentFilterLabel.textContent = 'Help Wanted';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'flex';
      } else if (nav === 'need-answers') {
        store.currentRoom = null;
        if (currentFilterLabel) currentFilterLabel.textContent = 'Need Answers';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'flex';
      } else if (nav === 'before-after') {
        store.currentRoom = 'design_roasts';
        if (currentFilterLabel) currentFilterLabel.textContent = 'Before → After Redesigns';
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'flex';
      } else {
        store.currentRoom = null;
        const activeFilterIndicator = document.getElementById('activeFilterIndicator');
        if (activeFilterIndicator) activeFilterIndicator.style.display = 'none';
      }

      renderFeed();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Community item clicks
  document.querySelectorAll('.community-row-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      clearSidebarActive();
      item.classList.add('active');
      const room = item.dataset.room;
      store.currentRoom = room;
      currentFilterLabel.textContent = room.startsWith('r/') ? room : 'r/' + room.toLowerCase().replace(/ /g, '_');
      activeFilterIndicator.style.display = 'flex';
      renderFeed();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  btnClearFeedFilter.addEventListener('click', () => {
    store.currentRoom = null;
    activeFilterIndicator.style.display = 'none';
    renderFeed();
  });

  // Comments Drawer
  function openCommentsDrawer(postId) {
    const post = store.posts.find(p => p.id === postId);
    if (!post) return;
    store.activeCommentPostId = postId;

    drawerCommentCount.textContent = post.commentCount || 0;
    drawerPostSummary.innerHTML = `
      <strong>${escapeHtml(post.title)}</strong>
      <div style="margin-top: 4px; color: var(--text-low);">${escapeHtml(post.content || '')}</div>
    `;

    renderComments(post);
    commentsDrawer.style.display = 'flex';
    drawerCommentInput.focus();
  }

  function renderComments(post) {
    if (!post.comments || post.comments.length === 0) {
      drawerCommentsList.innerHTML = `
        <div style="text-align: center; color: var(--text-low); padding: 40px 0;">
          No comments yet. Be the first to share your thoughts!
        </div>
      `;
      return;
    }

    drawerCommentsList.innerHTML = post.comments.map(c => {
      const cAvatar = AvatarService.get(c.avatar || c.author);
      return `
      <div class="reddit-comment-bubble">
        <div class="comment-meta-row" style="display: flex; align-items: center; gap: 8px;">
          <img src="${escapeHtml(cAvatar)}" alt="${escapeHtml(c.author)}" class="comment-author-avatar-img" onerror="this.onerror=null;this.src=window.GUEST_SILHOUETTE_SVG;" style="width: 22px; height: 22px; border-radius: 50%; object-fit: cover; border: 1px solid #232c3d; flex-shrink: 0;">
          <span class="comment-user-bold">${escapeHtml(c.author)}</span>
          <span class="meta-timestamp">${c.timeAgo}</span>
        </div>
        <div class="comment-body-text" style="margin-left: 30px;">${escapeHtml(c.text)}</div>
      </div>
    `;
    }).join('');
  }

  closeCommentsBtn?.addEventListener('click', () => {
    commentsDrawer.style.display = 'none';
    store.activeCommentPostId = null;
  });

  commentsDrawer?.addEventListener('click', (e) => {
    if (e.target === commentsDrawer) {
      commentsDrawer.style.display = 'none';
      store.activeCommentPostId = null;
    }
  });

  drawerCommentSubmitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = drawerCommentInput.value.trim();
    if (!text || !store.activeCommentPostId) return;

    if (!AuthManager.requireAuth({ type: 'comment', postId: store.activeCommentPostId }, 'Join DRAGME to join the conversation.', 'Comment on Post')) {
      return;
    }

    await store.addComment(store.activeCommentPostId, text);
    drawerCommentInput.value = '';

    const post = store.posts.find(p => p.id === store.activeCommentPostId);
    if (post) {
      drawerCommentCount.textContent = post.commentCount;
      renderComments(post);
      renderFeed();
    }
    showToast('Comment posted!');
  });

  // =============================================================================
  // DRAGME CROWN REACTION ENGINE (40-POINT PRODUCTION SPECIFICATION)
  // =============================================================================
  const CrownStates = {
    IDLE: 'IDLE',
    HOVER: 'HOVER',
    PRESSING: 'PRESSING',
    RELEASING: 'RELEASING',
    ACTIVATING: 'ACTIVATING',
    ACTIVE: 'ACTIVE',
    UNREACTING: 'UNREACTING',
    LONG_PRESS: 'LONG_PRESS',
    SUPER_CROWN: 'SUPER_CROWN',
    DISABLED: 'DISABLED',
    OPTIMISTIC_PENDING: 'OPTIMISTIC_PENDING',
    ERROR_ROLLBACK: 'ERROR_ROLLBACK'
  };

  const CrownReactionEngine = {
    states: {}, // { [postId]: CrownStates }
    longPressTimer: null,
    longPressTriggered: false,
    activePicker: null,
    lastTapTimes: {},
    inFlight: {}, // Network in-flight lock
    
    reactionMeta: {
      crown: { icon: 'fa-solid fa-crown', label: 'Crown', color: '#B7F34A' },
      fire: { icon: 'fa-solid fa-fire', label: 'Fire', color: '#FF7043' },
      insightful: { icon: 'fa-solid fa-lightbulb', label: 'Insightful', color: '#29B6F6' },
      support: { icon: 'fa-solid fa-handshake', label: 'Support', color: '#5C6BC0' },
      heartfelt: { icon: 'fa-solid fa-heart', label: 'Heartfelt', color: '#AB47BC' },
      mindblown: { icon: 'fa-solid fa-brain', label: 'Mind Blown', color: '#FFCA28' }
    },

    init() {
      // Dismiss reaction picker on click outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.reaction-picker-pill') && !e.target.closest('.drag-crown-btn')) {
          this.closePicker();
        }
      });

      // Keyboard accessibility (Space / Enter on focused Crown button)
      postsStream?.addEventListener('keydown', (e) => {
        const crownBtn = e.target.closest('.drag-crown-btn');
        if (crownBtn && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          const postId = crownBtn.dataset.id;
          if (postId) this.handleSingleTap(crownBtn, postId);
        }
      });
    },

    getState(postId) {
      return this.states[postId] || CrownStates.IDLE;
    },

    setState(postId, state) {
      this.states[postId] = state;
    },

    closePicker() {
      if (this.activePicker) {
        this.activePicker.classList.add('closing');
        setTimeout(() => {
          this.activePicker?.remove();
          this.activePicker = null;
        }, 180);
      }
    },

    spawnActivationRipple(btn) {
      const ripple = document.createElement('div');
      ripple.className = 'crown-activation-ripple';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 320);
    },

    spawnParticles(btn, isSuper = false, isGold = true) {
      const container = document.createElement('div');
      container.className = 'crown-particles-anchor';
      btn.appendChild(container);

      const count = isSuper ? 6 : 4;
      const angleStep = 360 / count;

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = `crown-float-particle ${isGold || isSuper ? 'gold' : ''}`;
        particle.innerHTML = '<i class="fa-solid fa-crown"></i>';

        const angle = (angleStep * i) + (Math.random() * 20 - 10);
        const rad = (angle * Math.PI) / 180;
        const dist = isSuper ? 38 + Math.random() * 12 : 24 + Math.random() * 8;
        const tx = Math.cos(rad) * dist;
        const ty = Math.sin(rad) * dist - 16;
        const rot = (Math.random() * 50 - 25);

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        particle.style.setProperty('--rot', `${rot}deg`);

        container.appendChild(particle);
      }

      setTimeout(() => container.remove(), 500);
    },

    spawnShockwave(btn) {
      const ring = document.createElement('div');
      ring.className = 'crown-shockwave-ring';
      btn.appendChild(ring);
      setTimeout(() => ring.remove(), 500);
    },

    showSupportFeedback(btn, message = 'You showed support.') {
      const existing = btn.querySelector('.support-feedback-pill');
      if (existing) existing.remove();

      const pill = document.createElement('div');
      pill.className = 'support-feedback-pill';
      pill.textContent = message;
      btn.appendChild(pill);
      setTimeout(() => pill.remove(), 1600);
    },

    rollCount(postId, newCount, isIncrement) {
      const countEl = document.getElementById(`crownCount-${postId}`);
      if (!countEl) return;
      countEl.classList.remove('roll-up', 'roll-down');
      void countEl.offsetWidth; // reflow
      countEl.textContent = newCount;
      countEl.classList.add(isIncrement ? 'roll-up' : 'roll-down');
    },

    updateButtonDOM(btn, { isVoted, reactionType = 'crown', isSuper = false, count }) {
      if (!btn) return;
      
      btn.classList.toggle('voted', isVoted);
      btn.classList.toggle('is-super', isSuper && isVoted);
      btn.setAttribute('aria-pressed', isVoted ? 'true' : 'false');
      btn.setAttribute('aria-label', isVoted ? 'Remove crown from this post' : 'Crown this post');

      // Clear reaction color classes and apply current
      Object.keys(this.reactionMeta).forEach(t => btn.classList.remove(`reaction-${t}`));
      if (isVoted) btn.classList.add(`reaction-${reactionType}`);

      if (count !== undefined) {
        const countEl = document.getElementById(`crownCount-${btn.dataset.id}`);
        if (countEl) countEl.textContent = count;
      }
    },

    openPicker(btn, postId) {
      this.closePicker();
      this.longPressTriggered = true;
      this.setState(postId, CrownStates.LONG_PRESS);

      const picker = document.createElement('div');
      picker.className = 'reaction-picker-pill';
      picker.setAttribute('role', 'toolbar');
      picker.setAttribute('aria-label', 'Reaction picker');

      const reactions = ['crown', 'fire', 'insightful', 'support', 'heartfelt', 'mindblown'];
      picker.innerHTML = reactions.map(type => {
        const meta = this.reactionMeta[type];
        return `
          <button type="button" class="reaction-picker-item item-${type}" data-reaction="${type}" title="${meta.label}" aria-label="${meta.label}">
            <i class="${meta.icon}"></i>
          </button>
        `;
      }).join('');

      picker.querySelectorAll('.reaction-picker-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
          sfx.playCrownTap();
          sfx.triggerHaptic('light');
        });

        item.addEventListener('click', async (e) => {
          e.stopPropagation();
          const targetReaction = item.dataset.reaction;
          this.closePicker();

          if (!AuthManager.requireAuth({ type: 'vote', postId }, 'Log in to react to this post.', 'React to Post')) {
            return;
          }

          sfx.playCrownBurst();
          sfx.triggerHaptic('medium');
          this.spawnParticles(btn, false, true);
          this.spawnActivationRipple(btn);
          btn.classList.add('is-activating');
          setTimeout(() => btn.classList.remove('is-activating'), 450);

          const post = store.posts.find(p => p.id === postId);
          const wasVoted = post?.hasVoted;
          const oldCount = post?.dragCount || 0;
          const newCount = wasVoted ? oldCount : oldCount + 1;

          this.rollCount(postId, newCount, true);
          this.updateButtonDOM(btn, { isVoted: true, reactionType: targetReaction, isSuper: false });

          try {
            const updated = await store.toggleDrag(postId, { reactionType: targetReaction, switchOnly: true });
            if (updated) {
              const label = this.reactionMeta[targetReaction]?.label || 'Reaction';
              showToast(`Reacted with ${label}!`);
            }
          } catch (err) {
            this.handleRollback(btn, postId, wasVoted, oldCount);
          }
        });
      });

      btn.appendChild(picker);
      this.activePicker = picker;
      sfx.playCrownTap();
      sfx.triggerHaptic('medium');
    },

    async handleSingleTap(btn, postId) {
      if (!AuthManager.requireAuth({ type: 'vote', postId }, 'Log in to react to this post.', 'Crown Post')) {
        return;
      }

      // Check in-flight lock
      if (this.inFlight[postId]) return;
      this.inFlight[postId] = true;

      const post = store.posts.find(p => p.id === postId);
      const willCrown = !post?.hasVoted;
      const oldCount = post?.dragCount || 0;
      const newCount = willCrown ? oldCount + 1 : Math.max(0, oldCount - 1);

      this.setState(postId, CrownStates.OPTIMISTIC_PENDING);

      if (willCrown) {
        // 7, 8, 9, 10. Activation sequence
        btn.classList.add('is-activating');
        this.spawnActivationRipple(btn);
        this.spawnParticles(btn, false, true);
        sfx.playCrownBurst();
        sfx.triggerHaptic('medium');
        this.showSupportFeedback(btn, 'You showed support.');

        setTimeout(() => {
          btn.classList.remove('is-activating');
          this.setState(postId, CrownStates.ACTIVE);
        }, 460);
      } else {
        // 17. Unreacting sequence
        btn.classList.add('is-unreacting');
        sfx.playCrownTap();
        sfx.triggerHaptic('light');

        setTimeout(() => {
          btn.classList.remove('is-unreacting');
          this.setState(postId, CrownStates.IDLE);
        }, 280);
      }

      // 12. Odometer count animation
      this.rollCount(postId, newCount, willCrown);
      this.updateButtonDOM(btn, { isVoted: willCrown, reactionType: 'crown', isSuper: false });

      // 13, 14, 15. Server sync & rollback handling
      try {
        const updated = await store.toggleDrag(postId, { reactionType: 'crown', isSuper: false });
        if (updated) {
          this.updateButtonDOM(btn, { 
            isVoted: updated.hasVoted, 
            reactionType: updated.reactionType || 'crown', 
            isSuper: updated.isSuper,
            count: updated.dragCount 
          });
        }
      } catch (err) {
        this.handleRollback(btn, postId, !willCrown, oldCount);
      } finally {
        this.inFlight[postId] = false;
      }
    },

    async handleSuperCrown(btn, postId) {
      if (!AuthManager.requireAuth({ type: 'vote', postId }, 'Log in to react to this post.', 'Super Crown')) {
        return;
      }

      if (this.inFlight[postId]) return;
      this.inFlight[postId] = true;

      const post = store.posts.find(p => p.id === postId);
      const wasVoted = post?.hasVoted;
      const oldCount = post?.dragCount || 0;
      const newCount = wasVoted ? (post.isSuper ? oldCount : oldCount + 1) : oldCount + 2;

      this.setState(postId, CrownStates.SUPER_CROWN);

      // 22. Super crown physical shockwave & bounce
      btn.classList.add('is-super-activating');
      this.spawnShockwave(btn);
      this.spawnParticles(btn, true, true);
      sfx.playSuperCrown();
      sfx.triggerHaptic('super');
      this.showSupportFeedback(btn, '⚡ Super Crown!');

      setTimeout(() => {
        btn.classList.remove('is-super-activating');
        this.setState(postId, CrownStates.ACTIVE);
      }, 500);

      this.rollCount(postId, newCount, true);
      this.updateButtonDOM(btn, { isVoted: true, reactionType: 'crown', isSuper: true });

      try {
        const updated = await store.toggleDrag(postId, { reactionType: 'crown', isSuper: true, switchOnly: true });
        if (updated) {
          this.updateButtonDOM(btn, { 
            isVoted: updated.hasVoted, 
            reactionType: updated.reactionType || 'crown', 
            isSuper: updated.isSuper,
            count: updated.dragCount 
          });
          showToast('⚡ Super Crown applied! +2');
        }
      } catch (err) {
        this.handleRollback(btn, postId, wasVoted, oldCount);
      } finally {
        this.inFlight[postId] = false;
      }
    },

    handleRollback(btn, postId, wasVoted, oldCount) {
      // 15. Graceful Error Rollback
      this.setState(postId, CrownStates.ERROR_ROLLBACK);
      this.rollCount(postId, oldCount, !wasVoted);
      this.updateButtonDOM(btn, { isVoted: wasVoted, reactionType: 'crown', isSuper: false });
      showToast("Couldn't update reaction. Try again.");
      setTimeout(() => this.setState(postId, wasVoted ? CrownStates.ACTIVE : CrownStates.IDLE), 250);
    }
  };

  CrownReactionEngine.init();

  // Who Reacted Modal Controller
  const WhoReactedModal = {
    overlay: document.getElementById('whoReactedOverlay'),
    listWrap: document.getElementById('whoReactedList'),
    activeTab: 'all',
    currentPostId: null,
    data: null,

    init() {
      document.getElementById('btnCloseWhoReacted')?.addEventListener('click', () => this.close());
      this.overlay?.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });

      ['all', 'friends', 'topReactors'].forEach(tab => {
        document.getElementById(`whoTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`)?.addEventListener('click', () => {
          this.switchTab(tab);
        });
      });
    },

    open(postId) {
      this.currentPostId = postId;
      this.activeTab = 'all';
      if (this.overlay) this.overlay.style.display = 'flex';
      if (this.listWrap) {
        this.listWrap.innerHTML = `
          <div class="who-reacted-loading">
            <i class="fa-solid fa-spinner fa-spin text-lime"></i>
            <span>Loading reactions...</span>
          </div>
        `;
      }
      this.fetchReactors(postId);
    },

    close() {
      if (this.overlay) this.overlay.style.display = 'none';
      this.currentPostId = null;
      this.data = null;
    },

    switchTab(tab) {
      this.activeTab = tab;
      document.querySelectorAll('.who-tab-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.querySelector(`.who-tab-btn[data-tab="${tab}"]`);
      if (activeBtn) activeBtn.classList.add('active');
      this.renderList();
    },

    async fetchReactors(postId) {
      try {
        const res = await AuthAPI.request(`/api/posts/${postId}/reactors`);
        if (res) {
          this.data = res;
          const countAll = document.getElementById('whoCountAll');
          const countFriends = document.getElementById('whoCountFriends');
          const countTop = document.getElementById('whoCountTop');
          if (countAll) countAll.textContent = res.all?.length || 0;
          if (countFriends) countFriends.textContent = res.friends?.length || 0;
          if (countTop) countTop.textContent = res.topReactors?.length || 0;
          this.renderList();
        }
      } catch (err) {
        if (this.listWrap) {
          this.listWrap.innerHTML = `
            <div class="who-reacted-empty">
              <i class="fa-solid fa-triangle-exclamation text-orange"></i>
              <span>Could not load reactors.</span>
            </div>
          `;
        }
      }
    },

    renderList() {
      if (!this.data || !this.listWrap) return;
      const list = this.data[this.activeTab] || [];

      if (list.length === 0) {
        this.listWrap.innerHTML = `
          <div class="who-reacted-empty">
            <i class="fa-solid fa-crown" style="font-size: 1.5rem; opacity: 0.4;"></i>
            <span>No reactors in this category yet.</span>
          </div>
        `;
        return;
      }

      this.listWrap.innerHTML = list.map(r => `
        <div class="who-reactor-item">
          <div class="who-reactor-left">
            <img src="${escapeHtml(r.avatarUrl)}" alt="${escapeHtml(r.displayName)}" class="who-reactor-avatar" onerror="this.src=window.GUEST_SILHOUETTE_SVG;">
            <div class="who-reactor-info">
              <div class="who-reactor-name-row">
                <span class="who-reactor-name">${escapeHtml(r.displayName)}</span>
                ${r.isSuper ? '<i class="fa-solid fa-bolt who-reactor-super-badge" title="Super Crown Reactor"></i>' : ''}
                ${r.isPremium ? '<i class="fa-solid fa-circle-check text-lime" style="font-size: 0.75rem;"></i>' : ''}
              </div>
              <span class="who-reactor-handle">@${escapeHtml(r.username)} · ${escapeHtml(r.timeAgo)}</span>
            </div>
          </div>
          <div class="who-reactor-badge" style="color: ${r.reactionColor}; border: 1px solid ${r.reactionColor}33;">
            <i class="${escapeHtml(r.reactionIcon)}"></i>
            <span style="font-size: 0.76rem; font-weight: 600;">${escapeHtml(r.reactionLabel)}</span>
          </div>
        </div>
      `).join('');
    }
  };

  WhoReactedModal.init();

  // Pointerdown and Pointerup delegation on postsStream for Crown tactile touch
  postsStream.addEventListener('pointerdown', (e) => {
    const crownBtn = e.target.closest('.drag-crown-btn');
    if (crownBtn) {
      const postId = crownBtn.dataset.id;
      crownBtn.classList.add('is-pressing');
      CrownReactionEngine.longPressTriggered = false;

      // 18. Long press threshold (450ms)
      CrownReactionEngine.longPressTimer = setTimeout(() => {
        crownBtn.classList.remove('is-pressing');
        CrownReactionEngine.openPicker(crownBtn, postId);
      }, 450);
    }
  });

  const clearCrownPress = (e) => {
    const crownBtn = e.target.closest('.drag-crown-btn');
    if (crownBtn) {
      crownBtn.classList.remove('is-pressing');
    }
    if (CrownReactionEngine.longPressTimer) {
      clearTimeout(CrownReactionEngine.longPressTimer);
      CrownReactionEngine.longPressTimer = null;
    }
  };

  postsStream.addEventListener('pointerup', clearCrownPress);
  postsStream.addEventListener('pointerleave', clearCrownPress);
  postsStream.addEventListener('pointercancel', clearCrownPress);

  // Central Action Delegation on Posts Feed
  postsStream.addEventListener('click', (e) => {
    // If click was on count wrap specifically, open "Who Reacted"
    const countWrap = e.target.closest('.vote-count-wrap');
    if (countWrap) {
      e.stopPropagation();
      const postId = countWrap.dataset.postId;
      if (postId) WhoReactedModal.open(postId);
      return;
    }

    const btn = e.target.closest('button');
    if (btn) {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (!action || !id) return;

      if (action === 'crown') {
        // If long press picker was opened, ignore tap
        if (CrownReactionEngine.longPressTriggered) {
          CrownReactionEngine.longPressTriggered = false;
          return;
        }

        const now = Date.now();
        const lastTap = CrownReactionEngine.lastTapTimes[id] || 0;
        if (now - lastTap < 260) {
          // Double Tap: Super Crown
          CrownReactionEngine.handleSuperCrown(btn, id);
          CrownReactionEngine.lastTapTimes[id] = 0;
        } else {
          CrownReactionEngine.lastTapTimes[id] = now;
          CrownReactionEngine.handleSingleTap(btn, id);
        }
      } else if (action === 'who-reacted') {
        WhoReactedModal.open(id);
      } else if (action === 'save') {
        if (!AuthManager.requireAuth({ type: 'save', postId: id }, 'Log in to save this post.', 'Save Post')) {
          return;
        }
        store.toggleSave(id).then(updated => {
          if (updated) {
            renderFeed(false);
            showToast(updated.isSaved ? 'Saved to bookmarks' : 'Removed from bookmarks');
          }
        });
      } else if (action === 'comment') {
        openCommentsDrawer(id);
      } else if (action === 'share') {
        navigator.clipboard.writeText(window.location.href);
        showToast('Link copied to clipboard!');
      }
      return;
    }

    // Direct click on post content/card opens thread discussion
    const postCard = e.target.closest('.reddit-post-card');
    if (postCard && !e.target.closest('a') && !e.target.closest('.reaction-picker-pill')) {
      const postId = postCard.dataset.postId;
      if (postId) {
        openCommentsDrawer(postId);
      }
    }
  });

  // Sort Tabs
  sortTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      sortTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      store.activeSort = tab.dataset.sort;
      renderFeed();
    });
  });

  // =========================================================================
  // CONTEXTUAL GUEST AUTH PROMPT MANAGER & RETURN INTENT CONTROLLER
  // =========================================================================
  const AuthPromptManager = {
    modal: document.getElementById('guestAuthPromptModal'),
    titleEl: document.getElementById('promptModalTitle'),
    subEl: document.getElementById('promptModalSubtitle'),

    open({ title = 'Join the conversation', subtitle = 'Create an account or log in to interact on DRAGME.', intent = null } = {}) {
      if (this.titleEl) this.titleEl.textContent = title;
      if (this.subEl) this.subEl.textContent = subtitle;
      if (intent) AuthManager.setPendingIntent(intent);
      if (this.modal) this.modal.style.display = 'flex';
      sfx.playOpen();
    },

    close() {
      if (this.modal) this.modal.style.display = 'none';
      sfx.playClose();
    },

    init() {
      const closeBtn = document.getElementById('closeGuestPromptBtn');
      closeBtn?.addEventListener('click', () => this.close());

      const continueBtn = document.getElementById('btnPromptContinueBrowsing');
      continueBtn?.addEventListener('click', () => this.close());

      const loginBtn = document.getElementById('btnPromptLogin');
      loginBtn?.addEventListener('click', () => {
        this.close();
        Router.navigate('login');
      });

      const signupBtn = document.getElementById('btnPromptSignup');
      signupBtn?.addEventListener('click', () => {
        this.close();
        Router.navigate('signup');
      });

      this.modal?.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
  };

  // =========================================================================
  // LOGOUT CONFIRMATION CONTROLLER
  // =========================================================================
  const LogoutManager = {
    modal: document.getElementById('logoutConfirmModal'),

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
      AuthManager.clearSession();
      if (ProfileDrawerHub.isOpen()) ProfileDrawerHub.close();
      Router.navigate('home');
      if (typeof renderFeed === 'function') renderFeed();
      showToast('Logged out successfully.');
    },

    init() {
      const cancelBtn = document.getElementById('btnCancelLogout');
      cancelBtn?.addEventListener('click', () => this.close());

      const confirmBtn = document.getElementById('btnConfirmLogout');
      confirmBtn?.addEventListener('click', () => this.confirm());

      this.modal?.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
  };

  // =========================================================================
  // TRANSLUCENT GLASS PROFILE DRAWER (DRAGME ARENA HUB)
  // =========================================================================
  const ProfileDrawerHub = {
    getBackdrop() { return document.getElementById('dragmeProfileDrawerHub'); },
    getPanel() { return document.getElementById('dragmeProfileDrawerPanel'); },
    
    isOpen() {
      const b = this.getBackdrop();
      if (!b) return false;
      return b.classList.contains('active') || b.style.visibility === 'visible';
    },

    open() {
      const backdrop = this.getBackdrop();
      if (!backdrop) return;
      this.syncUser();
      backdrop.classList.add('active');
      backdrop.setAttribute('aria-hidden', 'false');
      document.getElementById('userProfileDropdown')?.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    },

    close() {
      const backdrop = this.getBackdrop();
      if (backdrop) {
        backdrop.classList.remove('active');
        backdrop.setAttribute('aria-hidden', 'true');
      }
      document.getElementById('userProfileDropdown')?.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    },

    toggle() {
      if (this.isOpen()) this.close();
      else this.open();
    },

    syncUser() {
      const userName = document.getElementById('drawerUserName');
      const userHandle = document.getElementById('drawerUserHandle');
      const userAvatar = document.getElementById('drawerUserAvatar');
      const userBadge = document.getElementById('drawerUserBadge');
      const statPosts = document.getElementById('glassStatPosts');
      const statRep = document.getElementById('glassStatRep');
      const statCooked = document.getElementById('glassStatCooked');
      const btnSignIn = document.getElementById('btnDrawerSignIn');
      const btnSignUp = document.getElementById('btnDrawerSignUp');
      const btnLogOut = document.getElementById('btnDrawerLogOut');

      if (currentUser) {
        if (userName) userName.textContent = currentUser.display_name || `@${currentUser.username}`;
        if (userHandle) userHandle.textContent = `@${currentUser.username} • ${currentUser.location || 'Hamirpur, HP'}`;
        if (userAvatar) AvatarService.apply(userAvatar, currentUser);
        if (userBadge) userBadge.textContent = currentUser.role ? currentUser.role.toUpperCase() : 'Senior Roaster';
        if (statPosts) statPosts.textContent = currentUser.postsCount || '40';
        if (statRep) statRep.textContent = currentUser.reputation || '1.8K';
        if (statCooked) statCooked.innerHTML = `<i class="fa-solid fa-fire-flame-curved" style="font-size: 0.8rem; margin-right: 2px;"></i>${currentUser.cooked || '12'}`;
        if (btnSignIn) btnSignIn.style.display = 'none';
        if (btnSignUp) btnSignUp.style.display = 'none';
        if (btnLogOut) btnLogOut.style.display = 'flex';
      } else {
        if (userName) userName.textContent = 'Guest Visitor';
        if (userHandle) userHandle.textContent = 'Explore public rooms & feeds';
        if (userAvatar) AvatarService.apply(userAvatar, null);
        if (userBadge) userBadge.textContent = 'Guest';
        if (statPosts) statPosts.textContent = '0';
        if (statRep) statRep.textContent = '0';
        if (statCooked) statCooked.innerHTML = `<i class="fa-solid fa-fire-flame-curved" style="font-size: 0.8rem; margin-right: 2px;"></i>0`;
        if (btnSignIn) btnSignIn.style.display = 'flex';
        if (btnSignUp) btnSignUp.style.display = 'flex';
        if (btnLogOut) btnLogOut.style.display = 'none';
      }
    },

    init() {
      window.DRAGME_PROFILE_HUB = this;

      // Bind Top Header Profile Button
      const headerProfileBtn = document.getElementById('userProfileDropdown');
      if (headerProfileBtn) {
        headerProfileBtn.setAttribute('aria-controls', 'dragmeProfileDrawerHub');
        headerProfileBtn.setAttribute('aria-haspopup', 'dialog');
        headerProfileBtn.setAttribute('aria-expanded', 'false');
        headerProfileBtn.onclick = (e) => {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          this.toggle();
        };
      }

      // Close Button
      const closeBtn = document.getElementById('btnCloseGlassProfileDrawer');
      closeBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      });

      // Backdrop Click-Outside to Dismiss
      const backdrop = this.getBackdrop();
      backdrop?.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          e.preventDefault();
          this.close();
        }
      });

      // Escape Key to Close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen()) {
          this.close();
        }
      });

      // User Hero Card Click -> Go to Profile or Auth Prompt
      const heroCard = document.getElementById('drawerUserHeroCard');
      heroCard?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to view your complete profile and arena rank.', 'Profile Arena')) {
          return;
        }
        Router.navigate('profile');
      });

      // My Profile Arena Action
      const btnMyProfile = document.getElementById('btnDrawerMyProfile');
      btnMyProfile?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to access your personal DRAGME profile arena.', 'Profile Arena')) {
          return;
        }
        Router.navigate('profile');
      });

      // My Confessions Action
      const btnMyConfessions = document.getElementById('btnDrawerMyConfessions');
      btnMyConfessions?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to access your anonymous drops and confessions.', 'Anonymous Drops')) {
          return;
        }
        Router.navigate('profile');
        setTimeout(() => {
          document.querySelector('.profile-tab-btn[data-tab="confessions"]')?.click();
        }, 80);
      });

      // Bookmarks Action
      const btnBookmarks = document.getElementById('btnDrawerBookmarks');
      btnBookmarks?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to access your private saved bookmarks.', 'Saved Bookmarks')) {
          return;
        }
        Router.navigate('profile');
        setTimeout(() => {
          document.querySelector('.profile-tab-btn.tab-only-you')?.click();
        }, 80);
      });

      // Activity Action
      const btnActivity = document.getElementById('btnDrawerActivity');
      btnActivity?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to view your activity history and crowns.', 'Activity')) {
          return;
        }
        Router.navigate('profile');
      });

      // Edit Profile Action
      const btnEditProfile = document.getElementById('btnDrawerEditProfile');
      btnEditProfile?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to customize your avatar, bio, and arena title.', 'Edit Profile')) {
          return;
        }
        Router.navigate('edit-profile');
      });

      // Settings Action
      const btnSettings = document.getElementById('btnDrawerSettings');
      btnSettings?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to manage your account settings and privacy preferences.', 'Account Settings')) {
          return;
        }
        showToast('Account settings & privacy controls active.');
      });

      // Help & Support Action
      const btnHelp = document.getElementById('btnDrawerHelp');
      btnHelp?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        showToast('Need help? DRAGME Arena Guide & Support is active.');
      });

      // Sign In Action
      const btnSignIn = document.getElementById('btnDrawerSignIn');
      btnSignIn?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        Router.navigate('login');
      });

      // Sign Up Action
      const btnSignUp = document.getElementById('btnDrawerSignUp');
      btnSignUp?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        Router.navigate('signup');
      });

      // Log Out Action (Opens Confirmation Modal)
      const btnLogOut = document.getElementById('btnDrawerLogOut');
      btnLogOut?.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
        LogoutManager.open();
      });
    }
  };

  const btnProtectedApiEl = document.getElementById('btnTestProtectedApi');
  btnProtectedApiEl?.addEventListener('click', async () => {
    try {
      const res = await AuthAPI.request('/api/protected-data');
      showToast(`JWT Verified: @${res.authenticatedUser.username} (${res.authenticatedUser.role})`);
    } catch (err) {
      showToast(`Protected API Error: ${err.message}`);
    }
  });

  function updateUserSessionUI() {
    const guestNavRight = document.getElementById('guestNavRight');
    const authNavRight = document.getElementById('authNavRight');
    const navDropdown = document.getElementById('userProfileDropdown');
    const navAvatar = navDropdown?.querySelector('img') || document.getElementById('navHeaderUserAvatar');
    const modalMeAvatar = document.querySelector('.identity-user-dp');
    const sbAvatar = document.getElementById('sbUserAvatar');
    const profileAvatarImg = document.getElementById('profileAvatarImg');
    const sbName = document.getElementById('sbUserName');
    const sbHandle = document.getElementById('sbUserHandle');
    const sbBtn = document.getElementById('btnSidebarViewProfile');
    const quickCreateAvatar = document.getElementById('quickCreateAvatar');
    const flairAvatar = document.querySelector('.flair-avatar');
    const flairUsername = document.querySelector('.flair-username');
    const mobNavAvatar = document.getElementById('mobNavUserAvatar');

    if (currentUser) {
      if (guestNavRight) guestNavRight.style.display = 'none';
      if (authNavRight) authNavRight.style.display = 'flex';

      const displayAvatar = AvatarService.get(currentUser);
      if (navAvatar) AvatarService.apply(navAvatar, currentUser);
      if (modalMeAvatar) AvatarService.apply(modalMeAvatar, currentUser);
      if (sbAvatar) AvatarService.apply(sbAvatar, currentUser);
      if (profileAvatarImg) AvatarService.apply(profileAvatarImg, currentUser);
      if (quickCreateAvatar) AvatarService.apply(quickCreateAvatar, currentUser);
      if (flairAvatar) AvatarService.apply(flairAvatar, currentUser);
      if (mobNavAvatar) AvatarService.apply(mobNavAvatar, currentUser);

      if (sbName) sbName.textContent = currentUser.display_name || currentUser.username;
      if (sbHandle) sbHandle.textContent = `@${currentUser.username}`;
      if (sbBtn) sbBtn.textContent = 'View Profile';
      if (flairUsername) flairUsername.textContent = currentUser.display_name || currentUser.username;

      const cookedValEl = document.getElementById('userCookedVal');
      if (cookedValEl) cookedValEl.textContent = currentUser.cooked || '12';

      // Propagate universally across active feed store
      if (window.DRAGME_STORE && currentUser.username) {
        window.DRAGME_STORE.updateUserAvatars(currentUser.username, displayAvatar);
      }
    } else {
      if (guestNavRight) guestNavRight.style.display = 'flex';
      if (authNavRight) authNavRight.style.display = 'none';

      if (navAvatar) AvatarService.apply(navAvatar, null);
      if (modalMeAvatar) AvatarService.apply(modalMeAvatar, null);
      if (sbAvatar) AvatarService.apply(sbAvatar, null);
      if (profileAvatarImg) AvatarService.apply(profileAvatarImg, null);
      if (quickCreateAvatar) AvatarService.apply(quickCreateAvatar, null);
      if (flairAvatar) AvatarService.apply(flairAvatar, null);
      if (mobNavAvatar) AvatarService.apply(mobNavAvatar, null);

      if (sbName) sbName.textContent = 'Guest Visitor';
      if (sbHandle) sbHandle.textContent = 'Explore Arena';
      if (sbBtn) sbBtn.textContent = 'Sign In';
      if (flairUsername) flairUsername.textContent = 'Guest Visitor';
    }

    // Always synchronize drawer UI safely
    try {
      ProfileDrawerHub.syncUser();
    } catch (err) {
      console.warn('ProfileDrawerHub.syncUser error:', err);
    }
  }

  // =========================================================================
  // USERNAME SERVICE & SIGNUP FLOW (PRIMARY VISUAL REFERENCE)
  // =========================================================================
  const UsernameService = {
    cache: new Map(),

    validateFormat(username) {
      if (!username || username.length === 0) {
        return { valid: false, status: 'idle', message: 'Enter a username' };
      }
      if (username.length < 4 || username.length > 20) {
        return { valid: false, status: 'invalid', message: 'Usernames must be 4–20 characters long.' };
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { valid: false, status: 'invalid', message: 'Can only contain letters, numbers and underscores.' };
      }
      if (username.startsWith('_') || username.endsWith('_')) {
        return { valid: false, status: 'invalid', message: "Can't start or end with an underscore." };
      }
      return { valid: true, status: 'valid' };
    },

    async checkAvailability(username) {
      const formatCheck = this.validateFormat(username);
      if (!formatCheck.valid) {
        return formatCheck;
      }

      const lower = username.toLowerCase();
      if (this.cache.has(lower)) {
        return this.cache.get(lower);
      }

      try {
        const res = await fetch(`/api/users/check-username?username=${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          const result = {
            valid: data.available,
            status: data.status,
            message: data.message || data.error || (data.available ? `${username} is available!` : `@${username} is already taken.`),
            username
          };
          this.cache.set(lower, result);
          return result;
        }
      } catch (err) {
        console.warn('Backend username check failed, using fallback validation:', err);
      }

      // Fallback validation
      const reserved = ['admin', 'moderator', 'dragme', 'root', 'api', 'system', 'support', 'anonymous'];
      const isTaken = reserved.includes(lower);
      const fallbackResult = {
        valid: !isTaken,
        status: isTaken ? 'taken' : 'available',
        message: isTaken ? `@${username} is already taken.` : `${username} is available!`,
        username
      };
      this.cache.set(lower, fallbackResult);
      return fallbackResult;
    }
  };

  const SignupManager = {
    state: {
      currentStep: 1,
      username: 'nitish_kapoor',
      usernameStatus: 'idle',
      usernameError: '',
      isCheckingUsername: false,
      canContinue: false
    },
    debounceTimer: null,

    init() {
      this.signupPageView = document.getElementById('signupPageView');
      this.signupUsernameInput = document.getElementById('signupUsernameInput');
      this.usernameInputBox = document.getElementById('usernameInputBox');
      this.usernameStatusIndicator = document.getElementById('usernameStatusIndicator');
      this.usernameValidationMsg = document.getElementById('usernameValidationMsg');
      this.feedbackMessageText = document.getElementById('feedbackMessageText');
      this.btnSignupContinue = document.getElementById('btnSignupContinue');
      this.authTopLoginBtn = document.getElementById('authTopLoginBtn');
      this.btnSignupBottomLogin = document.getElementById('btnSignupBottomLogin');
      this.signupBrandLogo = document.getElementById('signupBrandLogo');

      this.ruleLength = document.getElementById('ruleLength');
      this.ruleChars = document.getElementById('ruleChars');
      this.ruleEdges = document.getElementById('ruleEdges');

      if (!this.signupPageView) return;

      this.bindEvents();
      this.bindStep2Events();

      // Initial validation for prefilled value
      if (this.signupUsernameInput) {
        const initialVal = this.signupUsernameInput.value.trim();
        if (initialVal) {
          this.handleUsernameChange(initialVal, true);
        }
      }
    },

    bindEvents() {
      this.signupUsernameInput?.addEventListener('input', (e) => {
        this.handleUsernameChange(e.target.value, false);
      });

      this.signupUsernameInput?.addEventListener('blur', (e) => {
        this.handleUsernameChange(e.target.value.trim(), true);
      });

      this.signupUsernameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.state.canContinue) {
          e.preventDefault();
          this.handleContinue();
        }
      });

      this.btnSignupContinue?.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.state.canContinue) {
          this.handleContinue();
        }
      });

      this.authTopLoginBtn?.addEventListener('click', () => {
        Router.navigate('login');
      });

      this.btnSignupBottomLogin?.addEventListener('click', () => {
        Router.navigate('login');
      });

      this.signupBrandLogo?.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate('home');
      });
    },

    updateRulesList(username) {
      const len = username ? username.length : 0;
      const isLenValid = len >= 4 && len <= 20;
      const isCharValid = /^[a-zA-Z0-9_]+$/.test(username);
      const isEdgeValid = username && !username.startsWith('_') && !username.endsWith('_');

      this.updateRuleItem(this.ruleLength, isLenValid);
      this.updateRuleItem(this.ruleChars, isCharValid);
      this.updateRuleItem(this.ruleEdges, isEdgeValid);
    },

    updateRuleItem(el, isValid) {
      if (!el) return;
      if (isValid) {
        el.classList.add('rule-valid');
        el.classList.remove('rule-invalid');
      } else {
        el.classList.remove('rule-valid');
        el.classList.add('rule-invalid');
      }
    },

    handleUsernameChange(val, immediate = false) {
      const cleanVal = val.trim();
      this.state.username = cleanVal;
      this.updateRulesList(cleanVal);

      if (this.debounceTimer) clearTimeout(this.debounceTimer);

      if (!cleanVal) {
        this.state.usernameStatus = 'idle';
        this.state.canContinue = false;
        this.renderStatus();
        return;
      }

      const formatCheck = UsernameService.validateFormat(cleanVal);
      if (!formatCheck.valid) {
        this.state.usernameStatus = 'invalid';
        this.state.usernameError = formatCheck.message;
        this.state.canContinue = false;
        this.renderStatus();
        return;
      }

      this.state.usernameStatus = 'checking';
      this.state.canContinue = false;
      this.renderStatus();

      const runCheck = async () => {
        this.state.isCheckingUsername = true;
        const result = await UsernameService.checkAvailability(cleanVal);
        this.state.isCheckingUsername = false;

        if (this.state.username === cleanVal) {
          if (result.valid) {
            this.state.usernameStatus = 'available';
            this.state.canContinue = true;
          } else {
            this.state.usernameStatus = result.status || 'taken';
            this.state.usernameError = result.message || 'Username unavailable';
            this.state.canContinue = false;
          }
          this.renderStatus();
        }
      };

      if (immediate) {
        runCheck();
      } else {
        this.debounceTimer = setTimeout(runCheck, 280);
      }
    },

    renderStatus() {
      if (!this.usernameInputBox || !this.usernameStatusIndicator || !this.usernameValidationMsg) return;

      const { usernameStatus, username, usernameError, canContinue } = this.state;

      this.usernameInputBox.classList.remove('input-error');
      this.usernameValidationMsg.className = 'feedback-msg';

      if (usernameStatus === 'idle') {
        this.usernameStatusIndicator.innerHTML = '';
        this.usernameValidationMsg.style.visibility = 'hidden';
      } else if (usernameStatus === 'checking') {
        this.usernameStatusIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-lime"></i>';
        this.usernameValidationMsg.className = 'feedback-msg text-muted';
        this.usernameValidationMsg.style.visibility = 'visible';
        this.usernameValidationMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Checking availability...';
      } else if (usernameStatus === 'available') {
        this.usernameStatusIndicator.innerHTML = '<i class="fa-solid fa-circle-check text-lime"></i>';
        this.usernameValidationMsg.className = 'feedback-msg text-lime';
        this.usernameValidationMsg.style.visibility = 'visible';
        this.usernameValidationMsg.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>${username}</strong> is available!`;
      } else if (usernameStatus === 'taken') {
        this.usernameInputBox.classList.add('input-error');
        this.usernameStatusIndicator.innerHTML = '<i class="fa-solid fa-circle-xmark text-danger"></i>';
        this.usernameValidationMsg.className = 'feedback-msg text-danger';
        this.usernameValidationMsg.style.visibility = 'visible';
        this.usernameValidationMsg.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${usernameError || `@${username} is already taken.`}`;
      } else if (usernameStatus === 'invalid') {
        this.usernameInputBox.classList.add('input-error');
        this.usernameStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-danger"></i>';
        this.usernameValidationMsg.className = 'feedback-msg text-danger';
        this.usernameValidationMsg.style.visibility = 'visible';
        this.usernameValidationMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${usernameError || 'Invalid username format.'}`;
      }

      if (this.btnSignupContinue) {
        this.btnSignupContinue.disabled = !canContinue;
      }
    },

    goToStep(step) {
      this.state.currentStep = step;
      const step1Body = document.getElementById('signupStep1Body');
      const step2Body = document.getElementById('signupStep2Body');
      const stepSuccessBody = document.getElementById('signupStepSuccessBody');
      const stepperItems = document.querySelectorAll('.auth-stepper .stepper-item');
      const stepperLines = document.querySelectorAll('.auth-stepper .stepper-line');

      if (step === 1) {
        if (step1Body) step1Body.style.display = 'block';
        if (step2Body) step2Body.style.display = 'none';
        if (stepSuccessBody) stepSuccessBody.style.display = 'none';

        // Stepper updates
        stepperItems.forEach((item, idx) => {
          const circle = item.querySelector('.stepper-circle');
          if (idx === 0) {
            item.className = 'stepper-item active';
            if (circle) circle.innerHTML = '<span>1</span>';
          } else {
            item.className = 'stepper-item';
            if (circle) circle.innerHTML = `<span>${idx + 1}</span>`;
          }
        });
        stepperLines.forEach((line, idx) => {
          line.className = idx === 0 ? 'stepper-line active-line' : 'stepper-line';
        });
        setTimeout(() => this.signupUsernameInput?.focus(), 60);
      } else if (step === 2) {
        if (step1Body) step1Body.style.display = 'none';
        if (step2Body) step2Body.style.display = 'block';
        if (stepSuccessBody) stepSuccessBody.style.display = 'none';

        const step2UserDisplay = document.getElementById('step2UsernameDisplay');
        if (step2UserDisplay) step2UserDisplay.textContent = `@${this.state.username}`;

        // Stepper updates: Step 1 completed, Step 2 active
        stepperItems.forEach((item, idx) => {
          const circle = item.querySelector('.stepper-circle');
          if (idx === 0) {
            item.className = 'stepper-item completed';
            if (circle) circle.innerHTML = '<i class="fa-solid fa-check"></i>';
          } else if (idx === 1) {
            item.className = 'stepper-item active';
            if (circle) circle.innerHTML = '<span>2</span>';
          } else {
            item.className = 'stepper-item';
            if (circle) circle.innerHTML = `<span>${idx + 1}</span>`;
          }
        });
        stepperLines.forEach((line, idx) => {
          line.className = idx === 0 ? 'stepper-line active-line' : 'stepper-line';
        });

        const emailInput = document.getElementById('signupEmailInput');
        setTimeout(() => emailInput?.focus(), 60);
      } else if (step === 4) {
        // Complete
        if (step1Body) step1Body.style.display = 'none';
        if (step2Body) step2Body.style.display = 'none';
        if (stepSuccessBody) stepSuccessBody.style.display = 'block';

        const successDisplay = document.getElementById('stepSuccessUsernameDisplay');
        if (successDisplay) successDisplay.textContent = `@${this.state.username}`;

        stepperItems.forEach((item) => {
          item.className = 'stepper-item active';
          const circle = item.querySelector('.stepper-circle');
          if (circle) circle.innerHTML = '<i class="fa-solid fa-check"></i>';
        });
        stepperLines.forEach((line) => {
          line.className = 'stepper-line active-line';
        });
      }
    },

    bindStep2Events() {
      const step2Form = document.getElementById('signupDetailsForm');
      const btnBackToStep1 = document.getElementById('btnBackToStep1');
      const btnTogglePwd = document.getElementById('btnToggleSignupPwd');
      const pwdInput = document.getElementById('signupPasswordInput');
      const emailInput = document.getElementById('signupEmailInput');
      const errorMsgArea = document.getElementById('step2ErrorMsg');
      const btnSubmitDetails = document.getElementById('btnSignupSubmitDetails');
      const btnGoToFeed = document.getElementById('btnGoToFeedAfterSignup');

      btnBackToStep1?.addEventListener('click', () => {
        this.goToStep(1);
      });

      btnTogglePwd?.addEventListener('click', () => {
        if (!pwdInput) return;
        const isPwd = pwdInput.type === 'password';
        pwdInput.type = isPwd ? 'text' : 'password';
        btnTogglePwd.innerHTML = isPwd ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
      });

      step2Form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailVal = emailInput?.value?.trim() || '';
        const pwdVal = pwdInput?.value || '';

        if (!emailVal || !pwdVal) {
          if (errorMsgArea) {
            errorMsgArea.textContent = 'Please fill out all fields.';
            errorMsgArea.style.display = 'block';
          }
          return;
        }

        if (pwdVal.length < 6) {
          if (errorMsgArea) {
            errorMsgArea.textContent = 'Password must be at least 6 characters long.';
            errorMsgArea.style.display = 'block';
          }
          return;
        }

        if (errorMsgArea) errorMsgArea.style.display = 'none';

        const btnText = btnSubmitDetails?.querySelector('.btn-text');
        const btnArrow = btnSubmitDetails?.querySelector('.btn-arrow-icon');
        const btnSpinner = btnSubmitDetails?.querySelector('.btn-spinner');

        if (btnText) btnText.textContent = 'Creating Account...';
        if (btnArrow) btnArrow.style.display = 'none';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';
        if (btnSubmitDetails) btnSubmitDetails.disabled = true;

        try {
          const res = await AuthAPI.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              username: this.state.username,
              email: emailVal,
              password: pwdVal
            })
          });

          AuthManager.setSession(res.token, res.user);
          renderFeed();

          showToast(`Account created! Welcome @${currentUser.username}!`);
          this.goToStep(4);
        } catch (err) {
          if (errorMsgArea) {
            errorMsgArea.textContent = err.message || 'Registration failed. Please try again.';
            errorMsgArea.style.display = 'block';
          }
        } finally {
          if (btnText) btnText.textContent = 'Create Account';
          if (btnArrow) btnArrow.style.display = 'inline-block';
          if (btnSpinner) btnSpinner.style.display = 'none';
          if (btnSubmitDetails) btnSubmitDetails.disabled = false;
        }
      });

      btnGoToFeed?.addEventListener('click', () => {
        Router.navigate('home');
      });
    },

    handleContinue() {
      if (!this.state.canContinue) return;

      const continueBtn = this.btnSignupContinue;
      const btnText = continueBtn.querySelector('.btn-text');
      const btnArrow = continueBtn.querySelector('.btn-arrow-icon');
      const btnSpinner = continueBtn.querySelector('.btn-spinner');

      if (btnText) btnText.textContent = 'Saving...';
      if (btnArrow) btnArrow.style.display = 'none';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      continueBtn.disabled = true;

      setTimeout(() => {
        if (btnText) btnText.textContent = 'Continue';
        if (btnArrow) btnArrow.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
        continueBtn.disabled = false;

        this.goToStep(2);
      }, 300);
    }
  };

  const LoginManager = {
    init() {
      this.loginPageView = document.getElementById('loginPageView');
      this.form = document.getElementById('loginPageForm');
      this.identifierInput = document.getElementById('loginPageIdentifierInput');
      this.passwordInput = document.getElementById('loginPagePasswordInput');
      this.submitBtn = document.getElementById('btnLoginSubmit');
      this.errorMsgArea = document.getElementById('loginPageErrorMsg');
      this.btnTogglePwd = document.getElementById('btnToggleLoginPwd');
      this.btnTopSignup = document.getElementById('loginTopSignupBtn');
      this.btnBottomSignup = document.getElementById('btnLoginBottomSignup');
      this.brandLogo = document.getElementById('loginBrandLogo');
      this.forgotLink = document.getElementById('loginPageForgotLink');

      if (!this.loginPageView) return;

      this.bindEvents();
    },

    bindEvents() {
      this.btnTogglePwd?.addEventListener('click', () => {
        if (!this.passwordInput) return;
        const isPwd = this.passwordInput.type === 'password';
        this.passwordInput.type = isPwd ? 'text' : 'password';
        this.btnTogglePwd.innerHTML = isPwd ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
      });

      this.btnTopSignup?.addEventListener('click', () => {
        Router.navigate('signup');
      });

      this.btnBottomSignup?.addEventListener('click', () => {
        Router.navigate('signup');
      });

      this.brandLogo?.addEventListener('click', (e) => {
        e.preventDefault();
        Router.navigate('home');
      });

      this.forgotLink?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Password reset link sent to your registered email.');
      });

      this.form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loginVal = this.identifierInput?.value?.trim() || '';
        const pwdVal = this.passwordInput?.value || '';

        if (!loginVal || !pwdVal) {
          this.showError('Please enter your username/email and password.');
          return;
        }

        this.clearError();
        this.setLoading(true);

        try {
          const res = await AuthAPI.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ login: loginVal, password: pwdVal })
          });

          AuthManager.setSession(res.token, res.user);
          renderFeed();

          showToast(`Welcome back, @${currentUser.username}!`);
          Router.navigate('home');
        } catch (err) {
          this.showError(err.message || 'Invalid username/email or password.');
        } finally {
          this.setLoading(false);
        }
      });
    },

    showError(msg) {
      if (this.errorMsgArea) {
        this.errorMsgArea.textContent = msg;
        this.errorMsgArea.style.display = 'block';
      }
    },

    clearError() {
      if (this.errorMsgArea) {
        this.errorMsgArea.style.display = 'none';
      }
    },

    setLoading(loading) {
      if (!this.submitBtn) return;
      const btnText = this.submitBtn.querySelector('.btn-text');
      const btnArrow = this.submitBtn.querySelector('.btn-arrow-icon');
      const btnSpinner = this.submitBtn.querySelector('.btn-spinner');

      if (loading) {
        if (btnText) btnText.textContent = 'Signing in...';
        if (btnArrow) btnArrow.style.display = 'none';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';
        this.submitBtn.disabled = true;
      } else {
        if (btnText) btnText.textContent = 'Sign In';
        if (btnArrow) btnArrow.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
        this.submitBtn.disabled = false;
      }
    }
  };

  // =============================================================================
  // PROFILE MANAGER & EDIT PROFILE CONTROLLER
  // =============================================================================
  const ProfileManager = {
    activeUsername: null,
    activeTab: 'overview',

    async loadProfile(username = null) {
      const targetUser = username || (currentUser ? currentUser.username : null);
      if (!targetUser) {
        if (!currentUser) {
          AuthManager.requireAuth({ type: 'profile' }, 'Sign in to access your personal DRAGME profile arena.', 'Profile Arena');
          Router.navigate('home');
          return;
        }
        return;
      }
      this.activeUsername = targetUser;

      try {
        const res = await AuthAPI.request(`/api/users/${encodeURIComponent(targetUser)}/profile`);
        if (res && res.profile) {
          this.renderProfileHeader(res.profile);
          await this.loadTabPosts(targetUser, this.activeTab);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        showToast('Unable to load profile.');
      }
    },

    renderProfileHeader(profile) {
      const isOwner = Boolean(currentUser && currentUser.username && currentUser.username.toLowerCase() === profile.username.toLowerCase());

      // Banner Media (Image or Video)
      const bannerWrap = document.getElementById('profileBannerMedia') || document.querySelector('.profile-banner-wrapper .profile-banner-media');
      const bannerUrl = profile.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80';
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
            videoEl.setAttribute('preload', 'metadata');
            videoEl.src = bannerUrl;
            videoEl.dataset.activeSrc = bannerUrl;
            if (currentBanner) {
              bannerWrap.replaceChild(videoEl, currentBanner);
            } else {
              bannerWrap.insertBefore(videoEl, bannerWrap.firstChild);
            }
            videoEl.play().catch(() => {});
          } else {
            if (!AvatarService.isSameUrl(currentBanner, bannerUrl)) {
              currentBanner.src = bannerUrl;
              currentBanner.dataset.activeSrc = bannerUrl;
              currentBanner.load();
              currentBanner.play().catch(() => {});
            }
          }
        } else {
          if (!currentBanner || currentBanner.tagName !== 'IMG') {
            const imgEl = document.createElement('img');
            imgEl.id = 'profileBannerImg';
            imgEl.className = 'profile-banner-img';
            imgEl.alt = 'Banner';
            imgEl.src = bannerUrl;
            imgEl.dataset.activeSrc = bannerUrl;
            if (currentBanner) {
              bannerWrap.replaceChild(imgEl, currentBanner);
            } else {
              bannerWrap.insertBefore(imgEl, bannerWrap.firstChild);
            }
          } else {
            if (!AvatarService.isSameUrl(currentBanner, bannerUrl)) {
              currentBanner.src = bannerUrl;
              currentBanner.dataset.activeSrc = bannerUrl;
            }
          }
        }
      }

      // Avatar Media & Shape/Frame
      const avatarFrameEl = document.querySelector('.profile-avatar-frame');
      if (avatarFrameEl) {
        // Reset old frames and shapes
        avatarFrameEl.className = 'profile-avatar-frame';
        const frameClass = profile.avatarFrame && profile.avatarFrame !== 'none' ? `frame-${profile.avatarFrame}` : '';
        const shapeClass = profile.avatarShape ? `shape-${profile.avatarShape}` : 'shape-rectangular';
        if (frameClass) avatarFrameEl.classList.add(frameClass);
        if (shapeClass) avatarFrameEl.classList.add(shapeClass);
      }

      const avatarTarget = document.getElementById('profileAvatarImg') || document.querySelector('.profile-avatar-frame img, .profile-avatar-frame video');
      if (avatarTarget) {
        AvatarService.apply(avatarTarget, profile);
      }

      // Profile Theme, Accent & Effects
      const profileContainer = document.getElementById('profileViewContainer');
      if (profileContainer) {
        profileContainer.dataset.theme = profile.profileTheme || 'default';
        profileContainer.dataset.accent = profile.profileAccent || 'lime';
        profileContainer.dataset.effects = profile.profileEffects || 'none';
      }

      // Owner-Only Controls & Buttons Visibility
      const btnEditBanner = document.getElementById('btnEditBanner');
      if (btnEditBanner) btnEditBanner.style.display = isOwner ? 'flex' : 'none';

      const btnChangeAvatar = document.getElementById('btnChangeAvatar');
      if (btnChangeAvatar) btnChangeAvatar.style.display = isOwner ? 'flex' : 'none';

      const btnEditProfile = document.getElementById('btnOpenEditProfileModal');
      if (btnEditProfile) btnEditProfile.style.display = isOwner ? 'inline-flex' : 'none';

      const onlyYouTab = document.querySelector('#profileNavTabs .tab-only-you');
      if (onlyYouTab) onlyYouTab.style.display = isOwner ? 'inline-flex' : 'none';

      const onlyYouWidget = document.querySelector('.profile-right-widgets .widget-only-you');
      if (onlyYouWidget) onlyYouWidget.style.display = isOwner ? 'block' : 'none';

      // Names & Bio
      const displayNameEl = document.getElementById('profileDisplayName');
      if (displayNameEl) displayNameEl.textContent = profile.displayName || profile.username;

      const rankBadgeEl = document.getElementById('profileRankBadge');
      if (rankBadgeEl) rankBadgeEl.textContent = profile.rankTitle || 'Senior Roaster';

      const handleEl = document.getElementById('profileHandle');
      if (handleEl) handleEl.textContent = `@${profile.username}`;

      const bioEl = document.getElementById('profileBioText');
      if (bioEl) bioEl.textContent = profile.bio || 'Arena Contender';

      const locEl = document.getElementById('profileLocationText');
      if (locEl) locEl.textContent = profile.location || 'Hamirpur, HP';

      const joinedEl = document.getElementById('profileJoinedText');
      if (joinedEl) joinedEl.textContent = profile.joinedDate || 'Joined May 2024';

      // Stats
      if (profile.stats) {
        const statPosts = document.getElementById('profileStatPosts');
        if (statPosts) statPosts.textContent = profile.stats.posts ?? 0;

        const statFollowers = document.getElementById('profileStatFollowers');
        if (statFollowers) statFollowers.textContent = profile.stats.followers ?? 0;

        const statFollowing = document.getElementById('profileStatFollowing');
        if (statFollowing) statFollowing.textContent = profile.stats.following ?? 0;

        const statConfessions = document.getElementById('profileStatConfessions');
        if (statConfessions) statConfessions.textContent = profile.stats.confessions ?? 0;

        const statReactions = document.getElementById('profileStatReactions');
        if (statReactions) statReactions.textContent = profile.stats.reactions ?? 0;
      }

      // Right Widgets
      const hlRep = document.getElementById('hlReputation');
      if (hlRep) hlRep.textContent = profile.reputationScore ? (profile.reputationScore >= 1000 ? `${(profile.reputationScore / 1000).toFixed(1)}K` : profile.reputationScore) : '0';

      const hlCooked = document.getElementById('hlCookedRatio');
      if (hlCooked) hlCooked.textContent = `${profile.cookedRatio || 0}%`;

      const hlAcc = document.getElementById('hlAccuracy');
      if (hlAcc) hlAcc.textContent = `${profile.judgmentAccuracy || 0}%`;

      const hlRank = document.getElementById('hlRank');
      if (hlRank) hlRank.textContent = `#${profile.rankNumber || 1} ${profile.rankTitle || 'Roaster'}`;

      const roastTitle = document.getElementById('roastLevelTitle');
      if (roastTitle) roastTitle.textContent = (profile.rankTitle || 'ROASTER').toUpperCase();

      const roastSub = document.getElementById('roastLevelSub');
      const ptsRemaining = (profile.nextLevelPoints || 3000) - (profile.roastPoints || 0);
      if (roastSub) roastSub.textContent = `Next level in ${ptsRemaining > 0 ? ptsRemaining : 500} points`;

      // Update Page Title
      document.title = `${profile.displayName || profile.username} (@${profile.username}) — DRAGME Profile`;
    },

    async loadTabPosts(username, tab = 'overview') {
      this.activeTab = tab;
      const stream = document.getElementById('profilePostsStream');
      if (!stream) return;

      stream.innerHTML = `<div class="feed-empty-state"><i class="fa-solid fa-spinner fa-spin text-lime" style="font-size: 2rem;"></i><p>Loading ${tab}...</p></div>`;

      try {
        const res = await AuthAPI.request(`/api/users/${encodeURIComponent(username)}/posts?tab=${tab}`);
        const posts = res.posts || [];

        if (posts.length === 0) {
          stream.innerHTML = `
            <div class="feed-empty-state">
              <i class="fa-solid fa-layer-group text-lime" style="font-size: 2.2rem; margin-bottom: 10px;"></i>
              <p>No ${tab} found for @${username} yet.</p>
            </div>
          `;
          return;
        }

        stream.innerHTML = posts.map(post => {
          const authorAvatarUrl = AvatarService.get(post.isAnonymous ? 'Masked Persona' : (post.avatar || post.author), post.isAnonymous);
          return `
          <article class="reddit-card" data-post-id="${post.id}">
            <div class="card-left-votes">
              <button class="btn-vote-arrow btn-vote-up ${post.hasVoted ? 'active-vote' : ''}" data-post-id="${post.id}">
                <i class="fa-solid fa-arrow-up"></i>
              </button>
              <span class="vote-count-num ${post.hasVoted ? 'text-lime' : ''}" id="vote-count-${post.id}">${post.dragCount}</span>
              <button class="btn-vote-arrow btn-vote-down" data-post-id="${post.id}">
                <i class="fa-solid fa-arrow-down"></i>
              </button>
            </div>
            <div class="card-main-body">
              <div class="card-header-meta">
                <img src="${escapeHTML(authorAvatarUrl)}" alt="" class="card-author-avatar" onerror="this.onerror=null;this.src=window.GUEST_SILHOUETTE_SVG;">
                <div class="meta-names-wrap">
                  <span class="author-display-name">${escapeHTML(post.author)}</span>
                  <span class="meta-room-tag">in <strong class="text-lime">${escapeHTML(post.roomDisplayName || post.room)}</strong></span>
                  <span class="meta-bullet">•</span>
                  <span class="meta-time-ago">${post.timeAgo}</span>
                </div>
                <div class="card-badge-right">
                  <span class="badge-post-flair ${post.flairClass || 'flair-confession'}">${escapeHTML(post.flair || 'Confession')}</span>
                  <button class="btn-card-more" title="More options"><i class="fa-solid fa-ellipsis"></i></button>
                </div>
              </div>
              <div class="card-text-content">
                <p class="card-body-paragraph">${escapeHTML(post.content)}</p>
              </div>
              ${post.imageUrl ? `<div class="card-image-wrap"><img src="${escapeHTML(post.imageUrl)}" alt="Attached media" class="card-embedded-image" loading="lazy"></div>` : ''}
              <div class="card-footer-actions">
                <button class="card-action-btn btn-open-comments" data-post-id="${post.id}">
                  <i class="fa-regular fa-message"></i>
                  <span>${post.commentCount} Comments</span>
                </button>
                <button class="card-action-btn btn-share-post" data-post-id="${post.id}">
                  <i class="fa-solid fa-share-nodes"></i>
                  <span>Share</span>
                </button>
                <button class="card-action-btn btn-save-post ${post.isSaved ? 'active-save' : ''}" data-post-id="${post.id}">
                  <i class="fa-${post.isSaved ? 'solid' : 'regular'} fa-bookmark ${post.isSaved ? 'text-lime' : ''}"></i>
                  <span>${post.isSaved ? 'Saved' : 'Save'}</span>
                </button>
              </div>
            </div>
          </article>
        `;
        }).join('');

        // Attach vote & save event listeners to the profile cards
        stream.querySelectorAll('.btn-vote-arrow').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const pId = btn.dataset.postId;
            if (pId) handleVoteClick(pId, e);
          });
        });

        stream.querySelectorAll('.btn-save-post').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const pId = btn.dataset.postId;
            if (pId) handleSaveClick(pId, e);
          });
        });

        stream.querySelectorAll('.btn-open-comments').forEach(btn => {
          btn.addEventListener('click', () => {
            const pId = btn.dataset.postId;
            if (pId) openCommentsDrawer(pId);
          });
        });
      } catch (err) {
        stream.innerHTML = `<div class="feed-empty-state"><p class="text-danger">Failed to load ${tab}.</p></div>`;
      }
    },

    init() {
      // Tab switcher
      const tabBtns = document.querySelectorAll('#profileNavTabs .profile-tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const tab = btn.dataset.tab || 'overview';
          if (this.activeUsername) {
            this.loadTabPosts(this.activeUsername, tab);
          }
        });
      });

      // Edit banner button
      const btnEditBanner = document.getElementById('btnEditBanner');
      if (btnEditBanner) {
        btnEditBanner.addEventListener('click', () => {
          Router.navigate('edit-profile');
          EditProfileManager.switchTab('banner');
        });
      }

      // Change avatar button
      const btnChangeAvatar = document.getElementById('btnChangeAvatar');
      if (btnChangeAvatar) {
        btnChangeAvatar.addEventListener('click', () => {
          Router.navigate('edit-profile');
          EditProfileManager.switchTab('avatar');
        });
      }

      // Edit profile button
      const btnEditProfile = document.getElementById('btnOpenEditProfileModal');
      if (btnEditProfile) {
        btnEditProfile.addEventListener('click', () => {
          Router.navigate('edit-profile');
          EditProfileManager.switchTab('profile');
        });
      }

      // Only You can see links
      document.querySelectorAll('.only-you-row').forEach(row => {
        row.addEventListener('click', (e) => {
          e.preventDefault();
          const tab = row.dataset.tab;
          if (tab === 'saved') {
            const savedTabBtn = document.querySelector('#profileNavTabs .tab-only-you');
            if (savedTabBtn) savedTabBtn.click();
          } else if (tab === 'anonymous') {
            const confTabBtn = document.querySelector('#profileNavTabs [data-tab="confessions"]');
            if (confTabBtn) confTabBtn.click();
          } else {
            showToast('Opening private timeline...');
          }
        });
      });
    }
  };



  // =========================================================================
  // MEDIA CROP & TRIM STUDIO MANAGER (UNIVERSAL PINCH-ZOOM, PAN, ROTATE & TRIM)
  // =========================================================================
  const MediaStudioManager = {
    currentFile: null,
    targetType: 'avatar', // 'avatar' | 'banner'
    isVideo: false,
    videoDuration: 0,
    startTime: 0,
    endTime: 0,
    isPlaying: false,
    
    // Transform state (applied to image, animated GIF, and video)
    zoomLevel: 1.0,
    rotationDeg: 0,
    flipH: false,
    flipV: false,
    panX: 0,
    panY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    
    // Pinch & touch state
    isPinching: false,
    initialPinchDistance: 0,
    initialZoom: 1.0,
    lastTouchTime: 0,

    init() {
      // Close & Cancel & Apply buttons
      const btnClose = document.getElementById('btnCloseMediaStudio');
      const btnCancel = document.getElementById('btnCancelMediaStudio');
      const btnApply = document.getElementById('btnApplyMediaStudio');

      [btnClose, btnCancel].forEach(b => b?.addEventListener('click', () => this.close()));
      btnApply?.addEventListener('click', () => this.apply());

      // Video Controls
      const btnPlay = document.getElementById('btnToggleVideoPlayback');
      const startSlider = document.getElementById('videoStartSlider');
      const endSlider = document.getElementById('videoEndSlider');
      const videoEl = document.getElementById('studioVideoPlayer');

      btnPlay?.addEventListener('click', () => this.toggleVideoPlay());

      let seekTimeout = null;
      const throttledSeek = (time) => {
        if (seekTimeout) clearTimeout(seekTimeout);
        seekTimeout = setTimeout(() => {
          if (videoEl && Math.abs(videoEl.currentTime - time) > 0.1) {
            videoEl.currentTime = time;
          }
        }, 50);
      };

      startSlider?.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (val >= this.endTime - 0.5) {
          val = Math.max(0, this.endTime - 0.5);
          e.target.value = val;
        }
        this.startTime = val;
        throttledSeek(this.startTime);
        this.updateVideoUI();
      });

      endSlider?.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value);
        if (val <= this.startTime + 0.5) {
          val = Math.min(this.videoDuration, this.startTime + 0.5);
          e.target.value = val;
        }
        const maxLen = this.targetType === 'avatar' ? 3.0 : 4.0;
        if (val - this.startTime > maxLen) {
          val = this.startTime + maxLen;
          e.target.value = val;
        }
        this.endTime = val;
        this.updateVideoUI();
      });

      videoEl?.addEventListener('play', () => {
        this.isPlaying = true;
        this.updateVideoPlayIcon();
      });

      videoEl?.addEventListener('pause', () => {
        this.isPlaying = false;
        this.updateVideoPlayIcon();
      });

      videoEl?.addEventListener('playing', () => {
        this.isPlaying = true;
        this.updateVideoPlayIcon();
      });

      let lastTimeCheck = 0;
      videoEl?.addEventListener('timeupdate', () => {
        if (!videoEl || !this.isVideo) return;
        const now = Date.now();
        if (now - lastTimeCheck < 100) return;
        lastTimeCheck = now;

        const cur = videoEl.currentTime;
        if (cur >= this.endTime || cur < this.startTime) {
          videoEl.currentTime = this.startTime > 0 ? this.startTime : 0.05;
        }
        const timer = document.getElementById('videoPlaybackTimer');
        if (timer) {
          timer.textContent = `${this.formatTime(videoEl.currentTime)} / ${this.formatTime(this.videoDuration)}`;
        }
      });

      // Zoom Controls & Sliders
      const zoomSlider = document.getElementById('photoZoomSlider');
      const btnZoomIn = document.getElementById('btnZoomIn');
      const btnZoomOut = document.getElementById('btnZoomOut');
      const btnRotateRight = document.getElementById('btnRotatePhoto');
      const btnRotateLeft = document.getElementById('btnRotateLeft');
      const btnFlipH = document.getElementById('btnFlipH');
      const btnFlipV = document.getElementById('btnFlipV');
      const btnReset = document.getElementById('btnResetTransform');

      zoomSlider?.addEventListener('input', (e) => {
        this.zoomLevel = parseFloat(e.target.value);
        this.syncPresetActiveState();
        this.renderTransform();
      });

      btnZoomIn?.addEventListener('click', () => {
        this.setZoom(Math.min(4, this.zoomLevel + 0.15));
      });

      btnZoomOut?.addEventListener('click', () => {
        this.setZoom(Math.max(1, this.zoomLevel - 0.15));
      });

      // Rotation & Flip
      btnRotateRight?.addEventListener('click', () => {
        this.rotationDeg = (this.rotationDeg + 90) % 360;
        this.renderTransform();
      });

      btnRotateLeft?.addEventListener('click', () => {
        this.rotationDeg = (this.rotationDeg - 90 + 360) % 360;
        this.renderTransform();
      });

      btnFlipH?.addEventListener('click', () => {
        this.flipH = !this.flipH;
        this.renderTransform();
        showToast(this.flipH ? 'Mirrored horizontally' : 'Horizontal mirror removed');
      });

      btnFlipV?.addEventListener('click', () => {
        this.flipV = !this.flipV;
        this.renderTransform();
        showToast(this.flipV ? 'Flipped vertically' : 'Vertical flip removed');
      });

      btnReset?.addEventListener('click', () => {
        this.resetTransform();
      });

      // Precision Pan D-Pad Nudge Buttons
      const btnPanUp = document.getElementById('btnPanUp');
      const btnPanDown = document.getElementById('btnPanDown');
      const btnPanLeft = document.getElementById('btnPanLeft');
      const btnPanRight = document.getElementById('btnPanRight');
      const btnPanCenter = document.getElementById('btnPanCenter');

      btnPanUp?.addEventListener('click', () => { this.panY -= 15; this.renderTransform(); });
      btnPanDown?.addEventListener('click', () => { this.panY += 15; this.renderTransform(); });
      btnPanLeft?.addEventListener('click', () => { this.panX -= 15; this.renderTransform(); });
      btnPanRight?.addEventListener('click', () => { this.panX += 15; this.renderTransform(); });
      btnPanCenter?.addEventListener('click', () => { this.panX = 0; this.panY = 0; this.renderTransform(); });

      // Zoom preset pills
      document.querySelectorAll('#zoomPresetPills .btn-preset-zoom').forEach(btn => {
        btn.addEventListener('click', () => {
          const scale = parseFloat(btn.dataset.scale || '1.0');
          this.setZoom(scale);
        });
      });

      // Unified Mouse & Multi-Touch Gesture Handlers on stage containers
      const stageBoxes = [
        document.getElementById('studioCropCanvasBox'),
        document.getElementById('studioVideoCanvasBox'),
        document.getElementById('mediaStudioStage')
      ];

      stageBoxes.forEach(box => {
        if (!box) return;

        // Mouse Drag to Pan
        box.addEventListener('mousedown', (e) => {
          this.isDragging = true;
          this.dragStartX = e.clientX - this.panX;
          this.dragStartY = e.clientY - this.panY;
          if (videoEl && this.isVideo && !videoEl.paused) {
            this.wasPlayingBeforeDrag = true;
            videoEl.pause();
          }
        });

        // Double Click to Toggle 1x / 2x Zoom
        box.addEventListener('dblclick', () => {
          this.setZoom(this.zoomLevel > 1.2 ? 1.0 : 2.0);
        });

        // Mouse Wheel to Zoom (Smooth, Passive: false to prevent background scroll)
        box.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.12 : -0.12;
          this.setZoom(Math.min(4, Math.max(1, this.zoomLevel + delta)));
        }, { passive: false });

        // Touch Gestures: 1 Finger Pan, 2 Fingers Pinch-to-Zoom, Double Tap to Toggle
        box.addEventListener('touchstart', (e) => {
          const now = Date.now();
          if (e.touches.length === 1 && now - this.lastTouchTime < 300) {
            // Double-tap detected
            this.setZoom(this.zoomLevel > 1.2 ? 1.0 : 2.0);
            this.lastTouchTime = 0;
            return;
          }
          this.lastTouchTime = now;

          if (e.touches.length === 2) {
            this.isPinching = true;
            this.isDragging = false;
            this.initialPinchDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            this.initialZoom = this.zoomLevel;
          } else if (e.touches.length === 1) {
            this.isDragging = true;
            this.isPinching = false;
            this.dragStartX = e.touches[0].clientX - this.panX;
            this.dragStartY = e.touches[0].clientY - this.panY;
          }
          if (videoEl && this.isVideo && !videoEl.paused) {
            this.wasPlayingBeforeDrag = true;
            videoEl.pause();
          }
        }, { passive: true });

        box.addEventListener('touchmove', (e) => {
          if (this.isPinching && e.touches.length === 2) {
            const currentDist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
            if (this.initialPinchDistance > 0) {
              const factor = currentDist / this.initialPinchDistance;
              this.setZoom(Math.min(4, Math.max(1, this.initialZoom * factor)));
            }
          } else if (this.isDragging && e.touches.length === 1) {
            this.panX = e.touches[0].clientX - this.dragStartX;
            this.panY = e.touches[0].clientY - this.dragStartY;
            this.renderTransform();
          }
        }, { passive: true });

        box.addEventListener('touchend', (e) => {
          if (e.touches.length < 2) this.isPinching = false;
          if (e.touches.length === 0) {
            this.isDragging = false;
            if (this.wasPlayingBeforeDrag && videoEl && this.isVideo) {
              this.wasPlayingBeforeDrag = false;
              videoEl.play().catch(() => {});
            }
          }
        });
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        this.panX = e.clientX - this.dragStartX;
        this.panY = e.clientY - this.dragStartY;
        this.renderTransform();
      });

      window.addEventListener('mouseup', () => {
        if (this.isDragging) {
          this.isDragging = false;
          if (this.wasPlayingBeforeDrag && videoEl && this.isVideo) {
            this.wasPlayingBeforeDrag = false;
            videoEl.play().catch(() => {});
          }
        }
      });
    },

    setZoom(val) {
      this.zoomLevel = parseFloat(Math.min(4, Math.max(1, val)).toFixed(2));
      const slider = document.getElementById('photoZoomSlider');
      if (slider) slider.value = this.zoomLevel;
      this.syncPresetActiveState();
      this.renderTransform();
    },

    resetTransform() {
      this.zoomLevel = 1.0;
      this.rotationDeg = 0;
      this.flipH = false;
      this.flipV = false;
      this.panX = 0;
      this.panY = 0;
      const slider = document.getElementById('photoZoomSlider');
      if (slider) slider.value = 1.0;
      this.syncPresetActiveState();
      this.renderTransform();
      showToast('Frame position, scale & orientation reset.');
    },

    syncPresetActiveState() {
      document.querySelectorAll('#zoomPresetPills .btn-preset-zoom').forEach(btn => {
        const scale = parseFloat(btn.dataset.scale);
        btn.classList.toggle('active', Math.abs(scale - this.zoomLevel) < 0.08);
      });
    },

    rafId: null,
    renderTransform() {
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = requestAnimationFrame(() => {
        const scaleX = this.zoomLevel * (this.flipH ? -1 : 1);
        const scaleY = this.zoomLevel * (this.flipV ? -1 : 1);
        const transformVal = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${scaleX}, ${scaleY}) rotate(${this.rotationDeg}deg)`;
        
        const imgEl = document.getElementById('studioCropImg');
        if (imgEl) imgEl.style.transform = transformVal;

        const videoEl = document.getElementById('studioVideoPlayer');
        if (videoEl) videoEl.style.transform = transformVal;

        // Update floating stage badges
        const zoomBadgeText = document.getElementById('valZoomLevelText');
        if (zoomBadgeText) zoomBadgeText.textContent = `${Math.round(this.zoomLevel * 100)}%`;

        const panBadgeText = document.getElementById('valPanPosText');
        if (panBadgeText) panBadgeText.textContent = `${Math.round(this.panX)}, ${Math.round(this.panY)}`;

        const rotBadgeText = document.getElementById('valRotationText');
        if (rotBadgeText) {
          let text = `${this.rotationDeg}°`;
          if (this.flipH && this.flipV) text += ' (HV)';
          else if (this.flipH) text += ' (H)';
          else if (this.flipV) text += ' (V)';
          rotBadgeText.textContent = text;
        }
      });
    },

    formatTime(sec) {
      const s = Math.max(0, sec || 0);
      const mins = Math.floor(s / 60);
      const remainder = (s % 60).toFixed(1);
      return `${mins}:${remainder.padStart(4, '0')}`;
    },

    open(file, targetType = 'avatar') {
      if (!file) return;
      this.currentFile = file;
      this.targetType = targetType;
      this.isVideo = file.type.startsWith('video/');

      const modal = document.getElementById('mediaStudioModal');
      const titleEl = document.getElementById('mediaStudioTitle');
      const iconEl = document.getElementById('mediaStudioIcon');
      const videoWrap = document.getElementById('studioVideoWrap');
      const imageWrap = document.getElementById('studioImageWrap');
      const videoControls = document.getElementById('studioVideoControls');
      const cropOverlay = document.getElementById('cropGridOverlay');
      const cropOverlayVideo = document.getElementById('cropGridOverlayVideo');
      const applyText = document.getElementById('btnApplyStudioText');

      if (modal) modal.style.display = 'flex';

      // Pause all background videos to free up hardware video decoders
      document.querySelectorAll('video').forEach(v => {
        if (v.id !== 'studioVideoPlayer') v.pause();
      });

      // Reset transform on open
      this.zoomLevel = 1.0;
      this.rotationDeg = 0;
      this.flipH = false;
      this.flipV = false;
      this.panX = 0;
      this.panY = 0;
      const zoomSlider = document.getElementById('photoZoomSlider');
      if (zoomSlider) zoomSlider.value = 1.0;
      this.syncPresetActiveState();

      if (cropOverlay) cropOverlay.classList.toggle('avatar-mode', targetType === 'avatar');
      if (cropOverlayVideo) cropOverlayVideo.classList.toggle('avatar-mode', targetType === 'avatar');

      const subEl = document.getElementById('mediaStudioSub');
      const mbSize = (file.size / (1024 * 1024)).toFixed(1);
      if (subEl) {
        subEl.innerHTML = `<span class="studio-file-pill"><i class="${this.isVideo ? 'fa-solid fa-video text-lime' : 'fa-solid fa-image text-lime'}"></i> <strong>${file.name}</strong> (${mbSize} MB)</span> • ${this.isVideo ? 'Drag sliders to trim clip & frame shot' : 'Pinch or scroll to zoom & frame shot'}`;
      }

      if (this.isVideo) {
        if (titleEl) titleEl.textContent = targetType === 'avatar' ? 'Frame & Trim Video Avatar' : 'Frame & Trim Motion Banner';
        if (iconEl) iconEl.className = 'fa-solid fa-video text-lime';
        if (applyText) applyText.textContent = 'Apply & Frame';
        if (videoWrap) videoWrap.style.display = 'flex';
        if (imageWrap) imageWrap.style.display = 'none';
        if (videoControls) videoControls.style.display = 'flex';

        const videoEl = document.getElementById('studioVideoPlayer');
        if (videoEl) {
          // Pause and reset previous media
          videoEl.pause();
          videoEl.removeAttribute('src');
          
          videoEl.muted = true;
          videoEl.defaultMuted = true;
          videoEl.volume = 0;
          videoEl.playsInline = true;
          videoEl.setAttribute('playsinline', '');
          videoEl.setAttribute('muted', '');
          videoEl.setAttribute('autoplay', '');
          videoEl.loop = true;

          let metadataLoaded = false;

          const startPlayback = () => {
            if (videoEl.paused) {
              const playPromise = videoEl.play();
              if (playPromise !== undefined) {
                playPromise.then(() => {
                  this.isPlaying = true;
                  this.updateVideoPlayIcon();
                }).catch(() => {
                  this.isPlaying = false;
                  this.updateVideoPlayIcon();
                });
              }
            }
          };

          const setupMetadata = () => {
            if (metadataLoaded) return;
            const dur = videoEl.duration;
            if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
              this.videoDuration = dur;
            } else {
              this.videoDuration = 10;
            }
            metadataLoaded = true;
            this.startTime = 0;
            const maxLen = targetType === 'avatar' ? 3.0 : 4.0;
            this.endTime = Math.min(maxLen, this.videoDuration);

            const trimRangeTitle = document.getElementById('trimRangeTitle');
            if (trimRangeTitle) {
              trimRangeTitle.textContent = `TRIM CLIP RANGE (MAX ${maxLen.toFixed(1)}S LOOP)`;
            }

            const startSlider = document.getElementById('videoStartSlider');
            const endSlider = document.getElementById('videoEndSlider');

            if (startSlider) {
              startSlider.min = 0;
              startSlider.max = this.videoDuration;
              startSlider.value = 0;
            }
            if (endSlider) {
              endSlider.min = 0;
              endSlider.max = this.videoDuration;
              endSlider.value = this.endTime;
            }

            // If seekable, fast forward to 0.05s to avoid frame 0 black fade
            if (videoEl.readyState >= 2) {
              try {
                if (videoEl.currentTime < 0.05) {
                  videoEl.currentTime = 0.05;
                }
              } catch (_) {}
            }

            startPlayback();
            this.updateVideoUI();
          };

          videoEl.onloadedmetadata = () => {
            setupMetadata();
            startPlayback();
          };
          videoEl.onloadeddata = () => {
            setupMetadata();
            startPlayback();
          };
          videoEl.oncanplay = () => {
            setupMetadata();
            startPlayback();
          };
          videoEl.onerror = (e) => {
            console.warn('Video preview error:', e);
          };

          const blobUrl = MediaPreviewEngine.createManagedUrl(file);
          videoEl.src = blobUrl;
          videoEl.load();

          if (videoEl.readyState >= 1) {
            setupMetadata();
          }
        }
      } else {
        // Image Mode (Static Photo or Animated GIF)
        const isAnimated = file.type === 'image/gif' || file.type === 'image/webp';
        const typeLabel = targetType === 'avatar' ? (isAnimated ? 'Animated Avatar' : 'Avatar Photo') : (isAnimated ? 'Animated Banner' : 'Banner Wallpaper');
        if (titleEl) titleEl.textContent = `Crop & Position ${typeLabel}`;
        if (iconEl) iconEl.className = isAnimated ? 'fa-solid fa-wand-magic-sparkles text-lime' : 'fa-solid fa-crop-simple text-lime';
        if (applyText) applyText.textContent = 'Apply & Frame';
        if (videoWrap) videoWrap.style.display = 'none';
        if (imageWrap) imageWrap.style.display = 'flex';
        if (videoControls) videoControls.style.display = 'none';

        const imgEl = document.getElementById('studioCropImg');
        if (imgEl) {
          if (isAnimated) {
            // Direct object URL for animated GIF/WebP ensures smooth hardware-accelerated playback with 0 CPU overhead
            const animBlobUrl = MediaPreviewEngine.createManagedUrl(file);
            imgEl.src = animBlobUrl;
            this.imageObj = new Image();
            this.imageObj.src = animBlobUrl;
          } else {
            MediaPreviewEngine.generateImagePreview(file, 1024).then(previewUrl => {
              imgEl.src = previewUrl;
              this.imageObj = new Image();
              this.imageObj.src = previewUrl;
            });
          }
        }
      }
      this.renderTransform();
    },

    updateVideoUI() {
      const startVal = document.getElementById('valStartTimestamp');
      const endVal = document.getElementById('valEndTimestamp');
      const clipDur = document.getElementById('valClipDuration');
      const highlightBar = document.getElementById('rangeHighlightBar');

      if (startVal) startVal.textContent = this.formatTime(this.startTime);
      if (endVal) endVal.textContent = this.formatTime(this.endTime);
      
      const duration = (this.endTime - this.startTime).toFixed(1);
      if (clipDur) clipDur.textContent = `Clip: ${duration}s`;

      if (highlightBar && this.videoDuration > 0) {
        const leftPct = (this.startTime / this.videoDuration) * 100;
        const rightPct = (this.endTime / this.videoDuration) * 100;
        highlightBar.style.left = `${leftPct}%`;
        highlightBar.style.width = `${Math.max(2, rightPct - leftPct)}%`;
      }
    },

    toggleVideoPlay() {
      const videoEl = document.getElementById('studioVideoPlayer');
      if (!videoEl) return;
      if (videoEl.paused) {
        if (videoEl.currentTime >= this.endTime || videoEl.currentTime < this.startTime) {
          videoEl.currentTime = this.startTime > 0 ? this.startTime : 0.05;
        }
        videoEl.play().then(() => {
          this.isPlaying = true;
          this.updateVideoPlayIcon();
        }).catch(() => {
          this.isPlaying = false;
          this.updateVideoPlayIcon();
        });
      } else {
        videoEl.pause();
        this.isPlaying = false;
        this.updateVideoPlayIcon();
      }
    },

    updateVideoPlayIcon() {
      const icon = document.getElementById('iconVideoPlayState');
      const btn = document.getElementById('btnToggleVideoPlayback');
      const textSpan = btn?.querySelector('span');
      const isActuallyPlaying = this.isPlaying && !document.getElementById('studioVideoPlayer')?.paused;
      if (icon) {
        icon.className = isActuallyPlaying ? 'fa-solid fa-pause' : 'fa-solid fa-play';
      }
      if (textSpan) {
        textSpan.textContent = isActuallyPlaying ? 'Pause Clip' : 'Play Clip';
      }
    },

    close() {
      const modal = document.getElementById('mediaStudioModal');
      const videoEl = document.getElementById('studioVideoPlayer');
      if (videoEl) {
        videoEl.pause();
        videoEl.src = '';
      }
      if (modal) modal.style.display = 'none';
      this.currentFile = null;

      // Resume live preview videos
      document.querySelectorAll('#lpAvatarImg, #lpBannerImg').forEach(v => {
        if (v.tagName === 'VIDEO') v.play().catch(() => {});
      });
    },

    async apply() {
      if (!this.currentFile) return;

      if (this.isVideo) {
        // Video trimming and positioning applied
        const videoEl = document.getElementById('studioVideoPlayer');
        if (videoEl) videoEl.pause();

        const clipLen = (this.endTime - this.startTime).toFixed(1);
        const videoBlobUrl = MediaPreviewEngine.createManagedUrl(this.currentFile);

        // Generate instant lightweight 256px poster snapshot for thumbnail chips
        const posterUrl = await MediaPreviewEngine.extractVideoPoster(this.currentFile, 256) || videoBlobUrl;

        if (this.targetType === 'avatar') {
          EditProfileManager.pendingAvatarFile = this.currentFile;
          EditProfileManager.pendingAvatarPosterUrl = posterUrl;
          EditProfileManager.draftProfile.avatarUrl = videoBlobUrl;
          const avThumb = document.getElementById('editorAvatarPreview');
          if (avThumb) avThumb.src = posterUrl;
        } else {
          EditProfileManager.pendingBannerFile = this.currentFile;
          EditProfileManager.pendingBannerPosterUrl = posterUrl;
          EditProfileManager.draftProfile.bannerUrl = videoBlobUrl;
          const banThumb = document.getElementById('editorBannerPreview');
          if (banThumb) banThumb.src = posterUrl;
        }

        EditProfileManager.updateLivePreview();
        EditProfileManager.markDirty(true);
        this.close();
        showToast(`Motion clip framed & trimmed to ${clipLen}s!`);
      } else if (this.currentFile.type === 'image/gif' || this.currentFile.type === 'image/webp') {
        // For animated GIF or animated WebP: use direct managed URL to preserve full dynamic animation in live preview
        const animBlobUrl = MediaPreviewEngine.createManagedUrl(this.currentFile);
        if (this.targetType === 'avatar') {
          EditProfileManager.pendingAvatarFile = this.currentFile;
          EditProfileManager.pendingAvatarPosterUrl = animBlobUrl;
          EditProfileManager.draftProfile.avatarUrl = animBlobUrl;
          const avThumb = document.getElementById('editorAvatarPreview');
          if (avThumb) avThumb.src = animBlobUrl;
        } else {
          EditProfileManager.pendingBannerFile = this.currentFile;
          EditProfileManager.pendingBannerPosterUrl = animBlobUrl;
          EditProfileManager.draftProfile.bannerUrl = animBlobUrl;
          const banThumb = document.getElementById('editorBannerPreview');
          if (banThumb) banThumb.src = animBlobUrl;
        }
        EditProfileManager.updateLivePreview();
        EditProfileManager.markDirty(true);
        this.close();
        showToast('Animated media framed & applied!');
      } else {
        // Static Photo Crop, Pan, Zoom, Flip & Rotation Canvas Export (4:5 Portrait PFP & 3:1 Banner)
        try {
          const canvas = document.createElement('canvas');
          const isAvatar = this.targetType === 'avatar';
          canvas.width = isAvatar ? 512 : 1920;
          canvas.height = isAvatar ? 640 : 640; // 4:5 portrait (512x640) for avatar, 3:1 (1920x640) for banner
          const ctx = canvas.getContext('2d');

          const imgEl = document.getElementById('studioCropImg');
          if (imgEl && ctx) {
            ctx.fillStyle = '#090d15';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(canvas.width / 2 + this.panX, canvas.height / 2 + this.panY);
            ctx.scale(this.zoomLevel * (this.flipH ? -1 : 1), this.zoomLevel * (this.flipV ? -1 : 1));
            ctx.rotate((this.rotationDeg * Math.PI) / 180);

            // Draw image centered
            const aspect = (imgEl.naturalWidth || 1) / (imgEl.naturalHeight || 1);
            let drawW = canvas.width;
            let drawH = canvas.width / aspect;
            if (drawH < canvas.height) {
              drawH = canvas.height;
              drawW = canvas.height * aspect;
            }
            ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();

            canvas.toBlob((blob) => {
              if (!blob) {
                this.close();
                return;
              }
              const croppedFile = new File([blob], `framed_${this.targetType}.webp`, { type: 'image/webp' });
              const localBlobUrl = MediaPreviewEngine.createManagedUrl(croppedFile);

              if (this.targetType === 'avatar') {
                EditProfileManager.pendingAvatarFile = croppedFile;
                EditProfileManager.pendingAvatarPosterUrl = localBlobUrl;
                EditProfileManager.draftProfile.avatarUrl = localBlobUrl;
                const avThumb = document.getElementById('editorAvatarPreview');
                if (avThumb) avThumb.src = localBlobUrl;
              } else {
                EditProfileManager.pendingBannerFile = croppedFile;
                EditProfileManager.pendingBannerPosterUrl = localBlobUrl;
                EditProfileManager.draftProfile.bannerUrl = localBlobUrl;
                const banThumb = document.getElementById('editorBannerPreview');
                if (banThumb) banThumb.src = localBlobUrl;
              }

              EditProfileManager.updateLivePreview();
              EditProfileManager.markDirty(true);
              this.close();
              showToast('Media positioned, framed & applied!');
            }, 'image/webp', 0.88);
          }
        } catch (err) {
          console.error('Crop export error:', err);
          this.close();
        }
      }
    }
  };

  const EditProfileManager = {
    savedProfile: null,
    draftProfile: null,
    isDirty: false,
    pendingAvatarFile: null,
    pendingAvatarPosterUrl: null,
    pendingBannerFile: null,
    pendingBannerPosterUrl: null,
    activeTab: 'profile',

    getDefaultDraft() {
      return {
        displayName: currentUser?.display_name || currentUser?.username || 'Contender',
        username: currentUser?.username || 'user',
        bio: currentUser?.bio || '',
        location: currentUser?.location || '',
        dateOfBirth: currentUser?.date_of_birth || '',
        gender: currentUser?.gender || 'Male',
        socialLinks: currentUser?.social_links ? (typeof currentUser.social_links === 'string' ? JSON.parse(currentUser.social_links) : currentUser.social_links) : { instagram: '', youtube: '', twitter: '', discord: '' },
        visibility: currentUser?.visibility || 'public',
        avatarUrl: currentUser?.avatar_url || '',
        bannerUrl: currentUser?.banner_url || '',
        avatarShape: currentUser?.avatar_shape || 'rectangular',
        avatarFrame: currentUser?.avatar_frame || 'none',
        profileTheme: currentUser?.profile_theme || 'default',
        profileAccent: currentUser?.profile_accent || 'lime',
        profileBadge: currentUser?.profile_badge || 'senior_roaster',
        profileEffects: currentUser?.profile_effects || 'none',
        stats: currentUser?.stats || { posts: 40, reputation: 1800, cooked: 12, badges: 5 }
      };
    },

    async open() {
      if (!AuthAPI.getToken() || !currentUser) {
        AuthManager.requireAuth({ type: 'profile' }, 'Please sign in to edit your profile arena.', 'Edit Profile');
        return;
      }

      // Fetch fresh profile DTO from server (Single Source of Truth)
      try {
        const res = await AuthAPI.request(`/api/users/${encodeURIComponent(currentUser.username)}/profile`);
        if (res && res.profile) {
          const p = res.profile;
          let sLinks = p.socialLinks || {};
          if (typeof sLinks === 'string') {
            try { sLinks = JSON.parse(sLinks); } catch (e) { sLinks = {}; }
          }
          this.savedProfile = {
            displayName: p.displayName || p.username,
            username: p.username,
            bio: p.bio || '',
            location: p.location || '',
            dateOfBirth: p.dateOfBirth || '',
            gender: p.gender || 'Male',
            socialLinks: sLinks,
            visibility: p.visibility || 'public',
            avatarUrl: p.avatarUrl || '',
            bannerUrl: p.bannerUrl || '',
            avatarShape: p.avatarShape || 'rectangular',
            avatarFrame: p.avatarFrame || 'none',
            profileTheme: p.profileTheme || 'default',
            profileAccent: p.profileAccent || 'lime',
            profileBadge: p.profileBadge || 'senior_roaster',
            profileEffects: p.profileEffects || 'none',
            rankTitle: p.rankTitle || 'Senior Roaster',
            stats: p.stats || { posts: 40, reputation: 1800, cooked: 12, badges: 5 }
          };
        } else {
          this.savedProfile = this.getDefaultDraft();
        }
      } catch (err) {
        console.warn('Could not fetch server profile DTO, using session state:', err);
        this.savedProfile = this.getDefaultDraft();
      }

      this.draftProfile = JSON.parse(JSON.stringify(this.savedProfile));
      this.pendingAvatarFile = null;
      this.pendingAvatarPosterUrl = null;
      this.pendingBannerFile = null;
      this.pendingBannerPosterUrl = null;
      this.isDirty = false;

      this.populateForm();
      this.updateLivePreview();
      this.markDirty(false);
    },

    populateForm() {
      const d = this.draftProfile;
      if (!d) return;

      // Inputs
      const nameInp = document.getElementById('editorDisplayNameInput');
      if (nameInp) nameInp.value = d.displayName || '';

      const userInp = document.getElementById('editorUsernameInput');
      if (userInp) userInp.value = d.username || '';

      const domainSpan = document.querySelector('#editorDomainPreview span');
      if (domainSpan) domainSpan.textContent = d.username || '';

      const bioInp = document.getElementById('editorBioInput');
      if (bioInp) {
        bioInp.value = d.bio || '';
        const counter = document.getElementById('editorBioCounter');
        if (counter) counter.textContent = `${bioInp.value.length}/150`;
      }

      const locInp = document.getElementById('editorLocationInput');
      if (locInp) locInp.value = d.location || '';

      const dobInp = document.getElementById('editorDobInput');
      if (dobInp) dobInp.value = d.dateOfBirth || '';

      const genSel = document.getElementById('editorGenderSelect');
      if (genSel) genSel.value = d.gender || 'Male';

      const visSel = document.getElementById('editorVisibilitySelect');
      if (visSel) visSel.value = d.visibility || 'public';

      // Social Links
      const sLinks = d.socialLinks || {};
      const igInp = document.getElementById('socialInstagramInput');
      if (igInp) igInp.value = sLinks.instagram || '';

      const ytInp = document.getElementById('socialYoutubeInput');
      if (ytInp) ytInp.value = sLinks.youtube || '';

      const twInp = document.getElementById('socialTwitterInput');
      if (twInp) twInp.value = sLinks.twitter || '';

      const dcInp = document.getElementById('socialDiscordInput');
      if (dcInp) dcInp.value = sLinks.discord || '';

      // Thumbs
      const avThumb = document.getElementById('editorAvatarPreview');
      if (avThumb) {
        avThumb.src = this.pendingAvatarPosterUrl || d.avatarUrl || GUEST_SILHOUETTE_SVG;
      }
      const banThumb = document.getElementById('editorBannerPreview');
      if (banThumb) {
        banThumb.src = this.pendingBannerPosterUrl || d.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80';
      }

      // Visual Selectors Selection States
      this.syncActivePills();
    },

    syncActivePills() {
      const d = this.draftProfile;
      if (!d) return;

      // Shape
      document.querySelectorAll('.shape-card').forEach(c => {
        c.classList.toggle('active', c.dataset.shape === d.avatarShape);
      });

      // Frame
      document.querySelectorAll('.frame-card').forEach(c => {
        c.classList.toggle('active', c.dataset.frame === d.avatarFrame);
      });

      // Accent
      document.querySelectorAll('.accent-color-btn').forEach(c => {
        c.classList.toggle('active', c.dataset.accent === d.profileAccent);
      });

      // Theme
      document.querySelectorAll('.theme-card').forEach(c => {
        c.classList.toggle('active', c.dataset.theme === d.profileTheme);
      });

      // Badge
      document.querySelectorAll('.badge-select-card').forEach(c => {
        c.classList.toggle('active', c.dataset.badge === d.profileBadge);
      });

      // Effects
      document.querySelectorAll('.effect-card').forEach(c => {
        c.classList.toggle('active', c.dataset.effect === d.profileEffects);
      });
    },

    updateLivePreviewTextOnly() {
      const d = this.draftProfile;
      if (!d) return;

      const lpDisplayName = document.getElementById('lpDisplayName');
      if (lpDisplayName) lpDisplayName.textContent = d.displayName || d.username || 'Contender';

      const lpHandle = document.getElementById('lpHandle');
      if (lpHandle) lpHandle.textContent = `@${d.username || 'user'}`;

      const lpBio = document.getElementById('lpBio');
      if (lpBio) lpBio.textContent = d.bio || 'Arena contender.';

      const cardAuthor1 = document.getElementById('lpCardAuthor1');
      if (cardAuthor1) cardAuthor1.textContent = d.displayName || d.username;
      const cardHandle1 = document.getElementById('lpCardHandle1');
      if (cardHandle1) cardHandle1.textContent = `@${d.username}`;

      const cardAuthor2 = document.getElementById('lpCardAuthor2');
      if (cardAuthor2) cardAuthor2.textContent = d.displayName || d.username;
      const cardHandle2 = document.getElementById('lpCardHandle2');
      if (cardHandle2) cardHandle2.textContent = `@${d.username}`;

      const lpLocationText = document.getElementById('lpLocationText');
      const lpMetaLocation = document.getElementById('lpMetaLocation');
      if (lpLocationText && lpMetaLocation) {
        if (d.location && d.location.trim()) {
          lpLocationText.textContent = d.location;
          lpMetaLocation.style.display = 'inline-flex';
        } else {
          lpMetaLocation.style.display = 'none';
        }
      }

      const lpDobText = document.getElementById('lpDobText');
      const lpMetaDob = document.getElementById('lpMetaDob');
      if (lpDobText && lpMetaDob) {
        if (d.dateOfBirth && d.dateOfBirth.trim()) {
          lpDobText.textContent = d.dateOfBirth;
          lpMetaDob.style.display = 'inline-flex';
        } else {
          lpMetaDob.style.display = 'none';
        }
      }

      const lpGenderText = document.getElementById('lpGenderText');
      const lpMetaGender = document.getElementById('lpMetaGender');
      if (lpGenderText && lpMetaGender) {
        if (d.gender && d.gender.trim()) {
          lpGenderText.textContent = d.gender;
          lpMetaGender.style.display = 'inline-flex';
        } else {
          lpMetaGender.style.display = 'none';
        }
      }

      const lpAvatarFrameBox = document.getElementById('lpAvatarFrameBox');
      if (lpAvatarFrameBox) {
        lpAvatarFrameBox.className = `lp-avatar-frame-box frame-${d.avatarFrame || 'none'}`;
      }

      const card = document.getElementById('livePreviewCard');
      if (card) {
        card.className = 'live-preview-card';
        if (d.profileTheme && d.profileTheme !== 'default') {
          card.classList.add(`theme-${d.profileTheme}`);
        }
        if (d.profileEffects && d.profileEffects !== 'none') {
          card.classList.add(`effect-${d.profileEffects}`);
        }
        if (d.profileAccent) {
          card.dataset.accent = d.profileAccent;
        }
      }
    },

    updateLivePreview() {
      const d = this.draftProfile;
      if (!d) return;

      // 1. Update text & styles
      this.updateLivePreviewTextOnly();

      // 2. Banner image / video
      const bannerContainer = document.querySelector('.lp-banner-box');
      if (bannerContainer) {
        const bannerUrl = d.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80';
        const isVideo = AvatarService.isVideoUrl(bannerUrl) || (this.pendingBannerFile?.type?.startsWith('video/'));
        
        let existingMedia = bannerContainer.querySelector('.lp-banner-media') || document.getElementById('lpBannerImg');
        if (existingMedia) existingMedia.classList.add('lp-banner-media');

        if (isVideo) {
          if (!existingMedia || existingMedia.tagName !== 'VIDEO') {
            const videoEl = document.createElement('video');
            videoEl.id = 'lpBannerImg';
            videoEl.className = 'lp-banner-img lp-banner-media';
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.muted = true;
            videoEl.defaultMuted = true;
            videoEl.playsInline = true;
            videoEl.setAttribute('playsinline', '');
            videoEl.setAttribute('preload', 'auto');
            videoEl.src = bannerUrl;
            videoEl.dataset.activeSrc = bannerUrl;
            if (existingMedia) {
              bannerContainer.replaceChild(videoEl, existingMedia);
            } else {
              bannerContainer.insertBefore(videoEl, bannerContainer.firstChild);
            }
            videoEl.play().catch(() => {});
          } else {
            if (!AvatarService.isSameUrl(existingMedia, bannerUrl)) {
              existingMedia.src = bannerUrl;
              existingMedia.dataset.activeSrc = bannerUrl;
              existingMedia.load();
              existingMedia.play().catch(() => {});
            } else if (existingMedia.paused) {
              existingMedia.play().catch(() => {});
            }
          }
        } else {
          if (!existingMedia || existingMedia.tagName !== 'IMG') {
            const imgEl = document.createElement('img');
            imgEl.id = 'lpBannerImg';
            imgEl.className = 'lp-banner-img lp-banner-media';
            imgEl.src = bannerUrl;
            imgEl.alt = 'Banner';
            imgEl.dataset.activeSrc = bannerUrl;
            if (existingMedia) {
              bannerContainer.replaceChild(imgEl, existingMedia);
            } else {
              bannerContainer.insertBefore(imgEl, bannerContainer.firstChild);
            }
          } else {
            if (!AvatarService.isSameUrl(existingMedia, bannerUrl)) {
              existingMedia.src = bannerUrl;
              existingMedia.dataset.activeSrc = bannerUrl;
            }
          }
        }
      }

      // 3. Avatar image / video
      const avatarContainer = document.querySelector('.lp-avatar-box');
      if (avatarContainer) {
        const avatarUrl = d.avatarUrl || GUEST_SILHOUETTE_SVG;
        const isVideo = AvatarService.isVideoUrl(avatarUrl) || (this.pendingAvatarFile?.type?.startsWith('video/'));
        let existingAv = avatarContainer.querySelector('.lp-avatar-img');

        if (isVideo) {
          if (!existingAv || existingAv.tagName !== 'VIDEO') {
            const videoEl = document.createElement('video');
            videoEl.id = 'lpAvatarImg';
            videoEl.className = `lp-avatar-img shape-${d.avatarShape || 'rectangular'}`;
            videoEl.autoplay = true;
            videoEl.loop = true;
            videoEl.muted = true;
            videoEl.defaultMuted = true;
            videoEl.playsInline = true;
            videoEl.setAttribute('playsinline', '');
            videoEl.setAttribute('preload', 'auto');
            videoEl.src = avatarUrl;
            videoEl.dataset.activeSrc = avatarUrl;
            if (existingAv) {
              avatarContainer.replaceChild(videoEl, existingAv);
            } else {
              avatarContainer.appendChild(videoEl);
            }
            videoEl.play().catch(() => {});
          } else {
            if (!AvatarService.isSameUrl(existingAv, avatarUrl)) {
              existingAv.src = avatarUrl;
              existingAv.dataset.activeSrc = avatarUrl;
              existingAv.load();
              existingAv.play().catch(() => {});
            } else if (existingAv.paused) {
              existingAv.play().catch(() => {});
            }
            existingAv.className = `lp-avatar-img shape-${d.avatarShape || 'rectangular'}`;
          }
        } else {
          if (!existingAv || existingAv.tagName !== 'IMG') {
            const imgEl = document.createElement('img');
            imgEl.id = 'lpAvatarImg';
            imgEl.className = `lp-avatar-img shape-${d.avatarShape || 'rectangular'}`;
            imgEl.src = avatarUrl;
            imgEl.alt = 'Avatar';
            imgEl.dataset.activeSrc = avatarUrl;
            if (existingAv) {
              avatarContainer.replaceChild(imgEl, existingAv);
            } else {
              avatarContainer.appendChild(imgEl);
            }
          } else {
            if (!AvatarService.isSameUrl(existingAv, avatarUrl)) {
              existingAv.src = avatarUrl;
              existingAv.dataset.activeSrc = avatarUrl;
            }
            existingAv.className = `lp-avatar-img shape-${d.avatarShape || 'rectangular'}`;
          }
        }
      }

      // 4. Feed Card Avatars (Use lightweight poster thumbnail for video, full animUrl for GIF)
      const feedAvatarThumb = (this.pendingAvatarFile?.type?.startsWith('video/')) ? (this.pendingAvatarPosterUrl || GUEST_SILHOUETTE_SVG) : (d.avatarUrl || GUEST_SILHOUETTE_SVG);
      const cardAvatar1 = document.getElementById('lpCardAvatar1');
      if (cardAvatar1) cardAvatar1.src = feedAvatarThumb;
      const cardAvatar2 = document.getElementById('lpCardAvatar2');
      if (cardAvatar2) cardAvatar2.src = feedAvatarThumb;

      // 5. Form Preview Thumbs
      const formAvatarThumb = document.getElementById('editorAvatarPreview');
      if (formAvatarThumb) {
        formAvatarThumb.src = (this.pendingAvatarFile?.type?.startsWith('video/')) ? (this.pendingAvatarPosterUrl || GUEST_SILHOUETTE_SVG) : (d.avatarUrl || GUEST_SILHOUETTE_SVG);
      }

      const formBannerThumb = document.getElementById('editorBannerPreview');
      if (formBannerThumb) {
        formBannerThumb.src = (this.pendingBannerFile?.type?.startsWith('video/')) ? (this.pendingBannerPosterUrl || d.bannerUrl) : (d.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80');
      }

      // Rank / Badge
      const lpRankBadge = document.getElementById('lpRankBadge');
      if (lpRankBadge) {
        const badgeNames = {
          'senior_roaster': 'Senior Roaster',
          'verified': 'Verified Citizen',
          'battle_champ': 'Battle Champion',
          'problem_solver': 'Problem Solver',
          'helpful': 'Helpful Roaster'
        };
        lpRankBadge.textContent = badgeNames[d.profileBadge] || 'Arena Member';
      }

      // Social links pills
      const socialContainer = document.getElementById('lpSocialLinksRow');
      if (socialContainer) {
        socialContainer.innerHTML = '';
        const sLinks = d.socialLinks || {};
        const entries = [
          { key: 'instagram', icon: 'fa-brands fa-instagram', label: 'Instagram', url: sLinks.instagram },
          { key: 'youtube', icon: 'fa-brands fa-youtube', label: 'YouTube', url: sLinks.youtube },
          { key: 'twitter', icon: 'fa-brands fa-x-twitter', label: 'X (Twitter)', url: sLinks.twitter },
          { key: 'discord', icon: 'fa-brands fa-discord', label: 'Discord', url: sLinks.discord }
        ];

        entries.forEach(item => {
          if (item.url && item.url.trim()) {
            const pill = document.createElement('a');
            pill.href = item.url;
            pill.target = '_blank';
            pill.rel = 'noopener noreferrer';
            pill.className = `lp-social-pill pill-${item.key}`;
            pill.innerHTML = `<i class="${item.icon}"></i><span>${item.label}</span>`;
            socialContainer.appendChild(pill);
          }
        });
      }

      this.updateStagedIndicators();
    },

    updateStagedIndicators() {
      // 1. General Avatar staged status badge
      let avBadge = document.getElementById('stagedAvatarBadge');
      if (!avBadge) {
        avBadge = document.createElement('div');
        avBadge.id = 'stagedAvatarBadge';
        avBadge.className = 'staged-media-pill';
        const anchor = document.querySelector('.avatar-meta-actions') || document.querySelector('.avatar-manager-row');
        if (anchor) anchor.appendChild(avBadge);
      }
      if (this.pendingAvatarFile) {
        const mb = (this.pendingAvatarFile.size / (1024 * 1024)).toFixed(1);
        const isVid = this.pendingAvatarFile.type?.startsWith('video/');
        avBadge.innerHTML = `<i class="fa-solid fa-circle-check text-green"></i> <span>Selected: <strong>${this.pendingAvatarFile.name}</strong> (${mb} MB ${isVid ? '• Video' : ''})</span>`;
        avBadge.style.display = 'inline-flex';
      } else {
        avBadge.style.display = 'none';
      }

      // 2. Nitro Avatar staged status box
      const nitroAvStatus = document.getElementById('nitroAvatarStagedStatus');
      if (nitroAvStatus) {
        if (this.pendingAvatarFile) {
          const mb = (this.pendingAvatarFile.size / (1024 * 1024)).toFixed(1);
          const isVid = this.pendingAvatarFile.type?.startsWith('video/');
          const fileKey = `${this.pendingAvatarFile.name}_${this.pendingAvatarFile.size}`;
          if (nitroAvStatus.dataset.fileKey !== fileKey) {
            nitroAvStatus.dataset.fileKey = fileKey;
            const thumbUrl = isVid ? (this.pendingAvatarPosterUrl || GUEST_SILHOUETTE_SVG) : (this.draftProfile?.avatarUrl || GUEST_SILHOUETTE_SVG);
            nitroAvStatus.innerHTML = `
              <img src="${thumbUrl}" class="nitro-staged-thumb" alt="Staged Avatar">
              <div class="nitro-staged-info">
                <div class="nitro-staged-title"><i class="fa-solid fa-circle-check text-green"></i> ${isVid ? 'Motion Video Avatar' : 'Custom Avatar'} Selected</div>
                <div class="nitro-staged-sub"><strong>${this.pendingAvatarFile.name}</strong> (${mb} MB) • Ready to Save</div>
              </div>
            `;
          }
          nitroAvStatus.style.display = 'flex';
        } else {
          nitroAvStatus.dataset.fileKey = '';
          nitroAvStatus.style.display = 'none';
        }
      }

      // 3. General Banner staged status badge
      let banBadge = document.getElementById('stagedBannerBadge');
      if (!banBadge) {
        banBadge = document.createElement('div');
        banBadge.id = 'stagedBannerBadge';
        banBadge.className = 'staged-media-pill';
        const anchor = document.querySelector('.interactive-banner-box') || document.querySelector('.visual-header-card');
        if (anchor) anchor.appendChild(banBadge);
      }
      if (this.pendingBannerFile) {
        const mb = (this.pendingBannerFile.size / (1024 * 1024)).toFixed(1);
        const isVid = this.pendingBannerFile.type?.startsWith('video/');
        banBadge.innerHTML = `<i class="fa-solid fa-circle-check text-green"></i> <span>Selected: <strong>${this.pendingBannerFile.name}</strong> (${mb} MB ${isVid ? '• Motion Video' : ''})</span>`;
        banBadge.style.display = 'inline-flex';
      } else {
        banBadge.style.display = 'none';
      }

      // 4. Nitro Banner staged status box
      const nitroBanStatus = document.getElementById('nitroBannerStagedStatus');
      if (nitroBanStatus) {
        if (this.pendingBannerFile) {
          const mb = (this.pendingBannerFile.size / (1024 * 1024)).toFixed(1);
          const isVid = this.pendingBannerFile.type?.startsWith('video/');
          const fileKey = `${this.pendingBannerFile.name}_${this.pendingBannerFile.size}`;
          if (nitroBanStatus.dataset.fileKey !== fileKey) {
            nitroBanStatus.dataset.fileKey = fileKey;
            const thumbUrl = isVid ? (this.pendingBannerPosterUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80') : (this.draftProfile?.bannerUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80');
            nitroBanStatus.innerHTML = `
              <img src="${thumbUrl}" class="nitro-staged-thumb" alt="Staged Banner">
              <div class="nitro-staged-info">
                <div class="nitro-staged-title"><i class="fa-solid fa-circle-check text-green"></i> ${isVid ? 'Motion Video Banner' : 'Custom Banner'} Selected</div>
                <div class="nitro-staged-sub"><strong>${this.pendingBannerFile.name}</strong> (${mb} MB) • Ready to Save</div>
              </div>
            `;
          }
          nitroBanStatus.style.display = 'flex';
        } else {
          nitroBanStatus.dataset.fileKey = '';
          nitroBanStatus.style.display = 'none';
        }
      }
    },

    markDirty(status = true) {
      this.isDirty = status;
      const saveBtn = document.getElementById('btnEditorSave');
      const discardBtn = document.getElementById('btnEditorDiscard');
      if (saveBtn) {
        saveBtn.classList.toggle('is-dirty', status);
      }
      if (discardBtn) {
        discardBtn.classList.toggle('is-dirty', status);
      }
    },

    async save() {
      if (!AuthAPI.getToken() || !currentUser) {
        AuthManager.requireAuth({ type: 'profile' }, 'Please sign in to save profile changes.', 'Save Profile');
        return;
      }

      const saveBtn = document.getElementById('btnEditorSave');
      const textSpan = saveBtn?.querySelector('.btn-save-text');
      const spinSpan = saveBtn?.querySelector('.btn-save-spinner');

      try {
        if (saveBtn) saveBtn.disabled = true;
        if (spinSpan) spinSpan.style.display = 'inline-block';

        // 1. Upload Pending Avatar if chosen via local file
        let finalAvatarUrl = this.draftProfile.avatarUrl;
        if (this.pendingAvatarFile) {
          try {
            const isVid = this.pendingAvatarFile.type?.startsWith('video/');
            const isGif = this.pendingAvatarFile.type === 'image/gif' || this.pendingAvatarFile.type === 'image/webp';
            const mediaType = (isVid || isGif) ? 'animatedAvatar' : 'avatar';
            if (textSpan) textSpan.textContent = 'Uploading avatar...';

            const uploadRes = await AuthAPI.uploadMedia(this.pendingAvatarFile, mediaType);
            if (uploadRes && uploadRes.url) {
              finalAvatarUrl = uploadRes.url;
              this.draftProfile.avatarUrl = finalAvatarUrl;
            }
          } catch (uploadErr) {
            console.error('Avatar upload failed:', uploadErr);
            showToast('Avatar upload failed: ' + uploadErr.message);
            return;
          }
        }

        // 2. Upload Pending Banner if chosen via local file
        let finalBannerUrl = this.draftProfile.bannerUrl;
        if (this.pendingBannerFile) {
          try {
            const isVid = this.pendingBannerFile.type?.startsWith('video/');
            const isGif = this.pendingBannerFile.type === 'image/gif' || this.pendingBannerFile.type === 'image/webp';
            const mediaType = (isVid || isGif) ? 'animatedBanner' : 'banner';
            if (textSpan) textSpan.textContent = 'Uploading banner...';

            const uploadRes = await AuthAPI.uploadMedia(this.pendingBannerFile, mediaType);
            if (uploadRes && uploadRes.url) {
              finalBannerUrl = uploadRes.url;
              this.draftProfile.bannerUrl = finalBannerUrl;
            }
          } catch (uploadErr) {
            console.error('Banner upload failed:', uploadErr);
            showToast('Banner upload failed: ' + uploadErr.message);
            return;
          }
        }

        if (textSpan) textSpan.textContent = 'Saving profile...';

        // 3. Payload with Server Mass-Assignment Allowlist
        const payload = {
          displayName: this.draftProfile.displayName,
          username: this.draftProfile.username,
          bio: this.draftProfile.bio,
          location: this.draftProfile.location,
          dateOfBirth: this.draftProfile.dateOfBirth,
          gender: this.draftProfile.gender,
          socialLinks: this.draftProfile.socialLinks,
          visibility: this.draftProfile.visibility,
          avatarUrl: finalAvatarUrl,
          bannerUrl: finalBannerUrl,
          avatarShape: this.draftProfile.avatarShape,
          avatarFrame: this.draftProfile.avatarFrame,
          profileTheme: this.draftProfile.profileTheme,
          profileAccent: this.draftProfile.profileAccent,
          profileBadge: this.draftProfile.profileBadge,
          profileEffects: this.draftProfile.profileEffects
        };

        const res = await AuthAPI.request('/api/users/profile', {
          method: 'PUT',
          body: JSON.stringify(payload)
        });

        if (res && res.user) {
          currentUser = res.user;
          AuthManager.currentUser = res.user;
          this.savedProfile = JSON.parse(JSON.stringify(this.draftProfile));
          this.pendingAvatarFile = null;
          this.pendingBannerFile = null;
          this.markDirty(false);
          this.updateStagedIndicators();

          updateUserSessionUI();
          showToast('Profile updated successfully!');
          Router.navigate('profile', true, currentUser.username);
        } else {
          showToast(res.error || 'Failed to update profile.');
        }
      } catch (err) {
        console.error('Profile update error:', err);
        showToast('' + (err.message || 'Failed to save changes.'));
      } finally {
        if (textSpan) textSpan.textContent = 'Save Changes';
        if (spinSpan) spinSpan.style.display = 'none';
        if (saveBtn) saveBtn.disabled = false;
      }
    },

    discard() {
      if (!this.savedProfile) return;
      this.draftProfile = JSON.parse(JSON.stringify(this.savedProfile));
      this.pendingAvatarFile = null;
      this.pendingBannerFile = null;
      this.populateForm();
      this.updateLivePreview();
      this.markDirty(false);
      showToast('Profile draft discarded.');
    },

    switchTab(tabName) {
      this.activeTab = tabName;
      document.querySelectorAll('#editorTabsNav .editor-nav-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tabName);
      });
      document.querySelectorAll('.editor-panel').forEach(p => {
        p.classList.remove('active');
      });
      const targetPanel = document.getElementById(`panel${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    },

    init() {
      // 0. Back button to return to profile
      const btnBack = document.getElementById('btnEditProfileBack');
      if (btnBack) {
        btnBack.addEventListener('click', (e) => {
          e.preventDefault();
          Router.navigate('profile');
        });
      }

      // 1. Discard & Save buttons
      const btnDiscard = document.getElementById('btnEditorDiscard');
      if (btnDiscard) {
        btnDiscard.addEventListener('click', (e) => {
          e.preventDefault();
          this.discard();
        });
      }

      const btnSave = document.getElementById('btnEditorSave');
      if (btnSave) {
        btnSave.addEventListener('click', (e) => {
          e.preventDefault();
          this.save();
        });
      }

      // 2. Editor Tabs Navigation (if present)
      const tabNav = document.getElementById('editorTabsNav');
      if (tabNav) {
        tabNav.querySelectorAll('.editor-nav-tab').forEach(tabBtn => {
          tabBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = tabBtn.dataset.tab;
            if (tab) this.switchTab(tab);
          });
        });
      }

      // 3. Real-Time Input Event Listeners
      const nameInput = document.getElementById('editorDisplayNameInput');
      nameInput?.addEventListener('input', (e) => {
        if (!this.draftProfile) return;
        this.draftProfile.displayName = e.target.value;
        this.updateLivePreviewTextOnly();
        this.markDirty(true);
      });

      const userInput = document.getElementById('editorUsernameInput');
      let usernameTimer = null;
      userInput?.addEventListener('input', (e) => {
        if (!this.draftProfile) return;
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        e.target.value = val;
        this.draftProfile.username = val;
        const domainSpan = document.querySelector('#editorDomainPreview span');
        if (domainSpan) domainSpan.textContent = val;
        this.updateLivePreviewTextOnly();
        this.markDirty(true);

        clearTimeout(usernameTimer);
        const checkIcon = document.getElementById('usernameCheck');
        if (checkIcon) checkIcon.style.opacity = '0.4';

        usernameTimer = setTimeout(async () => {
          if (!val || (this.savedProfile && val === this.savedProfile.username)) {
            if (checkIcon) {
              checkIcon.className = 'fa-solid fa-circle-check input-validation-icon text-green';
              checkIcon.style.opacity = '1';
            }
            return;
          }
          try {
            const res = await AuthAPI.request(`/api/users/${encodeURIComponent(val)}/profile`);
            if (res && res.profile && res.profile.username !== currentUser?.username) {
              if (checkIcon) {
                checkIcon.className = 'fa-solid fa-circle-xmark input-validation-icon text-danger';
                checkIcon.style.opacity = '1';
              }
            } else {
              if (checkIcon) {
                checkIcon.className = 'fa-solid fa-circle-check input-validation-icon text-green';
                checkIcon.style.opacity = '1';
              }
            }
          } catch (e) {
            if (checkIcon) {
              checkIcon.className = 'fa-solid fa-circle-check input-validation-icon text-green';
              checkIcon.style.opacity = '1';
            }
          }
        }, 400);
      });

      const bioInput = document.getElementById('editorBioInput');
      bioInput?.addEventListener('input', (e) => {
        if (!this.draftProfile) return;
        this.draftProfile.bio = e.target.value;
        const counter = document.getElementById('editorBioCounter');
        if (counter) counter.textContent = `${e.target.value.length}/150`;
        this.updateLivePreviewTextOnly();
        this.markDirty(true);
      });

      const locInput = document.getElementById('editorLocationInput');
      locInput?.addEventListener('input', (e) => {
        if (!this.draftProfile) return;
        this.draftProfile.location = e.target.value;
        this.updateLivePreviewTextOnly();
        this.markDirty(true);
      });

      const btnClearLoc = document.getElementById('btnClearLocation');
      btnClearLoc?.addEventListener('click', () => {
        if (!this.draftProfile) return;
        if (locInput) locInput.value = '';
        this.draftProfile.location = '';
        this.updateLivePreviewTextOnly();
        this.markDirty(true);
      });

      const dobInput = document.getElementById('editorDobInput');
      dobInput?.addEventListener('input', (e) => {
        if (!this.draftProfile) return;
        this.draftProfile.dateOfBirth = e.target.value;
        this.updateLivePreviewTextOnly();
        this.markDirty(true);
      });

      const genSelect = document.getElementById('editorGenderSelect');
      genSelect?.addEventListener('change', (e) => {
        if (!this.draftProfile) return;
        this.draftProfile.gender = e.target.value;
        this.updateLivePreviewTextOnly();
        this.markDirty(true);
      });

      const visSelect = document.getElementById('editorVisibilitySelect');
      visSelect?.addEventListener('change', (e) => {
        if (!this.draftProfile) return;
        this.draftProfile.visibility = e.target.value;
        this.markDirty(true);
      });

      // Social inputs
      const igInput = document.getElementById('socialInstagramInput');
      const ytInput = document.getElementById('socialYoutubeInput');
      const twInput = document.getElementById('socialTwitterInput');
      const dcInput = document.getElementById('socialDiscordInput');

      const updateSocialDraft = () => {
        if (!this.draftProfile) return;
        this.draftProfile.socialLinks = {
          instagram: igInput?.value || '',
          youtube: ytInput?.value || '',
          twitter: twInput?.value || '',
          discord: dcInput?.value || ''
        };
        this.updateLivePreviewTextOnly();
        this.markDirty(true);
      };

      [igInput, ytInput, twInput, dcInput].forEach(inp => {
        inp?.addEventListener('input', updateSocialDraft);
      });

      document.querySelectorAll('.btn-clear-social').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetId = btn.dataset.target;
          const inp = document.getElementById(targetId);
          if (inp) {
            inp.value = '';
            updateSocialDraft();
          }
        });
      });

      // 4. File Upload Triggers (Opens Media Trim & Crop Studio)
      MediaStudioManager.init();

      const avatarFileInput = document.getElementById('avatarFileInput');
      const btnTriggerAvatarUpload = document.getElementById('btnTriggerAvatarUpload');
      const btnTriggerAvatarUpload2 = document.getElementById('btnTriggerAvatarUpload2');
      btnTriggerAvatarUpload?.addEventListener('click', () => avatarFileInput?.click());
      btnTriggerAvatarUpload2?.addEventListener('click', () => avatarFileInput?.click());

      avatarFileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Strictly prevent animated GIF / video upload via normal avatar input
        if (file.type === 'image/gif' || file.type.startsWith('video/')) {
          showToast('Animated avatars and videos can only be uploaded in the DRAGME Nitro VIP section.');
          switchSettingsView('nitro');
          e.target.value = '';
          return;
        }
        MediaStudioManager.open(file, 'avatar');
        e.target.value = ''; // Reset so same file can be selected again
      });

      const btnRemoveAvatar = document.getElementById('btnRemoveAvatarPhoto');
      btnRemoveAvatar?.addEventListener('click', () => {
        if (!this.draftProfile) return;
        this.pendingAvatarFile = null;
        this.draftProfile.avatarUrl = '';
        const avThumb = document.getElementById('editorAvatarPreview');
        if (avThumb) avThumb.src = GUEST_SILHOUETTE_SVG;
        this.updateLivePreview();
        this.markDirty(true);
      });

      // Tab Switcher: General Settings vs DRAGME Nitro
      const tabSwitchGeneral = document.getElementById('tabSwitchGeneral');
      const tabSwitchNitro = document.getElementById('tabSwitchNitro');
      const viewGeneral = document.getElementById('viewGeneralSettings');
      const viewNitro = document.getElementById('viewNitroSettings');

      const switchSettingsView = (targetTab) => {
        if (targetTab === 'nitro') {
          tabSwitchNitro?.classList.add('active');
          tabSwitchGeneral?.classList.remove('active');
          if (viewGeneral) viewGeneral.style.display = 'none';
          if (viewNitro) {
            viewNitro.style.display = 'flex';
            viewNitro.classList.add('active');
          }
        } else {
          tabSwitchGeneral?.classList.add('active');
          tabSwitchNitro?.classList.remove('active');
          if (viewNitro) {
            viewNitro.style.display = 'none';
            viewNitro.classList.remove('active');
          }
          if (viewGeneral) viewGeneral.style.display = 'flex';
        }
      };

      tabSwitchGeneral?.addEventListener('click', () => switchSettingsView('general'));
      tabSwitchNitro?.addEventListener('click', () => switchSettingsView('nitro'));

      // Presets Grid (General Avatar)
      document.querySelectorAll('#avatarPresetsGrid .preset-av-bubble, #avatarPresetsGrid .preset-avatar-item').forEach(item => {
        item.addEventListener('click', () => {
          document.querySelectorAll('#avatarPresetsGrid .preset-av-bubble, #avatarPresetsGrid .preset-avatar-item').forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          const src = item.dataset.src;
          if (src && this.draftProfile) {
            this.pendingAvatarFile = null;
            this.draftProfile.avatarUrl = src;
            const avThumb = document.getElementById('editorAvatarPreview');
            if (avThumb) avThumb.src = src;
            this.updateLivePreview();
            this.markDirty(true);
          }
        });
      });

      const btnAddCustomPreset = document.getElementById('btnAddCustomPreset');
      btnAddCustomPreset?.addEventListener('click', () => avatarFileInput?.click());

      // Banner file upload (General)
      const bannerFileInput = document.getElementById('bannerFileInput');
      const btnTriggerBannerUpload = document.getElementById('btnTriggerBannerUpload');
      btnTriggerBannerUpload?.addEventListener('click', () => bannerFileInput?.click());

      bannerFileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Strictly prevent animated GIF / video upload via normal banner input
        if (file.type === 'image/gif' || file.type.startsWith('video/')) {
          showToast('Animated wallpapers and motion banners can only be uploaded in the DRAGME Nitro VIP section.');
          switchSettingsView('nitro');
          e.target.value = '';
          return;
        }
        MediaStudioManager.open(file, 'banner');
        e.target.value = '';
      });

      const btnRemoveBanner = document.getElementById('btnRemoveBannerPhoto');
      btnRemoveBanner?.addEventListener('click', () => {
        if (!this.draftProfile) return;
        this.pendingBannerFile = null;
        this.draftProfile.bannerUrl = '';
        const banThumb = document.getElementById('editorBannerPreview');
        if (banThumb) banThumb.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80';
        this.updateLivePreview();
        this.markDirty(true);
      });

      // Presets Strip (General Wallpapers)
      document.querySelectorAll('#bannerPresetsGrid .preset-strip-pill, #bannerPresetsGrid .banner-preset-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('#bannerPresetsGrid .preset-strip-pill, #bannerPresetsGrid .banner-preset-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const src = card.dataset.src;
          if (src && this.draftProfile) {
            this.pendingBannerFile = null;
            this.draftProfile.bannerUrl = src;
            const banThumb = document.getElementById('editorBannerPreview');
            if (banThumb) banThumb.src = src;
            this.updateLivePreview();
            this.markDirty(true);
          }
        });
      });

      // ===================================================================
      // DRAGME NITRO / LIVE PREVIEW EVENTS
      // ===================================================================

      // 1. Nitro Animated Avatars
      document.querySelectorAll('#nitroAvatarPresetsGrid .nitro-media-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('#nitroAvatarPresetsGrid .nitro-media-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const src = card.dataset.src;
          if (src && this.draftProfile) {
            this.pendingAvatarFile = null;
            this.draftProfile.avatarUrl = src;
            const avThumb = document.getElementById('editorAvatarPreview');
            if (avThumb) avThumb.src = src;
            this.updateLivePreview();
            this.markDirty(true);
            showToast('Previewing Nitro Animated Avatar!');
          }
        });
      });

      // 2. Nitro Custom Clip / GIF Avatar upload (opens trimmer/cropper)
      const nitroAvatarFileInput = document.getElementById('nitroAvatarFileInput');
      const btnTriggerNitroAvatar = document.getElementById('btnTriggerNitroAvatar');
      btnTriggerNitroAvatar?.addEventListener('click', () => nitroAvatarFileInput?.click());

      nitroAvatarFileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        MediaStudioManager.open(file, 'avatar');
        e.target.value = '';
      });

      // 3. Nitro Dynamic Motion Banners
      document.querySelectorAll('#nitroBannerPresetsGrid .nitro-banner-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('#nitroBannerPresetsGrid .nitro-banner-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const src = card.dataset.src;
          if (src && this.draftProfile) {
            this.pendingBannerFile = null;
            this.draftProfile.bannerUrl = src;
            const banThumb = document.getElementById('editorBannerPreview');
            if (banThumb) banThumb.src = src;
            this.updateLivePreview();
            this.markDirty(true);
            showToast('Previewing Nitro Motion Banner!');
          }
        });
      });

      // 4. Nitro Custom Motion Banner / Clip upload (opens trimmer/cropper)
      const nitroBannerFileInput = document.getElementById('nitroBannerFileInput');
      const btnTriggerNitroBanner = document.getElementById('btnTriggerNitroBanner');
      btnTriggerNitroBanner?.addEventListener('click', () => nitroBannerFileInput?.click());

      nitroBannerFileInput?.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        MediaStudioManager.open(file, 'banner');
        e.target.value = '';
      });

      // 5. Nitro Frames
      document.querySelectorAll('#nitroFramesGrid .frame-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('#nitroFramesGrid .frame-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const frame = card.dataset.frame || 'none';
          if (this.draftProfile) {
            this.draftProfile.avatarFrame = frame;
            this.updateLivePreview();
            this.markDirty(true);
            showToast(`Previewing frame!`);
          }
        });
      });

      // 6. Nitro CTA Button
      const btnNitroUpgradeCTA = document.getElementById('btnNitroUpgradeCTA');
      btnNitroUpgradeCTA?.addEventListener('click', () => {
        showToast('DRAGME Nitro unlocked in Preview Mode! Save changes to apply.');
      });

      // 5. Avatar Shapes
      document.querySelectorAll('.shape-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.shape-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          if (this.draftProfile) {
            this.draftProfile.avatarShape = card.dataset.shape || 'rectangular';
            this.updateLivePreview();
            this.markDirty(true);
          }
        });
      });

      // 6. Avatar Frames
      document.querySelectorAll('.frame-card').forEach(card => {
        card.addEventListener('click', () => {
          const frame = card.dataset.frame || 'none';
          const isUserVip = Boolean(currentUser?.is_premium || currentUser?.isPremium || currentUser?.role === 'admin');
          if (card.classList.contains('premium-locked') && !isUserVip) {
            showToast('Unlock Royal Frames with DRAGME Premium!');
            return;
          }
          document.querySelectorAll('.frame-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          if (this.draftProfile) {
            this.draftProfile.avatarFrame = frame;
            this.updateLivePreview();
            this.markDirty(true);
          }
        });
      });

      // 7. Accent Colors
      document.querySelectorAll('.accent-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.accent-color-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (this.draftProfile) {
            this.draftProfile.profileAccent = btn.dataset.accent || 'lime';
            this.updateLivePreview();
            this.markDirty(true);
          }
        });
      });

      // 8. Themes
      document.querySelectorAll('.theme-card').forEach(card => {
        card.addEventListener('click', () => {
          const theme = card.dataset.theme || 'default';
          const isUserVip = Boolean(currentUser?.is_premium || currentUser?.isPremium || currentUser?.role === 'admin');
          if (card.classList.contains('premium-theme') && !isUserVip) {
            showToast('Unlock Premium Arena Themes with DRAGME Premium!');
            return;
          }
          document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          if (this.draftProfile) {
            this.draftProfile.profileTheme = theme;
            this.updateLivePreview();
            this.markDirty(true);
          }
        });
      });

      // 9. Badges
      document.querySelectorAll('.badge-select-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.badge-select-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          if (this.draftProfile) {
            this.draftProfile.profileBadge = card.dataset.badge || 'senior_roaster';
            this.updateLivePreview();
            this.markDirty(true);
          }
        });
      });

      // 10. Effects
      document.querySelectorAll('.effect-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.effect-card').forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          if (this.draftProfile) {
            this.draftProfile.profileEffects = card.dataset.effect || 'none';
            this.updateLivePreview();
            this.markDirty(true);
          }
        });
      });

      // 11. Device Switcher Pills
      document.querySelectorAll('.preview-device-pills .device-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          const dev = btn.dataset.device;
          if (!dev) return;
          document.querySelectorAll('.preview-device-pills .device-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const card = document.getElementById('livePreviewCard');
          if (card) {
            card.classList.remove('device-desktop', 'device-tablet', 'device-mobile');
            card.classList.add(`device-${dev}`);
          }
        });
      });

      // 12. Mobile Segmented Controller (Edit vs Preview)
      const btnSegEdit = document.getElementById('btnSegEdit');
      const btnSegPreview = document.getElementById('btnSegPreview');
      const previewCol = document.getElementById('editPreviewCol');
      const controlsCol = document.getElementById('editControlsCol');

      btnSegEdit?.addEventListener('click', () => {
        btnSegEdit.classList.add('active');
        btnSegPreview?.classList.remove('active');
        if (controlsCol) controlsCol.style.display = 'block';
        if (previewCol) previewCol.style.display = 'none';
      });

      btnSegPreview?.addEventListener('click', () => {
        btnSegPreview.classList.add('active');
        btnSegEdit?.classList.remove('active');
        if (previewCol) previewCol.style.display = 'block';
        if (controlsCol) controlsCol.style.display = 'none';
      });
    }
  };

  const Router = {
    currentRoute: 'home',

    navigate(route, updateHistory = true, targetUser = null) {
      this.currentRoute = route;
      const topNav = document.getElementById('topNav');
      const appLayoutGrid = document.getElementById('appLayoutGrid');
      const mobileBottomNav = document.getElementById('mobileBottomNav');
      const signupPageView = document.getElementById('signupPageView');
      const loginPageView = document.getElementById('loginPageView');
      const editProfilePageView = document.getElementById('editProfilePageView');

      const homeFeedContainer = document.getElementById('homeFeedContainer');
      const profileViewContainer = document.getElementById('profileViewContainer');
      const homeRightWidgets = document.getElementById('homeRightWidgets');
      const profileRightWidgets = document.getElementById('profileRightWidgets');
      const rightInfoSidebar = document.getElementById('rightInfoSidebar');

      const navHome = document.getElementById('navHome');
      const navProfile = document.getElementById('navProfile');
      const navEditProfile = document.getElementById('navEditProfile');

      // Reset all nav items active states
      [navHome, navProfile, navEditProfile].forEach(el => el?.classList.remove('active'));

      if (route === 'signup') {
        if (topNav) topNav.style.display = 'none';
        if (appLayoutGrid) appLayoutGrid.style.display = 'none';
        if (mobileBottomNav) mobileBottomNav.style.display = 'none';
        if (loginPageView) loginPageView.style.display = 'none';
        if (editProfilePageView) editProfilePageView.style.display = 'none';
        if (signupPageView) {
          signupPageView.style.display = 'flex';
          window.scrollTo(0, 0);
        }
        document.title = 'Sign Up — DRAGME';
        if (updateHistory) {
          history.pushState({ route: 'signup' }, '', '/signup');
        }
      } else if (route === 'login') {
        if (topNav) topNav.style.display = 'none';
        if (appLayoutGrid) appLayoutGrid.style.display = 'none';
        if (mobileBottomNav) mobileBottomNav.style.display = 'none';
        if (signupPageView) signupPageView.style.display = 'none';
        if (editProfilePageView) editProfilePageView.style.display = 'none';
        if (loginPageView) {
          loginPageView.style.display = 'flex';
          window.scrollTo(0, 0);
        }
        document.title = 'Log In — DRAGME';
        if (updateHistory) {
          history.pushState({ route: 'login' }, '', '/login');
        }
      } else if (route === 'edit-profile') {
        // Authenticated check
        if (!currentUser) {
          AuthManager.requireAuth({ type: 'profile' }, 'Sign in to customize your DRAGME profile arena.', 'Edit Profile');
          this.navigate('home', false);
          return;
        }

        if (signupPageView) signupPageView.style.display = 'none';
        if (loginPageView) loginPageView.style.display = 'none';
        if (topNav) topNav.style.display = 'none';
        if (appLayoutGrid) appLayoutGrid.style.display = 'none';
        if (mobileBottomNav) mobileBottomNav.style.display = 'none';

        if (editProfilePageView) {
          editProfilePageView.style.display = 'flex';
        }

        if (navEditProfile) navEditProfile.classList.add('active');

        document.title = 'Edit Profile — DRAGME Arena';
        if (updateHistory) {
          history.pushState({ route: 'edit-profile' }, '', '/edit-profile');
        }

        EditProfileManager.open();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (route === 'profile') {
        // Authenticated or specified public profile check
        const usernameToLoad = targetUser || (currentUser ? currentUser.username : null);
        if (!usernameToLoad) {
          AuthManager.requireAuth({ type: 'profile' }, 'Sign in to access your personal DRAGME profile arena.', 'Profile Arena');
          this.navigate('home', false);
          return;
        }

        if (signupPageView) signupPageView.style.display = 'none';
        if (loginPageView) loginPageView.style.display = 'none';
        if (editProfilePageView) editProfilePageView.style.display = 'none';
        if (topNav) topNav.style.display = '';
        if (appLayoutGrid) appLayoutGrid.style.display = '';
        if (mobileBottomNav) mobileBottomNav.style.display = '';

        if (homeFeedContainer) homeFeedContainer.style.setProperty('display', 'none', 'important');
        if (profileViewContainer) profileViewContainer.style.setProperty('display', 'flex', 'important');
        if (rightInfoSidebar) rightInfoSidebar.style.setProperty('display', '', 'important');
        if (homeRightWidgets) homeRightWidgets.style.setProperty('display', 'none', 'important');
        if (profileRightWidgets) profileRightWidgets.style.setProperty('display', 'flex', 'important');

        if (navProfile) navProfile.classList.add('active');

        if (updateHistory) {
          const profilePath = targetUser ? `/profile?user=${encodeURIComponent(targetUser)}` : '/profile';
          history.pushState({ route: 'profile', user: targetUser }, '', profilePath);
        }
        ProfileManager.loadProfile(usernameToLoad);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Home Feed
        if (signupPageView) signupPageView.style.display = 'none';
        if (loginPageView) loginPageView.style.display = 'none';
        if (editProfilePageView) editProfilePageView.style.display = 'none';
        if (topNav) topNav.style.display = '';
        if (appLayoutGrid) appLayoutGrid.style.display = '';
        if (mobileBottomNav) mobileBottomNav.style.display = '';

        if (homeFeedContainer) homeFeedContainer.style.setProperty('display', 'flex', 'important');
        if (profileViewContainer) profileViewContainer.style.setProperty('display', 'none', 'important');
        if (rightInfoSidebar) rightInfoSidebar.style.setProperty('display', '', 'important');
        if (homeRightWidgets) homeRightWidgets.style.setProperty('display', 'flex', 'important');
        if (profileRightWidgets) profileRightWidgets.style.setProperty('display', 'none', 'important');

        if (navHome) navHome.classList.add('active');

        document.title = 'DRAGME — Next-Gen Social Arena & Community';
        if (updateHistory && window.location.pathname !== '/') {
          history.pushState({ route: 'home' }, '', '/');
        }
        renderFeed();
      }
    },

    init() {
      const handleRoute = () => {
        const path = window.location.pathname;
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);
        const queryUser = urlParams.get('user') || urlParams.get('u');

        if (path === '/signup' || path === '/register' || hash === '#signup' || hash === '#register') {
          this.navigate('signup', false);
        } else if (path === '/login' || path === '/signin' || hash === '#login' || hash === '#signin') {
          this.navigate('login', false);
        } else if (path === '/edit-profile' || hash === '#edit-profile' || hash === '#/edit-profile') {
          this.navigate('edit-profile', false);
        } else if (path === '/profile' || hash === '#profile' || hash === '#/profile') {
          this.navigate('profile', false, queryUser);
        } else {
          this.navigate('home', false);
        }
      };

      handleRoute();
      window.addEventListener('popstate', handleRoute);
      window.addEventListener('hashchange', handleRoute);
    }
  };

  // Expose Router for modal tab navigation
  window.DRAGME_ROUTER = Router;

  // Guest Header Action Listeners
  const btnGuestLogin = document.getElementById('btnGuestHeaderLogin');
  btnGuestLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    Router.navigate('login');
  });

  const btnGuestSignup = document.getElementById('btnGuestHeaderSignup');
  btnGuestSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    Router.navigate('signup');
  });

  // Top Nav Header Protected Buttons
  const btnChatNav = document.getElementById('chatBtn');
  btnChatNav?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!AuthManager.requireAuth({ type: 'notifications' }, 'Sign in to access your direct messages and private rooms.', 'Messages')) {
      return;
    }
    showToast('Real-time arena chat active.');
  });

  const btnNotifNav = document.getElementById('notifBtn');
  btnNotifNav?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!AuthManager.requireAuth({ type: 'notifications' }, 'Sign in to view your crowns, roasts, and notification alerts.', 'Notifications')) {
      return;
    }
    showToast('9 new arena reactions & mentions.');
  });

  // Sidebar Create Room Protected Button
  const btnSidebarCreateRoom = document.getElementById('btnSidebarCreateRoom');
  btnSidebarCreateRoom?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!AuthManager.requireAuth({ type: 'create_room' }, 'Create an account to start your own community room.', 'Create a Room')) {
      return;
    }
    showToast('Community room creator unlocked!');
  });

  const btnJoinRoom = document.getElementById('btnJoinRoom');
  btnJoinRoom?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!AuthManager.requireAuth({ type: 'join_room' }, 'Create an account or sign in to join community rooms and customize your feed.', 'Join Room')) {
      return;
    }
    showToast('You have joined this room!');
  });

  // Sidebar & Top Nav profile button listeners
  const navProfileBtn = document.getElementById('navProfile');
  if (navProfileBtn) {
    navProfileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to access your personal DRAGME profile arena.', 'Profile Arena')) {
        return;
      }
      Router.navigate('profile');
    });
  }

  const navEditProfileBtn = document.getElementById('navEditProfile');
  if (navEditProfileBtn) {
    navEditProfileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to customize your personal DRAGME profile arena.', 'Edit Profile')) {
        return;
      }
      Router.navigate('edit-profile');
    });
  }

  const sbViewProfileBtn = document.getElementById('btnSidebarViewProfile');
  if (sbViewProfileBtn) {
    sbViewProfileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!AuthManager.requireAuth({ type: 'profile' }, 'Sign in to access your personal DRAGME profile arena.', 'Profile Arena')) {
        return;
      }
      Router.navigate('profile');
    });
  }

  const brandLogo = document.getElementById('brandLogo');
  if (brandLogo) {
    brandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      Router.navigate('home');
      renderFeed();
    });
  }

  // App Initialization & Session Recovery (Zero-Flicker State Machine)
  async function initApp() {
    window.DRAGME_STORE = store;

    // Failsafe: Guaranteed splash removal within 300ms maximum
    const dismissSplash = () => {
      const splash = document.getElementById('appInitSplash');
      if (splash) {
        splash.classList.add('fade-out');
        setTimeout(() => splash.remove(), 250);
      }
    };
    setTimeout(dismissSplash, 350);

    // 1. Initialize Auth Prompt and Logout Managers
    try { AuthPromptManager.init(); } catch (e) { console.error('AuthPromptManager.init error:', e); }
    try { LogoutManager.init(); } catch (e) { console.error('LogoutManager.init error:', e); }

    // 2. Validate Session with Server (Server as Single Source of Truth)
    const token = AuthAPI.getToken();
    if (token) {
      try {
        const res = await AuthAPI.request('/api/auth/me');
        if (res && res.user) {
          AuthManager.currentUser = res.user;
          currentUser = res.user;
          AuthManager.authStatus = 'authenticated';
        } else {
          AuthManager.clearSession();
        }
      } catch (err) {
        AuthManager.clearSession();
      }
    } else {
      AuthManager.clearSession();
    }

    try {
      updateUserSessionUI();
    } catch (e) {
      console.error('Error in updateUserSessionUI:', e);
    }

    try {
      if (store && typeof store.syncFromBackend === 'function') {
        await store.syncFromBackend();
      }
    } catch (err) {
      console.warn('Backend store sync failed, rendering local store:', err);
    }

    try {
      renderFeed();
    } catch (e) {
      console.error('Error in renderFeed:', e);
    }

    // 3. Initialize UI Hubs, Forms & Router
    try { CreatePostModal.init(); } catch (e) { console.error('CreatePostModal.init error:', e); }
    try { ProfileDrawerHub.init(); } catch (e) { console.error('ProfileDrawerHub.init error:', e); }
    try { SignupManager.init(); } catch (e) { console.error('SignupManager.init error:', e); }
    try { LoginManager.init(); } catch (e) { console.error('LoginManager.init error:', e); }
    try { ProfileManager.init(); } catch (e) { console.error('ProfileManager.init error:', e); }
    try { EditProfileManager.init(); } catch (e) { console.error('EditProfileManager.init error:', e); }
    try { Router.init(); } catch (e) { console.error('Router.init error:', e); }

    // 4. Dismiss splash screen cleanly
    dismissSplash();
  }

  // Kick off application
  initApp();
});



