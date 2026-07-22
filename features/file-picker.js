class FilePicker {
  constructor(eventBus) {
    this.bus = eventBus;
    this.directoryHandle = null;
  }

  async verifyPermission(readWrite = true) {
    if (!this.directoryHandle) return false;
    const options = { mode: readWrite ? 'readwrite' : 'read' };
    
    if ((await this.directoryHandle.queryPermission(options)) === 'granted') {
      return true;
    }
    if ((await this.directoryHandle.requestPermission(options)) === 'granted') {
      return true;
    }
    return false;
  }

  async selectDirectory() {
    try {
      this.directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      this.bus.publish({ type: 'WORKSPACE_READY', payload: this.directoryHandle.name });
      return this.directoryHandle;
    } catch (err) {
      console.error('Fibo Workspace Error:', err);
      this.bus.publish({ type: 'WORKSPACE_ERROR', payload: err.message });
    }
  }
}