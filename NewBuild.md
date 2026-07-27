

<!-- NewBuild.md -->
<!-- Gemini 3.6 | FZFD Header & Log Stamp | 2026-07-27 -->

# Fibo Zip File Drop: Rebuild & Feature Specification

This document provides the technology-agnostic product specification, core philosophy, user journey, and historical lessons required to rebuild the "Fibo Zip File Drop" extension ecosystem from scratch.

---

## 1. Product Identity & Purpose

Fibo Zip File Drop is a specialized workflow tool for software developers. Its sole purpose is to act as a seamless, non-invasive bridge between online sandboxes or LLM chat sessions and local project workspaces.

### The Core Problem Solved
Modern AI code generation environments frequently deliver multi-file code updates as flat ZIP archives or raw text snippets. The intended directory tree is specified as a code comment on line 1 of each file (e.g., `// lib/auth/session.js`). Manually creating these subfolders and placing files destroys velocity. Fibo automates this extraction and placement safely.

---

## 2. Fundamental Architectural Pillars

### Pillar 1: Total UI Isolation (Shadow DOM)
The user interface MUST be rendered inside an isolated Shadow DOM attached to a host container on the page.
* **Rationale:** Host website CSS must never distort extension buttons or layout, and extension styles must never bleed onto the host website.

### Pillar 2: Two-Stage Workflow Lifecycle
Files must NEVER be written to the local disk blindly upon decompression.
1. **Stage & Review Phase:** Extract files in memory $\rightarrow$ parse path directives $\rightarrow$ evaluate local file existence $\rightarrow$ render review matrix.
2. **Commit Phase:** Collect user overwrite confirmations $\rightarrow$ create directories recursively $\rightarrow$ write files $\rightarrow$ emit execution logs.

### Pillar 3: Transparent Auto-Logging & Event Dispatching
Every disk modification MUST produce an auditable trail:
* **Text Execution Log:** Appended to `/FZFDlog/fzfd-YYYY-MM.log`.
* **JSON Event Batch:** Written to `/events/extension-TIMESTAMP.json` formatted for intake engines:
```json
{
  "timestamp": "2026-07-27T18:00:00.000Z",
  "date": "2026-07-27",
  "model": "Gemini 3.6",
  "chat_name": "FZFD Header & Log Stamp",
  "source": "extension",
  "files": [
    {
      "path": "src/app.js",
      "status": "success",
      "change_type": "updated",
      "expects": { "feature": "phase4-core" }
    }
  ]
}
```

---

## 3. Key Behavioral Specifications

### Multi-Mode Ingestion Engine
* **ZIP Ingestion:** Decompress entries, skip directory entries, read binary formats as byte arrays (`Uint8Array`), and read text formats as strings.
* **Single/Multi-File Ingestion:** Read files via Blob/File APIs. Process batches in a single staging pass.
* **Raw Text Ingestion:** Parse textarea buffer. Enforce mandatory Line 1 path directive validation. Reject text without explicit path directives to prevent filesystem clutter.

### Header Comment Parsing Engine
* **Line 1 (Path Directive):** Extract path enclosed in comments (`//`, `#`, `/*`, `<!--`). Validate extension ending (`/\.[a-zA-Z0-9]{1,10}$/`). Fall back to ZIP internal relative path if absent or invalid.
* **Line 2 (Session Stamp):** Parse `Model | Chat Name | Date` separated by pipe (`|`) delimiters.
* **Line 3 (Feature Directive):** Parse `feature: <feature_id>` for project management tracking.

---

## 4. Hard Lessons & Historical Pitfalls to Avoid

* **The Flat ZIP Paradox:** Relying solely on ZIP archive folder metadata fails because LLMs generate flat ZIP files. Line 1 header comment parsing is mandatory.
* **Extension Script Injection Failure (CSP Vector):** Using modern ES module syntax (`import`/`export`) in injected scripts triggers Content Security Policy blocking on secure sites. Load scripts as a flat, sequential array.
* **False-Positive Path Matches:** Naive path regexes match prose text containing dots (e.g., `# Notes on version 1.2. Read me`). Strictly enforce extension boundaries (`/\.[a-zA-Z0-9]{1,10}$/`) and reject URL strings containing `://`.
* **Stream Seek Corruption:** `FileSystemWritableFileStream` lacks a `.size` property. Always inspect file size from the `File` object via `handle.getFile()` prior to seeking stream offsets.
* **Staging Key Collisions:** Indexing staged items by string paths causes checkbox desynchronization when multiple files share identical display paths. Map staging states using numeric index pointers.
* **Permanent UI Lockout:** Disabling the directory connection button permanently locks users out of switching project folders. Always leave the workspace connection trigger interactive.