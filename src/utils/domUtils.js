/* ==========================================================================
   DRAGME CORE UTILS: DOM UTILITIES (src/utils/domUtils.js)
   Safe helpers for element querying, event delegation, sanitization & classes
   ========================================================================== */

export const $ = (selector, parent = document) => {
  if (typeof selector !== 'string') return selector;
  return parent.querySelector(selector);
};

export const $$ = (selector, parent = document) => {
  if (typeof selector !== 'string') return [];
  return Array.from(parent.querySelectorAll(selector));
};

export function addClass(el, className) {
  if (el && className) el.classList.add(className);
}

export function removeClass(el, className) {
  if (el && className) el.classList.remove(className);
}

export function toggleClass(el, className, force) {
  if (el && className) el.classList.toggle(className, force);
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeText(str) {
  if (!str) return '';
  return String(str).trim();
}

export function triggerEvent(name, detail = {}) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent(name, { detail, bubbles: true });
    window.dispatchEvent(event);
  }
}
