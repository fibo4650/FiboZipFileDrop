// core/event-bus.js
// Gemini 3.6 Flash | Class Declaration Guard | 2026-07-28

if (typeof window.EventBus === 'undefined') {
  window.EventBus = class EventBus {
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