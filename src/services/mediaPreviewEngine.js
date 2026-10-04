/* ==========================================================================
   DRAGME CLIENT SERVICE: MEDIA PREVIEW ENGINE (src/services/mediaPreviewEngine.js)
   Fast, non-blocking image preview & video poster snapshot extractor
   ========================================================================== */

export const MediaPreviewEngine = {
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
      }, 5000);

      v.onloadeddata = () => {
        try {
          const canvas = document.createElement('canvas');
          let w = v.videoWidth || maxDim;
          let h = v.videoHeight || maxDim;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(v, 0, 0, w, h);
          canvas.toBlob((blob) => {
            cleanup();
            clearTimeout(timer);
            if (blob) resolve(this.createManagedUrl(blob));
            else resolve(null);
          }, 'image/webp', 0.85);
        } catch (e) {
          cleanup();
          clearTimeout(timer);
          resolve(null);
        }
      };

      v.onerror = () => {
        cleanup();
        clearTimeout(timer);
        resolve(null);
      };

      v.src = tempUrl;
    });
  }
};
