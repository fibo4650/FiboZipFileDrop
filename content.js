// content.js
// Gemini 3.6 | FZFD Header & Log Stamp | 2026-07-27

let fiboPanelInstance = null;
let isPushedOpen = false;

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
  if (fiboPanelInstance) return; 

  const bus = new EventBus();
  const picker = new FilePicker(bus);
  const processor = new ZipProcessor(bus);

  const uiContainer = document.createElement('div');
  uiContainer.id = 'fibo-zip-drop-root';
  const shadow = uiContainer.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `
    .fibo-sidebar {
      position: fixed; top: 0; right: -320px; bottom: 0; z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif; font-size: 13px;
      background: #1e1e2e; color: #cdd6f4; border-left: 1px solid #45475a;
      width: 280px; padding: 20px; display: flex; flex-direction: column; gap: 10px;
      box-shadow: -4px 0 24px rgba(0,0,0,0.4); transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .fibo-sidebar.open { right: 0; }
    .fibo-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #45475a; padding-bottom: 10px; }
    .fibo-title { font-weight: bold; font-size: 14px; color: #f5e0dc; }
    .fibo-close { background: none; border: none; color: #a6adc8; cursor: pointer; font-size: 16px; }
    
    .fibo-nav { display: flex; gap: 6px; background: #181825; padding: 4px; border-radius: 6px; border: 1px solid #45475a; }
    .fibo-nav-btn {
      flex: 1; background: transparent; border: none; color: #a6adc8; padding: 6px;
      border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer; transition: 0.2s;
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
      padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;
    }
    .fibo-btn:hover { background: #b4befe; }
    .fibo-btn-secondary { background: #45475a; color: #cdd6f4; }
    .fibo-btn-secondary:hover { background: #585b70; }

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
      width: 100%; flex-grow: 1; min-height: 140px; background: #181825; color: #cdd6f4;
      border: 1px solid #45475a; border-radius: 6px; padding: 8px; font-family: monospace;
      font-size: 11px; resize: none; box-sizing: border-box; outline: none;
    }
    .fibo-textarea:focus { border-color: #89b4fa; }

    .fibo-search-input {
      width: 100%; background: #181825; color: #cdd6f4; border: 1px solid #45475a;
      border-radius: 4px; padding: 6px 8px; font-size: 11px; outline: none; box-sizing: border-box;
    }
    .fibo-search-input:focus { border-color: #89b4fa; }

    .fibo-file-list {
      flex-grow: 1; overflow-y: auto; background: #181825;
      border: 1px solid #45475a; border-radius: 6px; padding: 8px;
      display: flex; flex-direction: column; gap: 8px; max-height: 35vh;
    }
    .fibo-file-item {
      display: flex; align-items: center; justify-content: space-between;
      gap: 6px; background: #313244; padding: 6px 8px; border-radius: 4px;
    }
    .fibo-file-info {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      flex-grow: 1; font-size: 11px; color: #cdd6f4;
    }
    .fibo-change-type-select {
      background: #181825; color: #cdd6f4; border: 1px solid #45475a;
      border-radius: 4px; font-size: 10px; padding: 2px 4px; outline: none; cursor: pointer;
    }
    .fibo-change-type-select:focus { border-color: #89b4fa; }

    .fibo-badge-new {
      background: #a6e3a1; color: #11111b; font-size: 9px;
      font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
    }
    .fibo-badge-root {
      background: #f9e2af; color: #11111b; font-size: 9px;
      font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
    }
    .fibo-action-area { display: flex; flex-direction: column; gap: 8px; }

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

  fiboPanelInstance = document.createElement('div');
  fiboPanelInstance.className = 'fibo-sidebar';
  fiboPanelInstance.innerHTML = `
    <div class="fibo-header">
      <span class="fibo-title">Fibo Zip Drop</span>
      <button class="fibo-close" id="closeBtn">✕</button>
    </div>
    <button class="fibo-btn" id="connectBtn">📁 Connect Local Dir</button>
    <div class="fibo-status" id="statusText">System Unbound</div>
    
    <div class="fibo-nav">
      <button class="fibo-nav-btn active" id="modeFileBtn">📦 File / ZIP</button>
      <button class="fibo-nav-btn" id="modeTextBtn">📝 Raw Text</button>
    </div>

    <div class="fibo-option-row">
      <label class="fibo-checkbox-label">
        <input type="checkbox" id="autoLogToggle" /> Auto-log to /FZFDlog
      </label>
    </div>
    <div class="fibo-option-row">
      <label class="fibo-checkbox-label">
        <input type="checkbox" id="emitEventsToggle" /> Emit Event JSON to /events
      </label>
    </div>

    <div id="dynamicContentZone" style="display: flex; flex-direction: column; flex-grow: 1; gap: 10px;">
      <!-- Dynamic view content -->
    </div>
    <input type="file" id="hiddenFileInput" multiple style="display: none;" />
  `;

  shadow.appendChild(style);
  shadow.appendChild(fiboPanelInstance);
  document.body.appendChild(uiContainer);

  const connectBtn = fiboPanelInstance.querySelector('#connectBtn');
  const statusText = fiboPanelInstance.querySelector('#statusText');
  const closeBtn = fiboPanelInstance.querySelector('#closeBtn');
  const hiddenFileInput = fiboPanelInstance.querySelector('#hiddenFileInput');
  const dynamicContentZone = fiboPanelInstance.querySelector('#dynamicContentZone');
  const modeFileBtn = fiboPanelInstance.querySelector('#modeFileBtn');
  const modeTextBtn = fiboPanelInstance.querySelector('#modeTextBtn');
  const autoLogToggle = fiboPanelInstance.querySelector('#autoLogToggle');
  const emitEventsToggle = fiboPanelInstance.querySelector('#emitEventsToggle');

  const savedAutoLog = localStorage.getItem('fzfd_auto_log');
  autoLogToggle.checked = savedAutoLog === null ? true : savedAutoLog === 'true';

  autoLogToggle.onchange = (e) => {
    localStorage.setItem('fzfd_auto_log', e.target.checked);
  };

  const savedEmitEvents = localStorage.getItem('fzfd_emit_events');
  emitEventsToggle.checked = savedEmitEvents === null ? true : savedEmitEvents === 'true';

  emitEventsToggle.onchange = (e) => {
    localStorage.setItem('fzfd_emit_events', e.target.checked);
  };

  let currentMode = 'FILE';

  const renderFileModeView = () => {
    processor.clearState();
    currentMode = 'FILE';
    modeFileBtn.classList.add('active');
    modeTextBtn.classList.remove('active');

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

  hiddenFileInput.onchange = async (e) => {
    if (e.target.files.length > 0) {
      await processInputFiles(Array.from(e.target.files));
      hiddenFileInput.value = "";
    }
  };

  bus.subscribe('ZIP_STAGED', (e) => {
    const files = e.payload;
    statusText.innerText = `Review changes (${files.length} file${files.length > 1 ? 's' : ''}):`;

    const hasExistingFiles = files.some(f => f.exists);

    let listHtml = `
      ${hasExistingFiles ? `
        <div class="fibo-option-row" style="margin-bottom: 4px;">
          <label class="fibo-checkbox-label">
            <input type="checkbox" id="masterToggle" /> Select / Deselect All Overwrites
          </label>
        </div>
      ` : ''}
      <input type="text" class="fibo-search-input" id="stagingSearch" placeholder="🔍 Search path filters..." />
      <div class="fibo-file-list" id="fileListContainer">
    `;

    files.forEach((file) => {
      const isRootDefault = file.parts.length === 0;
      const escapedPath = escapeHtml(file.displayPath);
      listHtml += `
        <div class="fibo-file-item" data-path="${escapedPath.toLowerCase()}">
          <span class="fibo-file-info" title="${escapedPath}">${escapedPath}</span>
          ${isRootDefault ? `<span class="fibo-badge-root">main</span>` : ''}
          
          <select class="fibo-change-type-select" data-index="${file.index}" title="Select change_type for event JSON">
            <option value="new" ${file.exists ? '' : 'selected'}>new</option>
            <option value="updated" ${file.exists ? 'selected' : ''}>updated</option>
            <option value="replaced">replaced</option>
            <option value="appended">appended</option>
            <option value="deleted">deleted</option>
          </select>

          ${file.exists 
            ? `<input type="checkbox" class="fibo-replace-check" data-index="${file.index}" title="File exists. Check to confirm overwrite." />`
            : `<span class="fibo-badge-new">new</span>`
          }
        </div>
      `;
    });
    listHtml += `</div>`;
    listHtml += `
      <div class="fibo-action-area">
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
    stagingSearch.oninput = (evt) => {
      const query = evt.target.value.toLowerCase().trim();
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

    dynamicContentZone.querySelector('#cancelBtn').onclick = () => {
      processor.clearState();
      resetToDefaultView();
    };

    dynamicContentZone.querySelector('#sendBtn').onclick = async () => {
      const checkedBoxes = dynamicContentZone.querySelectorAll('.fibo-replace-check');
      const changeTypeSelects = dynamicContentZone.querySelectorAll('.fibo-change-type-select');
      const approvedIndices = [];
      const changeTypesMap = {};

      files.forEach((file) => {
        if (!file.exists) approvedIndices.push(file.index);
      });

      checkedBoxes.forEach(box => {
        if (box.checked) {
          approvedIndices.push(Number(box.getAttribute('data-index')));
        }
      });

      changeTypeSelects.forEach(select => {
        const idx = Number(select.getAttribute('data-index'));
        changeTypesMap[idx] = select.value;
      });

      dynamicContentZone.innerHTML = `
        <div class="fibo-status" id="writeProgressText">⚡ Initializing write stream...</div>
        <div class="fibo-progress-track">
          <div class="fibo-progress-fill" id="progressFill"></div>
        </div>
      `;
      
      const enableLogging = autoLogToggle.checked;
      const enableEvents = emitEventsToggle.checked;
      await processor.commitUpload(approvedIndices, picker.directoryHandle, enableLogging, enableEvents, changeTypesMap);
    };
  });

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
    } else {
      renderTextModeView();
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
      a.click();
      URL.revokeObjectURL(url);
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
  isPushedOpen = forceState !== undefined ? forceState : !isPushedOpen;
  bootstrapFibo(); 

  if (fiboPanelInstance) {
    if (isPushedOpen) {
      fiboPanelInstance.classList.add('open');
    } else {
      fiboPanelInstance.classList.remove('open');
    }
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_FIBO_PANEL") {
    handleToggle();
    sendResponse({ success: true });
  }
});