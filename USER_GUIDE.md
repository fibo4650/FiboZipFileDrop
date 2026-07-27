<!-- USER_GUIDE.md -->
<!-- Gemini 3.6 | FZFD Header & Log Stamp | 2026-07-27 -->

# Fibo Zip File Drop: User & Workflow Guide

This document provides a comprehensive operational guide for human developers using the **Fibo Zip File Drop** Chrome Extension. It details how the UI operates, the step-by-step user workflows, the comment header conventions expected from AI code generators, and the backend execution logic.

---

## 1. System Overview & Single Purpose

Fibo Zip File Drop is a desktop browser extension (Manifest V3) designed to accelerate developer workflows when working with LLMs (such as ChatGPT, Claude, or Gemini) or web coding sandboxes.

When LLMs generate multi-file project updates, they frequently output flat ZIP archives or raw code snippets. The true destination folder structure of each file is embedded directly inside the code as a comment header on the top lines. Fibo parses these header comments, recreates the required folder hierarchy recursively on your local disk using the File System Access API, and logs execution batches for auditing and meta-framework tracking.

---

## 2. The 3-Line Header Standard for AI Code Generation

To ensure Fibo correctly routes files and tracks features, instruct your AI coding assistant to prepends a 3-line comment header to every generated code file:

```javascript
// src/components/UserProfile.jsx
// Gemini 3.6 | Feature Implementation Sprint | 2026-07-27
// feature: phase4-user-profile-card
```

### Line Breakdown
* **Line 1 (Target Path Directive):** The target relative file path (e.g., `// path/to/file.ext` or `# scripts/deploy.py`). MUST terminate with a valid file extension and MUST NOT contain URL protocols (`://`).
* **Line 2 (Session Provenance Stamp):** The AI model, chat session name, and ISO date (`// Model | Chat Session Name | Date`).
* **Line 3 (Feature Tracking Directive):** The target feature ID or Bloc name (`// feature: <feature_id>`). Used by Fibo to correlate file updates directly with project management frameworks.

---

## 3. User Interface & Step-by-Step Workflow

### Step 1: Opening the Extension Sidebar
1. Left-click the extension toolbar icon (**F**) on any web page.
2. The isolated sidebar panel slides open from the right side of the screen over the host website.

### Step 2: Binding the Target Local Directory
1. Click **📁 Connect Local Dir** at the top of the sidebar.
2. Select your local project root folder in the native OS directory picker dialog and grant read/write permissions.
3. The status indicator updates to **📁 Target Bound (Click to Switch)**. You can click this button at any time to switch active project directories.

### Step 3: Multi-Mode Staging Phase
Fibo supports three input modes:

* **ZIP Archive Mode:** Drag and drop a flat `.zip` file onto the dropzone (or click to browse local files). Fibo unpacks the buffer in memory, inspects each file's line 1 path comment, and checks your local hard drive for existing file collisions.
* **Single / Multi-File Mode:** Drag and drop individual files (`.js`, `.ts`, `.py`, `.md`, `.sql`, `.png`, etc.) onto the dropzone. Fibo analyzes their header comments and checks disk state.
* **Raw Text Mode:** Switch to the **📝 Raw Text** tab, paste a code block containing a line 1 path comment directive, and click **⚡ Analyze Raw Text**.

### Step 4: Conflict Review Matrix & Customization
Once input is staged, the sidebar morphs into a preview matrix:

* **File Status Badges:**
  * `NEW`: The file does not exist locally. It will be created automatically.
  * `MAIN`: Indicates the file lands in the workspace root.
  * **Overwrite Checkbox:** Appears for files that already exist locally. Left unchecked by default to prevent accidental overwrites.
* **Master Overwrite Toggle:** A **Select / Deselect All Overwrites** checkbox appears at the top of the list when existing files are detected.
* **Real-Time Search Filter:** Type into the **🔍 Search path filters...** input to filter visible rows instantly by path substring.
* **Change Type Selector:** Each file row includes a `change_type` dropdown (`new`, `updated`, `replaced`, `appended`, `deleted`).
  * New files default to `new`.
  * Existing files default to `updated`.
  * You can adjust these values manually before committing to customize meta-framework event logging.

### Step 5: Batch Execution & Writing to Disk
1. Check the overwrite boxes for any existing files you wish to replace.
2. Click **🚀 Send & Process**.
3. A real-time progress bar (`⚡ Writing files: X / Y (Z%)`) tracks disk stream creation and recursive folder generation.
4. Upon completion, an execution log appears with success/failure indicators and an optional **📥 Download Execution Log** button.

---

## 4. Backend Processing & Auto-Logging Logic

When a commit occurs, Fibo executes the following background operations sequentially:

1. **Recursive Folder Creation:** Creates missing directory sub-trees sequentially to prevent stream race conditions.
2. **File Writing:** Opens a `FileSystemWritableFileStream` for each approved file index and writes raw text or binary typed arrays.
3. **Header Metadata Capture:** Reads Line 2 (session stamp) and Line 3 (`feature:` ID) from the first non-binary text file processed in the batch.
4. **Human-Readable Logging (`/FZFDlog`):** Appends a structured run block to `/FZFDlog/fzfd-YYYY-MM.log` inside the workspace root (automatically rotates at 1 MB).
5. **Meta-Framework Event Generation (`/events`):** Emits a JSON file formatted per `file-event.schema.json` directly into `/events/extension-YYYYMMDDTHHMMSSZ.json`. This enables external reconciliation engines and dashboard interfaces to ingest the delivery batch.

