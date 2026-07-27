# Master Code Audit, Security & Quality Control Specification: Fibo Zip File Drop

This document is the unified, standalone auditing directive and quality control specification for the "Fibo Zip File Drop" Chrome Extension. It integrates all foundational requirements, security directives, runtime threat matrices, historical bug fixes, and feature specifications from `llm.md`, `NewBuild.md`, and `Expand.md`.

---

## 1. Reference Architecture & Core Constraints

Any audit of this codebase must enforce these non-negotiable architectural boundaries:

* **Runtime Framework:** Chrome Extension Manifest V3 (MV3).
* **Injection Paradigm:** Sequential, flat global content scripts defined in `manifest.json`.
  * ⚠️ *Critical Rule:* **NEVER use `import` or `export` keywords** inside `core/`, `features/`, or `content.js`. Modern ES modules injected directly into web pages trigger Content Security Policy (CSP) blocking on strict production domains.
* **UI Containment & Sandboxing:** All UI elements must live strictly inside a **closed Shadow DOM** attached to a host container (`#fibo-zip-drop-root`). This prevents host website CSS from distorting the extension UI and prevents extension styles from leaking onto the web page.
* **Two-Stage Workflow Lifecycle:**
  1. **Staging Phase:** Unpack archive / raw text $\rightarrow$ read first-line path comments $\rightarrow$ evaluate disk conflict state $\rightarrow$ build in-memory staging array.
  2. **Commit Phase:** Render conflict review matrix $\rightarrow$ collect approved overwrite decisions $\rightarrow$ batch write to the local file system via File System Access API.
* **Script Injection Order:**
  1. `vendor/jszip.min.js` (Exposes global `JSZip`)
  2. `core/event-bus.js` (Exposes global class `EventBus`)
  3. `features/file-picker.js` (Exposes global class `FilePicker`)
  4. `features/zip-processor.js` (Exposes global class `ZipProcessor`)
  5. `content.js` (Main coordinator & Shadow DOM generator)
* **Security & Environment Boundaries:**
  * Background Service Worker (`background.js`) runs headlessly without DOM or `window` access.
  * Extension messaging must explicitly ignore protected browser pages (`chrome://*`, `edge://*`, `about:*`, and `chromewebstore.google.com`).

---

## 2. Mandatory Audit Targets & Threat Matrix

### 🛡️ 2.1 Text & Path Parsing Vulnerabilities

#### A. False-Positive Path Directives & Strict Extension Validation
* **Problem:** Text lines like `# Addendum to Phase3_Merlin_Blueprint.md — Block 7` contain a file extension embedded in prose text, which tricks naive regex parsers into capturing garbage strings as folder paths.
* **Directive:** Path comment candidates MUST strictly terminate with a valid file extension (`/\.[a-zA-Z0-9]{1,10}$/`) and MUST NOT contain protocol identifiers (`://`).
```javascript
const validExtensionEnd = /\.[a-zA-Z0-9]{1,10}$/;
if (candidate && !candidate.includes('://') && validExtensionEnd.test(candidate)) {
  // Valid path directive
}
```

