class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  subscribe(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
    return () => this.listeners.set(type, this.listeners.get(type).filter(h => h !== handler));
  }

  publish(event) {
    const secureEvent = Object.freeze(structuredClone(event));
    (this.listeners.get(secureEvent.type) || []).forEach(handler => {
      try { 
        handler(secureEvent); 
      } catch (e) { 
        console.error(`FiboBus Error [${secureEvent.type}]:`, e); 
      }
    });
  }
}