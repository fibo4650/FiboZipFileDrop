// features/zip/raw-text-stager.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

// Resolves raw pasted text — a single plain snippet, an AI chat response with
// one or more markdown code fences, or (new) a paste matching a learned
// extraction rule — into the same staged-file shape stageZip/stageMultipleFiles
// produce, so zip-processor.js can hand the result straight to FiboEventBus
// with no special-casing.

// Thrown only when every local tier failed to find a match AND no fallback path
// was given — the signal zip-processor.js uses to reveal the "Ask Gemini to
// Extract" button, as opposed to a genuine input mistake (empty buffer).
if (typeof window.FiboNoLocalMatchError === 'undefined') {
  window.FiboNoLocalMatchError = class FiboNoLocalMatchError extends Error {
    constructor(message) {
      super(message);
      this.name = 'FiboNoLocalMatchError';
    }
  };
}

if (typeof window.FiboRawTextStager === 'undefined') {
  window.FiboRawTextStager = class FiboRawTextStager {
    constructor(headerParser, pathResolver, collisionDetector, ruleMatcher, learnedRulesStore) {
      this.headerParser = headerParser;
      this.pathResolver = pathResolver;
      this.collisionDetector = collisionDetector;
      this.ruleMatcher = ruleMatcher || null;
      this.learnedRulesStore = learnedRulesStore || null;
      this.lastMatchedRule = null; // consumed + reset by zip-processor.js each call
    }

    // Ordered tier list with early-return, rather than a nested if-cascade —
    // readability for the tier chain itself, not a new extractor abstraction.
    // Tier 1/2 behavior (inside tryHeaderOrFenceTiers) is byte-for-byte identical
    // to before this refactor.
    async stageRawText(rawText, fallbackPath, rootHandle) {
      this.lastMatchedRule = null;

      const trimmed = rawText.trim();
      if (!trimmed) {
        throw new Error('Raw text buffer is empty!');
      }

      const tiers = [
        () => this.tryHeaderOrFenceTiers(rawText, rootHandle),
        () => this.tryRuleTier(rawText, rootHandle)
      ];

      for (const tier of tiers) {
        const result = await tier();
        if (result) return result;
      }

      return this.stagePlainSnippet(trimmed, (fallbackPath || '').trim(), rootHandle);
    }

    // Tier 2: markdown code fences. (Tier 1, the single-snippet 3-line header,
    // lives inside stagePlainSnippet below — it only applies when there are no
    // fences at all, so it stays the final fallback rather than an earlier tier.)
    async tryHeaderOrFenceTiers(rawText, rootHandle) {
      const blocks = this.headerParser.extractMarkdownCodeBlocks(rawText);
      if (blocks.length > 0) {
        return this.stageExtractedBlocks(blocks, rootHandle);
      }
      return null;
    }

    // Tier 3: learned-rule template matching. Only status 'verified'/'native'
    // rules are eligible to auto-apply here — 'candidate' rules are excluded by
    // getEligibleRules() and only ever testable in the Rules Manager UI.
    async tryRuleTier(rawText, rootHandle) {
      if (!this.ruleMatcher || !this.learnedRulesStore) return null;
      const results = this.ruleMatcher.matchAll(rawText, this.learnedRulesStore.getEligibleRules());
      if (results.length === 0) return null;
      this.lastMatchedRule = results[0].rule;
      return this.stageRuleMatchedBlocks(results[0].blocks, rootHandle);
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
        throw new window.FiboNoLocalMatchError('Enter a target path in "Fallback Path", or add a // path/file.js header on line 1.');
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

    // Every candidatePath from a matched rule goes through resolveFallbackPath —
    // same non-negotiable path-safety gate as every other producer in this file —
    // never parseTargetInfo, since rule-matched text has no in-body header concept.
    async stageRuleMatchedBlocks(blocks, rootHandle) {
      const resolved = blocks.map((b, i) => {
        try {
          const r = this.pathResolver.resolveFallbackPath(b.candidatePath, `Learned rule match ${i + 1}`);
          if (!r) return { fileName: null, displayPath: null, parts: [], content: b.content, needsPath: true };
          return { ...r, content: b.content, needsPath: false };
        } catch (err) {
          // resolveFallbackPath throws on '..' — never drop the block silently,
          // force manual review exactly like an unresolved markdown block does.
          console.warn('Fibo Tier3 Path Rejected:', err.message);
          return { fileName: null, displayPath: null, parts: [], content: b.content, needsPath: true };
        }
      });
      this.flagDuplicatePaths(resolved);

      const staged = [];
      for (let i = 0; i < resolved.length; i++) {
        const r = resolved[i];
        const fileExists = r.needsPath
          ? false
          : await this.collisionDetector.checkFileExists(rootHandle, r.parts, r.fileName);
        const displayPath = r.needsPath ? `(enter path) — match ${i + 1}` : r.displayPath;
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