#### B. Comment Wrapper Stripping & Path Sanitization
* Stripping comment delimiters (`//`, `/*`, `*/`, `#`, `<!--`, `-->`) must leave internal path slashes intact.
* Illegal OS path characters (`:`, `*`, `?`, `"`, `<`, `>`, `|`) must be converted to safe separators (e.g., `_`). Backslashes (`\`) must be normalized to forward slashes (`/`).

#### C. Empty Buffers & Binary File Exceptions
* **0-Byte / Empty Text Files:** Must fall back gracefully to the file's natural filename without throwing runtime exceptions.
* **Binary File Exception:** Binary formats (images, audio, fonts, archives) must skip line 1 text comment parsing entirely.
* **ZIP Relative Path Fallback:** For binary assets or text files lacking a valid line 1 comment directive, the processor MUST fall back to utilizing the ZIP archive's internal folder structure (`relativePath`) to generate local disk paths rather than flattening all files to the root directory.
* **SVG Classification:** SVG (`.svg`) files are XML text documents and must NOT be blacklisted as binary assets if they contain valid header path directives.

---

### 💾 2.2 File System Access API & Auto-Logging Rules

#### A. Explicit File Metadata Read (Stream Seek Bug Fix)
* **Problem:** `FileSystemWritableFileStream` instances do NOT possess a `.size` property. Calling `writable.seek(writable.size)` evaluates to `writable.seek(undefined)` and fails or corrupts stream offsets.
* **Directive:** Always inspect the `File` handle size *prior* to creating the writable stream:
```javascript
const file = await logFileHandle.getFile();
const fileSize = file.size; // Numerical byte offset

const writable = await logFileHandle.createWritable({ keepExistingData: true });
try {
  await writable.seek(fileSize); // Valid byte position
  await writable.write(logBlock);
} finally {
  await writable.close();
}
```

#### B. Monthly Log Rotation Limits
* **Directory:** `FZFDlog/` inside the user's bound root workspace.
* **Naming Pattern:** `fzfd-YYYY-MM.log`.
* **Max Threshold:** `1,048,576` bytes (1 MB).
* **Overflow Behavior:** Automatically rotate to `fzfd-YYYY-MM-part2.log`, `fzfd-YYYY-MM-part3.log`, etc., when threshold is reached.

#### C. Stream & Handle Safety
* **Dangling Streams:** `writable.close()` must always be guaranteed via `try...finally` blocks to prevent locking directory handles or leaking system memory.
* **Sequential Directory Creation:** Recursive folder creation (`getDirectoryHandle(folderName, { create: true })`) must be sequentially `await`ed in a `for...of` loop, never inside un-awaited `forEach` callbacks which cause directory handle race conditions.
* **Permission Verification:** Workspace handles must be checked via `verifyPermission()` before executing read/write operations.

---

### 🧠 2.3 Staging State, Index Alignment & Memory Cleanup

* **Unique ID / Pointer Mapping:** Staged items must be identified by unique IDs or numeric indices rather than raw `displayPath` strings. Identifying items solely by string path causes key collisions and checkbox desynchronization when multiple files share identical display paths.
* **XSS / HTML Sanitization:** File paths and names rendered into the Shadow DOM must be HTML-escaped or inserted via `textContent` to prevent DOM XSS vulnerabilities from malicious headers (e.g. `// <img src=x onerror=...>.js`).
* **Memory Lifecycle Cleanup:** The temporary in-memory buffer (`stagedFiles`) must be wiped clean (`clearState()`) upon:
  1. Successful commit completion (`PROCESS_COMPLETE`).
  2. Staging cancellation by user (`cancelBtn.onclick`).
  3. Closing the sidebar panel (`closeBtn.onclick`).

---

### ⚡ 2.4 Event Bus Isolation & Message Matrix

* **Global Scope Isolation:** The `EventBus` instance must remain scoped inside `bootstrapFibo()` to prevent webpage scripts from eavesdropping on internal extension events.
* **Cloning Safety:** `EventBus.publish()` should safely handle non-cloneable objects (Errors, DOM nodes) without throwing uncaught `structuredClone` exceptions.

#### Event Routing Matrix Specification

| Event Type | Emitted By | Payload Structure | System Action |
| :--- | :--- | :--- | :--- |
| `WORKSPACE_READY` | `FilePicker` | `string` (Folder Name) | Transforms UI connect button to bound green state. |
| `WORKSPACE_ERROR` | `FilePicker` | `string` (Error Text) | Resets state, displays alert in status tray. |
| `PROCESS_START` | `ZipProcessor` | `string` (File/Archive Name) | Shifts status UI to analysis mode. |
| `ZIP_STAGED` | `ZipProcessor` | `Array<StagedFileObject>` | Triggers UI morph from dropzone to conflict review matrix. |
| `PROCESS_PROGRESS`| `ZipProcessor` | `{ current: number, total: number }` | Updates real-time write progress bar. |
| `PROCESS_COMPLETE`| `ZipProcessor` | `{ successCount, failCount, logs, loggingEnabled }` | Displays completion statistics and log download options. |
| `PROCESS_ERROR` | `ZipProcessor` | `string` (Error Text) | Resets view and displays error notification. |

---

## 3. Feature Expansion Compliance Checklist

Audit active builds against these required feature enhancements from `Expand.md`:

### 🚀 Module A: Frontend UX Features
* [ ] **A.1 Global Overwrite Toggle ("Select All / Deselect All"):** Master checkbox present at top of `.fibo-file-list` to programmatically toggle all overwrite checkboxes.
* [ ] **A.2 Real-Time Staging Filter & Search Bar:** Sticky search input above file matrix filtering `displayPath` visible rows via CSS (`display: none`) without desynchronizing input indices.

### ⚙️ Module B: Deep Core Engine Features
* [ ] **B.1 Binary Asset Handling & ZIP Path Fallback:** Automatic binary format detection skipping text comment parsing and falling back to ZIP relative paths.
* [ ] **B.2 Async Write Throttling & Progress Milestones:** Throttled batch writing (e.g. pause 20ms every 10 files) emitting `PROCESS_PROGRESS` events to drive a visual progress bar.

---

## 4. Audit Execution & Output Format

When auditing codebase changes against this specification, categorize findings into:

1. **Critical Security/Runtime Failures:** (CSP violations, XSS vulnerabilities, unhandled stream crashes, memory leaks).
2. **Logic & Architecture Inconsistencies:** (Desynchronized indices, missing fallback paths, documentation event payload mismatches).
3. **Defensive Refactoring Recommendations:** (Regex optimizations, UI accessibility, robust event bus cloning).