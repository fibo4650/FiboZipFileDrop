# Feature Expansion Blueprint & Roadmap: Fibo Zip File Drop

This document is the standalone product extension manual and feature roadmap for the "Fibo Zip File Drop" Chrome Extension. When provided to an AI agent, its purpose is to guide the implementation of new features, performance optimizations, and UI upgrades without violating architectural constraints.

---

## 1. Baseline Execution Architecture & Constraints

All new features and refactoring tasks must strictly respect the core execution environment:

* **Runtime Framework:** Chrome Extension Manifest V3 (MV3).
* **Injection Paradigm:** Sequential, flat global content scripts listed in `manifest.json`. **Do NOT use `import` or `export` syntax**, as host website Content Security Policies (CSPs) will block module execution.
* **Interface Layer:** Closed Shadow DOM encapsulation (`#fibo-zip-drop-root`). All new buttons, textareas, progress bars, overlays, or CSS styles must reside inside the shadow root.
* **Two-Stage Workflow Lifecycle:**
  1. **Staging Phase:** Scan input (ZIP archive / single file / raw text) $\rightarrow$ parse line 1 path comment $\rightarrow$ evaluate disk conflict state $\rightarrow$ publish memory staging array (`ZIP_STAGED`).
  2. **Commit Phase:** Render conflict review matrix $\rightarrow$ collect approved overwrite index choices $\rightarrow$ batch write to local file system via File System Access API.

---

## 2. System Architecture & File Structure Map

```text
fibo-zip-drop/
├── manifest.json          # Extension manifest, permissions, & content script array order
├── background.js          # MV3 Service Worker (Headless background context; no DOM access)
├── content.js             # Master UI coordinator & Shadow DOM sidebar renderer
├── vendor/
│   └── jszip.min.js       # Production library for multi-file ZIP decoding
├── core/
│   └── event-bus.js       # Decoupled system event bus
└── features/
    ├── file-picker.js     # Native File System Access API workspace handle manager
    └── zip-processor.js   # Buffer extraction, text path parsing, auto-logging & disk writer
```

### Decoupled System Event Routing Matrix

| Event Type | Emitted By | Payload Structure | System Action |
| :--- | :--- | :--- | :--- |
| `WORKSPACE_READY` | `FilePicker` | `string` (Folder Name) | Updates connect button to green bound state. |
| `WORKSPACE_ERROR` | `FilePicker` | `string` (Error Text) | Resets state, displays alert in status tray. |
| `PROCESS_START` | `ZipProcessor` | `string` (File/Archive Name) | Shifts status UI to analysis mode. |
| `ZIP_STAGED` | `ZipProcessor` | `Array<StagedFileObject>` | Triggers UI morph from dropzone to conflict review matrix. |
| `PROCESS_PROGRESS`| `ZipProcessor` | `{ current: number, total: number }` | Updates real-time write progress bar component. |
| `PROCESS_COMPLETE`| `ZipProcessor` | `{ successCount, failCount, logs, loggingEnabled }` | Displays completion statistics and log download button. |
| `PROCESS_ERROR` | `ZipProcessor` | `string` (Error Text) | Resets view and displays error notification. |

---

## 3. Feature Implementation Status

### ✅ Completed Features
* [x] **Fault-Tolerant File Commits:** Non-halting batch processing with in-app error log modal.
* [x] **Log File Export:** Downloadable `.txt` run logs directly from the Shadow DOM UI.
* [x] **Multi-Mode Input Engine:** Tabbed interface supporting ZIP archives, single file drops, and raw text paste input.
* [x] **Line 1 Path Validation for Raw Text:** Mandatory validation forcing explicit comment path directives on line 1 for raw text.
* [x] **Strict Extension Regex Parser:** Anti-false-positive parser (`/\.[a-zA-Z0-9]{1,10}$/`) ensuring prose headers with dots aren't misidentified as file paths.
* [x] **Workspace Auto-Logging:** Automatic appending to `FZFDlog/fzfd-YYYY-MM.log` with 1 MB rotation guard.
* [x] **Persistent Auto-Log Toggle:** UI checkbox linked to `localStorage` (`fzfd_auto_log`).

---

## 4. High-Priority Feature Backlog (AI Implementation Specifications)

AI agents implementing new capabilities should select from the following modules:

### 🚀 Module A: Frontend UX Quality-of-Life Upgrades

#### A.1 Global Overwrite Toggle ("Select All / Deselect All")
* **Objective:** Prevent users from having to manually click dozens of checkboxes when a project needs to be fully overwritten.
* **Implementation Requirements:**
  * Inject a master checkbox toggle button at the top of the `.fibo-file-list` container.
  * Toggling it must programmatically check or uncheck all visible `.fibo-replace-check` elements.
  * State changes must dynamically update the execution indices bundle passed to `commitUpload()`.

#### A.2 Real-Time Staging Filter & Search Bar
* **Objective:** Allow developers to search through large archives to inspect specific component target paths.
* **Implementation Requirements:**
  * Place a sticky search text input right above the file list inside the sidebar panel.
  * Filter visible rows based on substring match against `displayPath`.
  * Hiding unmatched items must use CSS (`display: none`) so underlying input element indices remain intact.

#### A.3 Full-Screen Drag-and-Drop Overlay
* **Objective:** Provide a clear visual drop zone indicator when dragging files anywhere over the active web page window.
* **Implementation Requirements:**
  * Bind `dragover` / `dragleave` window events to toggle a full-screen backdrop overlay inside the Shadow DOM container.

---

### ⚙️ Module B: Deep Core Engine Upgrades

#### B.1 Binary Asset Handling & ZIP Relative Path Fallback
* **Objective:** Prevent binary files (images, audio, fonts) from having their binary buffers corrupted by text comment parsing.
* **Implementation Requirements:**
  * Maintain a binary extension whitelist/blacklist in `ZipProcessor`. Skip line 1 comment checks for binary assets.
  * **Fallback Mapping Rule:** For binary assets (or text files lacking line 1 comments), fall back to using the ZIP archive's native internal folder path (`relativePath`) to generate local disk target paths.

#### B.2 Async Chunking & Thread Preservation (`PROCESS_PROGRESS`)
* **Objective:** Prevent browser tab thread freezing during heavy file write operations.
* **Implementation Requirements:**
  * Refactor `commitUpload()` in `ZipProcessor` to write files in throttled batch chunks (e.g., write 10 files, pause 20ms using macro-task timeout, then resume).
  * Publish progressive `PROCESS_PROGRESS` payloads (`{ current, total }`) via `EventBus` to drive a visual progress bar in the UI.

#### B.3 Unique Index Pointer Mapping
* **Objective:** Eliminate checkbox desynchronization caused by path string collisions.
* **Implementation Requirements:**
  * Assign unique numeric IDs to staged file objects and track UI approvals via ID/index pointers instead of string path lookup keys.

---

## 5. Acceptance Criteria for Expansions

Before declaring any feature extension complete, verify:

1. **No Module Drift:** No ES module `import`/`export` keywords added to content scripts.
2. **Shadow Security:** All UI elements reside strictly inside the closed Shadow DOM root.
3. **Memory State Cleanup:** `processor.clearState()` is called on completion, cancellation, and panel close.