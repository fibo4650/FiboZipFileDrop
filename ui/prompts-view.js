// ui/prompts-view.js
// Claude Sonnet 5 | session 2 refactor | 2026-07-28

if (typeof window.FiboPromptsView === 'undefined') {
  window.FiboPromptsView = class FiboPromptsView {
    constructor({ promptManager, dynamicContentZone, escapeHtml, copyToClipboard, showToast }) {
      this.promptManager = promptManager;
      this.zone = dynamicContentZone;
      this.escapeHtml = escapeHtml;
      this.copyToClipboard = copyToClipboard;
      this.showToast = showToast;
      this.favoriteOnlyFilter = false;
    }

    render() {
      let prompts = this.promptManager.getPrompts();

      let promptsHtml = `
        <div style="display: flex; gap: 6px; align-items: center;">
          <input type="text" class="fibo-input" id="promptSearchInput" placeholder="🔍 Search prompts..." />
          <button class="fibo-btn fibo-btn-sm ${this.favoriteOnlyFilter ? 'fibo-btn-accent' : 'fibo-btn-secondary'}" id="favFilterBtn" title="Toggle favorites filter">⭐</button>
        </div>
        <button class="fibo-btn fibo-btn-accent" id="createPromptBtn">➕ Create New Prompt</button>
        <div class="fibo-prompt-list" id="promptListContainer">
      `;

      let filteredPrompts = prompts.filter(p => {
        if (this.favoriteOnlyFilter && !p.isFavorite) return false;
        return true;
      });

      if (filteredPrompts.length === 0) {
        promptsHtml += `<div class="fibo-status" style="margin-top: 10px;">No prompts found. Click "Create New Prompt" to start!</div>`;
      } else {
        filteredPrompts.forEach((p) => {
          const safeName = this.escapeHtml(p.name);
          promptsHtml += `
            <div class="fibo-prompt-card" data-prompt-id="${p.id}">
              <div class="fibo-prompt-card-header">
                <span class="fibo-prompt-title" data-action="open-prompt" data-id="${p.id}" style="cursor: pointer; text-decoration: underline;" title="Click to view & edit prompt">${safeName}</span>
                <button class="fibo-btn fibo-btn-sm fibo-btn-icon" data-action="copy-prompt" data-id="${p.id}" title="Quick Copy">📋</button>
              </div>
          `;

          if (p.variants && p.variants.length > 0) {
            promptsHtml += `<div class="fibo-variant-list">`;
            p.variants.forEach((v) => {
              if (this.favoriteOnlyFilter && !v.isFavorite) return;
              const safeVName = this.escapeHtml(v.name);
              const isAppend = v.type === 'append';

              promptsHtml += `
                <div class="fibo-variant-card" data-variant-id="${v.id}">
                  <div class="fibo-prompt-card-header">
                    <span class="fibo-prompt-title" data-action="open-variant" data-pid="${p.id}" data-vid="${v.id}" style="font-size: 10px; cursor: pointer; text-decoration: underline;" title="Click to view & edit variant">${safeVName}</span>
                    <span class="fibo-badge-tag">${isAppend ? 'append' : 'edit'}</span>
                    <button class="fibo-btn fibo-btn-sm fibo-btn-icon" data-action="copy-variant" data-pid="${p.id}" data-vid="${v.id}" title="Quick Copy Variant">📋</button>
                  </div>
                </div>
              `;
            });
            promptsHtml += `</div>`;
          }

          promptsHtml += `</div>`;
        });
      }

      promptsHtml += `</div>`;
      this.zone.innerHTML = promptsHtml;

      const promptSearchInput = this.zone.querySelector('#promptSearchInput');
      promptSearchInput.oninput = (evt) => {
        const q = evt.target.value.toLowerCase().trim();
        const cards = this.zone.querySelectorAll('.fibo-prompt-card');
        cards.forEach(card => {
          const text = card.innerText.toLowerCase();
          card.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
        });
      };

      this.zone.querySelector('#favFilterBtn').onclick = () => {
        this.favoriteOnlyFilter = !this.favoriteOnlyFilter;
        this.render();
      };

      this.zone.querySelector('#createPromptBtn').onclick = () => {
        this.renderEditor();
      };

      this.zone.querySelectorAll('[data-action]').forEach(btn => {
        btn.onclick = async (evt) => {
          const action = btn.getAttribute('data-action');
          const pid = btn.getAttribute('data-id') || btn.getAttribute('data-pid');
          const vid = btn.getAttribute('data-vid');

          if (action === 'copy-prompt') {
            const p = this.promptManager.getPrompts().find(x => x.id === pid);
            if (p) await this.copyToClipboard(this.promptManager.getComputedText(p));
          } else if (action === 'copy-variant') {
            const p = this.promptManager.getPrompts().find(x => x.id === pid);
            if (p) {
              const v = p.variants ? p.variants.find(x => x.id === vid) : null;
              if (v) await this.copyToClipboard(this.promptManager.getComputedText(p, v));
            }
          } else if (action === 'open-prompt') {
            const p = this.promptManager.getPrompts().find(x => x.id === pid);
            if (p) this.renderEditor(p);
          } else if (action === 'open-variant') {
            const p = this.promptManager.getPrompts().find(x => x.id === pid);
            if (p) {
              const v = p.variants ? p.variants.find(x => x.id === vid) : null;
              if (v) this.renderVariantEditor(pid, v);
            }
          }
        };
      });
    }

    renderEditor(existingPrompt = null) {
      const isEdit = !!existingPrompt;
      let promptFav = isEdit ? existingPrompt.isFavorite : false;

      this.zone.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="fibo-title" style="font-size: 12px;">${isEdit ? '✏️ Prompt Detail' : '➕ Create New Prompt'}</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="fibo-fav-btn ${promptFav ? 'active' : ''}" id="topFavBtn" title="Toggle favorite (Set/Unset)" style="font-size: 16px;">★</button>
              ${isEdit ? `<button class="fibo-btn fibo-btn-sm" id="topCopyBtn" title="Copy Prompt Text">📋 Copy</button>` : ''}
            </div>
          </div>

          <input type="text" class="fibo-input" id="pNameInput" placeholder="Prompt Name" value="${isEdit ? this.escapeHtml(existingPrompt.name) : ''}" />
          <textarea class="fibo-textarea" id="pContentInput" placeholder="Enter prompt text here...">${isEdit ? this.escapeHtml(existingPrompt.content) : ''}</textarea>

          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="fibo-btn fibo-btn-sm" id="savePromptBtn" style="background: #a6e3a1; flex: 1;">Save</button>
            ${isEdit ? `<button class="fibo-btn fibo-btn-sm fibo-btn-accent" id="addVariantBtn" style="flex: 1;">+ Variant</button>` : ''}
            ${isEdit ? `<button class="fibo-btn fibo-btn-sm fibo-btn-danger" id="deletePromptBtn">Delete</button>` : ''}
            <button class="fibo-btn fibo-btn-sm fibo-btn-secondary" id="cancelPromptBtn">Cancel</button>
          </div>
        </div>
      `;

      const topFavBtn = this.zone.querySelector('#topFavBtn');
      topFavBtn.onclick = async () => {
        promptFav = !promptFav;
        topFavBtn.classList.toggle('active', promptFav);
        if (isEdit) {
          await this.promptManager.toggleFavorite(existingPrompt.id);
        }
      };

      if (isEdit) {
        this.zone.querySelector('#topCopyBtn').onclick = async () => {
          await this.copyToClipboard(this.promptManager.getComputedText(existingPrompt));
        };

        this.zone.querySelector('#addVariantBtn').onclick = () => {
          this.renderVariantEditor(existingPrompt.id);
        };

        this.zone.querySelector('#deletePromptBtn').onclick = async () => {
          if (confirm('Delete this prompt and all its variants?')) {
            await this.promptManager.deletePrompt(existingPrompt.id);
            this.render();
          }
        };
      }

      this.zone.querySelector('#cancelPromptBtn').onclick = () => this.render();

      this.zone.querySelector('#savePromptBtn').onclick = async () => {
        const name = this.zone.querySelector('#pNameInput').value;
        const content = this.zone.querySelector('#pContentInput').value;
        if (!name.trim() || !content.trim()) {
          this.showToast('⚠️ Name and content required');
          return;
        }
        if (isEdit) {
          await this.promptManager.updatePrompt(existingPrompt.id, name, content);
        } else {
          const created = await this.promptManager.addPrompt(name, content);
          if (promptFav) {
            await this.promptManager.toggleFavorite(created.id);
          }
        }
        this.render();
      };
    }

    renderVariantEditor(promptId, existingVariant = null) {
      const isEdit = !!existingVariant;
      const parentPrompt = this.promptManager.getPrompts().find(p => p.id === promptId);
      if (!parentPrompt) return this.render();

      let variantFav = isEdit ? existingVariant.isFavorite : false;
      const initialType = isEdit ? existingVariant.type : 'append';

      this.zone.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="fibo-title" style="font-size: 11px;">${isEdit ? '✏️ Variant Detail' : '➕ Create Variant'} for "${this.escapeHtml(parentPrompt.name)}"</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button class="fibo-fav-btn ${variantFav ? 'active' : ''}" id="vTopFavBtn" title="Toggle favorite (Set/Unset)" style="font-size: 16px;">★</button>
              ${isEdit ? `<button class="fibo-btn fibo-btn-sm" id="vTopCopyBtn" title="Copy Variant Prompt">📋 Copy</button>` : ''}
            </div>
          </div>

          <input type="text" class="fibo-input" id="vNameInput" placeholder="Variant Name" value="${isEdit ? this.escapeHtml(existingVariant.name) : ''}" />

          <div class="fibo-option-row">
            <label class="fibo-checkbox-label">
              Variant Type:
              <select class="fibo-change-type-select" id="vTypeSelect" ${isEdit ? 'disabled' : ''}>
                <option value="append" ${initialType === 'append' ? 'selected' : ''}>Append (Inherits main prompt & appends text)</option>
                <option value="edit" ${initialType === 'edit' ? 'selected' : ''}>Edit (Independent rewritten copy)</option>
              </select>
            </label>
          </div>

          <div id="vTextHolder" style="display: flex; flex-direction: column; gap: 4px;">
            <!-- Textarea container -->
          </div>

          <div style="display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="fibo-btn fibo-btn-sm" id="saveVariantBtn" style="background: #a6e3a1; flex: 1;">Save Variant</button>
            ${isEdit ? `<button class="fibo-btn fibo-btn-sm fibo-btn-danger" id="deleteVariantBtn">Delete</button>` : ''}
            <button class="fibo-btn fibo-btn-sm fibo-btn-secondary" id="cancelVariantBtn">Cancel</button>
          </div>
        </div>
      `;

      const vTopFavBtn = this.zone.querySelector('#vTopFavBtn');
      vTopFavBtn.onclick = async () => {
        variantFav = !variantFav;
        vTopFavBtn.classList.toggle('active', variantFav);
        if (isEdit) {
          await this.promptManager.toggleVariantFavorite(promptId, existingVariant.id);
        }
      };

      if (isEdit) {
        this.zone.querySelector('#vTopCopyBtn').onclick = async () => {
          await this.copyToClipboard(this.promptManager.getComputedText(parentPrompt, existingVariant));
        };

        this.zone.querySelector('#deleteVariantBtn').onclick = async () => {
          if (confirm('Delete this variant?')) {
            await this.promptManager.deleteVariant(promptId, existingVariant.id);
            this.render();
          }
        };
      }

      const vTypeSelect = this.zone.querySelector('#vTypeSelect');
      const vTextHolder = this.zone.querySelector('#vTextHolder');

      const updateTextHolder = () => {
        const selectedType = vTypeSelect.value;
        if (selectedType === 'append') {
          const val = isEdit ? (existingVariant.addition || '') : '';
          vTextHolder.innerHTML = `
            <span class="fibo-hint">Text below will be appended to main prompt:</span>
            <textarea class="fibo-textarea" id="vTextInput" placeholder="Enter text to append...">${this.escapeHtml(val)}</textarea>
          `;
        } else {
          const val = isEdit ? (existingVariant.content || '') : parentPrompt.content;
          vTextHolder.innerHTML = `
            <span class="fibo-hint">Full independent prompt override:</span>
            <textarea class="fibo-textarea" id="vTextInput" placeholder="Enter rewritten prompt text...">${this.escapeHtml(val)}</textarea>
          `;
        }
      };

      vTypeSelect.onchange = updateTextHolder;
      updateTextHolder();

      this.zone.querySelector('#cancelVariantBtn').onclick = () => this.render();

      this.zone.querySelector('#saveVariantBtn').onclick = async () => {
        const name = this.zone.querySelector('#vNameInput').value;
        const type = vTypeSelect.value;
        const textVal = this.zone.querySelector('#vTextInput').value;

        if (!name.trim()) {
          this.showToast('⚠️ Variant name required');
          return;
        }

        const payload = type === 'append' ? { addition: textVal } : { content: textVal };

        if (isEdit) {
          await this.promptManager.updateVariant(promptId, existingVariant.id, name, payload);
        } else {
          const created = await this.promptManager.addVariant(promptId, name, type, payload);
          if (variantFav && created) {
            await this.promptManager.toggleVariantFavorite(promptId, created.id);
          }
        }
        this.render();
      };
    }
  };
}
