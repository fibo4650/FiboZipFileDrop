// docs/ui//02-ai-audit-and-debug-guide.md


# 🛠️ Fibo Zip File Drop (FZFD) — AI Audit & Debugging Guide

This document is the authoritative technical specification and defensive engineering guide for AI agents auditing, debugging, maintaining, or refactoring the **Fibo Zip File Drop (FZFD)** Chrome Extension codebase.

---

## 1. System Architecture & Constraints Matrix

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      Chrome Extension MV3 Context                       │
├───────────────────────────────────┬─────────────────────────────────────┤
│ Service Worker (background.js)     │ Content Script (content.js)         │
│  - Runs in headless worker        │  - Injected flat script sequence    │
│  - Handles extension icon clicks │  - Renders closed Shadow DOM UI     │
│  - Ignores internal systemic URLs │  - Direct File System Access API    │
└───────────────────────────────────┴─────────────────────────────────────┘
```

### 🚨 Strict Runtime Invariants
1. **Manifest V3 Content Script Execution Order:** Scripts are injected flatly in sequence as declared in `manifest.json`.
2. **Zero Module Exports/Imports:** **NEVER use `import` or `export` keywords** anywhere in `core/`, `features/`, `ui/`, or `content.js`. Modern ES modules trigger Content Security Policy (CSP) blocking on strict web domains. Everything operates in global namespace attached to `window`.
3. **Closed Shadow DOM Encapsulation:** Interface elements MUST live strictly inside a **closed Shadow DOM** attached to `#fibo-zip-drop-root`. This prevents host website CSS from breaking extension styling and prevents extension CSS from bleeding onto host web pages.
4. **Headless Worker Boundaries:** `background.js` runs in a service worker context without access to `window`, `document`, or DOM APIs. Extension click triggers must ignore protected browser URLs (`chrome://*`, `edge://*`, `about:*`, `chromewebstore.google.com`).

---

## 2. Manifest Load Sequence & Dependency Graph

Scripts must load in exact sequential order in `manifest.json`:

```text
vendor/jszip.min.js             ──► (Global JSZip library)
core/event-bus.js              ──► (Global window.FiboEventBus / window.EventBus)
features/file-picker.js        ──► (Global window.FiboFilePicker / window.FilePicker)
features/zip/header-parser.js  ──► (Global window.FiboHeaderParser)
features/zip/path-resolver.js  ──► (Global window.FiboPathResolver)
features/zip/collision-detector.js ──► (Global window.FiboCollisionDetector)
features/zip/file-writer.js    ──► (Global window.FiboFileWriter)
features/zip/log-writer.js     ──► (Global window.FiboLogWriter)
features/zip-processor.js      ──► (Global window.FiboZipProcessor / window.ZipProcessor)
features/prompt-manager.js     ──► (Global window.FiboPromptManager / window.PromptManager)
ui/styles.js                   ──► (Global window.FiboStyles)
ui/shadow-dom.js               ──► (Global window.FiboShadowDOM)
ui/toast-manager.js            ──► (Global window.FiboToastManager)
ui/clipboard.js                ──► (Global window.FiboClipboard)
ui/file-view.js                ──► (Global window.FiboFileView)
ui/text-view.js                ──► (Global window.FiboTextView)
ui/prompts-view.js             ──► (Global window.FiboPromptsView)
ui/staging-view.js             ──► (Global window.FiboStagingView)
content.js                     ──► (Master coordinator & message listener)
```

---

## 3. Threat Matrix & Defensive Security Standards

