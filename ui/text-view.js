// ui/text-view.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

if (typeof window.FiboTextView === 'undefined') {
  window.FiboTextView = class FiboTextView {
    constructor({ processor, picker, dynamicContentZone, checkWorkspacePermission, escapeHtml, aiSettingsStore, onRequestAiExtraction, onAcceptAiExtraction }) {
      this.processor = processor;
      this.picker = picker;
      this.zone = dynamicContentZone;
      this.checkWorkspacePermission = checkWorkspacePermission;
      this.escapeHtml = escapeHtml;
      this.aiSettingsStore = aiSettingsStore;
      this.onRequestAiExtraction = onRequestAiExtraction;
      this.onAcceptAiExtraction = onAcceptAiExtraction;

      this.currentView = 'edit'; // 'edit' | 'ai-preview'
      this.lastRawText = '';
      this.lastFallbackPath = '';
      this.showAiButton = false; // flips true only via showAiSection()
      this.aiError = null;
      this.aiFiles = null;
    }

    render() {
      this.currentView = 'edit';
      const hasKey = !!(this.aiSettingsStore && this.aiSettingsStore.hasApiKey());

      let aiSection = '';
      if (this.showAiButton) {
        aiSection = hasKey ? `
          <input type="text" class="fibo-input" id="aiContextInput" placeholder="Optional instruction for AI, e.g. 'Backend code is first, frontend is second'" />
          <button class="fibo-btn" id="askGeminiBtn" style="background: #89b4fa;">✨ Ask Gemini to Extract</button>
        ` : `
          <div class="fibo-hint">No local match found. Configure a Gemini API key in ⚙ Settings to enable AI extraction.</div>
        `;
      }

      const errorBanner = this.aiError
        ? `<div class="fibo-status" style="color: #f38ba8;">🚨 ${this.escapeHtml(this.aiError)}</div>`
        : '';

      // lastRawText/lastFallbackPath are re-seeded into value/textContent on every
      // render so a bounce-back from staging-view's "not this rule" escape hatch
      // (or from an AI Discard) never loses what the user pasted.
      this.zone.innerHTML = `
        <input type="text" class="fibo-input" id="rawTextPathInput" placeholder="Optional Fallback Path (e.g. src/utils/helpers.js) — only used for a single snippet with no header" value="${this.escapeHtml(this.lastFallbackPath)}" />
        <textarea class="fibo-textarea" id="rawTextArea" placeholder="// path/to/file.js&#10;// Gemini 3.6 | FZFD Header & Log Stamp | 2026-07-27&#10;// feature: phase4-grimoire-dragon-astral&#10;console.log('Paste code here...');">${this.escapeHtml(this.lastRawText)}</textarea>
        ${errorBanner}
        <button class="fibo-btn" id="stageTextBtn" style="background: #cba6f7;">⚡ Analyze Raw Text</button>
        ${aiSection}
      `;

      this.zone.querySelector('#stageTextBtn').onclick = async () => {
        const text = this.zone.querySelector('#rawTextArea').value;
        const fallbackPath = this.zone.querySelector('#rawTextPathInput').value;
        this.lastRawText = text;
        this.lastFallbackPath = fallbackPath;
        if (!await this.checkWorkspacePermission()) return;
        await this.processor.stageRawText(text, this.picker.directoryHandle, fallbackPath);
      };

      const askGeminiBtn = this.zone.querySelector('#askGeminiBtn');
      if (askGeminiBtn) {
        askGeminiBtn.onclick = async () => {
          const context = this.zone.querySelector('#aiContextInput').value;
          this.aiError = null;
          await this.onRequestAiExtraction(this.lastRawText, context);
        };
      }
    }

    // Called when local tiers 1–3 all found nothing (RAW_TEXT_NO_LOCAL_MATCH) —
    // reveals the Ask-Gemini button (or a hint to configure a key) without
    // discarding the user's paste.
    showAiSection({ rawText, fallbackPath }) {
      this.lastRawText = rawText;
      this.lastFallbackPath = fallbackPath || '';
      this.showAiButton = true;
      this.aiError = null;
      this.render();
    }

    // Distinct accept/discard step before anything reaches the staging review —
    // Gemini's result costs money and left the browser, so it gets its own
    // explicit moment rather than flowing straight into staging like a rule match.
    renderAiPreview(files) {
      this.currentView = 'ai-preview';
      this.aiFiles = files;

      const rows = files.map((f) => `
        <div class="fibo-file-item">
          <div class="fibo-file-header-row">
            <span class="fibo-file-info">${this.escapeHtml(f.path)}</span>
          </div>
          ${f.reasoning ? `<span class="fibo-hint">${this.escapeHtml(f.reasoning)}</span>` : ''}
        </div>
      `).join('');

      this.zone.innerHTML = `
        <div class="fibo-status">✨ Gemini found ${files.length} file${files.length === 1 ? '' : 's'}:</div>
        <div class="fibo-file-list">${rows}</div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button class="fibo-btn" id="acceptAiBtn" style="background: #a6e3a1;">✅ Accept &amp; Stage</button>
          <button class="fibo-btn fibo-btn-secondary" id="discardAiBtn">Discard</button>
        </div>
      `;

      this.zone.querySelector('#acceptAiBtn').onclick = async () => {
        await this.onAcceptAiExtraction(this.aiFiles);
      };
      this.zone.querySelector('#discardAiBtn').onclick = () => {
        this.aiFiles = null;
        this.render();
      };
    }

    showAiError(message) {
      this.aiError = message;
      this.render();
    }

    // Clears all AI-related state — called when switching into Text mode fresh so
    // a previous paste's leftover AI button/preview never lingers.
    resetAiState() {
      this.currentView = 'edit';
      this.lastRawText = '';
      this.lastFallbackPath = '';
      this.showAiButton = false;
      this.aiError = null;
      this.aiFiles = null;
    }
  };
}
