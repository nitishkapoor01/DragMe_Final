/* ==========================================================================
   DRAGME CLIENT SERVICE: MEDIA COMPRESSOR (src/services/clientMediaCompressor.js)
   Client-side canvas compression, WebP encoding, downscaling & video trimming
   ========================================================================== */

export const ClientMediaCompressor = {
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
      const maxDuration = isAvatar ? 3.0 : 4.0;
      const targetWidth = isAvatar ? 512 : 1280;
      const targetHeight = isAvatar ? 640 : 426;
      const targetBitrate = isAvatar ? 800000 : 1500000;

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
