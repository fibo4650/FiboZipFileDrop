// features/workspace-store.js
// Claude Sonnet 5 | 01-08-new features | 2026-08-02
// feature: phase2-workspace-switcher

// Workspace *names* are shared across every site (chrome.storage.local, same
// mechanism as prompt sync) so the dropdown looks identical everywhere. The
// actual folder handle can only ever be used on the site that requested it —
// both the File System Access permission model and this content script's own
// IndexedDB are scoped to the page's origin, and no extension design can
// bypass that. So handles live in a per-site IndexedDB store, keyed by the
// same id as the shared name, and get (re-)linked via a fresh native folder
// pick the first time a given name is used on a given site.
if (typeof window.FiboWorkspaceStore === 'undefined') {
  window.FiboWorkspaceStore = class FiboWorkspaceStore {
    constructor() {
      this.NAMES_KEY = 'fzfd_workspace_names';
      this.DB_NAME = 'fzfd_workspaces_db';
      this.STORE_NAME = 'handles';
      this._dbPromise = null;
    }

    // -- Shared name registry (chrome.storage.local, cross-site) --

    async listNames() {
      return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
          resolve([]);
          return;
        }
        chrome.storage.local.get([this.NAMES_KEY], (result) => {
          resolve((result && result[this.NAMES_KEY]) || []);
        });
      });
    }

    async saveName(rawName) {
      const names = await this.listNames();
      const id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const entry = { id, name: (rawName || '').trim() || 'Untitled Workspace', lastUsedISO: new Date().toISOString() };
      names.unshift(entry);
      await this._setNames(names);
      return entry;
    }

    async touchName(id) {
      const names = await this.listNames();
      const entry = names.find((n) => n.id === id);
      if (!entry) return;
      entry.lastUsedISO = new Date().toISOString();
      await this._setNames(names);
    }

    async _setNames(names) {
      return new Promise((resolve) => {
        if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
          resolve();
          return;
        }
        chrome.storage.local.set({ [this.NAMES_KEY]: names }, () => resolve());
      });
    }

    // -- Per-site handle storage (IndexedDB, this origin only) --

    _openDb() {
      if (this._dbPromise) return this._dbPromise;
      this._dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('IndexedDB is not available on this page.'));
          return;
        }
        const req = indexedDB.open(this.DB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(this.STORE_NAME)) {
            req.result.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return this._dbPromise;
    }

    async getHandleForThisSite(id) {
      try {
        const db = await this._openDb();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readonly');
          const req = tx.objectStore(this.STORE_NAME).get(id);
          req.onsuccess = () => resolve(req.result ? req.result.handle : null);
          req.onerror = () => reject(req.error);
        });
      } catch (err) {
        console.error('Fibo Workspace DB Read Error:', err);
        return null;
      }
    }

    async saveHandleForThisSite(id, handle) {
      try {
        const db = await this._openDb();
        return await new Promise((resolve, reject) => {
          const tx = db.transaction(this.STORE_NAME, 'readwrite');
          tx.objectStore(this.STORE_NAME).put({ id, handle });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch (err) {
        console.error('Fibo Workspace DB Write Error:', err);
      }
    }
  };
}
