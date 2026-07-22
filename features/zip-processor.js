class ZipProcessor {
  constructor(eventBus) {
    this.bus = eventBus;
    this.stagedFiles = [];
    this.BINARY_EXTENSIONS = new Set([
      'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'svg',
      'woff', 'woff2', 'ttf', 'otf', 'eot',
      'pdf', 'zip', 'tar', 'gz', 'mp3', 'mp4', 'wav', 'exe'
    ]);
  }

  isBinary(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return this.BINARY_EXTENSIONS.has(ext);
  }

  parseTargetInfo(firstLine, rawFileName) {
    // Default fallback: Place file directly in the main (root) folder
    let displayPath = rawFileName;
    let parts = [];

    if (firstLine) {
      const trimmed = firstLine.trim();
      // Match lines starting with comment indicators: //, /*, #, <!--
      const commentRegex = /^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/;
      const match = trimmed.match(commentRegex);

      if (match) {
        let candidate = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
        // Verify the extracted text looks like a valid relative path containing an extension
        if (candidate && candidate.includes('.')) {
          // Sanitize illegal OS path characters: : * ? " < > |
          const sanitized = candidate.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/');
          const pathParts = sanitized.split('/').filter(p => p && p !== '.');
          
          if (pathParts.length > 0) {
            const fileName = pathParts.pop();
            displayPath = sanitized;
            parts = pathParts;
            return { fileName, displayPath, parts };
          }
        }
      }
    }

    return { fileName: rawFileName, displayPath, parts };
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

        const rawFileName = relativePath.split('/').pop();
        if (!rawFileName) continue;

        const isBin = this.isBinary(rawFileName);
        let content = null;
        let firstLine = '';

        if (isBin) {
          content = await zipEntry.async('uint8array');
        } else {
          const textContent = await zipEntry.async('string');
          content = textContent;
          firstLine = textContent.split('\n')[0] || '';
        }

        const { fileName, displayPath, parts } = this.parseTargetInfo(isBin ? null : firstLine, rawFileName);

        // Non-destructive existence check on disk
        let fileExists = false;
        try {
          let currentDirHandle = rootHandle;
          for (const folderName of parts) {
            currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: false });
          }
          await currentDirHandle.getFileHandle(fileName, { create: false });
          fileExists = true;
        } catch (e) {
          fileExists = false;
        }

        this.stagedFiles.push({
          id: displayPath,
          fileName,
          displayPath,
          parts,
          content,
          isBinary: isBin,
          exists: fileExists
        });
      }

      this.bus.publish({ type: 'ZIP_STAGED', payload: this.stagedFiles });
    } catch (err) {
      this.clearState();
      console.error("Fibo Staging Error:", err);
      this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
    }
  }

  async commitUpload(approvedPaths, rootHandle) {
    const logs = [];
    let successCount = 0;
    let failCount = 0;

    try {
      const approvedSet = new Set(approvedPaths);
      const targets = this.stagedFiles.filter(f => approvedSet.has(f.displayPath));

      for (let i = 0; i < targets.length; i++) {
        const fileData = targets[i];
        let currentDirHandle = rootHandle;

        try {
          // 1. Traverse / create recursive folder hierarchy
          for (const folderName of fileData.parts) {
            currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: true });
          }

          // 2. Open file handle
          const fileHandle = await currentDirHandle.getFileHandle(fileData.fileName, { create: true });
          
          // 3. Guaranteed stream closure via try...finally block
          const writable = await fileHandle.createWritable();
          try {
            await writable.write(fileData.content);
          } finally {
            await writable.close();
          }

          successCount++;
          logs.push({ path: fileData.displayPath, status: 'SUCCESS', error: null });
        } catch (fileErr) {
          failCount++;
          const errMsg = fileErr.message || String(fileErr);
          logs.push({ path: fileData.displayPath, status: 'FAILED', error: errMsg });
          console.error(`Fibo Write Error [${fileData.displayPath}]:`, fileErr);
        }

        // Batch throttling: yield control back to browser thread every 10 files
        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Flush memory buffer
      this.clearState();

      this.bus.publish({
        type: 'PROCESS_COMPLETE',
        payload: { successCount, failCount, logs }
      });
    } catch (err) {
      this.clearState();
      console.error("Fibo Commit Error:", err);
      this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
    }
  }

  clearState() {
    this.stagedFiles = [];
  }
}