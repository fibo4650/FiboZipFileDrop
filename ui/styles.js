// ui/styles.js
// Claude Sonnet 5 | 01-08-new features | 2026-08-02
// feature: phase1-multiblock

if (typeof window.FiboStyles === 'undefined') {
  window.FiboStyles = {
    CSS: `
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
    .fibo-badge-danger {
      background: #f38ba8; color: #11111b; font-size: 9px;
      font-weight: bold; padding: 2px 5px; border-radius: 4px; text-transform: uppercase; flex-shrink: 0;
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
  `,

    inject: function (shadowRoot) {
      const style = document.createElement('style');
      style.textContent = window.FiboStyles.CSS;
      shadowRoot.appendChild(style);
      return style;
    }
  };
}
