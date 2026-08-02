


# 📋 Fibo Zip File Drop (FZFD) — TO-DO List & Implementation Blueprint

This document is the official task backlog, step-by-step implementation guide, and test specification for AI agents extending the **Fibo Zip File Drop (FZFD)** Chrome Extension.

---

## 🧭 Roadmap Overview & Order of Execution

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ IMMEDIATE TASK: PHASE 1 — SMART RAW TEXT & MULTI-BLOCK INGESTION            │
│  1. Fallback Path Prompting (Ask for path when Line 1 header is missing)    │
│  2. Feature 4: Multi-Codeblock Extractor (Extract multiple files from AI text)│
├─────────────────────────────────────────────────────────────────────────────┤
│ FUTURE PIPELINE (In Exact Order):                                            │
│  3. Feature 7: Multi-Workspace Directory Switcher (IndexedDB Presets)       │
│  4. Feature 6: Dynamic Variable Placeholders in Prompt Manager               │
│  5. Feature 9: Prompt Manager Import / Export (JSON Backups)                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 PHASE 1: Smart Raw Text & Multi-Codeblock Ingestion

### 🎯 Objective
1. **Fallback Path Prompting:** When a user pastes raw code into the **📝 Text** tab without a Line 1 path comment (e.g. `// path/file.js`), do not fail with an error. Provide a target relative path input prompt or assign a clean editable default (`snippet-1.js`) so the user can edit the path in the staging review matrix.
2. **Multi-Codeblock Extraction (Feature 4):** When an AI chat response contains multiple markdown code blocks (```` ```lang ... ``` ````), automatically extract each code block into an independent staged file in one single pass.

---

### 📂 Target Files to Modify
* `features/zip/header-parser.js` $\rightarrow$ Add `extractMarkdownCodeBlocks(rawText)` helper method.
* `features/zip-processor.js` $\rightarrow$ Update `stageRawText(rawText, rootHandle, fallbackPath)` to handle single/multiple blocks and fallback paths.
* `ui/text-view.js` $\rightarrow$ Add UI input fields for optional target path fallback when staging single plain snippets.

---

### 📐 Step-by-Step Implementation Specification

