/* ==========================================================================
   DRAGME CORE: PLATFORM DETECTOR (src/core/platform.js)
   Server-Authoritative, Responsive Device & Viewport Detection
   ========================================================================== */

export const BREAKPOINTS = {
  MOBILE_MAX: 768,
  TABLET_MAX: 1024,
  DESKTOP_MIN: 1025
};

export class PlatformDetector {
  static isMobile() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= BREAKPOINTS.MOBILE_MAX;
  }

  static isTablet() {
    if (typeof window === 'undefined') return false;
    return window.innerWidth > BREAKPOINTS.MOBILE_MAX && window.innerWidth <= BREAKPOINTS.TABLET_MAX;
  }

  static isDesktop() {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > BREAKPOINTS.TABLET_MAX;
  }

  static getDeviceType() {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    return 'desktop';
  }

  static onResize(callback) {
    if (typeof window === 'undefined') return () => {};
    let lastType = this.getDeviceType();
    
    const handler = () => {
      const currentType = this.getDeviceType();
      callback({
        device: currentType,
        isMobile: this.isMobile(),
        isTablet: this.isTablet(),
        isDesktop: this.isDesktop(),
        changed: currentType !== lastType
      });
      lastType = currentType;
    };

    window.addEventListener('resize', handler, { passive: true });
    return () => window.removeEventListener('resize', handler);
  }
}

export default PlatformDetector;
