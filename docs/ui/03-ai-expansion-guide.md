
# 🚀 Fibo Zip File Drop (FZFD) — AI Feature Expansion Guide

This document is the implementation manual, architectural specification, and feature backlog blueprint for AI agents expanding and extending the capabilities of the **Fibo Zip File Drop (FZFD)** Chrome Extension.

---

## 1. Architectural Rules for Feature Extensions

Before adding any new capability, module, or UI component to FZFD, verify adherence to these core system rules:

1. **Zero-Build Boundary & Flat Scripts:** NEVER add Node compilation steps, Webpack/Vite bundlers, or standard ES module `import`/`export` keywords. All new scripts must be added to `manifest.json` under `content_scripts.js` and `background.js` as flat scripts attached to `window`.
2. **Shadow DOM Isolation:** All new UI overlays, modals, tooltips, or popups MUST be injected inside the closed Shadow DOM created in `ui/shadow-dom.js`.
3. **Decoupled Event Bus Messaging:** Features must communicate through `FiboEventBus`. Do not create direct cross-module DOM event couplings.
4. **State Cleanup Standard:** Whenever user flow navigates away or resets, ensure `ZipProcessor.clearState()` and view reset handlers are invoked to prevent memory leaks or stale staging queues.

---

## 2. Completed Architecture Map

```text
fibo-zip-drop/
├── manifest.json              # App configuration, MV3 permissions, content script order
├── background.js              # Service worker handling toolbar action & dynamic script injection
├── content.js                 # Central coordinator & UI lifecycle manager
├── core/
│   └── event-bus.js           # Publish/Subscribe event matrix (FiboEventBus)
├── features/
│   ├── file-picker.js         # File System Access API workspace handle manager
│   ├── prompt-manager.js      # Prompts & variants CRUD manager with local storage
│   ├── zip-processor.js       # Master staging coordinator & commit orchestrator
│   └── zip/
│       ├── header-parser.js   # 3-Line comment header parser & combiner
│       ├── path-resolver.js   # Path sanitization, extension validation & binary detector
│       ├── collision-detector.js # File existence checker against local directory
│       ├── file-writer.js     # Recursive directory navigator & stream writer
│       └── log-writer.js      # Auto-log (/FZFDlog) & Event JSON (/events) writer
├── ui/
│   ├── styles.js              # Catppuccin Mocha CSS injected into Shadow DOM
│   ├── shadow-dom.js          # Closed Shadow DOM root creation helper
│   ├── toast-manager.js       # Toast notifications engine
│   ├── clipboard.js           # Fallback copy-to-clipboard handler
│   ├── file-view.js           # File/ZIP drag-and-drop view
│   ├── text-view.js           # Raw text buffer analyzer view
│   ├── prompts-view.js        # Prompt manager UI view with search & favorites
│   └── staging-view.js        # Conflict review matrix, change_type selector & execution log
└── vendor/
    └── jszip.min.js           # JSZip decompiling library
```

---

## 3. High-Priority Feature Expansion Blueprints

### 🚀 Blueprint A: Side-by-Side Diff Preview Modal
* **Objective:** Allow developers to inspect line-by-line differences between staged file content and existing disk content before confirming an overwrite.
* **Implementation Blueprint:**
  1. Add an inspection button (`🔍 Diff`) next to existing files in `ui/staging-view.js`.
  2. In `features/zip/collision-detector.js` or `features/zip-processor.js`, add a helper method `readExistingDiskText(rootHandle, parts, fileName)`.
  3. Create a lightweight inline diff helper in `ui/diff-view.js` that compares staged content lines with disk content lines.
  4. Render a side-by-side or unified diff modal inside the Shadow DOM container overlay when the user clicks `🔍 Diff`.

### 🚀 Blueprint B: Page-Wide Drag-and-Drop Overlay
* **Objective:** Enable dropping ZIP archives or files anywhere on the browser webpage (not just inside the sidebar dropzone).
* **Implementation Blueprint:**
  1. In `content.js`, bind `dragover`, `dragleave`, and `drop` event listeners to `window`.
  2. When a file drag enters the browser window, toggle a full-screen semi-transparent backdrop (`#fibo-fullscreen-dropzone`) inside the Shadow DOM root.
  3. On drop, catch `e.dataTransfer.files`, hide the backdrop overlay, slide open the FZFD sidebar if closed, and route the files directly into `processInputFiles()`.

### 🚀 Blueprint C: Multi-Workspace Presets & Workspace Switching
* **Objective:** Allow users to save multiple project handles (e.g., "Frontend App", "Backend API", "Docs Repo") and switch between them via a dropdown selector.
* **Implementation Blueprint:**
  1. Since `FileSystemDirectoryHandle` objects cannot be stored as plain JSON in `localStorage`, store handle references in IndexedDB using `indexedDB.open('fzfd_workspaces', 1)`.
  2. Extend `features/file-picker.js` with `saveWorkspaceHandle(alias, handle)` and `loadWorkspaceHandle(alias)`.
  3. Add a workspace selector dropdown above the connect button in `content.js`.
  4. Upon selection, execute `handle.queryPermission({ mode: 'readwrite' })` and update the active active workspace handle seamlessly.

### 🚀 Blueprint D: Event JSON Cleanup & Archiving
* **Objective:** Prevent `/events/` directory clutter in local repositories by automatically archiving processed event files older than $N$ days into `/events/processed/`.
* **Implementation Blueprint:**
  1. Add `archiveOldEvents(rootHandle, maxDays = 7)` to `features/zip/log-writer.js`.
  2. Iterate through files in `/events/` handle. Parse ISO timestamp from filenames (`extension-YYYYMMDDTHHMMSSZ.json`).
  3. If timestamp age exceeds `maxDays`, create `/events/processed/` directory handle, copy file content, and remove entry from `/events/`.
  4. Trigger `archiveOldEvents` asynchronously after successful commit execution.

### 🚀 Blueprint E: Prompt Manager Import / Export
* **Objective:** Allow developers to export their Prompt Manager items and variants as a structured JSON file and share them across browser instances.
* **Implementation Blueprint:**
  1. In `features/prompt-manager.js`, implement `exportPromptsJson()` and `importPromptsJson(jsonString)`.
  2. In `ui/prompts-view.js`, add **📤 Export Prompts** and **📥 Import Prompts** buttons in the prompt list view header.
  3. Export creates a downloadable Blob (`fzfd-prompts-export.json`).
  4. Import reads a `.json` file, validates schema structure, merges non-duplicate prompts by ID, and saves to browser storage.

---

## 4. Expansion Quality Control Checklist

Before certifying any newly implemented feature complete:

- [ ] Zero ES module `import` or `export` keywords added to content scripts or features.
- [ ] New UI elements live strictly inside the closed Shadow DOM boundary.
- [ ] New script entries added to `manifest.json` in correct sequence.
- [ ] `processor.clearState()` called during tab switching and workflow cancellation.
- [ ] All file system calls wrap writable streams in `try...finally` to ensure `.close()` execution.
- [ ] Tested on target web pages with strict Content Security Policies (CSP).

