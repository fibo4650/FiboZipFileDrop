

# 🏗️ Fibo Zip File Drop (FZFD) — AI Rebuild & Functional Specification

This document is a technology-agnostic functional specification for recreating the **Fibo Zip File Drop (FZFD)** ecosystem in any framework, runtime, or technology stack (React, Next.js, Vue, Svelte, Web Components, VS Code Extension, Electron, or Manifest V3 Chrome Extension).

---

## 1. System Intent & Philosophy

FZFD is a workflow bridge connecting AI code generation tools (ChatGPT, Claude, Gemini, DeepSeek, Cursor) with local code repositories.

### Core Architecture Pillars
1. **Bridge, Not Governance Gate:** Fast, non-invasive file placement tool that parses intent from code comment headers.
2. **Two-Stage Workflow Lifecycle:** Files are **never** written directly to disk upon decompression. Ingestion extracts files into memory $\rightarrow$ parses path directives $\rightarrow$ detects disk collisions $\rightarrow$ renders review matrix $\rightarrow$ user confirms $\rightarrow$ batch commits to disk.
3. **Total UI Isolation:** User interface elements must be encapsulated in a isolated DOM boundary (such as a closed Shadow DOM) to prevent styling conflicts with host web pages.
4. **Transparent Audit Logging:** Every disk modification produces both a human-readable log block (`/FZFDlog/fzfd-YYYY-MM.log`) and a structured machine-readable JSON batch (`/events/extension-TIMESTAMP.json`).

---

## 2. Core Entities & Data Schemas

### A. Staged File Object
```json
{
  "index": 0,
  "id": "0_src/components/UserProfile.jsx",
  "fileName": "UserProfile.jsx",
  "displayPath": "src/components/UserProfile.jsx",
  "parts": ["src", "components"],
  "content": "// src/components/UserProfile.jsx\n// Model | Chat | Date\nconsole.log('hello');",
  "isBinary": false,
  "exists": true
}
```

### B. 3-Line Comment Header Structure
```text
Line 1 (Path Directive):   // src/components/UserProfile.jsx
Line 2 (Session Stamp):    // Claude Sonnet 3.7 | Session Blueprint | 2026-07-28
Line 3 (Feature ID):       // feature: phase4-user-profile
```

### C. Prompt & Variant Record
```json
{
  "id": "p_1722100000_abc12",
  "name": "FZFD 3-Line Header Directive",
  "content": "Please precede every generated code file with the 3-line header format:\n// relative/path/to/file.ext\n// Model | Chat Session Name | YYYY-MM-DD\n// feature: feature-id-here",
  "isFavorite": true,
  "createdAt": "2026-07-28T12:00:00.000Z",
  "variants": [
    {
      "id": "v_1722100005_xyz99",
      "name": "MV3 Strict Checklist Append",
      "type": "append",
      "addition": "\nEnsure zero import/export statements in content scripts.",
      "isFavorite": false
    }
  ]
}
```

### D. Machine-Readable Event Batch (`/events/extension-TIMESTAMP.json`)
```json
{
  "timestamp": "2026-07-28T12:00:00.000Z",
  "date": "2026-07-28",
  "model": "Claude Sonnet 3.7",
  "chat_name": "Session Blueprint",
  "source": "extension",
  "files": [
    {
      "path": "src/components/UserProfile.jsx",
      "status": "success",
      "change_type": "updated",
      "expects": { "feature": "phase4-user-profile" }
    }
  ]
}
```

---

## 3. Required Functional Views & UI Specifications

### View 1: Top Bar & Navigation Header
* **Workspace Connection Control:** Shows `📁 Connect Local Dir` when unbound and `📁 Target Bound (Click to Switch)` in green when bound.
* **Status Bar:** Displays current workspace folder name, operation progress, or status alerts.
* **Mode Navigation Tabs:**
  * `📦 File/ZIP`: Main file & archive dropzone view.
  * `📝 Text`: Raw text snippet analyzer view.
  * `💬 Prompts`: Prompt manager & system directive copy view.
* **Option Checkboxes:** `Auto-log to /FZFDlog` and `Emit Event JSON to /events`.

