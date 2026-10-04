/* ==========================================================================
   DRAGME APP ROUTER: (src/app/router.js)
   Client-side hash & history router for zero-page-reload navigation
   ========================================================================== */

import { triggerEvent } from '../utils/domUtils.js';

class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = '';
    this.params = {};
  }

  init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('popstate', () => this.handleRoute());

    // Initial handle
    this.handleRoute();
  }

  on(path, handler) {
    this.routes.set(path, handler);
  }

  navigate(path) {
    if (typeof window === 'undefined') return;
    window.location.hash = path.startsWith('#') ? path : `#${path}`;
  }

  handleRoute() {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1) || 'feed';
    const [pathPart, queryPart] = hash.split('?');

    this.currentRoute = pathPart;
    triggerEvent('dragme:route:change', { route: pathPart, query: queryPart });

    // Match exact route
    if (this.routes.has(pathPart)) {
      this.routes.get(pathPart)({});
      return;
    }

    // Match parameterized route e.g. profile/:username
    for (const [routePattern, handler] of this.routes.entries()) {
      const patternParts = routePattern.split('/');
      const currentParts = pathPart.split('/');

      if (patternParts.length === currentParts.length) {
        let match = true;
        const params = {};

        for (let i = 0; i < patternParts.length; i++) {
          if (patternParts[i].startsWith(':')) {
            const paramName = patternParts[i].slice(1);
            params[paramName] = decodeURIComponent(currentParts[i]);
          } else if (patternParts[i] !== currentParts[i]) {
            match = false;
            break;
          }
        }

        if (match) {
          this.params = params;
          handler(params);
          return;
        }
      }
    }
  }
}

export const router = new Router();
export default router;
