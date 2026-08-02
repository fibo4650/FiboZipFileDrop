// features/zip/raw-text-stager.js
// Claude Sonnet 5 | 01-08-new features | 2026-08-02
// feature: phase1-multiblock

// Resolves raw pasted text — either a single plain snippet or an AI chat
// response containing one or more markdown code fences — into the same
// staged-file shape stageZip/stageMultipleFiles produce, so zip-processor.js
// can hand the result straight to FiboEventBus with no special-casing.
if (typeof window.FiboRawTextStager === 'undefined') {
  window.FiboRawTextStager = class FiboRawTextStager {
    constructor(headerParser, pathResolver, collisionDetector) {
      this.headerParser = headerParser;
      this.pathResolver = pathResolver;
      this.collisionDetector = collisionDetector;
    }

    async stageRawText(rawText, fallbackPath, rootHandle) {
      const trimmed = rawText.trim();
      if (!trimmed) {
        throw new Error('Raw text buffer is empty!');
      }

      const blocks = this.headerParser.extractMarkdownCodeBlocks(rawText);
      if (blocks.length > 0) {
        return this.stageExtractedBlocks(blocks, rootHandle);
      }
      return this.stagePlainSnippet(trimmed, (fallbackPath || '').trim(), rootHandle);
    }

    async stagePlainSnippet(trimmed, fallbackPath, rootHandle) {
      const firstLine = trimmed.split('\n')[0] || '';
      let fileName, displayPath, parts;

      if (this.headerParser.isPathHeaderLine(firstLine)) {
        ({ fileName, displayPath, parts } = this.pathResolver.parseTargetInfo(firstLine, 'unnamed.txt'));
      } else if (fallbackPath) {
        const resolvedFallback = this.pathResolver.resolveFallbackPath(fallbackPath, 'Fallback path');
        if (!resolvedFallback) {
          throw new Error('Fallback path did not resolve to a valid file name.');
        }
        ({ fileName, parts, displayPath } = resolvedFallback);
      } else {
        // Deliberately not auto-named (e.g. "pasted-code.txt") — a guessed name
        // is easy to miss and commit by accident. Forcing the user to state a
        // path up front is slower but never surprises them later.
        throw new Error('Enter a target path in "Fallback Path", or add a // path/file.js header on line 1.');
      }

      const fileExists = await this.collisionDetector.checkFileExists(rootHandle, parts, fileName);
      return [{
        index: 0,
        id: `0_${displayPath}`,
        fileName,
        displayPath,
        parts,
        content: trimmed,
        isBinary: false,
        exists: fileExists,
        needsPath: false
      }];
    }

    async stageExtractedBlocks(blocks, rootHandle) {
      const resolved = blocks.map((block, i) => this.resolveBlockPath(block, i));
      this.flagDuplicatePaths(resolved);

      const staged = [];
      for (let i = 0; i < resolved.length; i++) {
        const r = resolved[i];
        const fileExists = r.needsPath
          ? false
          : await this.collisionDetector.checkFileExists(rootHandle, r.parts, r.fileName);
        const displayPath = r.needsPath ? `(enter path) — block ${i + 1}` : r.displayPath;
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
      return staged;
    }

    // Tier 1: an in-body // path header (the block content itself carries it).
    // Tier 2: a path stated in the fence's info string, e.g. ```js src/App.jsx.
    // Neither present: flagged needsPath — never auto-named, per the same
    // "ask, don't guess" policy as the single-snippet fallback above.
    resolveBlockPath(block, i) {
      if (block.hasExplicitComment) {
        const firstLine = block.content.split('\n')[0] || '';
        const { fileName, displayPath, parts } = this.pathResolver.parseTargetInfo(firstLine, `unnamed-${i + 1}.txt`);
        return { fileName, displayPath, parts, content: block.content, needsPath: false };
      }

      if (block.candidatePath) {
        const fallback = this.pathResolver.resolveFallbackPath(block.candidatePath, `Code block ${i + 1} path annotation`);
        if (fallback) {
          return { ...fallback, content: block.content, needsPath: false };
        }
      }

      return { fileName: null, displayPath: null, parts: [], content: block.content, needsPath: true };
    }

    // Two extracted blocks resolving to the same path is a silent-overwrite risk
    // (common in "before/after" style AI responses) — flag both for manual
    // resolution rather than letting the second one clobber the first on commit.
    flagDuplicatePaths(resolved) {
      const counts = new Map();
      resolved.forEach((r) => {
        if (r.needsPath) return;
        const key = r.displayPath.toLowerCase();
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      resolved.forEach((r) => {
        if (r.needsPath) return;
        if (counts.get(r.displayPath.toLowerCase()) > 1) r.needsPath = true;
      });
    }
  };
}