### View 2: Multi-Mode Ingestion Views
1. **File/ZIP View:**
   * Interactive drag-and-drop zone (`Slide File or ZIP Here`).
   * Clicking dropzone opens native local file picker.
   * Supports `.zip` extraction in memory, multi-file selection, and binary vs text detection.
2. **Text View:**
   * Code text area with placeholder showing the 3-line header standard.
   * `⚡ Analyze Raw Text` button that validates Line 1 path directive before staging.
3. **Prompts View:**
   * Search input filtering prompts & variants by title/content substring.
   * ⭐ Favorites filter button.
   * Prompt cards displaying title, variant list, quick-copy buttons (`📋`), and `+ Variant` button.
   * Prompt editor with title, content, favorite toggle, save, and delete buttons.

### View 3: Staging Review Matrix & Conflict Resolution
* **Master Overwrite Toggle:** `Select / Deselect All Overwrites` checkbox (toggles overwrite checkboxes for visible items). Supports indeterminate state (`masterToggle.indeterminate`) when a subset of visible files is selected.
* **Real-time Search Filter:** Search bar filtering displayed rows by path substring.
* **Staged File Row Components:**
  * **Path Info Label:** Displays `displayPath`. Clicking path opens inline editor.
  * **Badge Tags:** `main` for root directory files, `NEW` for non-existent files.
  * **Change Type Selector Dropdown:** Options: `new`, `updated`, `replaced`, `append`, `prepend`, `delete`. Defaults to `new` for non-existent files and `updated` for existing files.
  * **Overwrite Checkbox:** Rendered for existing files (unchecked by default).
* **Inline Path & Header Editor:** Form allowing modification of target relative path and Line 1, Line 2, Line 3 comment headers.
* **Action Buttons:** `🚀 Send & Process` and `Cancel`.

### View 4: Execution Progress & Summary Log
* **Progress Bar Track & Text:** Real-time progress tracker (`⚡ Writing files: X / Y (Z%)`).
* **Execution Log Display Box:** Console box showing color-coded results (`✓ [updated] path/file.js` or `✗ [failed] path/file.js (Error details)`).
* **Download Log Button:** `📥 Download Execution Log` generating a downloadable text report blob.

---

## 4. Key Algorithm Specifications

### Algorithm A: Path Parsing & Sanitization (`parseTargetInfo`)
Input: `firstLine` (string), `rawFileName` (string)

1. Strip leading UTF-8 BOM (`/^\uFEFF/`).
2. Extract inner content from comment delimiters (`//`, `#`, `/*`, `<!--`).
3. Verify inner string terminates with a valid file extension (`/\.[a-zA-Z0-9]{1,10}$/`) and does not contain `://`.
4. Sanitize path: replace OS illegal characters (`:*?"<>|`) with `_`, convert `\` to `/`, collapse duplicate slashes `/+/`.
5. Split into path segments. If any segment equals `..`, **raise a parent directory traversal exception**.
6. If valid, return extracted relative path. If invalid or missing comment, fall back to ZIP internal relative path or raw filename.

### Algorithm B: Header Extraction & Content Combination
When combining added text with existing disk text for `append` or `prepend` modes:

$$\text{FinalContent} = \text{MergedHeaders} + \text{CombinedBodies} + \text{Newline}$$

1. Parse Line 1 (path), Line 2 (session stamp), Line 3 (feature directive) from both added text and disk text.
2. Merge headers, giving priority to newly added non-empty headers.
3. Extract body sections (text below headers) and trim.
4. For `append` mode: `CombinedBodies = DiskBody + "\n\n" + AddedBody`.
5. For `prepend` mode: `CombinedBodies = AddedBody + "\n\n" + DiskBody`.

### Algorithm C: Disk Stream Commit & Safety Rules
For each approved staged file:
1. Traverse directory parts recursively. Create missing folders sequentially (`getDirectoryHandle(part, { create: true })`).
2. If `change_type === 'delete'`, remove entry (`removeEntry(fileName)`).
3. If `change_type === 'append'` or `'prepend'`, read existing text, combine headers and content per Algorithm B.
4. Obtain writable stream handle (`createWritable()`).
5. Write final content buffer.
6. **Mandatory Rule:** Always close writable stream inside a `finally` block (`await writable.close()`).

***

All 4 documentation files have now been generated and updated to reflect the full, modern codebase architecture.