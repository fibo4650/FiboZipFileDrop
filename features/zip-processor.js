// features/zip-processor.js
// Gemini | FZFD builder 2 : errors and log | 2026-07-22

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
    let displayPath = rawFileName;
    let parts = [];
    let hasExplicitComment = false;

    if (firstLine) {
      const trimmed = firstLine.trim();
      const commentRegex = /^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/;
      const match = trimmed.match(commentRegex);

      if (match) {
        let candidate = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
        
        // Strict Validation:
        // 1. Must not be a URL (no '://')
        // 2. Must end strictly with a valid file extension (\.[a-zA-Z0-9]{1,10}$)
        const validExtensionEnd = /\.[a-zA-Z0-9]{1,10}$/;

        if (candidate && !candidate.includes('://') && validExtensionEnd.test(candidate)) {
          const sanitized = candidate.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/');
          const pathParts = sanitized.split('/').filter(p => p && p !== '.');
          
          if (pathParts.length > 0) {
            const fileName = pathParts.pop();

            // Verify the extracted target filename itself ends with a valid extension
            if (validExtensionEnd.test(fileName)) {
              displayPath = sanitized;
              parts = pathParts;
              hasExplicitComment = true;
              return { fileName, displayPath, parts, hasExplicitComment };
            }
          }
        }
      }
    }

    return { fileName: rawFileName, displayPath, parts, hasExplicitComment };
  }

  extractSecondLine(textContent) {
    if (typeof textContent !== 'string') return 'N/A (Binary Content)';
    const lines = textContent.split('\n');
    if (lines.length >= 2 && lines[1].trim().length > 0) {
      return lines[1].trim();
    }
    return 'N/A (No Line 2 Present)';
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
      this.stagedFiles = [];

      const zip = await JSZip.loadAsync(zipBlob);

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
          content = await zipEntry.async('string');
          firstLine = content.split('\n')[0] || '';
        }

        const { fileName, displayPath, parts } = this.parseTargetInfo(isBin ? null : firstLine, rawFileName);
        let fileExists = await this.checkFileExists(rootHandle, parts, fileName);

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

  async stageSingleFile(file, rootHandle) {
    if (!rootHandle) {
      this.bus.publish({ type: 'PROCESS_ERROR', payload: 'Please attach a target folder first!' });
      return;
    }

    try {
      this.bus.publish({ type: 'PROCESS_START', payload: file.name });
      this.stagedFiles = [];

      const isBin = this.isBinary(file.name);
      let content = null;
      let firstLine = '';

      if (isBin) {
        content = new Uint8Array(await file.arrayBuffer());
      } else {
        content = await file.text();
        firstLine = content.split('\n')[0] || '';
      }

      const { fileName, displayPath, parts } = this.parseTargetInfo(isBin ? null : firstLine, file.name);
      let fileExists = await this.checkFileExists(rootHandle, parts, fileName);

      this.stagedFiles.push({
        id: displayPath,
        fileName,
        displayPath,
        parts,
        content,
        isBinary: isBin,
        exists: fileExists
      });

      this.bus.publish({ type: 'ZIP_STAGED', payload: this.stagedFiles });
    } catch (err) {
      this.clearState();
      console.error("Fibo Single File Error:", err);
      this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
    }
  }

  async stageRawText(rawText, rootHandle) {
    if (!rootHandle) {
      this.bus.publish({ type: 'PROCESS_ERROR', payload: 'Please attach a target folder first!' });
      return;
    }

    const trimmed = rawText.trim();
    if (!trimmed) {
      this.bus.publish({ type: 'PROCESS_ERROR', payload: 'Raw text buffer is empty!' });
      return;
    }

    try {
      this.bus.publish({ type: 'PROCESS_START', payload: 'Raw Text Input' });
      this.stagedFiles = [];

      const firstLine = trimmed.split('\n')[0] || '';
      const { fileName, displayPath, parts, hasExplicitComment } = this.parseTargetInfo(firstLine, 'unnamed.txt');

      if (!hasExplicitComment) {
        this.clearState();
        this.bus.publish({ 
          type: 'PROCESS_ERROR', 
          payload: 'Raw text requires a valid path comment on line 1 (e.g. // path/file.js or # path/file.md)' 
        });
        return;
      }

      let fileExists = await this.checkFileExists(rootHandle, parts, fileName);

      this.stagedFiles.push({
        id: displayPath,
        fileName,
        displayPath,
        parts,
        content: rawText,
        isBinary: false,
        exists: fileExists
      });

      this.bus.publish({ type: 'ZIP_STAGED', payload: this.stagedFiles });
    } catch (err) {
      this.clearState();
      console.error("Fibo Raw Text Error:", err);
      this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
    }
  }

  async checkFileExists(rootHandle, parts, fileName) {
    try {
      let currentDirHandle = rootHandle;
      for (const folderName of parts) {
        currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: false });
      }
      await currentDirHandle.getFileHandle(fileName, { create: false });
      return true;
    } catch (e) {
      return false;
    }
  }

  async commitUpload(approvedPaths, rootHandle, enableLogging = true) {
    const logs = [];
    let successCount = 0;
    let failCount = 0;
    let firstCopiedSecondLine = null;

    try {
      const approvedSet = new Set(approvedPaths);
      const targets = this.stagedFiles.filter(f => approvedSet.has(f.displayPath));

      for (let i = 0; i < targets.length; i++) {
        const fileData = targets[i];
        let currentDirHandle = rootHandle;

        try {
          for (const folderName of fileData.parts) {
            currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: true });
          }

          const fileHandle = await currentDirHandle.getFileHandle(fileData.fileName, { create: true });
          const writable = await fileHandle.createWritable();
          try {
            await writable.write(fileData.content);
          } finally {
            await writable.close();
          }

          successCount++;
          logs.push({ path: fileData.displayPath, status: 'SUCCESS', error: null });

          if (!firstCopiedSecondLine && !fileData.isBinary) {
            firstCopiedSecondLine = this.extractSecondLine(fileData.content);
          }
        } catch (fileErr) {
          failCount++;
          const errMsg = fileErr.message || String(fileErr);
          logs.push({ path: fileData.displayPath, status: 'FAILED', error: errMsg });
          console.error(`Fibo Write Error [${fileData.displayPath}]:`, fileErr);
        }

        if (i > 0 && i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      if (enableLogging) {
        await this.writeAutoLog(rootHandle, logs, successCount, failCount, firstCopiedSecondLine);
      }

      this.clearState();
      this.bus.publish({
        type: 'PROCESS_COMPLETE',
        payload: { successCount, failCount, logs, loggingEnabled: enableLogging }
      });
    } catch (err) {
      this.clearState();
      console.error("Fibo Commit Error:", err);
      this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
    }
  }

  async getRotatedLogHandle(logDirHandle, year, month) {
    const baseName = `fzfd-${year}-${month}`;
    const MAX_BYTES = 1024 * 1024; // 1 MB threshold
    let index = 1;

    while (true) {
      const fileName = index === 1 ? `${baseName}.log` : `${baseName}-part${index}.log`;
      const logFileHandle = await logDirHandle.getFileHandle(fileName, { create: true });
      const file = await logFileHandle.getFile();

      if (file.size < MAX_BYTES) {
        return { logFileHandle, fileSize: file.size };
      }

      index++;
    }
  }

  async writeAutoLog(rootHandle, logs, successCount, failCount, line2Header) {
    try {
      const logDirHandle = await rootHandle.getDirectoryHandle('FZFDlog', { create: true });
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      const { logFileHandle, fileSize } = await this.getRotatedLogHandle(logDirHandle, year, month);

      const timestamp = now.toISOString();
      const headerLine1 = `[TIMESTAMP: ${timestamp}] | SUCCESS: ${successCount} | FAILED: ${failCount}`;
      const headerLine2 = `[STAMP LINE 2]: ${line2Header || 'N/A'}`;

      let logBlock = `${headerLine1}\n${headerLine2}\n`;
      logs.forEach(l => {
        logBlock += `  - [${l.status}] ${l.path}${l.error ? ` (Error: ${l.error})` : ''}\n`;
      });
      logBlock += `--------------------------------------------------------------------------------\n`;

      const writable = await logFileHandle.createWritable({ keepExistingData: true });
      try {
        await writable.seek(fileSize);
        await writable.write(logBlock);
      } finally {
        await writable.close();
      }
    } catch (logErr) {
      console.error("FZFD Auto-Logging Error:", logErr);
    }
  }

  clearState() {
    this.stagedFiles = [];
  }
}