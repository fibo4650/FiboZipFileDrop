// features/zip-processor.js
// Gemini 3.6 Flash | Class Declaration Guard | 2026-07-28

if (typeof window.ZipProcessor === 'undefined') {
  window.ZipProcessor = class ZipProcessor {
    constructor(eventBus) {
      this.bus = eventBus;
      this.stagedFiles = [];
      this.BINARY_EXTENSIONS = new Set([
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico',
        'woff', 'woff2', 'ttf', 'otf', 'eot',
        'pdf', 'zip', 'tar', 'gz', 'mp3', 'mp4', 'wav', 'exe',
        'dll', 'so', 'dylib', 'class', 'pyc', 'db', 'sqlite'
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
        const trimmed = firstLine.replace(/^\uFEFF/, '').trim();
        const commentRegex = /^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/;
        const match = trimmed.match(commentRegex);

        if (match) {
          let candidate = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
          const validExtensionEnd = /\.[a-zA-Z0-9]{1,10}$/;

          if (candidate && !candidate.includes('://') && validExtensionEnd.test(candidate)) {
            const sanitized = candidate.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/').replace(/\/+/g, '/');
            const pathParts = sanitized.split('/').filter(p => p && p !== '.');
            
            if (pathParts.includes('..')) {
              throw new Error(`Forbidden parent directory reference ('..') in path header: '${candidate}'`);
            }

            if (pathParts.length > 0) {
              const fileName = pathParts.pop();

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

    isPathHeaderLine(line) {
      if (typeof line !== 'string') return false;
      const trimmed = line.replace(/^\uFEFF/, '').trim();
      const match = trimmed.match(/^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/);
      if (!match) return false;
      const inner = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
      const validExtensionEnd = /\.[a-zA-Z0-9]{1,10}$/;
      if (!inner || inner.includes('://') || !validExtensionEnd.test(inner)) return false;
      const sanitized = inner.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/').replace(/\/+/g, '/');
      const parts = sanitized.split('/').filter(p => p && p !== '.');
      return !parts.includes('..') && parts.length > 0;
    }

    isStampHeaderLine(line) {
      if (typeof line !== 'string') return false;
      const trimmed = line.replace(/^\uFEFF/, '').trim();
      const match = trimmed.match(/^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/);
      if (!match) return false;
      const inner = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
      const firstPipe = inner.indexOf('|');
      const lastPipe = inner.lastIndexOf('|');
      return firstPipe !== -1 && lastPipe !== -1 && firstPipe < lastPipe;
    }

    isFeatureHeaderLine(line) {
      if (typeof line !== 'string') return false;
      const trimmed = line.replace(/^\uFEFF/, '').trim();
      const match = trimmed.match(/^(?:\/\/|\/\*|#|<!--)\s*(.*?)(?:\*\/|-->)?$/);
      if (!match) return false;
      const inner = match[1].trim().replace(/(?:\*\/|-->)$/, '').trim();
      return /^feature:\s*(.+)$/i.test(inner);
    }

    extractHeaderAndBody(textContent) {
      if (typeof textContent !== 'string') {
        return { slots: { line1: null, line2: null, line3: null }, body: '' };
      }

      const lines = textContent.split('\n');
      const slots = { line1: null, line2: null, line3: null };
      let bodyStartIndex = 0;

      if (lines.length > 0 && this.isPathHeaderLine(lines[0])) {
        slots.line1 = lines[0];
        bodyStartIndex = 1;

        for (let i = 1; i < Math.min(3, lines.length); i++) {
          const line = lines[i];
          if (this.isStampHeaderLine(line)) {
            if (!slots.line2) {
              slots.line2 = line;
              bodyStartIndex = i + 1;
            } else {
              break;
            }
          } else if (this.isFeatureHeaderLine(line)) {
            if (!slots.line3) {
              slots.line3 = line;
              bodyStartIndex = i + 1;
            } else {
              break;
            }
          } else {
            break;
          }
        }
      }

      const body = lines.slice(bodyStartIndex).join('\n');
      return { slots, body };
    }

    combineHeaderAndContent(addedText, diskText, mode) {
      const added = this.extractHeaderAndBody(addedText || '');
      const disk = this.extractHeaderAndBody(diskText || '');

      const mergedLine1 = added.slots.line1 || disk.slots.line1 || null;
      const mergedLine2 = added.slots.line2 || disk.slots.line2 || null;
      const mergedLine3 = added.slots.line3 || disk.slots.line3 || null;

      const mergedHeaders = [];
      if (mergedLine1) mergedHeaders.push(mergedLine1);
      if (mergedLine2) mergedHeaders.push(mergedLine2);
      if (mergedLine3) mergedHeaders.push(mergedLine3);

      const headerBlock = mergedHeaders.length > 0 ? mergedHeaders.join('\n') + '\n' : '';
      const addedBody = added.body.trim();
      const diskBody = disk.body.trim();

      let bodies = '';
      if (mode === 'appended') {
        bodies = [diskBody, addedBody].filter(Boolean).join('\n\n');
      } else {
        bodies = [addedBody, diskBody].filter(Boolean).join('\n\n');
      }

      return headerBlock + bodies + (bodies ? '\n' : '');
    }

    parseLine2Info(line2) {
      const today = new Date().toISOString().split('T')[0];
      if (!line2 || typeof line2 !== 'string') {
        return { model: 'Gemini 3.6', chatName: 'FZFD Session', date: today };
      }
      const cleaned = line2.replace(/^(?:\/\/|\/\*|#|<!--)\s*/, '').replace(/(?:\*\/|-->)$/, '').trim();
      const firstPipe = cleaned.indexOf('|');
      const lastPipe = cleaned.lastIndexOf('|');

      if (firstPipe !== -1 && lastPipe !== -1 && firstPipe < lastPipe) {
        const model = cleaned.substring(0, firstPipe).trim() || 'Gemini 3.6';
        const date = cleaned.substring(lastPipe + 1).trim() || today;
        const chatName = cleaned.substring(firstPipe + 1, lastPipe).trim() || 'FZFD Session';
        return { model, chatName, date };
      }

      return { model: 'Gemini 3.6', chatName: cleaned || 'FZFD Session', date: today };
    }

    parseFeatureInfo(line3) {
      if (!line3 || typeof line3 !== 'string') return null;
      const cleaned = line3.replace(/^(?:\/\/|\/\*|#|<!--)\s*/, '').replace(/(?:\*\/|-->)$/, '').trim();
      const match = cleaned.match(/^feature:\s*(.+)$/i);
      if (match && match[1].trim()) {
        return match[1].trim();
      }
      return null;
    }

    async updateStagedFile(index, newDisplayPath, newHeaderLines, rootHandle) {
      const staged = this.stagedFiles.find(f => f.index === index);
      if (!staged) return null;

      const sanitized = newDisplayPath.replace(/[:*?"<>|]/g, '_').replace(/\\/g, '/').replace(/\/+/g, '/');
      const pathParts = sanitized.split('/').filter(p => p && p !== '.');
      
      if (pathParts.includes('..')) {
        throw new Error(`Forbidden parent directory reference ('..') in path: '${newDisplayPath}'`);
      }

      if (pathParts.length === 0) {
        throw new Error(`Path cannot be empty.`);
      }

      const fileName = pathParts.pop();
      staged.fileName = fileName;
      staged.displayPath = sanitized;
      staged.parts = pathParts;
      staged.id = `${staged.index}_${sanitized}`;

      if (newHeaderLines && typeof newHeaderLines === 'object' && !staged.isBinary) {
        const { body } = this.extractHeaderAndBody(staged.content);
        const newHeaders = [];
        
        if (newHeaderLines.line1 && this.isPathHeaderLine(newHeaderLines.line1)) {
          newHeaders.push(newHeaderLines.line1);
        }
        if (newHeaderLines.line2 && this.isStampHeaderLine(newHeaderLines.line2)) {
          newHeaders.push(newHeaderLines.line2);
        }
        if (newHeaderLines.line3 && this.isFeatureHeaderLine(newHeaderLines.line3)) {
          newHeaders.push(newHeaderLines.line3);
        }

        const headerBlock = newHeaders.length > 0 ? newHeaders.join('\n') + '\n' : '';
        staged.content = headerBlock + body;
      }

      if (rootHandle) {
        staged.exists = await this.checkFileExists(rootHandle, staged.parts, staged.fileName);
      }

      return staged;
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

          let { fileName, displayPath, parts, hasExplicitComment } = this.parseTargetInfo(isBin ? null : firstLine, rawFileName);

          if (!hasExplicitComment) {
            const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
            const pathParts = normalizedPath.split('/').filter(p => p && p !== '.');
            
            if (pathParts.includes('..')) {
              throw new Error(`ZIP entry contains forbidden parent directory reference ('..'): '${relativePath}'`);
            }

            if (pathParts.length > 0) {
              fileName = pathParts.pop();
              parts = pathParts;
              displayPath = normalizedPath;
            }
          }

          let fileExists = await this.checkFileExists(rootHandle, parts, fileName);
          const fileIndex = this.stagedFiles.length;

          this.stagedFiles.push({
            index: fileIndex,
            id: `${fileIndex}_${displayPath}`,
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

    async stageMultipleFiles(filesArray, rootHandle) {
      if (!rootHandle) {
        this.bus.publish({ type: 'PROCESS_ERROR', payload: 'Please attach a target folder first!' });
        return;
      }

      try {
        this.bus.publish({ type: 'PROCESS_START', payload: `${filesArray.length} file(s)` });
        this.stagedFiles = [];

        for (const file of filesArray) {
          const isBin = this.isBinary(file.name);
          let content = null;
          let firstLine = '';

          if (isBin) {
            content = new Uint8Array(await file.arrayBuffer());
          } else {
            content = await file.text();
            firstLine = content.split('\n')[0] || '';
          }

          let { fileName, displayPath, parts, hasExplicitComment } = this.parseTargetInfo(isBin ? null : firstLine, file.name);

          if (!hasExplicitComment && file.webkitRelativePath) {
            const normalizedPath = file.webkitRelativePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/');
            const pathParts = normalizedPath.split('/').filter(p => p && p !== '.');

            if (pathParts.includes('..')) {
              throw new Error(`File path contains forbidden parent directory reference ('..'): '${file.webkitRelativePath}'`);
            }

            if (pathParts.length > 0) {
              fileName = pathParts.pop();
              parts = pathParts;
              displayPath = normalizedPath;
            }
          }

          let fileExists = await this.checkFileExists(rootHandle, parts, fileName);
          const fileIndex = this.stagedFiles.length;

          this.stagedFiles.push({
            index: fileIndex,
            id: `${fileIndex}_${displayPath}`,
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
        console.error("Fibo Multi-File Staging Error:", err);
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
        const fileIndex = this.stagedFiles.length;

        this.stagedFiles.push({
          index: fileIndex,
          id: `${fileIndex}_${displayPath}`,
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

    async commitUpload(approvedIndices, rootHandle, enableLogging = true, enableEvents = true, changeTypesMap = {}) {
      const logs = [];
      let successCount = 0;
      let failCount = 0;
      let firstCopiedSecondLine = null;
      let firstCopiedThirdLine = null;

      try {
        const approvedSet = new Set((approvedIndices || []).map(idx => Number(idx)));
        const targets = this.stagedFiles.filter(f => approvedSet.has(f.index));
        const total = targets.length;

        if (total === 0) {
          this.clearState();
          this.bus.publish({ type: 'PROCESS_ERROR', payload: 'No files selected for commit.' });
          return;
        }

        for (let i = 0; i < total; i++) {
          const fileData = targets[i];
          let currentDirHandle = rootHandle;

          this.bus.publish({
            type: 'PROCESS_PROGRESS',
            payload: { current: i + 1, total }
          });

          let fileFeature = null;

          try {
            for (const folderName of fileData.parts) {
              currentDirHandle = await currentDirHandle.getDirectoryHandle(folderName, { create: true });
            }

            const userChangeType = changeTypesMap[fileData.index] || (fileData.exists ? 'updated' : 'new');

            if (userChangeType === 'deleted') {
              await currentDirHandle.removeEntry(fileData.fileName);
              successCount++;
              logs.push({ 
                path: fileData.displayPath, 
                status: 'SUCCESS', 
                error: null,
                feature: null,
                changeType: 'deleted'
              });
              continue;
            }

            let finalContent = fileData.content;

            if ((userChangeType === 'appended' || userChangeType === 'prepended') && !fileData.isBinary) {
              let existingText = '';
              try {
                const existingHandle = await currentDirHandle.getFileHandle(fileData.fileName, { create: false });
                const fileObj = await existingHandle.getFile();
                existingText = await fileObj.text();
              } catch (e) {
                existingText = '';
              }

              finalContent = this.combineHeaderAndContent(fileData.content, existingText, userChangeType);
            }

            const fileHandle = await currentDirHandle.getFileHandle(fileData.fileName, { create: true });
            const writable = await fileHandle.createWritable();
            try {
              await writable.write(finalContent);
            } finally {
              await writable.close();
            }

            if (!fileData.isBinary) {
              const { slots } = this.extractHeaderAndBody(finalContent);

              if (!firstCopiedSecondLine && slots.line2) {
                firstCopiedSecondLine = slots.line2;
              }
              
              if (slots.line3) {
                if (!firstCopiedThirdLine) firstCopiedThirdLine = slots.line3;
                fileFeature = this.parseFeatureInfo(slots.line3);
              }
            }

            successCount++;
            logs.push({ 
              path: fileData.displayPath, 
              status: 'SUCCESS', 
              error: null,
              feature: fileFeature,
              changeType: userChangeType
            });
          } catch (fileErr) {
            failCount++;
            const errMsg = fileErr.message || String(fileErr);
            logs.push({ 
              path: fileData.displayPath, 
              status: 'FAILED', 
              error: errMsg,
              feature: null,
              changeType: 'updated'
            });
            console.error(`Fibo Write Error [${fileData.displayPath}]:`, fileErr);
          }

          if (i > 0 && i % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 15));
          }
        }

        if (enableLogging) {
          try {
            await this.writeAutoLog(
              rootHandle, 
              logs, 
              successCount, 
              failCount, 
              firstCopiedSecondLine || 'N/A (No Line 2 Present)',
              firstCopiedThirdLine
            );
          } catch (logErr) {
            console.error("FZFD Commit Auto-Log Call-site Error:", logErr);
          }
        }

        if (enableEvents) {
          try {
            await this.writeEventJson(
              rootHandle,
              logs,
              firstCopiedSecondLine,
              firstCopiedThirdLine
            );
          } catch (eventErr) {
            console.error("FZFD Commit Event-JSON Call-site Error:", eventErr);
          }
        }

        this.clearState();
        this.bus.publish({
          type: 'PROCESS_COMPLETE',
          payload: { successCount, failCount, logs, loggingEnabled: enableLogging, eventsEnabled: enableEvents }
        });
      } catch (err) {
        this.clearState();
        console.error("Fibo Commit Error:", err);
        this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
      }
    }

    async getRotatedLogHandle(logDirHandle, year, month) {
      const baseName = `fzfd-${year}-${month}`;
      const MAX_BYTES = 1024 * 1024;
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

    async writeAutoLog(rootHandle, logs, successCount, failCount, line2Header, line3Header) {
      try {
        const logDirHandle = await rootHandle.getDirectoryHandle('FZFDlog', { create: true });
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');

        const { logFileHandle, fileSize } = await this.getRotatedLogHandle(logDirHandle, year, month);

        const timestamp = now.toISOString();
        const headerLine1 = `[TIMESTAMP: ${timestamp}] | SUCCESS: ${successCount} | FAILED: ${failCount}`;
        const headerLine2 = `[STAMP LINE 2]: ${line2Header || 'N/A'}`;
        const headerLine3 = line3Header ? `[STAMP LINE 3 / FEATURE]: ${line3Header}\n` : '';

        let logBlock = `${headerLine1}\n${headerLine2}\n${headerLine3}`;
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

    async writeEventJson(rootHandle, logs, secondLine, thirdLine) {
      try {
        const eventsDirHandle = await rootHandle.getDirectoryHandle('events', { create: true });
        
        const now = new Date();
        const isoTimestamp = now.toISOString();
        const compactStamp = isoTimestamp.replace(/[:\-.]/g, '');
        const fileName = `extension-${compactStamp}.json`;

        const line2Info = this.parseLine2Info(secondLine);
        const globalFeature = this.parseFeatureInfo(thirdLine);

        const filesPayload = logs.map(l => {
          const featureName = l.feature || globalFeature;
          const entry = {
            path: l.path,
            status: l.status === 'SUCCESS' ? 'success' : 'error',
            change_type: l.changeType || 'updated'
          };
          if (featureName) {
            entry.expects = { feature: featureName };
          }
          return entry;
        });

        const batchPayload = {
          timestamp: isoTimestamp,
          date: line2Info.date,
          model: line2Info.model,
          chat_name: line2Info.chatName,
          source: 'extension',
          files: filesPayload
        };

        const eventFileHandle = await eventsDirHandle.getFileHandle(fileName, { create: true });
        const writable = await eventFileHandle.createWritable();
        try {
          await writable.write(JSON.stringify(batchPayload, null, 2));
        } finally {
          await writable.close();
        }
      } catch (err) {
        console.error("FZFD Event JSON Write Error:", err);
      }
    }

    clearState() {
      this.stagedFiles = [];
    }
  };
}