// features/ai-settings-store.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

if (typeof window.FiboAiSettingsStore === 'undefined') {
  window.FiboAiSettingsStore = class FiboAiSettingsStore {
    constructor(eventBus) {
      this.bus = eventBus;
      this.STORAGE_KEY = 'fzfd_gemini_api_key';
      this.apiKey = '';
    }

    async init() {
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([this.STORAGE_KEY], (result) => {
            this.apiKey = (result && result[this.STORAGE_KEY]) || '';
            resolve(this.apiKey);
          });
          this.bindStorageSync();
        } else {
          this.apiKey = localStorage.getItem(this.STORAGE_KEY) || '';
          resolve(this.apiKey);
          this.bindWindowStorageSync();
        }
      });
    }

    // chrome.storage.onChanged fires in every context running this content script,
    // including the tab that made the write itself — the equality check is what
    // tells a real cross-tab change apart from an echo of our own save().
    bindStorageSync() {
      if (!chrome.storage.onChanged) return;
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes[this.STORAGE_KEY]) return;
        const incoming = changes[this.STORAGE_KEY].newValue || '';
        if (incoming === this.apiKey) return;
        this.apiKey = incoming;
        // Never echo the raw key into the event bus — only whether one is set.
        if (this.bus) this.bus.publish({ type: 'AI_SETTINGS_UPDATED', payload: { hasKey: !!this.apiKey } });
      });
    }

    bindWindowStorageSync() {
      if (typeof window === 'undefined' || !window.addEventListener) return;
      window.addEventListener('storage', (e) => {
        if (e.key !== this.STORAGE_KEY) return;
        this.apiKey = e.newValue || '';
        if (this.bus) this.bus.publish({ type: 'AI_SETTINGS_UPDATED', payload: { hasKey: !!this.apiKey } });
      });
    }

    getApiKey() {
      return this.apiKey;
    }

    hasApiKey() {
      return !!this.apiKey;
    }

    async saveApiKey(rawKey) {
      this.apiKey = (rawKey || '').trim();
      return new Promise((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ [this.STORAGE_KEY]: this.apiKey }, () => resolve());
        } else {
          localStorage.setItem(this.STORAGE_KEY, this.apiKey);
          resolve();
        }
      });
    }

    async clearApiKey() {
      return this.saveApiKey('');
    }
  };
}
