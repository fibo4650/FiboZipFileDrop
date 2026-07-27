
# Document 1: Human User & Workflow Guide
**File Path:** `docs/ui/01-human-user-guide.md`

```markdown
# 📜 Meta-Framework UI & Workflow Guide (For Humans)

## 1. What is the Meta-Framework?

The **Meta-Framework** is a local, lightweight system for tracking project state, code artifacts, design documents, and feature completion. 

### Core Principles
1. **Tool, Not a Governance Gate:** The framework never locks your code or stops you from working. It tracks reality, auto-suggests choices, and records your actions.
2. **AI is a Reasoning Engine, Not the System:** Code changes made by AI chats or Cursor agents are captured as events. The Data Registry (`registry-arene.json`) remains the single persistent memory of the project.
3. **Human in the Loop:** Automated checks provide information (*findings*). You are the gatekeeper who confirms matches, links features, or clears warnings with 1 click.
4. **Zero Dev Commands Required:** The entire UI runs locally inside your browser via standard local HTML/JS. No background servers or terminal commands needed.

---

## 2. Core Concepts & Data Model

### Artifact Types
Artifacts are records tracked in `registry-arene.json`. They fall into two categories:

* **10 File-Backed Artifact Types (Physical Files on Disk):**
  * `code_module`: Application source code (`.js`, `.ts`, `.jsx`, `.tsx`).
  * `test_suite`: Test files (`.test.js`, `.smoke.mjs`).
  * `doc`: Documentation markdown files (`.md`).
  * `blueprint`: Major phase design documents (`Phase4_CarteCeleste_Blueprint.md`).
  * `contract`: API or data contract specifications.
  * `migration`: Database SQL scripts (`supabase/*.sql`).
  * `decision_log`: One dated, product-defining decision record.
  * `report`: Advisory bug postmortem or lesson learned.
  * `pending_patch`: Patch or addendum file waiting to be hand-merged.
  * `spec`: Generic specification document.

* **1 Abstract Container Type (`feature`):**
  * A `feature` has **no physical file of its own** (`location: ""`).
  * It represents a named unit of composed work (e.g. `phase3-merlin-cerveau` or `fix-db-sessions`).
  * Its completion status (`DONE` / `IN PROGRESS`) is rolled up automatically from the artifacts linked to it via `part_of`.

---

## 3. The 4-Step Artifact Lifecycle

```text
[ 1. PLANNED ] ──────► [ 2. CAPTURED ] ──────► [ 3. MATCHED ] ──────► [ 4. ACTIVE ]
 Slot declared in      File edit detected     Intake Queue matches    Human confirms;
 Registry/Feature      by Git/Extension       path to registry        payload activated
```

1. **Planned (`proposed`):** An expected file slot declared in a feature plan.
2. **Captured:** Git commit hook (`git_events.py`), Cursor agent hook (`cursor_hooks.py`), or Chrome extension (`extension_events.py`) writes a JSON batch to `./events/`.
3. **Matched:** The Intake Queue matches the physical path to a registry slot.
4. **Active (`active`):** You click **[✅ Confirm & Activate]**. The browser reads the source code from disk into the registry record and marks it active.

---

## 4. How to Use the Local Web Dashboard

### Step 1: Open the Dashboard
Double-click `meta-framework/ui/index.html` or open it in Chrome, Edge, or Cursor's Browser Preview.

### Step 2: Connect Your Repository
Click **"📁 Open Workspace"** in the bottom left sidebar and select your root project directory (e.g., `arene-des-mots-mages`).

### Step 3: Use the Intake Queue Tab
When you commit code or an AI generates files, the **Intake Queue** badge lights up:
* **Confirm Entire Batch:** Click **"🚀 Confirm All Files"** to approve a full Git commit at once.
* **Confirm Single File:** Click **"✅ Confirm & Activate"** on individual file cards.
* **Assign / Move to Feature:** Use the dropdown on any file card to attach it to a feature (e.g., `fix-db-sessions`).
* **Action Modes:**
  * *Update Existing Artifact:* Updates the source code and timestamp of the existing artifact ID.
  * *Create New Artifact (Supersedes Old):* Registers a new version of the artifact for a new feature while preserving history.
* **Ignore File:** Click **"🚫 Ignore File"** for junk files (like `repomix-output.md` or `.cursor/hooks.json`). The framework saves ignored paths into `ignored_locations` so it never asks about them again.

### Step 4: Use the Overview Tab
* **Feature Explorer:** Click any feature card (e.g. `phase3-merlin-cerveau`) to expand it and view **Made (Active)** files vs **Expected (Planned)** slots.
* **Create New Feature / Refactor:** Click **"➕ Create New Feature / Refactor"** to create a new virtual container for a major multi-file fix (e.g. `fix-db-sessions`).
* **Artifact Inventory:** Filter all project files by **Linked**, **Unlinked**, or **Carrying Findings**.

---

## 5. Frequently Asked Questions

#### Q: What happens when an active file is modified later?
The system compares the Git event timestamp against the artifact's `updated_at` time:
* **Same Delivery:** If Git fires right after you confirmed an extension delivery, the system recognizes it as **automatic corroboration** and auto-clears it.
* **New Modification:** If you edit an active file 2 days later, it pops up in Intake as `UPDATED` or `REPLACED`. You confirm it, and the new source code is re-read into the registry.

#### Q: What if a validation check finds an issue?
In this framework, **validation reports, it never blocks**. An artifact with a validation finding is still marked `active`. The finding is shown in the Overview tab for your information, where you can click **"Acknowledge & Clear"** whenever you've reviewed it.
```

---

# Document 2: AI Audit & Debug Guide
**File Path:** `docs/ui/02-ai-audit-and-debug-guide.md`

```markdown
# 🛠️ Meta-Framework UI Audit & Debugging Guide (For AI Agents)

This document is a technical guide for an AI assistant auditing, troubleshooting, or fixing bugs in the `meta-framework/ui/` codebase.

---

## 1. System Architecture & File Layout

The UI is built as a zero-server, modular Vanilla JS Single Page Application (SPA) using ES6 modules and the browser's File System Access API.

```text
meta-framework/ui/
  ├── index.html           # Shell, Tailwind CDN, Mermaid.js CDN, Sidebar, View Container
  └── js/
       ├── app.js          # App lifecycle, hash router (#overview, #intake, #graph), event bindings
       ├── fs_bridge.js     # Native File System Access API bridge (Disk IO)
       └── views/
            ├── overview.js # Feature Explorer, Artifact Inventory table, Create Feature modal
            ├── intake.js   # Event batch parsing, timestamp matching, batch/single approval logic
            └── graph.js    # Mermaid.js dependency diagram generator
```

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

$$\text{isPending} = \begin{cases} 
\text{false} & \text{if } f.\text{path} \in \text{registry.ignored\_locations} \\
\text{false} & \text{if } \text{matched.state} == \text{'active'} \land B.\text{timestamp} \le \text{matched.updated\_at} + 2000\text{ms} \\
\text{true} & \text{otherwise (New file OR } B.\text{timestamp} > \text{matched.updated\_at} + 2000\text{ms})
\end{cases}$$

* **Older / Same-Time Events:** Treated as cross-channel corroboration (e.g. Git confirming an extension delivery) and auto-cleared/auto-archived.
* **Newer Events ($> 2000\text{ms}$):** Treated as genuine file modifications and surfaced as pending items in the Intake Queue.

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

### Issue 4: "Git hooks fail on Windows with `UnicodeDecodeError` or `cp1252` error"
* **Cause:** Python's `subprocess.run(..., text=True)` on Windows defaults to code page 1252 instead of UTF-8 when reading Git stdout containing accented French characters.
* **Fix:** In `meta-framework/git_events.py`, pass `encoding="utf-8", errors="replace"` to `subprocess.run`.

### Issue 5: "Git hook fails with `#!\bin\sh command not found` on Windows"
* **Cause:** PowerShell `Out-File` or `Set-Content` wrote a UTF-8 Byte Order Mark (BOM) at the start of `.git/hooks/post-commit`.
* **Fix:** Write the hook file using .NET without BOM:
  `[System.IO.File]::WriteAllText("$PWD/.git/hooks/post-commit", $content, [System.Text.UTF8Encoding]::$false)`
```

---

# Document 3: AI Feature Expansion Guide
**File Path:** `docs/ui/03-ai-expansion-guide.md`

```markdown
# 🚀 Meta-Framework UI Expansion Guide (For AI Agents)

This document provides step-by-step blueprints for AI assistants extending and adding new capabilities to the `meta-framework/ui/` codebase.

---

## 1. Architectural Rules for UI Extensions

1. **Zero-Build Boundary:** Keep the application running natively on standard browser APIs. Do not introduce Webpack, Vite, or Node compilation steps unless explicitly requested.
2. **Hash-Based Client Routing:** Add new top-level views by extending the hash router in `ui/js/app.js` (`#overview`, `#intake`, `#graph`, `#your-new-view`).
3. **State Integrity:** Every state mutation MUST write through `fs.writeRegistry(registry)` and log an audit record via `fs.appendActivityLog({ ... })`.

---

## 2. Expansion Blueprint A: In-Browser Contract Validation Engine

### Goal
Currently, contract checks (`payload_shape`, `output_location_pattern`, `consumes` dependencies) run via Python scripts (`contract_validators.py`). We want to run lightweight contract validation natively in JS inside the browser.

### Implementation Steps
1. Create `ui/js/validators.js`:
   * Implement a lightweight JSON schema checker or import AJV via CDN (`https://cdn.jsdelivr.net/npm/ajv@8/dist/ajv.min.js`).
   * Read `02-knowledge-architecture/contracts/*.json` via `fs.readFileText()`.
2. When an artifact is confirmed in `ui/js/views/intake.js`:
   * Validate `payload.source` or filename against `output_location_pattern`.
   * Populate `artifact.findings = [...]` if any convention is violated.
   * Set `artifact.validation_state = findings.length > 0 ? 'failed' : 'passed'`.

---

## 3. Expansion Blueprint B: Decision Log & Report Journal Editor

### Goal
Provide a dedicated UI view (`#journal`) to create, inspect, and supersede `decision_log` and `report` artifacts.

### Implementation Steps
1. Add `#journal` tab in `ui/index.html` navigation.
2. Create `ui/js/views/journal.js`:
   * Filter artifacts where `type === 'decision_log'` or `type === 'report'`.
   * Render cards showing `payload.decision` or `payload.situation` / `payload.what_happened` / `payload.why`.
   * Display **Maturity (0–100)** and **Confidence (0–100)** progress bars.
3. Add **"➕ New Decision Log"** Modal:
   * Fields: Decision text, rationale, status (`open` | `decided` | `applied`), `applies_to` features.
   * Add a **"Supersede Decision"** button on existing cards that automatically creates a new decision log and attaches `supersedes: ["old-decision-id"]`.

---

## 4. Expansion Blueprint C: Interactive Drag-and-Drop Dependency Graph

### Goal
Replace static Mermaid.js rendering with an interactive node canvas (using Cytoscape.js or Vis.js via CDN).

### Implementation Steps
1. In `ui/index.html`, load Cytoscape.js:
   `<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.26.0/cytoscape.min.js"></script>`
2. Create `ui/js/views/graph.js`:
   * Map `registry.artifacts` into Cytoscape nodes and edges (`depends_on` and `part_of`).
   * Color-code nodes by `lifecycle_state` (`active` = green, `proposed` = amber, `failed` = red).
   * Allow dragging an arrow from Node A to Node B to dynamically create a `depends_on` link and save it to `registry-arene.json`!

---

## 5. Expansion Blueprint D: Persistent Workspace via IndexedDB

### Goal
Currently, refreshing the browser requires clicking "Open Workspace" again. Using IndexedDB, the browser can save the `FileSystemDirectoryHandle`.

### Implementation Steps
1. In `ui/js/fs_bridge.js`, store `this.dirHandle` in IndexedDB upon selection.
2. On page load in `ui/js/app.js`:
   * Retrieve saved handle from IndexedDB.
   * Call `await savedHandle.queryPermission({ mode: 'readwrite' })`.
   * If granted, automatically connect and render without prompting the user!
```

---

# Document 4: AI Rebuild & Functional Specification
**File Path:** `docs/ui/04-ai-rebuild-spec.md`

```markdown
# 🏗️ Meta-Framework UI Functional Specification (Rebuild Spec)

This document is a framework-agnostic functional specification for recreating the Meta-Framework UI in any technology stack (React, Next.js, Vue, Svelte, VS Code Extension, Tauri, or Electron).

---

## 1. System Intent & Philosophy

The Meta-Framework UI is a tracking and decision device for solo developers working with AI code generation tools.
* **Human-in-the-Loop:** Automation proposes candidate actions; the human confirms or overrides them.
* **Non-Blocking Validation:** Contract findings are recorded as advisory warnings, never blocking state promotion.
* **History Preservation:** Decisions are superseded, never overwritten.

---

## 2. Core Entities & Data Schema

### A. Artifact Record (`registry.json`)
```json
{
  "artifacts": {
    "artifact_id": {
      "id": "string (unique key)",
      "type": "string (code_module | test_suite | doc | blueprint | contract | migration | decision_log | report | pending_patch | spec | feature)",
      "lifecycle_state": "proposed | candidate | validated | active | failed | archived",
      "validation_state": "not_checked | passed | failed",
      "origin": "worker | discovered | null",
      "location": "string (repo-relative path or empty for features)",
      "part_of": "string | null (Feature ID this belongs to)",
      "required": "boolean (default: true)",
      "depends_on": ["array of artifact IDs"],
      "supersedes": ["array of artifact IDs"],
      "findings": ["array of finding text strings"],
      "payload": { "label": "", "note": "", "source": "" },
      "created_at": "ISO 8601 string",
      "updated_at": "ISO 8601 string"
    }
  },
  "ignored_locations": ["array of file paths to ignore"],
  "custom_types": ["array of user-created artifact types"]
}
```

### B. Event Batch Record (`events/*.json`)
```json
{
  "timestamp": "ISO 8601 string",
  "source": "git | extension | cursor_hooks | manual",
  "files": [
    {
      "path": "string (file path)",
      "status": "success | error",
      "change_type": "new | appended | replaced | updated | deleted",
      "expects": { "type": "string", "feature": "string", "artifact_id": "string" }
    }
  ]
}
```

### C. Activity Log Record (`.activity.jsonl`)
Append-only JSONL file where each line is:
`{"timestamp": "...", "artifact_id": "...", "event": "created|update|ignored", "from_state": "...", "to_state": "...", "reason": "...", "actor": "human"}`

---

## 3. Required Functional Views & Features

### View 1: Overview & Rollup Dashboard
1. **Metrics Cards:**
   * Feature completion ratio: $\frac{\text{Completed Features}}{\text{Total Features}}$ where a feature is `DONE` iff all its `required: true` children have `lifecycle_state === 'active'`.
   * Total Active Artifacts count.
   * Standalone / Unlinked Artifacts count.
   * Active Validation Findings count.
2. **Interactive Feature Explorer:**
   * Accordion list of all `type === 'feature'` artifacts.
   * Expanding a card displays two lists:
     * **Made Artifacts:** Active children where `part_of === feature.id`.
     * **Expected / Planned Slots:** Proposed or candidate children.
   * **Create Feature Modal:** Form to register a new `type: "feature"` container (`id`, `label`, `note`). Must validate against duplicate Feature IDs.
3. **Artifact Inventory Table:**
   * Filter pills: `All`, `Linked`, `Unlinked`, `Findings`.
   * Search input (searches ID, location path, and type).
   * Inline Feature Re-binding Dropdown on every row to change `part_of` instantly.

### View 2: Event Intake Queue
1. **Batch Grouping:** Group incoming file events by event batch file (`events/git-*.json`).
2. **Smart Type Guessing:** Auto-infer default artifact type from file extension (`.test.js` ➔ `test_suite`, `.md` ➔ `doc`, `.sql` ➔ `migration`).
3. **10 Standard Types + Custom Type Creator:** Dropdown must contain all standard types plus a custom option that reveals a text input for new types.
4. **Action Modes for Matched Files:**
   * *Update Existing:* Updates `payload.source`, sets `updated_at`, promotes to `active`.
   * *Supersede:* Creates a new artifact ID for the assigned feature and populates `supersedes: [old_id]`.
5. **Ignore File Button:** Adds path to `ignored_locations` in `registry.json` and hides it permanently.
6. **Batch & Single Approval Buttons:**
   * `Confirm This File Only`: Activates single artifact, updates registry.
   * `Confirm All Files in Batch`: Activates all items in batch, archives event file to `events/processed/`.

### View 3: Visual Dependency & Feature Graph
1. Render a horizontal graph (`LR` direction).
2. Group nodes into subgraphs by feature (`part_of`).
3. Draw directional arrows for dependency edges (`depends_on`).

---

## 4. Key Algorithm Specifications

### Algorithm A: Event Timestamp Matching (Corroboration vs Modification)
For each file `f` in event batch `B`:

$$\text{Action} = \begin{cases}
\text{IGNORE} & \text{if } f.\text{path} \in \text{registry.ignored\_locations} \\
\text{AUTO-CLEAR} & \text{if } \exists A \in \text{artifacts} \mid A.\text{location} == f.\text{path} \land A.\text{state} == \text{'active'} \land B.\text{timestamp} \le A.\text{updated\_at} + 2000\text{ms} \\
\text{SURFACE IN QUEUE} & \text{otherwise}
\end{cases}$$

### Algorithm B: Feature Rollup Completion
For a feature $F$:

$$\text{isDone}(F) = \forall c \in \{A \in \text{artifacts} \mid A.\text{part\_of} == F.\text{id} \land A.\text{required} == \text{true}\}, \quad c.\text{lifecycle\_state} == \text{'active'}$$
```