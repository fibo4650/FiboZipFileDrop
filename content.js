// content.js
// Claude Sonnet | Priority 2 & 3 Remediation | 2026-07-28

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

  const { host: uiContainer, shadow } = window.FiboShadowDOM.create();
  window.FiboStyles.inject(shadow);

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

  const toastManager = new window.FiboToastManager(dynamicContentZone);
  const showToast = (msg) => toastManager.show(msg);

  const copyToClipboard = async (text) => {
    const success = await window.FiboClipboard.copyToClipboard(text, shadow);
    showToast(success ? '📋 Copied to clipboard!' : '🚨 Copy failed!');
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

  const fileView = new window.FiboFileView({
    hiddenFileInput, dynamicContentZone,
    processInputFiles: (files) => processInputFiles(files)
  });

  const textView = new window.FiboTextView({
    processor, picker, dynamicContentZone,
    checkWorkspacePermission
  });

  const promptsView = new window.FiboPromptsView({
    promptManager, dynamicContentZone, escapeHtml, copyToClipboard, showToast
  });

  const stagingView = new window.FiboStagingView({
    processor, dynamicContentZone, escapeHtml, showToast,
    onCancel: () => resetToDefaultView(),
    onUpdateStagedFile: (index, newPath, headers) => processor.updateStagedFile(index, newPath, headers, picker.directoryHandle),
    onCommitUpload: (approvedIndices, changeTypesMap) => {
      const enableLogging = autoLogToggle.checked;
      const enableEvents = emitEventsToggle.checked;
      return processor.commitUpload(approvedIndices, picker.directoryHandle, enableLogging, enableEvents, changeTypesMap);
    }
  });

  const renderFileModeView = () => {
    processor.clearState();
    currentMode = 'FILE';
    modeFileBtn.classList.add('active');
    modeTextBtn.classList.remove('active');
    modePromptsBtn.classList.remove('active');
    autoLogRow.style.display = 'flex';
    emitEventsRow.style.display = 'flex';

    fileView.render();
  };

  const renderTextModeView = () => {
    processor.clearState();
    currentMode = 'TEXT';
    modeTextBtn.classList.add('active');
    modeFileBtn.classList.remove('active');
    modePromptsBtn.classList.remove('active');
    autoLogRow.style.display = 'flex';
    emitEventsRow.style.display = 'flex';

    textView.render();
  };

  const renderPromptsModeView = () => {
    currentMode = 'PROMPTS';
    modePromptsBtn.classList.add('active');
    modeFileBtn.classList.remove('active');
    modeTextBtn.classList.remove('active');
    autoLogRow.style.display = 'none';
    emitEventsRow.style.display = 'none';

    promptsView.render();
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
    stagingView.show(files);
  });

  bus.subscribe('PROCESS_PROGRESS', (e) => {
    const { current, total } = e.payload;
    stagingView.updateProgress(current, total);
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

  bus.subscribe('PROCESS_START', (e) => {
    statusText.innerText = `⚡ Analyzing ${e.payload || 'structure'}...`;
  });

  bus.subscribe('PROCESS_COMPLETE', (e) => {
    const { successCount, failCount, logs, loggingEnabled, eventsEnabled } = e.payload;
    resetToDefaultView();

    let statusColor = failCount === 0 ? '#a6e3a1' : '#f38ba8';
    let logNotes = [];
    if (loggingEnabled) logNotes.push('Log: /FZFDlog');
    if (eventsEnabled) logNotes.push('Events: /events');
    let logNoteStr = logNotes.length > 0 ? ` (${logNotes.join(' | ')})` : ' (Logging disabled)';

    statusText.innerHTML = `<span style='color: ${statusColor};'>Saved: ${successCount} | Failed: ${failCount}${logNoteStr}</span>`;

    stagingView.renderExecutionLog(logs);
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
