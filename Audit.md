# Code Audit Specification & Checklist: Fibo Zip File Drop

This document is a standalone auditing directive. When provided with source files for the "Fibo Zip File Drop" Chrome Extension, your task is to evaluate the code against the runtime architecture constraints, error boundaries, and defensive edge cases listed below.

---

## 1. Project Reference Architecture
To maintain continuity across standalone AI sessions, you must evaluate the codebase against this exact foundation:
*   **Runtime:** Chrome Extension Manifest V3 (MV3).
*   **Injection Mode:** Sequential, flat global content scripts. Standard ES Modules (`import`/`export`) are strictly forbidden inside content files to prevent script blocking on strict domain Content Security Policies (CSP).
*   **UI Containment:** Closed Shadow DOM boundary to guarantee style isolation from host websites.
*   **The Workflow Lifecycle:** A two-stage operation:
    1.  **Staging Phase:** Reads a flat ZIP, extracts path strings from the first line of text files, evaluates file existence on the disk, and builds an in-memory staging array.
    2.  **Commit Phase:** Receives explicit permission arrays (indices) from the UI and batches writing operations to the File System Access API.

---

## 2. Mandatory Audit Targets & Threat Matrix

### 🔍 2.1 Text & Path Parsing Vulnerabilities (The Regular Expression Layer)
The application converts text comments inside file headers into physical OS sub-directories. You must audit the parsing logic for these failure points:
*   **Leading/Trailing Junk:** Ensure comment wrappers (`//`, `/*`, `*/`, `#`, `<!--`, `-->`) are completely stripped from both ends of the path string without destroying the internal path slashes.
*   **Invalid Characters:** Confirm that standard illegal file system characters (e.g., `:`, `*`, `?`, `"`, `<`, `>`, `|`) are stripped or cleanly converted to safe separators (like underscores).
*   **Empty or Truncated Buffers:** If a file within the ZIP is 0 bytes or completely empty, parsing the "first line" will yield an empty string. The code must fall back gracefully to a default placeholder layout or the archive's internal filename instead of crashing.
*   **The Binary File Exception:** If a binary asset (like a `.png` icon or web font) is bundled in the ZIP, reading it as a plain-text string to look for a comment line will yield corrupted binary data. Verify that the file-processing stream either ignores binary assets or safely falls back to native zip mapping if no text path can be decoded.

### 🔍 2.2 File System Access API Risks (The Storage Layer)
Interacting with the local system via `FileSystemDirectoryHandle` brings unique threading and state issues. Audit the storage layer for:
*   **Dangling Writable Streams:** Every file write instantiates a `FileSystemWritableFileStream`. If an exception occurs mid-write, verify that `writable.close()` is caught in a `finally` block or handled cleanly. Open, un-closed file descriptors can lock directory paths or leak system memory.
*   **Race Conditions in Nested Directory Creation:** The engine loops through path segments and creates folders recursively via `getDirectoryHandle(folderName, { create: true })`. Ensure that these asynchronous file system calls are properly awaited sequentially, rather than mapping via un-awaited `forEach` loops, which causes directory creation collisions.
*   **Revoked Handle Permissions:** Users can revoke folder access at any moment through Chrome's security settings. Verify that the extension checks or handles permission errors on `rootHandle` gracefully before attempting a write operation.

### 🔍 2.3 Staging State & Index Alignment (The State Layer)
The UI operates on index selections (e.g., user confirms they want to overwrite file #3 and file #7).
*   **Index Mutation Checks:** Ensure that filtering, sorting, or altering the file list during the staging screen review phase does not desynchronize the index pointers map passed to the final `commitUpload()` function.
*   **Memory Overhead Leaks:** The `ZipProcessor` caches text buffers in an array (`stagedFiles`) during user review. Verify that this temporary storage state is completely wiped clean upon successful extraction completion or upon user cancellation to avoid bloating memory on heavy project uploads.

### 🔍 2.4 Event Bus Isolation & Scope
*   **Global Pollution:** Since the extension runs flat, un-modularized files sequentially, ensure the `EventBus` instance is securely tied inside the local initialization scope (`bootstrapFibo()`) so it never registers on the global webpage `window` object where host pages could eavesdrop or intercept internal extension events.

---

## 3. Formatted Audit Output Instructions
When delivering your code audit analysis based on this blueprint, group your findings into the following categories:
1.  **Critical Security/Runtime Failures:** (Code that will crash the extension or leak memory under edge cases).
2.  **Logic/Architecture Sins:** (Departures from the flat sequential initialization or closed Shadow DOM requirements).
3.  **Defensive Refactoring Recommendations:** (Clean improvements to make the path regex parsing or write streams more robust).