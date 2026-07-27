// content.js
// Gemini 3.6 Flash | Staging & Prompt UI Layout Tweaks | 2026-07-28

window.fiboPanelInstance = window.fiboPanelInstance || null;
window.isPushedOpen = window.isPushedOpen || false;

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

function bootstrapFibo() {
  if (window.fiboPanelInstance) return; 

  const bus = new window.EventBus();
  const picker = new window.FilePicker(bus);
  const processor = new window.ZipProcessor(bus);
  const promptManager = new window.PromptManager(bus);

  const uiContainer = document.createElement('div');
  uiContainer.id = 'fibo-zip-drop-root';
  uiContainer.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; z-index: 2147483647 !important; display: block !important; border: none !important; margin: 0 !important; padding: 0 !important;';

  const shadow = uiContainer.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .fibo-sidebar {
      position: fixed; top: 0; right: -360px; bottom: 0; z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif; font-size: 13px;
      background: #1e1e2e; color: #cdd6f4; border-left: 1px solid #45475a;
      width: 300px; padding: 18px; display: flex; flex-direction: column; gap: 10px;
      box-shadow: -4px 0 24px rgba(0,0,0,0.4); transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      visibility: visible !important; opacity: 1 !important; pointer-events: auto !important;
    }
    .fibo-sidebar.open { right: 0 !important; }
    .fibo-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #45475a; padding-bottom: 10px; }
    .fibo-title { font-weight: bold; font-size: 14px; color: #f5e0dc; }
    .fibo-close { background: none; border: none; color: #a6adc8; cursor: pointer; font-size: 16px; }
    
    .fibo-nav { display: flex; gap: 4px; background: #181825; padding: 4px; border-radius: 6px; border: 1px solid #45475a; }
    .fibo-nav-btn {
      flex: 1; background: transparent; border: none; color: #a6adc8; padding: 6px 4px;
      border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; text-align: center;
    }
    .fibo-nav-btn.active { background: #313244; color: #89b4fa; }

    .fibo-option-row {
      display: flex; align-items: center; gap: 6px; font-size: 11px; color: #a6adc8;
      background: #181825; padding: 5px 8px; border-radius: 6px; border: 1px solid #313244;
    }
    .fibo-checkbox-label {
      display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; width: 100%;
    }

    .fibo-btn {
      width: 100%; background: #89b4fa; color: #11111b; border: none;
      padding: 8px 10px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 12px;
    }
    .fibo-btn:hover { background: #b4befe; }
    .fibo-btn-secondary { background: #45475a; color: #cdd6f4; }
    .fibo-btn-secondary:hover { background: #585b70; }
    .fibo-btn-sm { padding: 4px 8px; font-size: 10px; border-radius: 4px; }
    .fibo-btn-icon { width: auto !important; padding: 2px 6px !important; flex-shrink: 0 !important; font-size: 11px; }
    .fibo-btn-accent { background: #cba6f7; color: #11111b; }
    .fibo-btn-danger { background: #f38ba8; color: #11111b; }

    .fibo-status { font-size: 11px; color: #a6adc8; text-align: center; line-height: 1.4; word-break: break-word; }
    
    .fibo-dropzone {
      border: 2px dashed #45475a; border-radius: 8px; flex-grow: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; color: #a6adc8; transition: 0.2s; min-height: 140px; cursor: pointer;
    }
    .fibo-dropzone:hover { border-color: #89b4fa; color: #89b4fa; background: rgba(137, 180, 250, 0.05); }
    .fibo-dropzone.active { border-color: #a6e3a1; background: rgba(166, 227, 161, 0.1); color: #a6e3a1; }
    .fibo-hint { font-size: 10px; color: #6c7086; margin-top: 4px; }

    .fibo-textarea {
      width: 100%; flex-grow: 1; min-height: 120px; background: #181825; color: #cdd6f4;
      border: 1px solid #45475a; border-radius: 6px; padding: 8px; font-family: monospace;
      font-size: 11px; resize: none; box-sizing: border-box; outline: none;
    }
    .fibo-textarea:focus { border-color: #89b4fa; }

    .fibo-input {
      width: 100%; background: #181825; color: #cdd6f4; border: 1px solid #45475a;
      border-radius: 4px; padding: 6px 8px; font-size: 11px; outline: none; box-sizing: border-box;
    }
    .fibo-input:focus { border-color: #89b4fa; }

    .fibo-file-list {
      flex-grow: 1; overflow-y: auto; background: #181825;
      border: 1px solid #45475a; border-radius: 6px; padding: 8px;
      display: flex; flex-direction: column; gap: 8px; max-height: 38vh;
    }
    .fibo-file-item {
      display: flex; flex-direction: column; gap: 4px; background: #313244;
      padding: 6px 8px; border-radius: 4px; border: 1px solid #45475a;
    }
    .fibo-file-header-row {
      display: flex; align-items: center; justify-content: space-between; gap: 4px;
    }
    .fibo-file-info {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      flex-grow: 1; min-width: 0; font-size: 11px; color: #cdd6f4; cursor: pointer; text-decoration: underline;
    }
    .fibo-file-info:hover { color: #89b4fa; }
    .fibo-change-type-select {
      background: #181825; color: #cdd6f4; border: 1px solid #45475a;
      border-radius: 4px; font-size: 9px; padding: 1px 3px; outline: none; cursor: pointer;
      max-width: 68px; flex-shrink: 0; text-overflow: ellipsis;
    }
    .fibo-change-type-select:focus { border-color: #89b4fa; }

    .fibo-inline-edit-panel {
      display: flex; flex-direction: column; gap: 6px; background: #181825;
      padding: 8px; border-radius: 4px; border: 1px dashed #89b4fa; margin-top: 4px;
    }

    .fibo-badge-new {
      background: #a6e3a1; color: #11111b; font-size: 9px;
      font-weight: bold; padding: 2px 5px; border-radius: 4px; text-transform: uppercase; flex-shrink: 0;
    }
    .fibo-badge-root {
      background: #f9e2af; color: #11111b; font-size: 9px;
      font-weight: bold; padding: 2px 5px; border-radius: 4px; text-transform: uppercase; flex-shrink: 0;
    }
    .fibo-badge-tag {
      background: #cba6f7; color: #11111b; font-size: 9px; font-weight: bold;
      padding: 1px 4px; border-radius: 3px; text-transform: uppercase; flex-shrink: 0;
    }

    .fibo-prompt-list {
      flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column;
      gap: 6px; max-height: 48vh; padding-right: 2px;
    }
    .fibo-prompt-card {
      background: #282936; border: 1px solid #45475a; border-radius: 6px;
      padding: 6px 8px; display: flex; flex-direction: column; gap: 4px;
    }
    .fibo-prompt-card-header {
      display: flex; align-items: center; justify-content: space-between; gap: 6px;
    }
    .fibo-prompt-title {
      font-weight: bold; font-size: 11px; color: #f5e0dc; flex-grow: 1;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
    }
    
    .fibo-variant-list {
      display: flex; flex-direction: column; gap: 4px; margin-left: 8px;
      border-left: 2px solid #45475a; padding-left: 6px; margin-top: 2px;
    }
    .fibo-variant-card {
      background: #1e1e2e; border: 1px solid #313244; border-radius: 4px;
      padding: 4px 6px; display: flex; flex-direction: column; gap: 2px;
    }

    .fibo-fav-btn {
      background: none; border: none; cursor: pointer; font-size: 14px; color: #6c7086; padding: 0 2px; transition: 0.2s;
    }
    .fibo-fav-btn.active { color: #f9e2af; }

    .fibo-toast {
      position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
      background: #a6e3a1; color: #11111b; font-size: 10px; font-weight: bold;
      padding: 4px 10px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10;
    }

    .fibo-progress-track {
      width: 100%; height: 8px; background: #181825; border-radius: 4px;
      overflow: hidden; border: 1px solid #45475a; margin-top: 6px;
    }
    .fibo-progress-fill {
      height: 100%; background: #a6e3a1; width: 0%; transition: width 0.1s linear;
    }
    .fibo-log-box {
      font-family: monospace; font-size: 10px; background: #11111b;
      border: 1px solid #45475a; border-radius: 6px; padding: 8px;
      max-height: 130px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
    }
    .fibo-log-success { color: #a6e3a1; }
    .fibo-log-fail { color: #f38ba8; }
  `;

  window.fiboPanelInstance = document.createElement('div');
  window.fiboPanelInstance.className = 'fibo-sidebar';
  window.fiboPanelInstance.innerHTML = `
    <div class="fibo-header">
      <span class="fibo-title">Fibo Zip Drop</span>
      <button class="fibo-close" id="closeBtn">✕</button>
    </div>
    <button class="fibo-btn" id="connectBtn">📁 Connect Local Dir</button>
    <div class="fibo-status" id="statusText">System Unbound</div>
    
    <div class="fibo-nav">
      <button class="fibo-nav-btn active" id="modeFileBtn">📦 File/ZIP</button>
      <button class="fibo-nav-btn" id="modeTextBtn">📝 Text</button>
      <button class="fibo-nav-btn" id="modePromptsBtn">💬 Prompts</button>
    </div>

    <div class="fibo-option-row" id="autoLogRow">
      <label class="fibo-checkbox-label">
        <input type="checkbox" id="autoLogToggle" /> Auto-log to /FZFDlog
      </label>
    </div>
    <div class="fibo-option-row" id="emitEventsRow">
      <label class="fibo-checkbox-label">
        <input type="checkbox" id="emitEventsToggle" /> Emit Event JSON to /events
      </label>
    </div>

    <div id="dynamicContentZone" style="display: flex; flex-direction: column; flex-grow: 1; gap: 10px; position: relative;">
      <!-- Dynamic view content -->
    </div>
    <input type="file" id="hiddenFileInput" multiple style="display: none;" />
  `;

  shadow.appendChild(style);
  shadow.appendChild(window.fiboPanelInstance);

  const parentContainer = document.body || document.documentElement;
  if (parentContainer) {
    parentContainer.appendChild(uiContainer);
  }

  promptManager.init().catch(err => console.error("PromptManager Init Error:", err));

  const connectBtn = window.fiboPanelInstance.querySelector('#connectBtn');
  const statusText = window.fiboPanelInstance.querySelector('#statusText');
  const closeBtn = window.fiboPanelInstance.querySelector('#closeBtn');
  const hiddenFileInput = window.fiboPanelInstance.querySelector('#hiddenFileInput');
  const dynamicContentZone = window.fiboPanelInstance.querySelector('#dynamicContentZone');
  const modeFileBtn = window.fiboPanelInstance.querySelector('#modeFileBtn');
  const modeTextBtn = window.fiboPanelInstance.querySelector('#modeTextBtn');
  const modePromptsBtn = window.fiboPanelInstance.querySelector('#modePromptsBtn');
  const autoLogToggle = window.fiboPanelInstance.querySelector('#autoLogToggle');
  const emitEventsToggle = window.fiboPanelInstance.querySelector('#emitEventsToggle');
  const autoLogRow = window.fiboPanelInstance.querySelector('#autoLogRow');
  const emitEventsRow = window.fiboPanelInstance.querySelector('#emitEventsRow');

  const savedAutoLog = localStorage.getItem('fzfd_auto_log');
  autoLogToggle.checked = savedAutoLog === null ? true : savedAutoLog === 'true';
  autoLogToggle.onchange = (e) => localStorage.setItem('fzfd_auto_log', e.target.checked);

  const savedEmitEvents = localStorage.getItem('fzfd_emit_events');
  emitEventsToggle.checked = savedEmitEvents === null ? true : savedEmitEvents === 'true';
  emitEventsToggle.onchange = (e) => localStorage.setItem('fzfd_emit_events', e.target.checked);

  let currentMode = 'FILE';
  let activeInlineEditIndex = null;
  let favoriteOnlyFilter = false;

  const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'fibo-toast';
    toast.innerText = msg;
    dynamicContentZone.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  };

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const helperArea = document.createElement('textarea');
        helperArea.value = text;
        helperArea.style.position = 'fixed';
        helperArea.style.opacity = '0';
        shadow.appendChild(helperArea);
        helperArea.focus();
        helperArea.select();
        document.execCommand('copy');
        helperArea.remove();
      }
      showToast('📋 Copied to clipboard!');
    } catch (err) {
      console.error('Fibo Copy Error:', err);
      showToast('🚨 Copy failed!');
    }
  };

  const renderFileModeView = () => {
    processor.clearState();
    currentMode = 'FILE';
    modeFileBtn.classList.add('active');
    modeTextBtn.classList.remove('active');
    modePromptsBtn.classList.remove('active');
    autoLogRow.style.display = 'flex';
    emitEventsRow.style.display = 'flex';

    dynamicContentZone.innerHTML = `
      <div class="fibo-dropzone" id="dropZone">
        <span>Slide File or ZIP Here</span>
        <span class="fibo-hint">(or click to browse local files)</span>
      </div>
    `;

    const dropZone = dynamicContentZone.querySelector('#dropZone');
    dropZone.onclick = () => hiddenFileInput.click();
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('active'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('active');
      if (e.dataTransfer.files.length > 0) {
        await processInputFiles(Array.from(e.dataTransfer.files));
      }
    });
  };

  const renderTextModeView = () => {
    processor.clearState();
    currentMode = 'TEXT';
    modeTextBtn.classList.add('active');
    modeFileBtn.classList.remove('active');
    modePromptsBtn.classList.remove('active');
    autoLogRow.style.display = 'flex';
    emitEventsRow.style.display = 'flex';

    dynamicContentZone.innerHTML = `
      <textarea class="fibo-textarea" id="rawTextArea" placeholder="// path/to/file.js&#10;// Gemini 3.6 | FZFD Header & Log Stamp | 2026-07-27&#10;// feature: phase4-grimoire-dragon-astral&#10;console.log('Paste code here...');"></textarea>
      <button class="fibo-btn" id="stageTextBtn" style="background: #cba6f7;">⚡ Analyze Raw Text</button>
    `;

    dynamicContentZone.querySelector('#stageTextBtn').onclick = async () => {
      const text = dynamicContentZone.querySelector('#rawTextArea').value;
      if (!await checkWorkspacePermission()) return;
      await processor.stageRawText(text, picker.directoryHandle);
    };
  };

  const renderPromptsModeView = () => {
    currentMode = 'PROMPTS';
    modePromptsBtn.classList.add('active');
    modeFileBtn.classList.remove('active');
    modeTextBtn.classList.remove('active');
    autoLogRow.style.display = 'none';
    emitEventsRow.style.display = 'none';

    let prompts = promptManager.getPrompts();

    let promptsHtml = `
      <div style="display: flex; gap: 6px; align-items: center;">
        <input type="text" class="fibo-input" id="promptSearchInput" placeholder="🔍 Search prompts..." />
        <button class="fibo-btn fibo-btn-sm ${favoriteOnlyFilter ? 'fibo-btn-accent' : 'fibo-btn-secondary'}" id="favFilterBtn" title="Toggle favorites filter">⭐</button>
      </div>
      <button class="fibo-btn fibo-btn-accent" id="createPromptBtn">➕ Create New Prompt</button>
      <div class="fibo-prompt-list" id="promptListContainer">
    `;

    let filteredPrompts = prompts.filter(p => {
      if (favoriteOnlyFilter && !p.isFavorite) return false;
      return true;
    });

    if (filteredPrompts.length === 0) {
      promptsHtml += `<div class="fibo-status" style="margin-top: 10px;">No prompts found. Click "Create New Prompt" to start!</div>`;
    } else {
      filteredPrompts.forEach((p) => {
        const safeName = escapeHtml(p.name);
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
            if (favoriteOnlyFilter && !v.isFavorite) return;
            const safeVName = escapeHtml(v.name);
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
    dynamicContentZone.innerHTML = promptsHtml;

    const promptSearchInput = dynamicContentZone.querySelector('#promptSearchInput');
    promptSearchInput.oninput = (evt) => {
      const q = evt.target.value.toLowerCase().trim();
      const cards = dynamicContentZone.querySelectorAll('.fibo-prompt-card');
      cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
      });
    };

    dynamicContentZone.querySelector('#favFilterBtn').onclick = () => {
      favoriteOnlyFilter = !favoriteOnlyFilter;
      renderPromptsModeView();
    };

    dynamicContentZone.querySelector('#createPromptBtn').onclick = () => {
      renderPromptEditorModal();
    };

    dynamicContentZone.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = async (evt) => {
        const action = btn.getAttribute('data-action');
        const pid = btn.getAttribute('data-id') || btn.getAttribute('data-pid');
        const vid = btn.getAttribute('data-vid');

        if (action === 'copy-prompt') {
          const p = promptManager.getPrompts().find(x => x.id === pid);
          if (p) await copyToClipboard(promptManager.getComputedText(p));
        } else if (action === 'copy-variant') {
          const p = promptManager.getPrompts().find(x => x.id === pid);
          if (p) {
            const v = p.variants ? p.variants.find(x => x.id === vid) : null;
            if (v) await copyToClipboard(promptManager.getComputedText(p, v));
          }
        } else if (action === 'open-prompt') {
          const p = promptManager.getPrompts().find(x => x.id === pid);
          if (p) renderPromptEditorModal(p);
        } else if (action === 'open-variant') {
          const p = promptManager.getPrompts().find(x => x.id === pid);
          if (p) {
            const v = p.variants ? p.variants.find(x => x.id === vid) : null;
            if (v) renderVariantEditorModal(pid, v);
          }
        }
      };
    });
  };

  const renderPromptEditorModal = (existingPrompt = null) => {
    const isEdit = !!existingPrompt;
    let promptFav = isEdit ? existingPrompt.isFavorite : false;

    dynamicContentZone.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="fibo-title" style="font-size: 12px;">${isEdit ? '✏️ Prompt Detail' : '➕ Create New Prompt'}</span>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button class="fibo-fav-btn ${promptFav ? 'active' : ''}" id="topFavBtn" title="Toggle favorite (Set/Unset)" style="font-size: 16px;">★</button>
            ${isEdit ? `<button class="fibo-btn fibo-btn-sm" id="topCopyBtn" title="Copy Prompt Text">📋 Copy</button>` : ''}
          </div>
        </div>

        <input type="text" class="fibo-input" id="pNameInput" placeholder="Prompt Name" value="${isEdit ? escapeHtml(existingPrompt.name) : ''}" />
        <textarea class="fibo-textarea" id="pContentInput" placeholder="Enter prompt text here...">${isEdit ? escapeHtml(existingPrompt.content) : ''}</textarea>

        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
          <button class="fibo-btn fibo-btn-sm" id="savePromptBtn" style="background: #a6e3a1; flex: 1;">Save</button>
          ${isEdit ? `<button class="fibo-btn fibo-btn-sm fibo-btn-accent" id="addVariantBtn" style="flex: 1;">+ Variant</button>` : ''}
          ${isEdit ? `<button class="fibo-btn fibo-btn-sm fibo-btn-danger" id="deletePromptBtn">Delete</button>` : ''}
          <button class="fibo-btn fibo-btn-sm fibo-btn-secondary" id="cancelPromptBtn">Cancel</button>
        </div>
      </div>
    `;

    const topFavBtn = dynamicContentZone.querySelector('#topFavBtn');
    topFavBtn.onclick = async () => {
      promptFav = !promptFav;
      topFavBtn.classList.toggle('active', promptFav);
      if (isEdit) {
        await promptManager.toggleFavorite(existingPrompt.id);
      }
    };

    if (isEdit) {
      dynamicContentZone.querySelector('#topCopyBtn').onclick = async () => {
        await copyToClipboard(promptManager.getComputedText(existingPrompt));
      };

      dynamicContentZone.querySelector('#addVariantBtn').onclick = () => {
        renderVariantEditorModal(existingPrompt.id);
      };

      dynamicContentZone.querySelector('#deletePromptBtn').onclick = async () => {
        if (confirm('Delete this prompt and all its variants?')) {
          await promptManager.deletePrompt(existingPrompt.id);
          renderPromptsModeView();
        }
      };
    }

    dynamicContentZone.querySelector('#cancelPromptBtn').onclick = () => renderPromptsModeView();

    dynamicContentZone.querySelector('#savePromptBtn').onclick = async () => {
      const name = dynamicContentZone.querySelector('#pNameInput').value;
      const content = dynamicContentZone.querySelector('#pContentInput').value;
      if (!name.trim() || !content.trim()) {
        showToast('⚠️ Name and content required');
        return;
      }
      if (isEdit) {
        await promptManager.updatePrompt(existingPrompt.id, name, content);
      } else {
        const created = await promptManager.addPrompt(name, content);
        if (promptFav) {
          await promptManager.toggleFavorite(created.id);
        }
      }
      renderPromptsModeView();
    };
  };

  const renderVariantEditorModal = (promptId, existingVariant = null) => {
    const isEdit = !!existingVariant;
    const parentPrompt = promptManager.getPrompts().find(p => p.id === promptId);
    if (!parentPrompt) return renderPromptsModeView();

    let variantFav = isEdit ? existingVariant.isFavorite : false;
    const initialType = isEdit ? existingVariant.type : 'append';

    dynamicContentZone.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="fibo-title" style="font-size: 11px;">${isEdit ? '✏️ Variant Detail' : '➕ Create Variant'} for "${escapeHtml(parentPrompt.name)}"</span>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button class="fibo-fav-btn ${variantFav ? 'active' : ''}" id="vTopFavBtn" title="Toggle favorite (Set/Unset)" style="font-size: 16px;">★</button>
            ${isEdit ? `<button class="fibo-btn fibo-btn-sm" id="vTopCopyBtn" title="Copy Variant Prompt">📋 Copy</button>` : ''}
          </div>
        </div>

        <input type="text" class="fibo-input" id="vNameInput" placeholder="Variant Name" value="${isEdit ? escapeHtml(existingVariant.name) : ''}" />
        
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

    const vTopFavBtn = dynamicContentZone.querySelector('#vTopFavBtn');
    vTopFavBtn.onclick = async () => {
      variantFav = !variantFav;
      vTopFavBtn.classList.toggle('active', variantFav);
      if (isEdit) {
        await promptManager.toggleVariantFavorite(promptId, existingVariant.id);
      }
    };

    if (isEdit) {
      dynamicContentZone.querySelector('#vTopCopyBtn').onclick = async () => {
        await copyToClipboard(promptManager.getComputedText(parentPrompt, existingVariant));
      };

      dynamicContentZone.querySelector('#deleteVariantBtn').onclick = async () => {
        if (confirm('Delete this variant?')) {
          await promptManager.deleteVariant(promptId, existingVariant.id);
          renderPromptsModeView();
        }
      };
    }

    const vTypeSelect = dynamicContentZone.querySelector('#vTypeSelect');
    const vTextHolder = dynamicContentZone.querySelector('#vTextHolder');

    const updateTextHolder = () => {
      const selectedType = vTypeSelect.value;
      if (selectedType === 'append') {
        const val = isEdit ? (existingVariant.addition || '') : '';
        vTextHolder.innerHTML = `
          <span class="fibo-hint">Text below will be appended to main prompt:</span>
          <textarea class="fibo-textarea" id="vTextInput" placeholder="Enter text to append...">${escapeHtml(val)}</textarea>
        `;
      } else {
        const val = isEdit ? (existingVariant.content || '') : parentPrompt.content;
        vTextHolder.innerHTML = `
          <span class="fibo-hint">Full independent prompt override:</span>
          <textarea class="fibo-textarea" id="vTextInput" placeholder="Enter rewritten prompt text...">${escapeHtml(val)}</textarea>
        `;
      }
    };

    vTypeSelect.onchange = updateTextHolder;
    updateTextHolder();

    dynamicContentZone.querySelector('#cancelVariantBtn').onclick = () => renderPromptsModeView();

    dynamicContentZone.querySelector('#saveVariantBtn').onclick = async () => {
      const name = dynamicContentZone.querySelector('#vNameInput').value;
      const type = vTypeSelect.value;
      const textVal = dynamicContentZone.querySelector('#vTextInput').value;

      if (!name.trim()) {
        showToast('⚠️ Variant name required');
        return;
      }

      const payload = type === 'append' ? { addition: textVal } : { content: textVal };

      if (isEdit) {
        await promptManager.updateVariant(promptId, existingVariant.id, name, payload);
      } else {
        const created = await promptManager.addVariant(promptId, name, type, payload);
        if (variantFav && created) {
          await promptManager.toggleVariantFavorite(promptId, created.id);
        }
      }
      renderPromptsModeView();
    };
  };

  const checkWorkspacePermission = async () => {
    if (!picker.directoryHandle) {
      statusText.innerHTML = "<span style='color: #f38ba8;'>⚠️ Attach target folder first!</span>";
      return false;
    }
    const hasPerm = await picker.verifyPermission(true);
    if (!hasPerm) {
      statusText.innerHTML = "<span style='color: #f38ba8;'>⚠️ Permission revoked by user</span>";
      return false;
    }
    return true;
  };

  const processInputFiles = async (filesArray) => {
    if (!await checkWorkspacePermission()) return;
    if (!filesArray || filesArray.length === 0) return;

    if (filesArray.length === 1 && filesArray[0].name.endsWith('.zip')) {
      await processor.stageZip(filesArray[0], picker.directoryHandle);
    } else {
      await processor.stageMultipleFiles(filesArray, picker.directoryHandle);
    }
  };

  connectBtn.onclick = async () => { 
    await picker.selectDirectory(); 
  };

  closeBtn.onclick = () => { 
    processor.clearState();
    handleToggle(false); 
  };

  modeFileBtn.onclick = () => { renderFileModeView(); };
  modeTextBtn.onclick = () => { renderTextModeView(); };
  modePromptsBtn.onclick = () => { renderPromptsModeView(); };

  hiddenFileInput.onchange = async (e) => {
    if (e.target.files.length > 0) {
      await processInputFiles(Array.from(e.target.files));
      hiddenFileInput.value = "";
    }
  };

  bus.subscribe('ZIP_STAGED', (e) => {
    const files = e.payload;
    statusText.innerText = `Review changes (${files.length} file${files.length > 1 ? 's' : ''}):`;
    activeInlineEditIndex = null;

    renderStagingMatrix(files);
  });

  function captureStagingUIState() {
    const state = { changeTypes: {}, checkedOverwrites: new Set(), searchQuery: '' };
    if (!dynamicContentZone) return state;

    const search = dynamicContentZone.querySelector('#stagingSearch');
    if (search) state.searchQuery = search.value;

    dynamicContentZone.querySelectorAll('.fibo-change-type-select').forEach(sel => {
      state.changeTypes[sel.getAttribute('data-index')] = sel.value;
    });

    dynamicContentZone.querySelectorAll('.fibo-replace-check').forEach(chk => {
      if (chk.checked) state.checkedOverwrites.add(Number(chk.getAttribute('data-index')));
    });

    return state;
  }

  function renderStagingMatrix(files, preservedState = null) {
    const previousState = preservedState || captureStagingUIState();
    const hasExistingFiles = files.some(f => f.exists);

    let listHtml = `
      ${hasExistingFiles ? `
        <div class="fibo-option-row" style="margin-bottom: 4px;">
          <label class="fibo-checkbox-label">
            <input type="checkbox" id="masterToggle" /> Select / Deselect All Overwrites
          </label>
        </div>
      ` : ''}
      <input type="text" class="fibo-input" id="stagingSearch" placeholder="🔍 Search path filters..." value="${escapeHtml(previousState.searchQuery)}" />
      <div class="fibo-file-list" id="fileListContainer">
    `;

    files.forEach((file) => {
      const isRootDefault = file.parts.length === 0;
      const escapedPath = escapeHtml(file.displayPath);
      const isEditingThis = activeInlineEditIndex === file.index;

      const { slots } = processor.extractHeaderAndBody(file.content);
      const line1 = slots.line1 || '';
      const line2 = slots.line2 || '';
      const line3 = slots.line3 || '';

      const selectedChangeType = previousState.changeTypes[file.index] || (file.exists ? 'updated' : 'new');
      const isOverwriteChecked = previousState.checkedOverwrites.has(file.index);

      listHtml += `
        <div class="fibo-file-item" data-path="${escapedPath.toLowerCase()}">
          <div class="fibo-file-header-row">
            <span class="fibo-file-info" data-action="toggle-edit" data-index="${file.index}" title="Click to edit relative path & headers">${escapedPath}</span>
            ${isRootDefault ? `<span class="fibo-badge-root">main</span>` : ''}
            
            <select class="fibo-change-type-select" data-index="${file.index}" title="Select change_type for commit">
              <option value="new" ${selectedChangeType === 'new' ? 'selected' : ''}>new</option>
              <option value="updated" ${selectedChangeType === 'updated' ? 'selected' : ''}>updated</option>
              <option value="replaced" ${selectedChangeType === 'replaced' ? 'selected' : ''}>replaced</option>
              <option value="appended" ${selectedChangeType === 'appended' ? 'selected' : ''}>append</option>
              <option value="prepended" ${selectedChangeType === 'prepended' ? 'selected' : ''}>prepend</option>
              <option value="deleted" ${selectedChangeType === 'deleted' ? 'selected' : ''}>delete</option>
            </select>

            ${file.exists 
              ? `<input type="checkbox" class="fibo-replace-check" data-index="${file.index}" ${isOverwriteChecked ? 'checked' : ''} title="File exists. Check to confirm overwrite." />`
              : `<span class="fibo-badge-new">new</span>`
            }
          </div>

          ${isEditingThis ? `
            <div class="fibo-inline-edit-panel">
              <span class="fibo-hint" style="font-weight: bold; color: #89b4fa;">Edit Path & Line Headers:</span>
              <input type="text" class="fibo-input" id="editPath_${file.index}" placeholder="Relative Path" value="${escapedPath}" />
              ${!file.isBinary ? `
                <input type="text" class="fibo-input" id="editLine1_${file.index}" placeholder="Line 1 Path Comment (e.g. // path/file.js)" value="${escapeHtml(line1)}" />
                <input type="text" class="fibo-input" id="editLine2_${file.index}" placeholder="Line 2 Session Stamp (e.g. // Model | Chat | Date)" value="${escapeHtml(line2)}" />
                <input type="text" class="fibo-input" id="editLine3_${file.index}" placeholder="Line 3 Feature Directive (e.g. // feature: id)" value="${escapeHtml(line3)}" />
              ` : '<span class="fibo-hint">(Binary file header comments disabled)</span>'}
              <div style="display: flex; gap: 4px; margin-top: 4px;">
                <button class="fibo-btn fibo-btn-sm" id="saveInlineEdit_${file.index}" style="background: #a6e3a1;">Save Changes</button>
                <button class="fibo-btn fibo-btn-sm fibo-btn-secondary" id="cancelInlineEdit">Cancel</button>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });
    listHtml += `</div>`;
    listHtml += `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button class="fibo-btn" id="sendBtn" style="background: #a6e3a1;">🚀 Send & Process</button>
        <button class="fibo-btn fibo-btn-secondary" id="cancelBtn">Cancel</button>
      </div>
    `;

    dynamicContentZone.innerHTML = listHtml;

    const masterToggle = dynamicContentZone.querySelector('#masterToggle');
    if (masterToggle) {
      masterToggle.onchange = (evt) => {
        const visibleChecks = dynamicContentZone.querySelectorAll('.fibo-replace-check');
        visibleChecks.forEach(chk => {
          const row = chk.closest('.fibo-file-item');
          if (row && row.style.display !== 'none') {
            chk.checked = evt.target.checked;
          }
        });
      };
    }

    const stagingSearch = dynamicContentZone.querySelector('#stagingSearch');
    const filterRows = () => {
      const query = stagingSearch.value.toLowerCase().trim();
      const items = dynamicContentZone.querySelectorAll('.fibo-file-item');
      items.forEach(item => {
        const pathAttr = item.getAttribute('data-path') || '';
        if (!query || pathAttr.includes(query)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    };
    stagingSearch.oninput = filterRows;
    if (previousState.searchQuery) filterRows();

    dynamicContentZone.querySelectorAll('[data-action="toggle-edit"]').forEach(btn => {
      btn.onclick = () => {
        const idx = Number(btn.getAttribute('data-index'));
        const currentState = captureStagingUIState();
        activeInlineEditIndex = activeInlineEditIndex === idx ? null : idx;
        renderStagingMatrix(processor.stagedFiles, currentState);
      };
    });

    if (activeInlineEditIndex !== null) {
      const idx = activeInlineEditIndex;
      const saveBtn = dynamicContentZone.querySelector(`#saveInlineEdit_${idx}`);
      const cancelBtn = dynamicContentZone.querySelector('#cancelInlineEdit');

      if (cancelBtn) cancelBtn.onclick = () => { 
        const currentState = captureStagingUIState();
        activeInlineEditIndex = null; 
        renderStagingMatrix(processor.stagedFiles, currentState); 
      };

      if (saveBtn) {
        saveBtn.onclick = async () => {
          const currentState = captureStagingUIState();
          const newPath = dynamicContentZone.querySelector(`#editPath_${idx}`).value;
          const line1El = dynamicContentZone.querySelector(`#editLine1_${idx}`);
          const line2El = dynamicContentZone.querySelector(`#editLine2_${idx}`);
          const line3El = dynamicContentZone.querySelector(`#editLine3_${idx}`);

          const headerLines = line1El ? {
            line1: line1El.value,
            line2: line2El ? line2El.value : null,
            line3: line3El ? line3El.value : null
          } : null;

          try {
            await processor.updateStagedFile(idx, newPath, headerLines, picker.directoryHandle);
            activeInlineEditIndex = null;
            renderStagingMatrix(processor.stagedFiles, currentState);
          } catch (err) {
            showToast(`🚨 ${err.message}`);
          }
        };
      }
    }

    dynamicContentZone.querySelector('#cancelBtn').onclick = () => {
      processor.clearState();
      resetToDefaultView();
    };

    dynamicContentZone.querySelector('#sendBtn').onclick = async () => {
      const checkedBoxes = dynamicContentZone.querySelectorAll('.fibo-replace-check');
      const changeTypeSelects = dynamicContentZone.querySelectorAll('.fibo-change-type-select');
      const approvedIndices = new Set();
      const changeTypesMap = {};

      changeTypeSelects.forEach(select => {
        const idx = Number(select.getAttribute('data-index'));
        changeTypesMap[idx] = select.value;
      });

      files.forEach((file) => {
        const userAction = changeTypesMap[file.index] || (file.exists ? 'updated' : 'new');
        if (!file.exists || ['deleted', 'appended', 'prepended'].includes(userAction)) {
          approvedIndices.add(file.index);
        }
      });

      checkedBoxes.forEach(box => {
        if (box.checked) {
          approvedIndices.add(Number(box.getAttribute('data-index')));
        }
      });

      dynamicContentZone.innerHTML = `
        <div class="fibo-status" id="writeProgressText">⚡ Initializing write stream...</div>
        <div class="fibo-progress-track">
          <div class="fibo-progress-fill" id="progressFill"></div>
        </div>
      `;
      
      const enableLogging = autoLogToggle.checked;
      const enableEvents = emitEventsToggle.checked;
      await processor.commitUpload(Array.from(approvedIndices), picker.directoryHandle, enableLogging, enableEvents, changeTypesMap);
    };
  }

  bus.subscribe('PROCESS_PROGRESS', (e) => {
    const { current, total } = e.payload;
    const progressFill = dynamicContentZone.querySelector('#progressFill');
    const writeProgressText = dynamicContentZone.querySelector('#writeProgressText');
    
    if (progressFill && writeProgressText) {
      const pct = Math.round((current / total) * 100);
      progressFill.style.width = `${pct}%`;
      writeProgressText.innerText = `⚡ Writing files: ${current} / ${total} (${pct}%)`;
    }
  });

  function resetToDefaultView() {
    statusText.innerText = picker.directoryHandle ? `Folder: ${picker.directoryHandle.name}` : "System Unbound";
    if (currentMode === 'FILE') {
      renderFileModeView();
    } else if (currentMode === 'TEXT') {
      renderTextModeView();
    } else {
      renderPromptsModeView();
    }
  }

  renderFileModeView();

  bus.subscribe('WORKSPACE_READY', (e) => {
    connectBtn.innerText = "📁 Target Bound (Click to Switch)";
    connectBtn.disabled = false;
    connectBtn.style.background = '#a6e3a1';
    statusText.innerText = `Folder: ${e.payload}`;
  });

  bus.subscribe('PROCESS_START', () => { statusText.innerText = `⚡ Analyzing input structure...`; });

  bus.subscribe('PROCESS_COMPLETE', (e) => {
    const { successCount, failCount, logs, loggingEnabled, eventsEnabled } = e.payload;
    resetToDefaultView();

    let statusColor = failCount === 0 ? '#a6e3a1' : '#f38ba8';
    let logNotes = [];
    if (loggingEnabled) logNotes.push('Log: /FZFDlog');
    if (eventsEnabled) logNotes.push('Events: /events');
    let logNoteStr = logNotes.length > 0 ? ` (${logNotes.join(' | ')})` : ' (Logging disabled)';

    statusText.innerHTML = `<span style='color: ${statusColor};'>Saved: ${successCount} | Failed: ${failCount}${logNoteStr}</span>`;

    let logHtml = `<div class="fibo-log-box">`;
    logs.forEach(log => {
      const isOk = log.status === 'SUCCESS';
      const safePath = escapeHtml(log.path);
      const safeErr = log.error ? ` (${escapeHtml(log.error)})` : '';
      const safeType = escapeHtml(log.changeType || 'updated');
      logHtml += `
        <div class="${isOk ? 'fibo-log-success' : 'fibo-log-fail'}">
          ${isOk ? '✓' : '✗'} [${safeType}] ${safePath}${safeErr}
        </div>
      `;
    });
    logHtml += `</div>`;
    logHtml += `<button class="fibo-btn" id="downloadLogBtn" style="background: #89b4fa;">📥 Download Execution Log</button>`;

    const logContainer = document.createElement('div');
    logContainer.style.cssText = "display: flex; flex-direction: column; gap: 8px;";
    logContainer.innerHTML = logHtml;
    dynamicContentZone.appendChild(logContainer);

    logContainer.querySelector('#downloadLogBtn').onclick = () => {
      const logText = logs.map(l => `[${l.status}] [${l.changeType || 'updated'}] ${l.path}${l.error ? ` - Error: ${l.error}` : ''}`).join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fibo-upload-log-${Date.now()}.txt`;
      logContainer.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  });

  bus.subscribe('PROCESS_ERROR', (e) => {
    resetToDefaultView();
    const safeError = escapeHtml(e.payload);
    statusText.innerHTML = `<span style='color: #f38ba8;'>🚨 Error: ${safeError}</span>`;
  });

  bus.subscribe('WORKSPACE_ERROR', () => {
    if (picker.directoryHandle) {
      statusText.innerText = `Folder: ${picker.directoryHandle.name}`;
    } else {
      statusText.innerText = `⚠️ Connection Aborted`;
    }
  });
}

function handleToggle(forceState) {
  window.isPushedOpen = forceState !== undefined ? forceState : !window.isPushedOpen;
  bootstrapFibo(); 

  if (window.fiboPanelInstance) {
    if (window.isPushedOpen) {
      window.fiboPanelInstance.classList.add('open');
    } else {
      window.fiboPanelInstance.classList.remove('open');
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_FIBO_PANEL") {
    handleToggle();
    sendResponse({ success: true });
  }
});