// content.js
// Gemini | FZFD builder 2 : errors and log | 2026-07-22

let fiboPanelInstance = null;
let isPushedOpen = false;

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
      width: 280px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
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
      background: #181825; padding: 6px 8px; border-radius: 6px; border: 1px solid #313244;
    }
    .fibo-checkbox-label {
      display: flex; align-items: center; gap: 6px; cursor: pointer; user-select: none; width: 100%;
    }

    .fibo-btn {
      width: 100%; background: #89b4fa; color: #11111b; border: none;
      padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s;
    }
    .fibo-btn:hover { background: #b4befe; }
    .fibo-status { font-size: 11px; color: #a6adc8; text-align: center; line-height: 1.4; word-break: break-word; }
    
    .fibo-dropzone {
      border: 2px dashed #45475a; border-radius: 8px; flex-grow: 1;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; color: #a6adc8; transition: 0.2s; min-height: 150px; cursor: pointer;
    }
    .fibo-dropzone:hover { border-color: #89b4fa; color: #89b4fa; background: rgba(137, 180, 250, 0.05); }
    .fibo-dropzone.active { border-color: #a6e3a1; background: rgba(166, 227, 161, 0.1); color: #a6e3a1; }
    .fibo-hint { font-size: 10px; color: #6c7086; margin-top: 4px; }

    .fibo-textarea {
      width: 100%; flex-grow: 1; min-height: 150px; background: #181825; color: #cdd6f4;
      border: 1px solid #45475a; border-radius: 6px; padding: 8px; font-family: monospace;
      font-size: 11px; resize: none; box-sizing: border-box; outline: none;
    }
    .fibo-textarea:focus { border-color: #89b4fa; }

    .fibo-file-list {
      flex-grow: 1; overflow-y: auto; background: #181825;
      border: 1px solid #45475a; border-radius: 6px; padding: 8px;
      display: flex; flex-direction: column; gap: 8px; max-height: 40vh;
    }
    .fibo-file-item {
      display: flex; align-items: center; justify-content: space-between;
      gap: 8px; background: #313244; padding: 6px 8px; border-radius: 4px;
    }
    .fibo-file-info {
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      flex-grow: 1; font-size: 11px; color: #cdd6f4;
    }
    .fibo-badge-new {
      background: #a6e3a1; color: #11111b; font-size: 9px;
      font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
    }
    .fibo-badge-root {
      background: #f9e2af; color: #11111b; font-size: 9px;
      font-weight: bold; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
    }
    .fibo-action-area { display: flex; flex-direction: column; gap: 8px; }
    
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

    <div id="dynamicContentZone" style="display: flex; flex-direction: column; flex-grow: 1; gap: 12px;">
      <!-- Dynamic view content -->
    </div>
    <input type="file" id="hiddenFileInput" style="display: none;" />
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

  // Load persistent auto-log preference (defaults to true)
  const savedAutoLog = localStorage.getItem('fzfd_auto_log');
  autoLogToggle.checked = savedAutoLog === null ? true : savedAutoLog === 'true';

  autoLogToggle.onchange = (e) => {
    localStorage.setItem('fzfd_auto_log', e.target.checked);
  };

  let currentMode = 'FILE';

  const renderFileModeView = () => {
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
        await processInputFile(e.dataTransfer.files[0]);
      }
    });
  };

  const renderTextModeView = () => {
    currentMode = 'TEXT';
    modeTextBtn.classList.add('active');
    modeFileBtn.classList.remove('active');

    dynamicContentZone.innerHTML = `
      <textarea class="fibo-textarea" id="rawTextArea" placeholder="// path/to/file.js&#10;console.log('Paste code here...');"></textarea>
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

  const processInputFile = async (file) => {
    if (!await checkWorkspacePermission()) return;

    if (file.name.endsWith('.zip')) {
      await processor.stageZip(file, picker.directoryHandle);
    } else {
      await processor.stageSingleFile(file, picker.directoryHandle);
    }
  };

  connectBtn.onclick = async () => { await picker.selectDirectory(); };
  closeBtn.onclick = () => { handleToggle(false); };
  modeFileBtn.onclick = () => { renderFileModeView(); };
  modeTextBtn.onclick = () => { renderTextModeView(); };

  hiddenFileInput.onchange = async (e) => {
    if (e.target.files.length > 0) {
      await processInputFile(e.target.files[0]);
      hiddenFileInput.value = "";
    }
  };

  bus.subscribe('ZIP_STAGED', (e) => {
    const files = e.payload;
    statusText.innerText = "Review file changes below:";

    let listHtml = `<div class="fibo-file-list">`;
    files.forEach((file) => {
      const isRootDefault = file.parts.length === 0;
      listHtml += `
        <div class="fibo-file-item">
          <span class="fibo-file-info" title="${file.displayPath}">${file.displayPath}</span>
          ${isRootDefault ? `<span class="fibo-badge-root">main</span>` : ''}
          ${file.exists 
            ? `<input type="checkbox" class="fibo-replace-check" data-path="${encodeURIComponent(file.displayPath)}" title="File exists. Check to confirm overwrite." />`
            : `<span class="fibo-badge-new">new</span>`
          }
        </div>
      `;
    });
    listHtml += `</div>`;
    listHtml += `
      <div class="fibo-action-area">
        <button class="fibo-btn" id="sendBtn" style="background: #a6e3a1;">🚀 Send & Process</button>
        <button class="fibo-btn" id="cancelBtn" style="background: #45475a; color: #cdd6f4;">Cancel</button>
      </div>
    `;

    dynamicContentZone.innerHTML = listHtml;

    dynamicContentZone.querySelector('#cancelBtn').onclick = () => {
      processor.clearState();
      resetToDefaultView();
    };

    dynamicContentZone.querySelector('#sendBtn').onclick = async () => {
      const checkedBoxes = dynamicContentZone.querySelectorAll('.fibo-replace-check');
      const approvedPaths = [];

      files.forEach((file) => {
        if (!file.exists) approvedPaths.push(file.displayPath);
      });

      checkedBoxes.forEach(box => {
        if (box.checked) {
          approvedPaths.push(decodeURIComponent(box.getAttribute('data-path')));
        }
      });

      dynamicContentZone.innerHTML = `<div class="fibo-status">⚡ Writing files to disk...</div>`;
      
      const enableLogging = autoLogToggle.checked;
      await processor.commitUpload(approvedPaths, picker.directoryHandle, enableLogging);
    };
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
    connectBtn.innerText = "✅ Target Bound";
    connectBtn.disabled = true;
    connectBtn.style.background = '#a6e3a1';
    statusText.innerText = `Folder: ${e.payload}`;
  });

  bus.subscribe('PROCESS_START', () => { statusText.innerText = `⚡ Analyzing input structure...`; });

  bus.subscribe('PROCESS_COMPLETE', (e) => {
    const { successCount, failCount, logs, loggingEnabled } = e.payload;
    resetToDefaultView();

    let statusColor = failCount === 0 ? '#a6e3a1' : '#f38ba8';
    let logNote = loggingEnabled ? ' (Logged to FZFDlog)' : ' (Auto-log disabled)';
    statusText.innerHTML = `<span style='color: ${statusColor};'>Saved: ${successCount} | Failed: ${failCount}${logNote}</span>`;

    let logHtml = `<div class="fibo-log-box">`;
    logs.forEach(log => {
      const isOk = log.status === 'SUCCESS';
      logHtml += `
        <div class="${isOk ? 'fibo-log-success' : 'fibo-log-fail'}">
          ${isOk ? '✓' : '✗'} ${log.path} ${log.error ? `(${log.error})` : ''}
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
      const logText = logs.map(l => `[${l.status}] ${l.path}${l.error ? ` - Error: ${l.error}` : ''}`).join('\n');
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
    statusText.innerHTML = `<span style='color: #f38ba8;'>🚨 Error: ${e.payload}</span>`;
  });

  bus.subscribe('WORKSPACE_ERROR', () => { statusText.innerText = `⚠️ Connection Aborted`; });
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