#### Step 1: Add Markdown Codeblock Extraction to `features/zip/header-parser.js`
Add a method `extractMarkdownCodeBlocks(rawText)` to `FiboHeaderParser`:
1. Use regex `/```(?:[a-zA-Z0-9_-]+)?(?:\s+([^\n]+))?\n([\s\S]*?)```/g` to find markdown code fences.
2. For each matched code block:
   * Inspect capture group 1 (optional path annotation after language, e.g. ```` ```js src/app.js ````).
   * Inspect Line 1 inside capture group 2 (code body) using `isPathHeaderLine(line1)`.
   * Extract the code body and determine the best candidate path (Line 1 path header $>$ fence annotation path $>$ fallback `snippet-N.ext`).
3. Return an array of block objects: `[{ content, candidatePath, hasExplicitComment }]`.

#### Step 2: Update `features/zip-processor.js` (`stageRawText`)
1. Call `this.headerParser.extractMarkdownCodeBlocks(rawText)`.
2. **If 1 or more markdown blocks exist:**
   * Iterate over extracted blocks.
   * Parse target info via `this.pathResolver.parseTargetInfo(firstLine, candidatePath)`.
   * Check local file existence via `this.collisionDetector.checkFileExists()`.
   * Push all extracted blocks into `this.stagedFiles` array.
   * Publish `ZIP_STAGED` event.
3. **If NO markdown blocks exist (Plain Code Paste):**
   * Inspect Line 1 using `this.pathResolver.parseTargetInfo(firstLine, fallbackPath || 'pasted-code.txt')`.
   * Stage the single file into `this.stagedFiles`.
   * Publish `ZIP_STAGED` event so the user can immediately review or inline-edit the path in the staging matrix.

#### Step 3: Update `ui/text-view.js`
1. Add an optional relative path input field `#rawTextPathInput` above the text area:
   `[ Optional Fallback Path: e.g. src/utils/helpers.js ]`
2. Pass the entered fallback path to `processor.stageRawText(text, picker.directoryHandle, fallbackPath)`.

---

### 🧪 Manual Test Checklist for Phase 1
- [ ] **Test Case 1 (Single Plain Snippet with Header):** Paste code starting with `// src/app.js`. Click **⚡ Analyze Raw Text**. Verify it stages cleanly as `src/app.js`.
- [ ] **Test Case 2 (Single Plain Snippet WITHOUT Header):** Paste code with no comment header. Type `src/components/Button.jsx` into the Fallback Path field. Click **⚡ Analyze Raw Text**. Verify it stages as `src/components/Button.jsx`.
- [ ] **Test Case 3 (Single Plain Snippet WITHOUT Header or Fallback):** Paste code with no comment header and leave Fallback Path empty. Click **⚡ Analyze Raw Text**. Verify it stages as `pasted-code.txt` and allows inline editing in the staging matrix.
- [ ] **Test Case 4 (Multi-Codeblock Paste):** Paste an AI chat message containing 3 markdown blocks (e.g. ```` ```js // src/a.js ... ``` ````, ```` ```css // src/b.css ... ``` ````, ```` ```html ... ``` ````). Click **⚡ Analyze Raw Text**. Verify **all 3 files** appear in the staging matrix in a single pass.

---

## 🔮 FUTURE PHASE 2: Multi-Workspace Directory Switcher (Feature 7)

### 🎯 Objective
Save directory handle references in IndexedDB so users can switch between recent project repositories via a 1-click dropdown selector without re-opening the OS folder picker dialog.

### 📂 Target Files
* `features/file-picker.js` $\rightarrow$ Add IndexedDB storage methods (`saveWorkspace`, `listWorkspaces`, `loadWorkspace`).
* `content.js` $\rightarrow$ Render workspace dropdown select box above the connect button.

### 📐 Implementation Specification
1. Open IndexedDB database `fzfd_workspaces_db` with store `workspaces`.
2. When a folder is connected via `window.showDirectoryPicker()`, store `{ name: handle.name, handle: handle, date: ISOString }`.
3. Render a dropdown `<select id="workspaceSelect">` in the sidebar header listing saved workspace names.
4. When selecting a saved workspace, invoke `await handle.queryPermission({ mode: 'readwrite' })`. If granted, set `picker.directoryHandle = handle` and trigger `WORKSPACE_READY`.

---

## 🔮 FUTURE PHASE 3: Dynamic Variable Placeholders in Prompt Manager (Feature 6)

### 🎯 Objective
Support dynamic tags in Prompt Manager templates (`{{date}}`, `{{feature}}`, `{{model}}`) that auto-fill with real session data upon copying.

### 📂 Target Files
* `features/prompt-manager.js` $\rightarrow$ Update `getComputedText(prompt, variant, context)` to evaluate placeholders.
* `ui/prompts-view.js` $\rightarrow$ Pass live context (ISO date, feature ID input) when copying.

### 📐 Implementation Specification
1. In `getComputedText`, scan result text for:
   * `{{date}}` $\rightarrow$ Replaced with `YYYY-MM-DD`.
   * `{{time}}` $\rightarrow$ Replaced with current timestamp.
   * `{{feature}}` $\rightarrow$ Replaced with active feature directive or user prompt.
2. Return resolved text prior to copying to clipboard.

---

## 🔮 FUTURE PHASE 4: Prompt Manager Import / Export (Feature 9)

### 🎯 Objective
Enable exporting saved prompts and variants as a structured `.json` backup file and importing them across browser profiles.

### 📂 Target Files
* `features/prompt-manager.js` $\rightarrow$ Add `exportPromptsJson()` and `importPromptsJson(jsonStr)`.
* `ui/prompts-view.js` $\rightarrow$ Add **📤 Export** and **📥 Import** buttons.

### 📐 Implementation Specification
1. **Export:** Convert `this.prompts` array to JSON string, create a downloadable Blob (`fzfd-prompts-export.json`), and trigger download.
2. **Import:** Add a hidden `<input type="file" accept=".json">`. Read file text, validate array schema, merge unique prompts by ID, and save to `chrome.storage.local`.

---

## 🛡️ Mandatory Execution Rules for AI Agents
1. **Strict Content Script Rules:** Never use `import` or `export` keywords in injected content scripts.
2. **Shadow DOM Integrity:** Render all UI elements strictly inside the closed Shadow DOM boundary.
3. **File Header Standard:** Apply the 3-line header comment standard to any updated or newly created JS file, (if comments are possible, with the proper comment delimiters):
   * Line 1: `// relative/path/to/file.js`
   * Line 2: `// AI Model Name | Chat Session Name | YYYY-MM-DD`
   * Line 3: `// feature: feature-id`
4. **Sequential Execution:** Complete Phase 1 fully, test against the checklist, and receive human approval before proceeding to Phase 2.