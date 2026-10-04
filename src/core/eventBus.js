/* ==========================================================================
   DRAGME CORE: EVENT BUS (src/core/eventBus.js)
   Decoupled Typed Application Event Bus for Component Communication
   ========================================================================== */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(eventName, handler) {
    if (!this.events.has(eventName)) {
      this.events.set(eventName, new Set());
    }
    this.events.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).delete(handler);
    }
  }

  emit(eventName, data) {
    if (this.events.has(eventName)) {
      this.events.get(eventName).forEach(handler => {
        try {
          handler(data);
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${eventName}":`, err);
        }
      });
    }

    // Also dispatch as DOM CustomEvent for backward compatibility
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
      } catch (e) {}
    }
  }

  clear() {
    this.events.clear();
  }
}

export const eventBus = new EventBus();
export default eventBus;
