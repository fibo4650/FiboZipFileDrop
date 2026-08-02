// core/event-bus.js
// Claude Sonnet | Priority 2 & 3 Remediation | 2026-07-28

if (typeof window.FiboEventBus === 'undefined') {
  window.FiboEventBus = class FiboEventBus {
    constructor() {
      this.listeners = new Map();
    }

    subscribe(type, handler) {
      if (!this.listeners.has(type)) this.listeners.set(type, []);
      this.listeners.get(type).push(handler);
      return () => this.listeners.set(type, this.listeners.get(type).filter(h => h !== handler));
    }

    publish(event) {
      let secureEvent;
      try {
        secureEvent = Object.freeze(structuredClone(event));
      } catch (e) {
        secureEvent = Object.freeze({ ...event });
      }
      (this.listeners.get(secureEvent.type) || []).forEach(handler => {
        try {
          handler(secureEvent);
        } catch (e) {
          console.error(`FiboBus Error [${secureEvent.type}]:`, e);
        }
      });
    }
  };
}

// Legacy alias — preserved for backwards compatibility.
window.EventBus = window.FiboEventBus;