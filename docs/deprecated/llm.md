<!-- llm.md -->
<!-- Claude 3.7 Sonnet | FZFD Deprecation Update | 2026-07-27 -->

# [DEPRECATED] AI Architecture & Audit Specification: Fibo Zip File Drop

> ⚠️ **DEPRECATION NOTICE**: This document (`llm.md`) is deprecated and kept for historical reference only. It has been superseded by the active documentation matrix. AI agents and developers should refer strictly to the active files listed below for authoritative project rules, runtime constraints, and event matrices.

---

## Canonical Documentation Index

* **[Audit Specification](Audit.md):** The primary source of truth for system constraints, defensive code standards, threat matrices, and AI code review checklists.
* **[User & Workflow Guide](USER_GUIDE.md):** Complete operational manual for human developers and prompt engineering standards for 3-line comment headers.
* **[Feature Expansion Manual](Expand.md):** Active implementation specifications, backlog tasks, and feature completion criteria.
* **[Product & Rebuild Specification](NewBuild.md):** Core architecture paradigms, lifecycle workflows, and historical lessons learned.

# AI Architecture & Audit Specification: Fibo Zip File Drop

This document serves as the absolute source of truth for AI agents auditing, debugging, or extending the "Fibo zip file drop" Chrome Extension. 

---

## 1. Project Paradigm & Constraints
*   **Runtime Environment:** Chrome Extension Manifest V3 (MV3).
*   **Target Domains:** Global (`<all_urls>`), bypassing strict domain Content Security Policies (CSP).
*   **No-Module Injection Sequence:** Because Chrome content script arrays do not support standard ES modules reliably without triggering CSP syntax errors on protected domains, all content files are executed sequentially as standard flat global scripts.
    *   *Critical Rule:* **NEVER use `export` or `import` keywords** inside `core/`, `features/`, or `content.js`. Doing so will break the runtime immediately.
*   **UI Sandboxing:** The front-end layout must be rendered strictly inside a **closed Shadow DOM** attached to a host element. This isolates extension styles and prevents target websites from breaking the UI.

---

## 2. Directory Architecture Map

```text
fibo-zip-drop/
├── manifest.json          # App configuration, permissions, and execution sequence
├── background.js          # Headless MV3 Service Worker handling toolbar action triggers
├── content.js             # Master coordinator, generates Shadow DOM sidebar UI
├── vendor/
│   └── jszip.min.js       # Production asset used for multi-file unzip decoding
├── core/
│   └── event-bus.js       # Decoupled system messaging matrix
└── features/
    ├── file-picker.js     # Native File System Access API integration
    └── zip-processor.js   # Buffer extractor, text parser, and disk writer
```

---

## 3. Module Contracts & Lifecycle

### Content Script Initialization Sequence
Chrome injects scripts into the web document in the exact array order listed in `manifest.json`:
1. `vendor/jszip.min.js` (Exposes global `JSZip` class)
2. `core/event-bus.js` (Instantiates global class `EventBus`)
3. `features/file-picker.js` (Instantiates global class `FilePicker`)
4. `features/zip-processor.js` (Instantiates global class `ZipProcessor`)
5. `content.js` (Executes execution loop `bootstrapFibo()`)

### Operational Data Flow
1. User **Left-Clicks** toolbar **F** icon -> `background.js` catches action -> sends `TOGGLE_FIBO_PANEL` message to target tab.
2. `content.js` listener wakes up -> slides open sidebar panel -> binds local dropzone events.
3. User triggers Directory Picker -> handles persistent `FileSystemDirectoryHandle`.
4. User drops `.zip` file from download history tray -> file stream sent to `ZipProcessor`.
5. `ZipProcessor` reads plain-text content -> extracts **the first line** of each file -> cleans the string into a valid OS directory path -> writes sorted sub-folders directly to the local hard drive.

---

## 4. System Message Routing (Event Matrix)

| Event Type | Emitted By | Payload | System Action |
| :--- | :--- | :--- | :--- |
| `WORKSPACE_READY` | `FilePicker` | `string` (Folder Name) | Transforms UI connect button to green state. |
| `WORKSPACE_ERROR` | `FilePicker` | `string` (Error Text) | Resets tracking state, logs anomaly to status tray. |
| `PROCESS_START` | `ZipProcessor` | `string` (ZIP Name) | Shifts status UI text to unpacking notification mode. |
| `PROCESS_COMPLETE`| `ZipProcessor` | `integer` (File Count)| Updates UI with final extraction data. |
| `PROCESS_ERROR` | `ZipProcessor` | `string` (Error Text) | Safely passes errors to the UI status container. |

---

## 5. Security & Safety Boundaries
*   **Headless Service Workers:** `background.js` has no access to the `window` or DOM. Do not attempt to use `alert()`, `confirm()`, or DOM injection methods inside the service worker file.
*   **System Exceptions:** Extension messaging must explicitly ignore protected browser nodes:
    *   `chrome://*`
    *   `edge://*`
    *   `about:*`
    *   `chromewebstore.google.com`