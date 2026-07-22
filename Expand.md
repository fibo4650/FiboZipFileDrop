# Feature Expansion Blueprint: Fibo Zip File Drop

This document is a standalone product extension manual. When provided to an AI agent, its purpose is to guide the implementation of new features, performance optimizations, and UI upgrades for the "Fibo Zip File Drop" Chrome Extension without compromising its core architectural integrity.

---

## 1. Baseline Architecture & Constraints

To ensure compatibility, any new feature or optimization must strictly respect the foundational execution environment:

- **Runtime Framework:** Chrome Extension Manifest V3 (MV3).
- **Injection Paradigm:** Sequential, flat global content scripts. **Do not use** `import` **or** `export` **syntax**, as strict host website Content Security Policies (CSPs) will block module execution.
- **Interface Layer:** Closed Shadow DOM encapsulation. All new styles, buttons, overlays, or animations must live inside the shadow root to prevent layout bleeding.
- **The Workflow Lifecycle:** Modern operations must adhere to the two-stage lifecycle:
  1. **Staging Phase:** Scan ZIP $\rightarrow$ parse file path from the first-line code comment $\rightarrow$ evaluate file conflicts on disk $\rightarrow$ publish memory state array.
  2. **Commit Phase:** Render conflict review matrix $\rightarrow$ collect approved file index choices $\rightarrow$ batch write to the local file system.

---



## 2. High-Priority Feature Backlog

Use the following modular specifications to implement upgrades. Each feature must communicate status changes exclusively via the internal decoupled `EventBus`.

### 🚀 Module A: Frontend UX Quality-of-Life Upgrades



#### A.1 Global Overwrite Toggle ("Select All / Deselect All")

- **Objective:** Prevent users from having to manually click dozens of checkboxes when a massive project needs to be fully overwritten.
- **Implementation Requirements:** 
  - Inject a primary checkbox or master toggle button at the top of the `.fibo-file-list` container view.
  - Toggling it must programmatically check or uncheck all `.fibo-replace-check` elements currently visible in the active staging list.
  - The state must dynamically reflect in the execution indices bundle passed to the commit phase.



#### A.2 Real-Time Staging Filter & Search Bar

- **Objective:** Allow developers to quickly search through large archives to see if a specific component file is targeted for an update.
- **Implementation Requirements:**
  - Place a sticky text input field right above the file matrix list inside the sidebar panel.
  - As the user types, perform an active substring match filter against the file path strings (`displayPath`).
  - Hiding unmatched items must be handled via CSS toggle rules (`display: none`) to ensure the underlying input checkboxes retain their physical indices mapping.

---



### ⚙️ Module B: Deep Core Engine Upgrades



#### B.1 Binary Asset Handling & Fallback Stream

- **Objective:** Currently, the extension assumes every file is text-based to read its first-line comment. If the ZIP contains binary assets (images, audio, icons, web fonts), parsing them as text destroys the asset or produces broken folder paths.
- **Implementation Requirements:**
  - Introduce a file-extension whitelist/blacklist filter during the extraction loop.
  - If a file matches a binary format (e.g., `.png`, `.jpg`, `.woff2`, `.ico`), **skip the first-line comment check entirely**.
  - **The Fallback Mapping Rule:** For binary assets, fall back to utilizing the ZIP archive's native internal folder structure (`relativePath`) to generate the local disk path.



#### B.2 Async Chunking & Thread Preservation

- **Objective:** Writing hundreds of files sequentially using rapid async loops can lock up the browser tab thread, causing the UI animation to freeze or stutter on large project uploads.
- **Implementation Requirements:**
  - Refactor the `commitUpload` loop in `ZipProcessor` to process file writes in throttled batch chunks (e.g., write 10 files, pause execution for 20ms using a macro-task timeout, then continue).
  - Publish a progressive `PROCESS_PROGRESS` milestone payload token via the `EventBus` to feed a visual progress bar component in the UI.

---



## 3. Extension Architecture Mapping Reference

When modifying modules to accommodate expansions, ensure logic is strictly partitioned across these structural domains:

```text
    fibo-zip-drop/
    ├── manifest.json          # Add permissions or register new asset streams
    ├── background.js          # Service worker context (No DOM access)
    ├── content.js             # UI Canvas Management (Render search bars, toggles, progress indicators)
    ├── core/
    │   └── event-bus.js       # Register new communication events (e.g., 'PROCESS_PROGRESS')
    └── features/
    ├── file-picker.js     # Manages raw directory access tokens
    └── zip-processor.js   # Handles data streams (Throttling, binary analysis, parsing fallbacks)
```

---



## 4. Acceptance Criteria for Expansions

Before declaring a new feature complete, verify that:

1. **No Module Drift:** No framework dependencies or ES `export`/`import` loops were added.
2. **Shadow Security:** No elements are appended directly to the host body outside the protected closed Shadow DOM container.
3. **Independency Matrix:** Canceling or resetting an ongoing action cleans the cached state arrays completely without requiring a hard page refresh.

