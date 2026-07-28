// features/zip-processor.js
// Claude Sonnet 5 | session 3 refactor | 2026-07-28

if (typeof window.ZipProcessor === 'undefined') {
  window.ZipProcessor = class ZipProcessor {
    constructor(eventBus) {
      this.bus = eventBus;
      this.stagedFiles = [];

      this.headerParser = new window.FiboHeaderParser();
      this.pathResolver = new window.FiboPathResolver();
      this.collisionDetector = new window.FiboCollisionDetector();
      this.fileWriter = new window.FiboFileWriter();
      this.logWriter = new window.FiboLogWriter();
    }

    // -- Back-compat delegates (kept for API stability) --

    isBinary(filename) {
      return this.pathResolver.isBinary(filename);
    }

    parseTargetInfo(firstLine, rawFileName) {
      return this.pathResolver.parseTargetInfo(firstLine, rawFileName);
    }

    isPathHeaderLine(line) {
      return this.headerParser.isPathHeaderLine(line);
    }

    isStampHeaderLine(line) {
      return this.headerParser.isStampHeaderLine(line);
    }

    isFeatureHeaderLine(line) {
      return this.headerParser.isFeatureHeaderLine(line);
    }

    extractHeaderAndBody(textContent) {
      return this.headerParser.extractHeaderAndBody(textContent);
    }

    combineHeaderAndContent(addedText, diskText, mode) {
      return this.headerParser.combineHeaderAndContent(addedText, diskText, mode);
    }

    parseLine2Info(line2) {
      return this.headerParser.parseLine2Info(line2);
    }

    parseFeatureInfo(line3) {
      return this.headerParser.parseFeatureInfo(line3);
    }

    async checkFileExists(rootHandle, parts, fileName) {
      return this.collisionDetector.checkFileExists(rootHandle, parts, fileName);
    }

    async getRotatedLogHandle(logDirHandle, year, month) {
      return this.logWriter.getRotatedLogHandle(logDirHandle, year, month);
    }

    async writeAutoLog(rootHandle, logs, successCount, failCount, line2Header, line3Header) {
      return this.logWriter.writeAutoLog(rootHandle, logs, successCount, failCount, line2Header, line3Header);
    }

    async writeEventJson(rootHandle, logs, secondLine, thirdLine) {
      return this.logWriter.writeEventJson(rootHandle, logs, secondLine, thirdLine, this.headerParser);
    }

    // -- Orchestration --

    async updateStagedFile(index, newDisplayPath, newHeaderLines, rootHandle) {
      const staged = this.stagedFiles.find(f => f.index === index);
      if (!staged) return null;

      const { fileName, parts, displayPath } = this.pathResolver.resolveExplicitPath(newDisplayPath);
      staged.fileName = fileName;
      staged.displayPath = displayPath;
      staged.parts = parts;
      staged.id = `${staged.index}_${displayPath}`;

      if (newHeaderLines && typeof newHeaderLines === 'object' && !staged.isBinary) {
        const { body } = this.headerParser.extractHeaderAndBody(staged.content);
        const newHeaders = [];

        if (newHeaderLines.line1 && this.headerParser.isPathHeaderLine(newHeaderLines.line1)) {
          newHeaders.push(newHeaderLines.line1);
        }
        if (newHeaderLines.line2 && this.headerParser.isStampHeaderLine(newHeaderLines.line2)) {
          newHeaders.push(newHeaderLines.line2);
        }
        if (newHeaderLines.line3 && this.headerParser.isFeatureHeaderLine(newHeaderLines.line3)) {
          newHeaders.push(newHeaderLines.line3);
        }

        const headerBlock = newHeaders.length > 0 ? newHeaders.join('\n') + '\n' : '';
        staged.content = headerBlock + body;
      }

      if (rootHandle) {
        staged.exists = await this.collisionDetector.checkFileExists(rootHandle, staged.parts, staged.fileName);
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

          const isBin = this.pathResolver.isBinary(rawFileName);
          let content = null;
          let firstLine = '';

          if (isBin) {
            content = await zipEntry.async('uint8array');
          } else {
            content = await zipEntry.async('string');
            firstLine = content.split('\n')[0] || '';
          }

          let { fileName, displayPath, parts, hasExplicitComment } = this.pathResolver.parseTargetInfo(isBin ? null : firstLine, rawFileName);

          if (!hasExplicitComment) {
            const override = this.pathResolver.resolveFallbackPath(relativePath, 'ZIP entry');
            if (override) {
              fileName = override.fileName;
              parts = override.parts;
              displayPath = override.displayPath;
            }
          }

          let fileExists = await this.collisionDetector.checkFileExists(rootHandle, parts, fileName);
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
          const isBin = this.pathResolver.isBinary(file.name);
          let content = null;
          let firstLine = '';

          if (isBin) {
            content = new Uint8Array(await file.arrayBuffer());
          } else {
            content = await file.text();
            firstLine = content.split('\n')[0] || '';
          }

          let { fileName, displayPath, parts, hasExplicitComment } = this.pathResolver.parseTargetInfo(isBin ? null : firstLine, file.name);

          if (!hasExplicitComment && file.webkitRelativePath) {
            const override = this.pathResolver.resolveFallbackPath(file.webkitRelativePath, 'File path');
            if (override) {
              fileName = override.fileName;
              parts = override.parts;
              displayPath = override.displayPath;
            }
          }

          let fileExists = await this.collisionDetector.checkFileExists(rootHandle, parts, fileName);
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
        const { fileName, displayPath, parts, hasExplicitComment } = this.pathResolver.parseTargetInfo(firstLine, 'unnamed.txt');

        if (!hasExplicitComment) {
          this.clearState();
          this.bus.publish({
            type: 'PROCESS_ERROR',
            payload: 'Raw text requires a valid path comment on line 1 (e.g. // path/file.js or # path/file.md)'
          });
          return;
        }

        let fileExists = await this.collisionDetector.checkFileExists(rootHandle, parts, fileName);
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

          this.bus.publish({
            type: 'PROCESS_PROGRESS',
            payload: { current: i + 1, total }
          });

          let fileFeature = null;

          try {
            const userChangeType = changeTypesMap[fileData.index] || (fileData.exists ? 'updated' : 'new');
            const result = await this.fileWriter.writeStagedFile(rootHandle, fileData, userChangeType, this.headerParser);

            if (result.deleted) {
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

            if (result.slots) {
              if (!firstCopiedSecondLine && result.slots.line2) {
                firstCopiedSecondLine = result.slots.line2;
              }

              if (result.slots.line3) {
                if (!firstCopiedThirdLine) firstCopiedThirdLine = result.slots.line3;
                fileFeature = result.feature;
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
            await this.logWriter.writeAutoLog(
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
            await this.logWriter.writeEventJson(
              rootHandle,
              logs,
              firstCopiedSecondLine,
              firstCopiedThirdLine,
              this.headerParser
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

    clearState() {
      this.stagedFiles = [];
    }
  };
}
