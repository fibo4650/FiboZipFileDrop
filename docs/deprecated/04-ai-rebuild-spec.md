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
   * Feature completion ratio: Total Completed Features / Total Features where a feature is DONE iff all its `required: true` children have `lifecycle_state === 'active'`.
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
2. **Smart Type Guessing:** Auto-infer default artifact type from file extension (`.test.js` -> `test_suite`, `.md` -> `doc`, `.sql` -> `migration`).
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

- If f.path in registry.ignored_locations -> IGNORE
- Else if EXISTS A in artifacts WHERE A.location == f.path AND A.state == 'active' AND B.timestamp <= A.updated_at + 2000ms -> AUTO-CLEAR
- Else -> SURFACE IN INTAKE QUEUE

### Algorithm B: Feature Rollup Completion
For a feature F:
isDone(F) = true iff for all children c of F where c.required == true, c.lifecycle_state == 'active'.