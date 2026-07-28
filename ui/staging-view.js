// ui/staging-view.js
// Claude Sonnet 5 | session 2 refactor | 2026-07-28

if (typeof window.FiboStagingView === 'undefined') {
  window.FiboStagingView = class FiboStagingView {
    constructor({ processor, picker, dynamicContentZone, escapeHtml, showToast, autoLogToggle, emitEventsToggle, onCancel }) {
      this.processor = processor;
      this.picker = picker;
      this.zone = dynamicContentZone;
      this.escapeHtml = escapeHtml;
      this.showToast = showToast;
      this.autoLogToggle = autoLogToggle;
      this.emitEventsToggle = emitEventsToggle;
      this.onCancel = onCancel;
      this.activeInlineEditIndex = null;
    }

    show(files) {
      this.activeInlineEditIndex = null;
      this.render(files);
    }

    captureUIState() {
      const state = { changeTypes: {}, checkedOverwrites: new Set(), searchQuery: '' };
      if (!this.zone) return state;

      const search = this.zone.querySelector('#stagingSearch');
      if (search) state.searchQuery = search.value;

      this.zone.querySelectorAll('.fibo-change-type-select').forEach(sel => {
        state.changeTypes[sel.getAttribute('data-index')] = sel.value;
      });

      this.zone.querySelectorAll('.fibo-replace-check').forEach(chk => {
        if (chk.checked) state.checkedOverwrites.add(Number(chk.getAttribute('data-index')));
      });

      return state;
    }

    updateProgress(current, total) {
      const progressFill = this.zone.querySelector('#progressFill');
      const writeProgressText = this.zone.querySelector('#writeProgressText');

      if (progressFill && writeProgressText) {
        const pct = Math.round((current / total) * 100);
        progressFill.style.width = `${pct}%`;
        writeProgressText.innerText = `⚡ Writing files: ${current} / ${total} (${pct}%)`;
      }
    }

    render(files, preservedState = null) {
      const previousState = preservedState || this.captureUIState();
      const hasExistingFiles = files.some(f => f.exists);

      let listHtml = `
        ${hasExistingFiles ? `
          <div class="fibo-option-row" style="margin-bottom: 4px;">
            <label class="fibo-checkbox-label">
              <input type="checkbox" id="masterToggle" /> Select / Deselect All Overwrites
            </label>
          </div>
        ` : ''}
        <input type="text" class="fibo-input" id="stagingSearch" placeholder="🔍 Search path filters..." value="${this.escapeHtml(previousState.searchQuery)}" />
        <div class="fibo-file-list" id="fileListContainer">
      `;

      files.forEach((file) => {
        const isRootDefault = file.parts.length === 0;
        const escapedPath = this.escapeHtml(file.displayPath);
        const isEditingThis = this.activeInlineEditIndex === file.index;

        const { slots } = this.processor.extractHeaderAndBody(file.content);
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
                  <input type="text" class="fibo-input" id="editLine1_${file.index}" placeholder="Line 1 Path Comment (e.g. // path/file.js)" value="${this.escapeHtml(line1)}" />
                  <input type="text" class="fibo-input" id="editLine2_${file.index}" placeholder="Line 2 Session Stamp (e.g. // Model | Chat | Date)" value="${this.escapeHtml(line2)}" />
                  <input type="text" class="fibo-input" id="editLine3_${file.index}" placeholder="Line 3 Feature Directive (e.g. // feature: id)" value="${this.escapeHtml(line3)}" />
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

      this.zone.innerHTML = listHtml;

      const masterToggle = this.zone.querySelector('#masterToggle');
      if (masterToggle) {
        masterToggle.onchange = (evt) => {
          const visibleChecks = this.zone.querySelectorAll('.fibo-replace-check');
          visibleChecks.forEach(chk => {
            const row = chk.closest('.fibo-file-item');
            if (row && row.style.display !== 'none') {
              chk.checked = evt.target.checked;
            }
          });
        };
      }

      const stagingSearch = this.zone.querySelector('#stagingSearch');
      const filterRows = () => {
        const query = stagingSearch.value.toLowerCase().trim();
        const items = this.zone.querySelectorAll('.fibo-file-item');
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

      this.zone.querySelectorAll('[data-action="toggle-edit"]').forEach(btn => {
        btn.onclick = () => {
          const idx = Number(btn.getAttribute('data-index'));
          const currentState = this.captureUIState();
          this.activeInlineEditIndex = this.activeInlineEditIndex === idx ? null : idx;
          this.render(this.processor.stagedFiles, currentState);
        };
      });

      if (this.activeInlineEditIndex !== null) {
        const idx = this.activeInlineEditIndex;
        const saveBtn = this.zone.querySelector(`#saveInlineEdit_${idx}`);
        const cancelBtn = this.zone.querySelector('#cancelInlineEdit');

        if (cancelBtn) cancelBtn.onclick = () => {
          const currentState = this.captureUIState();
          this.activeInlineEditIndex = null;
          this.render(this.processor.stagedFiles, currentState);
        };

        if (saveBtn) {
          saveBtn.onclick = async () => {
            const currentState = this.captureUIState();
            const newPath = this.zone.querySelector(`#editPath_${idx}`).value;
            const line1El = this.zone.querySelector(`#editLine1_${idx}`);
            const line2El = this.zone.querySelector(`#editLine2_${idx}`);
            const line3El = this.zone.querySelector(`#editLine3_${idx}`);

            const headerLines = line1El ? {
              line1: line1El.value,
              line2: line2El ? line2El.value : null,
              line3: line3El ? line3El.value : null
            } : null;

            try {
              await this.processor.updateStagedFile(idx, newPath, headerLines, this.picker.directoryHandle);
              this.activeInlineEditIndex = null;
              this.render(this.processor.stagedFiles, currentState);
            } catch (err) {
              this.showToast(`🚨 ${err.message}`);
            }
          };
        }
      }

      this.zone.querySelector('#cancelBtn').onclick = () => {
        this.processor.clearState();
        this.onCancel();
      };

      this.zone.querySelector('#sendBtn').onclick = async () => {
        const checkedBoxes = this.zone.querySelectorAll('.fibo-replace-check');
        const changeTypeSelects = this.zone.querySelectorAll('.fibo-change-type-select');
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

        this.zone.innerHTML = `
          <div class="fibo-status" id="writeProgressText">⚡ Initializing write stream...</div>
          <div class="fibo-progress-track">
            <div class="fibo-progress-fill" id="progressFill"></div>
          </div>
        `;

        const enableLogging = this.autoLogToggle.checked;
        const enableEvents = this.emitEventsToggle.checked;
        await this.processor.commitUpload(Array.from(approvedIndices), this.picker.directoryHandle, enableLogging, enableEvents, changeTypesMap);
      };
    }
  };
}