### 🛡️ Path Parsing & Regex Boundaries (`features/zip/path-resolver.js` & `header-parser.js`)
* **False-Positive Path Mitigation:** Header path comments MUST terminate with a valid file extension matching `/\.[a-zA-Z0-9]{1,10}$/` and MUST NOT contain protocol strings (`://`). Prose lines mentioning filenames (e.g. `# Version 1.2 notes`) MUST be rejected as explicit paths.
* **Parent Directory Traversal Block (`..`):** Any path header or relative ZIP entry containing parent directory references (`..`) MUST throw an immediate exception. The File System Access API rejects `..` in `getDirectoryHandle()` and throws unhandled exceptions.
* **UTF-8 Byte Order Mark (BOM) Removal:** Input buffers MUST strip leading BOM marks (`/^\uFEFF/`) prior to header regex evaluation to prevent BOM characters from breaking regex start-of-line (`^`) assertions.
* **Path Sanitization:** Illegal OS characters (`:`, `*`, `?`, `"`, `<`, `>`, `|`) MUST be replaced with `_`. Backslashes (`\`) MUST be normalized to forward slashes (`/`), and duplicate slashes MUST be collapsed (`/+/`).

### 💾 File System Stream Safety (`features/zip/file-writer.js` & `log-writer.js`)
* **Writable Stream Seek Rule:** `FileSystemWritableFileStream` objects DO NOT possess a `.size` property. Querying `writable.size` causes stream corruption. File size MUST be inspected from the `File` handle (`(await handle.getFile()).size`) *before* creating a writable stream with `{ keepExistingData: true }`.
* **Guaranteed Stream Closure:** Stream write operations MUST be wrapped in `try...finally` blocks executing `await writable.close()` to prevent directory handle locking.
* **Sequential Navigation:** Directory navigation (`getDirectoryHandle(folder, { create: true })`) MUST use sequential `for...of` loops with `await` to avoid race conditions.

---

## 4. Event Bus Architecture & Messaging Contracts (`core/event-bus.js`)

Publishers emit structured events through `window.FiboEventBus`:

| Event Type | Emitted By | Payload Structure | System Action |
| :--- | :--- | :--- | :--- |
| `WORKSPACE_READY` | `FilePicker` | `string` (Folder Name) | Transforms UI connect button to green active state. |
| `WORKSPACE_ERROR` | `FilePicker` | `string` (Error Text) | Resets workspace state and renders status warning. |
| `PROCESS_START` | `ZipProcessor` | `string` (Batch Label) | Displays structure analysis status. |
| `ZIP_STAGED` | `ZipProcessor` | `Array<StagedFileObject>` | Morphs dynamic UI zone into staging review matrix. |
| `PROCESS_PROGRESS`| `ZipProcessor` | `{ current: number, total: number }` | Updates real-time write progress bar. |
| `PROCESS_COMPLETE`| `ZipProcessor` | `{ successCount, failCount, logs, loggingEnabled, eventsEnabled }` | Renders execution log summary & download button. |
| `PROCESS_ERROR` | `ZipProcessor` | `string` (Error Message) | Resets view and displays error status text. |

---

## 5. Staging State & Index Pointer Rules (`ui/staging-view.js`)

* **Numeric Index Pointers:** Staged items MUST be mapped and approved using unique integer array indices (`file.index`). Mapping staged approvals solely by `displayPath` strings causes key collisions when archives contain duplicate file paths.
* **State Preservation:** When inline-editing file headers or searching paths, the staging view MUST capture the current UI state (`captureUIState()`) and restore overwrite checkbox states and selected `change_type` values upon re-render.
* **State Clearing:** `ZipProcessor.clearState()` (`this.stagedFiles = []`) MUST be called when switching input modes, cancelling staging views, closing the panel, or completing a commit.

---

## 6. Diagnostic & Debugging Decision Tree

### Issue 1: Extension panel fails to open on click
* **Cause A:** Target URL is a protected browser page (`chrome://`, `edge://`, `chromewebstore.google.com`).
* **Cause B:** Script injection failed or event listener threw a syntax error.
* **Fix:** Check DevTools Console in target tab. Confirm zero `import`/`export` keywords exist in any JS file.

### Issue 2: "Forbidden parent directory reference" exception thrown during staging
* **Cause:** Incoming code header contains relative traversal (`../` or `path/to/../file.js`).
* **Fix:** Inspect incoming source text. Ensure path header on line 1 is a clean relative path from workspace root.

### Issue 3: Staged file modifications or prompt additions do not persist
* **Cause:** `PromptManager.save()` or `ZipProcessor.updateStagedFile` failed due to storage permissions or invalid payload parameters.
* **Fix:** Verify `chrome.storage.local` availability fallback to `localStorage`. Check that update payloads explicitly guard string parameters (`typeof payload.content === 'string'`).

