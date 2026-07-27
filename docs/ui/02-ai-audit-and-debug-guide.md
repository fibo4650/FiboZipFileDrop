
# 🛠️ Meta-Framework UI Audit & Debugging Guide (For AI Agents)

This document is a technical guide for an AI assistant auditing, troubleshooting, or fixing bugs in the `meta-framework/ui/` codebase.

---

## 1. System Architecture & File Layout

The UI is built as a zero-server, modular Vanilla JS Single Page Application (SPA) using ES6 modules and the browser's File System Access API.

meta-framework/ui/
  ├── index.html           # Shell, Tailwind CDN, Mermaid.js CDN, Sidebar, View Container
  └── js/
       ├── app.js          # App lifecycle, hash router (#overview, #intake, #graph), event bindings
       ├── fs_bridge.js     # Native File System Access API bridge (Disk IO)
       └── views/
            ├── overview.js # Feature Explorer, Artifact Inventory table, Create Feature modal
            ├── intake.js   # Event batch parsing, timestamp matching, batch/single approval logic
            └── graph.js    # Mermaid.js dependency diagram generator

---

## 2. Directory Handle & File Resolution Logic (`fs_bridge.js`)

When `window.showDirectoryPicker()` is invoked, the user selects a root folder. `LocalFSBridge.resolveTargetDirectory()` locates where `registry-arene.json` lives:

1. Checks root directory: `./registry-arene.json`
2. Checks subfolder: `./meta-framework/registry-arene.json`
3. Fallback: `./examples/demo_registry.json`

### Key Invariant:
`this.targetDirHandle` points to the directory containing `registry-arene.json` and `./events/`. All file writes (`writeRegistry`, `appendActivityLog`, `archiveEventFile`) execute against `this.targetDirHandle`.

---

## 3. State Invariants & Event Intake Rules

### A. Timestamp Matching & Corroboration Rule (`intake.js`)
When checking whether an incoming file event `f` in batch `B` requires human confirmation:

- If f.path is in registry.ignored_locations -> Hide (not pending)
- If matched.state == 'active' AND B.timestamp <= matched.updated_at + 2000ms -> Auto-clear (Corroboration)
- Otherwise (New file OR B.timestamp > matched.updated_at + 2000ms) -> Surface in Intake Queue as Pending

* **Older / Same-Time Events:** Treated as cross-channel corroboration (e.g. Git confirming an extension delivery) and auto-cleared/auto-archived.
* **Newer Events (> 2000ms):** Treated as genuine file modifications and surfaced as pending items in the Intake Queue.

### B. Batch Auto-Archiving Rule
An event batch file `events/git-xxx.json` MUST be moved to `events/processed/git-xxx.json` if and only if **all files in `batch.data.files`** are either `active` (and up to date) in `registry.artifacts` OR listed in `registry.ignored_locations`.

---

## 4. Diagnostic & Debugging Checklist

If a user reports an issue with the UI, follow this decision tree:

### Issue 1: "Clicking Open Workspace does nothing"
* **Cause:** JavaScript ES Module syntax error in one of the imported `.js` files, preventing `app.js` from executing.
* **Fix:** Check browser DevTools console (`F12`). Look for unclosed backticks, missing export functions, or undefined variables.

### Issue 2: "Features or Artifacts show 0 / 0"
* **Cause:** `resolveTargetDirectory()` failed to locate `registry-arene.json`.
* **Fix:** Inspect `fs.targetDirHandle`. Ensure `registry-arene.json` exists either at the root or inside `meta-framework/`.

### Issue 3: "Confirmed files remain stuck in the Intake Queue"
* **Cause A:** `archiveEventFile()` failed because `events/processed/` directory handle could not be created or written to.
* **Cause B:** Timestamp comparison failed because `matched.updated_at` was not written as an ISO string during activation.
* **Fix:** Verify `matched.updated_at = new Date().toISOString()` is executed before `fs.writeRegistry(registry)`.

### Issue 4: "Git hooks fail on Windows with UnicodeDecodeError or cp1252 error"
* **Cause:** Python's `subprocess.run(..., text=True)` on Windows defaults to code page 1252 instead of UTF-8 when reading Git stdout containing accented French characters.
* **Fix:** In `meta-framework/git_events.py`, pass `encoding="utf-8", errors="replace"` to `subprocess.run`.

### Issue 5: "Git hook fails with #!\bin\sh command not found on Windows"
* **Cause:** PowerShell `Out-File` or `Set-Content` wrote a UTF-8 Byte Order Mark (BOM) at the start of `.git/hooks/post-commit`.
* **Fix:** Write the hook file using .NET without BOM:
  `[System.IO.File]::WriteAllText("$PWD/.git/hooks/post-commit", $content, [System.Text.UTF8Encoding]::$false)`