<!-- Audit.md -->
<!-- Claude 3.7 Sonnet | FZFD Security & Audit Update | 2026-07-27 -->

# Fibo Zip File Drop: AI Code Audit & Quality Control Specification

This document is the auditing directive and quality control specification for AI agents auditing, debugging, or maintaining the Fibo Zip File Drop Chrome Extension.

---

## 1. System Architecture & Constraints

* **Runtime Environment:** Chrome Extension Manifest V3 (MV3).
* **Flat Script Execution:** Script files are loaded sequentially in `manifest.json`. **NEVER use `import` or `export` statements** inside `core/`, `features/`, or `content.js`, as modern ES modules trigger Content Security Policy (CSP) blocking on strict web domains.
* **UI Isolation:** Interface elements MUST live strictly inside a **closed Shadow DOM** attached to `#fibo-zip-drop-root` to prevent host website CSS bleeding and style leakage.
* **Headless Background Worker:** `background.js` runs in a service worker context without access to `window` or DOM APIs. Protected browser URLs (`chrome://*`, `edge://*`, `about:*`, `chromewebstore.google.com`) MUST be ignored by extension messaging.

---

## 2. Threat Matrix & Defensive Code Standards

### 🛡️ Path Parsing & Regex Protection
* **False-Positive Path Defense:** Header path comments MUST terminate with a valid file extension matching `/\.[a-zA-Z0-9]{1,10}$/` and MUST NOT contain protocol strings (`://`). Prose header lines mentioning filenames (e.g., `# Addendum to Phase3_Blueprint.md — Block 7`) MUST be rejected as explicit paths and fall back to native ZIP relative paths or filenames.
* **Parent Directory Reference Rejection (`..`):** Header paths or ZIP relative entries containing parent folder references (`..`) MUST be strictly rejected and throw an explicit exception. The File System Access API prohibits `..` in `getDirectoryHandle()` calls and will throw an unhandled `TypeError`.
* **UTF-8 BOM Removal:** Text input buffers MUST strip leading Byte Order Marks (`/^\uFEFF/`) prior to header regex evaluation to prevent BOM characters from breaking regex start-of-line (`^`) assertions.
* **Comment Marker Stripping:** Comment delimiters (`//`, `/*`, `*/`, `#`, `<!--`, `-->`) MUST be stripped cleanly from Line 1, Line 2, and Line 3 without corrupting internal slashes.
* **Path Sanitization:** Illegal OS characters (`:`, `*`, `?`, `"`, `<`, `>`, `|`) MUST be replaced with `_`. Backslashes (`\`) MUST be normalized to forward slashes (`/`), and consecutive slashes MUST be collapsed (`/+/`).

### 💾 File System Access API & Stream Safety
* **Writable Stream Seek Rule:** `FileSystemWritableFileStream` objects DO NOT possess a `.size` property. Querying `writable.size` causes stream corruption. File size MUST be inspected from the `File` handle (`(await handle.getFile()).size`) *before* creating a writable stream with `{ keepExistingData: true }`.
* **Guaranteed Stream Closure:** Stream writes MUST be wrapped inside `try...finally` blocks executing `await writable.close()` to prevent locking directory handles.
* **Directory Creation Safety:** Recursive directory navigation (`getDirectoryHandle(folder, { create: true })`) MUST use sequential `for...of` loops with `await`, never un-awaited array callbacks like `forEach`.

### 🧠 Staging State & Index Pointer Integrity
* **Numeric Index Pointers:** Staged items MUST be mapped and approved using unique integer array indices (`file.index`). Mapping staged approvals solely by `displayPath` strings creates key collisions when archives contain duplicate file paths.
* **State Wiping:** `ZipProcessor.clearState()` (`this.stagedFiles = []`) MUST be called when switching input tabs, cancelling staging views, closing the panel, or completing a commit.

---

## 3. Event Routing Matrix Verification

Verify that `EventBus` events publish and consume expected payloads:

| Event Type | Emitted By | Payload Structure | System Action |
| :--- | :--- | :--- | :--- |
| `WORKSPACE_READY` | `FilePicker` | `string` (Folder Name) | Updates connect button to active green state. |
| `WORKSPACE_ERROR` | `FilePicker` | `string` (Error Message) | Displays warning in status container. |
| `PROCESS_START` | `ZipProcessor` | `string` (Batch Label) | Displays structure analysis state. |
| `ZIP_STAGED` | `ZipProcessor` | `Array<StagedFileObject>` | Morph UI to conflict review matrix. |
| `PROCESS_PROGRESS`| `ZipProcessor` | `{ current: number, total: number }` | Updates real-time write progress bar. |
| `PROCESS_COMPLETE`| `ZipProcessor` | `{ successCount, failCount, logs, loggingEnabled, eventsEnabled }` | Renders completion statistics and log download button. |
| `PROCESS_ERROR` | `ZipProcessor` | `string` (Error Message) | Resets view and displays error status. |

---

## 4. Audit Execution Checklist

When reviewing code modifications, confirm:
1. [ ] Zero `import` or `export` keywords in injected content scripts.
2. [ ] Shadow DOM attached with `{ mode: 'closed' }`.
3. [ ] `writeAutoLog` and `writeEventJson` wrapped in individual `try...catch` blocks to prevent logging failures from halting disk commits.
4. [ ] Line 2 (`parseLine2Info`) partitions using `indexOf('|')` and `lastIndexOf('|')` to safely preserve chat names containing internal pipes.
5. [ ] Line 3 (`parseFeatureInfo`) extracts feature IDs using `/^feature:\s*(.+)$/i`.
6. [ ] Paths with `..` references throw explicit errors during staging.