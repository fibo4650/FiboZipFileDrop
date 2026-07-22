class ZipProcessor {
  constructor(eventBus) {
    this.bus = eventBus;
    this.stagedFiles = []; // Temporary holds files during review
  }

  async stageZip(zipBlob, rootHandle) {
    if (!rootHandle) {
      this.bus.publish({ type: 'PROCESS_ERROR', payload: 'Please attach a target folder first!' });
      return;
    }

    if (typeof JSZip === 'undefined') {
      this.bus.publish({ type: 'PROCESS_ERROR', payload: 'JSZip library failed to initialize.' });
      return;
    }

    try {
      this.bus.publish({ type: 'PROCESS_START', payload: zipBlob.name });
      
      const zip = await JSZip.loadAsync(zipBlob);
      this.stagedFiles = [];

      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue; 

        const textContent = await zipEntry.async('string');
        const firstLine = textContent.split('\n')[0].trim();
        
        let targetPath = firstLine
          .replace(/^[\s/*#<!-]+/, '')  
          .replace(/[\s*>!-]+$/, '')   
          .trim();

        if (!targetPath || !targetPath.includes('.')) {
          targetPath = relativePath;
        }

        const normalizedPath = targetPath.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        const fileName = parts.pop(); 
        
        // Check if the file already exists on the disk
        let fileExists = false;
        try {
          let currentDirHandle = rootHandle;
          for (const folderName of parts) {
            if (!folderName || folderName === '.') continue;
            currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: false });
          }
          await currentDirHandle.getFileHandle(fileName, { create: false });
          fileExists = true; // Found it without throwing an error!
        } catch (e) {
          fileExists = false; // Directory or file does not exist
        }

        this.stagedFiles.push({
          fileName,
          displayPath: normalizedPath,
          parts,
          textContent,
          exists: fileExists
        });
      }

      // Send the list up to the UI to build the confirmation screen
      this.bus.publish({ type: 'ZIP_STAGED', payload: this.stagedFiles });
    } catch (err) {
      console.error("Fibo Staging Error:", err);
      this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
    }
  }

  async commitUpload(approvedIndices, rootHandle) {
    try {
      let count = 0;

      for (const index of approvedIndices) {
        const fileData = this.stagedFiles[index];
        if (!fileData) continue;

        let currentDirHandle = rootHandle;
        for (const folderName of fileData.parts) {
          if (!folderName || folderName === '.') continue;
          currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: true });
        }

        const fileHandle = await currentDirHandle.getFileHandle(fileData.fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileData.textContent);
        await writable.close();
        
        count++;
      }

      this.stagedFiles = []; // Clear state
      this.bus.publish({ type: 'PROCESS_COMPLETE', payload: count });
    } catch (err) {
      console.error("Fibo Commit Error:", err);
      this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
    }
  }
}