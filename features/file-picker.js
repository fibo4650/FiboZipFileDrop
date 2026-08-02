// features/file-picker.js
// Claude Sonnet | Priority 2 & 3 Remediation | 2026-07-28

if (typeof window.FiboFilePicker === 'undefined') {
  window.FiboFilePicker = class FiboFilePicker {
    constructor(eventBus) {
      this.bus = eventBus;
      this.directoryHandle = null;
    }

    async verifyPermission(readWrite = true) {
      if (!this.directoryHandle) return false;
      const options = { mode: readWrite ? 'readwrite' : 'read' };
      
      try {
        if ((await this.directoryHandle.queryPermission(options)) === 'granted') {
          return true;
        }
        if ((await this.directoryHandle.requestPermission(options)) === 'granted') {
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