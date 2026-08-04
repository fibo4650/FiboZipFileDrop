// features/zip-processor.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

if (typeof window.FiboZipProcessor === 'undefined') {
  window.FiboZipProcessor = class FiboZipProcessor {
    constructor(eventBus, learnedRulesStore) {
      this.bus = eventBus;
      this.stagedFiles = [];
      this.learnedRulesStore = learnedRulesStore || null;
      this.pendingInduction = null; // {originalRawText, files} set by acceptAiExtraction, consumed by commitUpload

      this.headerParser = new window.FiboHeaderParser();
      this.pathResolver = new window.FiboPathResolver(this.headerParser);
      this.collisionDetector = new window.FiboCollisionDetector();
      this.fileWriter = new window.FiboFileWriter();
      this.logWriter = new window.FiboLogWriter();
      this.ruleMatcher = new window.FiboRuleMatcher();
      this.rawTextStager = new window.FiboRawTextStager(this.headerParser, this.pathResolver, this.collisionDetector, this.ruleMatcher, this.learnedRulesStore);
    }

    // extractHeaderAndBody is the one delegate the UI layer calls directly
    // (ui/staging-view.js uses it to preview line1/line2/line3 while editing).
    extractHeaderAndBody(textContent) {
      return this.headerParser.extractHeaderAndBody(textContent);
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
      staged.needsPath = false;

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
        this.pendingInduction = null; // starting an unrelated batch abandons any prior AI induction context

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
        this.pendingInduction = null;

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

    async stageRawText(rawText, rootHandle, fallbackPath = '') {
      if (!rootHandle) {
        this.bus.publish({ type: 'PROCESS_ERROR', payload: 'Please attach a target folder first!' });
        return;
      }

      try {
        this.bus.publish({ type: 'PROCESS_START', payload: 'Raw Text Input' });
        this.pendingInduction = null; // starting an unrelated batch abandons any prior AI induction context
        this.stagedFiles = await this.rawTextStager.stageRawText(rawText, fallbackPath, rootHandle);

        const matchedRule = this.rawTextStager.lastMatchedRule;
        if (matchedRule) {
          this.bus.publish({
            type: 'RULE_MATCHED',
            payload: { ruleId: matchedRule.id, ruleName: matchedRule.name, matchCount: this.stagedFiles.length }
          });
          if (this.learnedRulesStore) {
            this.learnedRulesStore.recordRuleUsage(matchedRule.id).catch(err => console.error('Fibo Rule Usage Record Error:', err));
          }
        }

        this.bus.publish({ type: 'ZIP_STAGED', payload: this.stagedFiles });
      } catch (err) {
        this.clearState();
        console.error("Fibo Raw Text Error:", err);
        // Mutually exclusive, not both: PROCESS_ERROR's content.js handler does a
        // full resetToDefaultView() that would immediately wipe the AI-button
        // state RAW_TEXT_NO_LOCAL_MATCH's handler just set, if both fired.
        if (err instanceof window.FiboNoLocalMatchError) {
          this.bus.publish({ type: 'RAW_TEXT_NO_LOCAL_MATCH', payload: { rawText, fallbackPath, message: err.message } });
        } else {
          this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
        }
      }
    }

    async requestAiExtraction(rawText, context) {
      this.bus.publish({ type: 'AI_EXTRACT_START' });
      try {
        const response = await chrome.runtime.sendMessage({ type: 'FIBO_AI_EXTRACT', payload: { text: rawText, context: context || '' } });
        if (!response || !response.ok) {
          this.bus.publish({ type: 'AI_EXTRACT_ERROR', payload: (response && response.error) || 'Unknown error contacting Gemini.' });
          return;
        }
        this.bus.publish({ type: 'AI_EXTRACT_RESULT', payload: { files: response.files } });
      } catch (err) {
        console.error('Fibo AI Extract Error:', err);
        this.bus.publish({ type: 'AI_EXTRACT_ERROR', payload: err.message || String(err) });
      }
    }

    // Every f.path is re-sanitized via resolveFallbackPath — never used directly,
    // same non-negotiable rule as Tier 3. Unlike Tier 3's per-block handling, a
    // '..' anywhere in the AI result rejects the WHOLE batch (nothing partially
    // staged) since this is a single paid network response, not a locally-derived
    // split — a malformed one is more likely to be entirely wrong than partially.
    async acceptAiExtraction(files, rootHandle, originalRawText) {
      if (!rootHandle) {
        this.bus.publish({ type: 'PROCESS_ERROR', payload: 'Please attach a target folder first!' });
        return;
      }

      try {
        this.bus.publish({ type: 'PROCESS_START', payload: 'Gemini Extraction' });

        const resolved = files.map((f, i) => {
          const r = this.pathResolver.resolveFallbackPath(f.path, `Gemini result ${i + 1}`);
          if (!r) throw new Error(`Gemini result ${i + 1} did not resolve to a valid path.`);
          return { ...r, content: f.content };
        });
        this.rawTextStager.flagDuplicatePaths(resolved);

        const staged = [];
        for (let i = 0; i < resolved.length; i++) {
          const r = resolved[i];
          const fileExists = r.needsPath
            ? false
            : await this.collisionDetector.checkFileExists(rootHandle, r.parts, r.fileName);
          const displayPath = r.needsPath ? `(enter path) — file ${i + 1}` : r.displayPath;
          const index = staged.length;

          staged.push({
            index,
            id: `${index}_${displayPath}`,
            fileName: r.fileName,
            displayPath,
            parts: r.parts || [],
            content: r.content,
            isBinary: false,
            exists: fileExists,
            needsPath: r.needsPath
          });
        }

        this.stagedFiles = staged;
        // Consumed by commitUpload on a successful write — NOT fired here, since
        // the user can still rename paths, deselect files, or cancel entirely in
        // staging-view before anything is actually written.
        this.pendingInduction = files.length >= 2 ? { originalRawText, files } : null;
        this.bus.publish({ type: 'ZIP_STAGED', payload: this.stagedFiles });
      } catch (err) {
        this.clearState();
        console.error('Fibo AI Accept Error:', err);
        this.bus.publish({ type: 'PROCESS_ERROR', payload: err.message });
      }
    }

    // A signature is recorded as an observation, not a rule, the first time it's
    // ever seen — only the SECOND sighting promotes it into a real candidate. A
    // third+ sighting just strengthens the now-existing rule. One-off paste
    // formats that never recur stay invisible bookkeeping forever instead of
    // permanently cluttering the Rules Manager.
    async tryInduceRule(originalRawText, files) {
      if (!this.learnedRulesStore) return;
      const response = await chrome.runtime.sendMessage({ type: 'FIBO_AI_INDUCE', payload: { sampleText: originalRawText } });
      if (!response || !response.ok || response.templateType === 'unmatched') return;

      const template = { type: response.templateType, ...response.params };

      const existingRule = this.learnedRulesStore.findRuleBySignature(template);
      if (existingRule) {
        await this.learnedRulesStore.recordRuleUsage(existingRule.id); // already a real rule — strengthen, don't duplicate
        return;
      }

      const observation = await this.learnedRulesStore.recordObservation(template, originalRawText.slice(0, 2000));
      if (observation.occurrences >= 2) {
        await this.learnedRulesStore.promoteObservationToRule(observation, {
          name: response.suggestedName || 'Gemini-Induced Rule',
          source: 'gemini-induced'
        });
      }
      // occurrences === 1: recorded and nothing more — not yet a rule, not yet visible anywhere.
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

        // Fire-and-forget, never blocks PROCESS_COMPLETE — only learns from files
        // the user actually committed to disk, not merely previewed-and-accepted.
        if (successCount > 0 && this.pendingInduction) {
          const { originalRawText, files } = this.pendingInduction;
          this.tryInduceRule(originalRawText, files).catch(err => console.error('Fibo Rule Induction Error:', err));
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
      this.pendingInduction = null;
    }
  };
}

// Legacy alias — preserved for backwards compatibility.
window.ZipProcessor = window.FiboZipProcessor;
