Project
--------

Chrome Extension (Manifest V3)

Architecture

- No bundler
- No import/export in content scripts
- Global namespace
- EventBus architecture

Coding rules

- Preserve behavior
- Keep APIs stable
- Prefer 100–200 line files
- One responsibility per module

Workflow

- Work on one subsystem at a time
- Never continue after finishing a task
- Wait for approval

Git

- Never commit automatically
- Never delete working code until replacement is connected

Testing

- Do not invent tests
- Produce manual test checklist

Code file header convention:
Every delivered code file must have a two-line header as its very first comment:

Line 1: Relative file path (e.g., // app/parent/login/page.js)
Line 2: AI Model name, chat name, and date (e.g., // Claude Sonnet 4.5 | Phase 4 Bloc 5 — Blason | 2026-07-21)

Apply on substantive changes only; skip trivial edits (comments-only, formatting). Greg names his own chat sessions — he will state the chat name explicitly at the start of each session so it can be used in the header stamp.