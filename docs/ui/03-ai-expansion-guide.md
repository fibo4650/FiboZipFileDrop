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