

<!-- Expand.md -->
<!-- Gemini 3.6 | FZFD Header & Log Stamp | 2026-07-27 -->

# Fibo Zip File Drop: Feature Expansion Roadmap

This document serves as the implementation manual and roadmap for AI agents extending the capabilities of the Fibo Zip File Drop extension.

---

## 1. System Architecture Map

```text
fibo-zip-drop/
├── manifest.json          # Extension configuration & content script load order
├── background.js          # Headless MV3 service worker
├── content.js             # Master UI coordinator & Shadow DOM sidebar renderer
├── vendor/
│   └── jszip.min.js       # Production JSZip decoding library
├── core/
│   └── event-bus.js       # Decoupled publish/subscribe messaging bus
└── features/
    ├── file-picker.js     # Native File System Access API workspace manager
    └── zip-processor.js   # Extraction engine, path parser, log & event generator
```

---

## 2. Completed Feature Capabilities

* [x] **Fault-Tolerant Batch Commits:** Non-halting upload loop with individual file error trapping and in-app execution logs.
* [x] **Multi-Mode Input Engine:** Tabbed interface supporting ZIP archives, single/multi-file drops, and raw text paste buffer.
* [x] **Strict Extension Path Parser:** Regex parser (`/\.[a-zA-Z0-9]{1,10}$/`) eliminating false positives from prose headers.
* [x] **Master Overwrite Toggle ("Select / Deselect All"):** Global master checkbox for toggling all overwrite checkboxes for visible rows.
* [x] **Real-Time Staging Search Bar:** Sticky search input filtering visible matrix rows via CSS (`display: none`) without desynchronizing item indices.
* [x] **Visual Progress Milestones:** Throttled batch commits publishing `PROCESS_PROGRESS` to drive an animated progress bar.
* [x] **Re-Connect Directory Handle:** Capability to switch or re-bind workspace folders without reloading the webpage.
* [x] **Line 3 Feature Directive Parser:** Extraction of `// feature: <feature_id>` headers.
* [x] **Dual-Channel Logging & Event Generation:** Human-readable logs in `/FZFDlog` and structured JSON event batches in `/events` conforming to `file-event.schema.json`.
* [x] **Per-File `change_type` Selector:** Interactive dropdown (`new`, `updated`, `replaced`, `appended`, `deleted`) preset by disk existence state.
* [x] **Persistent Event Emitter Toggle:** Option checkbox (`emitEventsToggle`) linked to `localStorage` (`fzfd_emit_events`).

---

## 3. High-Priority Expansion Backlog (AI Specifications)

AI agents implementing new capabilities should select from the following modules:

### 🚀 Module A: Advanced UI & Visual Inspection

#### A.1 Full-Screen Drag-and-Drop Backdrop Overlay
* **Objective:** Provide a page-wide dropzone indicator when dragging files anywhere over the browser window.
* **Requirements:**
  * Bind `dragover` and `dragleave` window event listeners in `content.js`.
  * Toggle a full-screen backdrop overlay inside the closed Shadow DOM (`#fibo-zip-drop-root`).
  * Drop events anywhere on the backdrop route directly to `processInputFiles()`.

#### A.2 Side-by-Side Diff Preview Modal
* **Objective:** Allow developers to inspect file differences before confirming an overwrite.
* **Requirements:**
  * Add an inspection icon (`🔍`) next to existing files in the staging matrix.
  * Upon clicking, read the existing file content from disk using `rootHandle.getFileHandle()`.
  * Render a line-by-line diff modal inside the Shadow DOM overlay.

---

### ⚙️ Module B: Storage & Framework Integration Upgrades

#### B.1 Automatic Event Clean-up & Archiving
* **Objective:** Manage processed event files inside the target workspace.
* **Requirements:**
  * Add a utility method to inspect `/events/` and move event files older than $N$ days into `/events/processed/`.

#### B.2 Workspace Workspace Presets & Alias Names
* **Objective:** Allow users to save multiple root directory handles (e.g., "Frontend Repo", "Backend API") and switch between them via a dropdown selector.
* **Requirements:**
  * Store directory handle references in IndexedDB (since `FileSystemHandle` instances cannot be serialized directly in `localStorage`).
  * Provide a selector dropdown above the connect button.

---

## 4. Expansion Acceptance Standard

Before marking any new feature complete:
1. Confirm zero ES module `import`/`export` keywords are added to content script files.
2. Verify all UI elements remain strictly inside the closed Shadow DOM.
3. Ensure `processor.clearState()` is called on cancel, completion, and mode navigation.

