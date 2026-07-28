// ui/text-view.js
// Claude Sonnet 5 | session 2 refactor | 2026-07-28

if (typeof window.FiboTextView === 'undefined') {
  window.FiboTextView = class FiboTextView {
    constructor({ processor, picker, dynamicContentZone, checkWorkspacePermission }) {
      this.processor = processor;
      this.picker = picker;
      this.zone = dynamicContentZone;
      this.checkWorkspacePermission = checkWorkspacePermission;
    }

    render() {
      this.zone.innerHTML = `
        <textarea class="fibo-textarea" id="rawTextArea" placeholder="// path/to/file.js&#10;// Gemini 3.6 | FZFD Header & Log Stamp | 2026-07-27&#10;// feature: phase4-grimoire-dragon-astral&#10;console.log('Paste code here...');"></textarea>
        <button class="fibo-btn" id="stageTextBtn" style="background: #cba6f7;">⚡ Analyze Raw Text</button>
      `;

      this.zone.querySelector('#stageTextBtn').onclick = async () => {
        const text = this.zone.querySelector('#rawTextArea').value;
        if (!await this.checkWorkspacePermission()) return;
        await this.processor.stageRawText(text, this.picker.directoryHandle);
      };
    }
  };
}
