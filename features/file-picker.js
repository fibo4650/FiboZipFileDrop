// features/file-picker.js
// Claude Sonnet 5 | 01-08-new features | 2026-08-02
// feature: phase2-workspace-switcher

if (typeof window.FiboFilePicker === 'undefined') {
  window.FiboFilePicker = class FiboFilePicker {
    constructor(eventBus) {
      this.bus = eventBus;
      this.directoryHandle = null;
    }

    // `handle` defaults to the currently-connected directory but can be passed
    // explicitly to re-verify a workspace handle rehydrated from IndexedDB,
    // which needs the exact same query/request flow before it can be reused.
    async verifyPermission(readWrite = true, handle = this.directoryHandle) {
      if (!handle) return false;
      const options = { mode: readWrite ? 'readwrite' : 'read' };

      try {
        if ((await handle.queryPermission(options)) === 'granted') {
          return true;
        }
        if ((await handle.requestPermission(options)) === 'granted') {
          return true;
        }
      } catch (err) {
        console.error('Fibo Permission Verification Error:', err);
      }
      return false;
    }

    async selectDirectory() {
      try {
        this.directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        this.bus.publish({ type: 'WORKSPACE_READY', payload: this.directoryHandle.name });
        return this.directoryHandle;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Fibo Workspace Error:', err);
        }
        this.bus.publish({ type: 'WORKSPACE_ERROR', payload: err.message });
      }
    }
  };
}

// Legacy alias — preserved for backwards compatibility.
window.FilePicker = window.FiboFilePicker;