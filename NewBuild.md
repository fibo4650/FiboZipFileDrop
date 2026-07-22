# Product Specification & Lore: Fibo Zip File Drop (Rebuild Blueprint)

This document is the absolute source of truth for the product identity, philosophy, user experience, and historical lessons of the Fibo Zip File Drop ecosystem. If this project is ever rebuilt from scratch—even using completely different framework paradigms or programming languages—these core product pillars and hard-won lessons must be strictly maintained.

---

## 1. Product Core & Purpose
Fibo Zip File Drop is a specialized developer workflow accelerator built as a desktop browser extension. Its single purpose is to act as an instantaneous bridge between ephemeral online sandboxes (like LLM chats or cloud coding interfaces) and the developer's local hard drive.

### The Problem it Solves
Modern AI code generation environments frequently output project updates as flat, single-level ZIP archives containing dozens of files. However, the *true* intended folder structure of these files is written manually as a code comment on the very first line of each individual file (e.g., `// lib/ui/components/Button.js`). Manually recreating these folders and placing files one by one destroys developer velocity.

---

## 2. Product Philosophy & UX Architecture

### Design Philosophy
*   **Zero Invasiveness:** The tool must sit silently in the background until explicitly invoked. It must never alter the native layout or performance of the host website.
*   **Absolute Transparency:** The tool deals with local file systems. Developers must never feel like files are being modified blindly behind their backs. Visual confirmation must precede every disk mutation.

### The Standard User Journey (UX Flow)
1.  **Invocation:** The user clicks the extension icon in their toolbar. A streamlined sidebar panel slides into view over the current webpage.
2.  **Target Binding:** The user selects a root local workspace folder via a single action button. This sets the boundary for all future operations.
3.  **The Staging Drop:** The user drags a flat ZIP archive from their downloads tracker (or clicks to browse their system) and drops it onto the sidebar.
4.  **The Conflict Review Matrix:** The sidebar instantly morphs from a dropzone into a scrollable preview inventory matrix. 
    *   Files that *do not* exist in the local workspace are flagged as `new`.
    *   Files that *already exist* inside the targeted directory tree display an unchecked overwrite box.
5.  **Commit:** The user selectively ticks files they wish to overwrite and hits a single execution button. The directory tree is generated dynamically, files are written, and the panel returns to a clean drop state with a success notification.

---

## 3. The Hard Lessons: Historical Non-Obvious Bugs & Breakdowns
*Do not let a fresh AI architecture fall into these exact traps. These issues were discovered and solved through trial and error.*

### 🛠️ The Flat ZIP Paradox
*   **The Trap:** A generic AI will look at a ZIP file and use traditional extraction libraries to recreate paths based on the archive's internal folder directories.
*   **The Reality:** The ZIP files processed by this product are physically flat. The folders do not exist in the archive metadata. The extension *must* open each file, read the first line of text, parse out the comment markers, and dynamically deduce the structural tree from that plain text string.

### 🛠️ The Extension Script Injection Conflict (CSP Vector)
*   **The Trap:** Attempting to build the extension using modern modular architectures (like ES Modules with standard `import`/`export` keywords) injected directly into the tab.
*   **The Reality:** High-security production sites feature strict Content Security Policies (CSP). Injecting modules into the host page context will cause immediate syntax block errors. Files injected into the browser tab must either run as a flat, sequential execution sequence or be fully sandboxed out of the host document's namespace.

### 🛠️ The Disappearing Toolbar Arrow & Permission Reset
*   **The Trap:** Assuming that browser toolbar icons are permanent features.
*   **The Reality:** Browsers dynamically manage toolbar real estate. When the extension is reloaded, updated, or when permissions are changed on secure tabs, Chrome frequently resets the tab's active download tracking state and pushes the extension icon out of sight. A click-to-browse fallback file selection workflow inside the UI is mandatory so the user is never stranded if drag-and-drop elements become inaccessible due to security resets.

---

## 4. Critical Architectural Decisions (Non-Negotiable)

### UI Sandboxing via Closed Shadow DOM
The interface elements *must* be rendered inside a completely isolated, closed Shadow DOM boundary container attached to a host node. 
*   **Why:** Without a closed Shadow DOM, the CSS styles of the website the developer is currently browsing will bleed into the extension panel, breaking layouts, hiding buttons, and distorting fonts. Isolation guarantees a uniform app environment regardless of the host domain.

### Upfront Conflict Resolution Lifecycle
Files must never be written to the local disk sequentially as they are unzipped. The product must explicitly adhere to a strict two-stage lifecycle:
1.  **Stage Phase:** Scan the archive $\rightarrow$ read the comment header $\rightarrow$ test the local folder tree for file existence using explicit non-creating read hooks $\rightarrow$ compile a complete memory state matrix.
2.  **Commit Phase:** Render the state matrix to the user $\rightarrow$ wait for explicit approval indices $\rightarrow$ batch write only verified files to the disk thread.