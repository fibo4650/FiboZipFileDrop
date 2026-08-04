// ui/settings-view.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

if (typeof window.FiboSettingsView === 'undefined') {
  window.FiboSettingsView = class FiboSettingsView {
    constructor({ aiSettingsStore, learnedRulesStore, dynamicContentZone, escapeHtml, showToast, onBack }) {
      this.aiSettingsStore = aiSettingsStore;
      this.learnedRulesStore = learnedRulesStore;
      this.zone = dynamicContentZone;
      this.escapeHtml = escapeHtml;
      this.showToast = showToast;
      this.onBack = onBack;
      this.currentView = 'main'; // 'main' | 'rule-detail'
    }

    render() {
      this.currentView = 'main';
      const hasKey = this.aiSettingsStore.hasApiKey();
      const rules = this.learnedRulesStore.getAllRules();

      const ruleCards = rules.length === 0
        ? `<div class="fibo-hint">No learned rules yet — they appear here after Gemini extracts the same paste shape twice.</div>`
        : rules.map((r) => this._renderRuleCard(r)).join('');

      this.zone.innerHTML = `
        <button class="fibo-btn fibo-btn-secondary" id="settingsBackBtn">← Back</button>

        <div class="fibo-status">Gemini API Key</div>
        <input type="password" class="fibo-input" id="geminiKeyInput" placeholder="Paste your Gemini API key" />
        <div class="fibo-hint">${hasKey ? 'A key is currently saved.' : 'No key saved yet — AI extraction stays hidden until one is set.'}</div>
        <button class="fibo-btn" id="saveKeyBtn" style="background: #89b4fa;">💾 Save Key</button>

        <div class="fibo-status" style="margin-top: 8px;">Learned Rules</div>
        <div class="fibo-prompt-list" id="ruleListContainer">${ruleCards}</div>
      `;

      this.zone.querySelector('#settingsBackBtn').onclick = () => this.onBack();

      this.zone.querySelector('#saveKeyBtn').onclick = async () => {
        const val = this.zone.querySelector('#geminiKeyInput').value;
        await this.aiSettingsStore.saveApiKey(val);
        this.showToast('💾 Gemini key saved');
        this.render();
      };

      this.zone.querySelectorAll('[data-action]').forEach((btn) => {
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        btn.onclick = async () => {
          if (action === 'open-rule') {
            const rule = this.learnedRulesStore.getAllRules().find((r) => r.id === id);
            if (rule) this.renderRuleDetail(rule);
          } else if (action === 'promote-rule') {
            await this.learnedRulesStore.setStatus(id, 'verified');
            this.render();
          } else if (action === 'delete-rule') {
            await this.learnedRulesStore.deleteRule(id);
            this.render();
          }
        };
      });
    }

    _renderRuleCard(r) {
      const matchLabel = `Used ${r.matchCount} time${r.matchCount === 1 ? '' : 's'}, rejected ${r.rejectedCount || 0} time${(r.rejectedCount || 0) === 1 ? '' : 's'}`;
      const sample = (r.sampleText || '').slice(0, 80);
      const badgeClass = r.status === 'candidate' ? 'fibo-badge-new' : 'fibo-badge-tag';

      return `
        <div class="fibo-prompt-card">
          <div class="fibo-prompt-card-header">
            <span>${this.escapeHtml(r.name)}</span>
            <span class="${badgeClass}">${this.escapeHtml(r.status)}</span>
          </div>
          <div class="fibo-hint">${matchLabel}</div>
          <div class="fibo-hint">${this.escapeHtml(sample)}${(r.sampleText || '').length > 80 ? '…' : ''}</div>
          <div style="display: flex; gap: 4px; margin-top: 4px;">
            <button class="fibo-btn fibo-btn-sm" data-action="open-rule" data-id="${r.id}">Open</button>
            ${r.status === 'candidate' ? `<button class="fibo-btn fibo-btn-sm" data-action="promote-rule" data-id="${r.id}" style="background: #a6e3a1;">Promote</button>` : ''}
            <button class="fibo-btn fibo-btn-sm fibo-btn-danger" data-action="delete-rule" data-id="${r.id}">Delete</button>
          </div>
        </div>
      `;
    }

    // Purely client-side — new FiboRuleMatcher().matchAll() here has zero
    // storage/staging side effects, it just reports match/no-match + block count.
    renderRuleDetail(rule) {
      this.currentView = 'rule-detail';
      const t = rule.template;
      const paramRows = Object.keys(t)
        .filter((k) => k !== 'type')
        .map((k) => `<div class="fibo-hint">${this.escapeHtml(k)}: ${this.escapeHtml(String(t[k]))}</div>`)
        .join('');

      this.zone.innerHTML = `
        <button class="fibo-btn fibo-btn-secondary" id="ruleDetailBackBtn">← Back to Rules</button>
        <div class="fibo-status">${this.escapeHtml(rule.name)}</div>
        <div class="fibo-hint">Template: ${this.escapeHtml(t.type)}</div>
        ${paramRows}
        <div class="fibo-hint">Status: ${this.escapeHtml(rule.status)} · Used ${rule.matchCount} time${rule.matchCount === 1 ? '' : 's'} · Rejected ${rule.rejectedCount || 0} time${(rule.rejectedCount || 0) === 1 ? '' : 's'}</div>

        <textarea class="fibo-textarea" id="testSampleArea" placeholder="Paste sample text to test this rule against...">${this.escapeHtml(rule.sampleText || '')}</textarea>
        <button class="fibo-btn fibo-btn-sm" id="testRuleBtn">🧪 Test against sample</button>
        <div class="fibo-hint" id="testResultText"></div>

        <div style="display: flex; gap: 4px; margin-top: 4px;">
          ${rule.status === 'candidate' ? `<button class="fibo-btn fibo-btn-sm" id="promoteDetailBtn" style="background: #a6e3a1;">Promote to Verified</button>` : ''}
          <button class="fibo-btn fibo-btn-sm fibo-btn-danger" id="deleteDetailBtn">Delete</button>
        </div>
      `;

      this.zone.querySelector('#ruleDetailBackBtn').onclick = () => this.render();

      this.zone.querySelector('#testRuleBtn').onclick = () => {
        const sample = this.zone.querySelector('#testSampleArea').value;
        const matcher = new window.FiboRuleMatcher();
        const results = matcher.matchAll(sample, [rule]);
        const resultEl = this.zone.querySelector('#testResultText');
        if (results.length > 0) {
          resultEl.textContent = `✅ Match: ${results[0].blocks.length} block(s) found.`;
          resultEl.style.color = '#a6e3a1';
        } else {
          resultEl.textContent = '❌ No match against this sample.';
          resultEl.style.color = '#f38ba8';
        }
      };

      const promoteBtn = this.zone.querySelector('#promoteDetailBtn');
      if (promoteBtn) {
        promoteBtn.onclick = async () => {
          await this.learnedRulesStore.setStatus(rule.id, 'verified');
          this.render();
        };
      }

      this.zone.querySelector('#deleteDetailBtn').onclick = async () => {
        await this.learnedRulesStore.deleteRule(rule.id);
        this.render();
      };
    }
  };
}
