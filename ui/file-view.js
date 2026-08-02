// ui/file-view.js
// Claude Sonnet 5 | session 4 refactor | 2026-07-28

if (typeof window.FiboFileView === 'undefined') {
  window.FiboFileView = class FiboFileView {
    constructor({ hiddenFileInput, dynamicContentZone, processInputFiles }) {
      this.hiddenFileInput = hiddenFileInput;
      this.zone = dynamicContentZone;
      this.processInputFiles = processInputFiles;
    }

    render() {
      this.zone.innerHTML = `
        <div class="fibo-dropzone" id="dropZone">
          <span>Slide File or ZIP Here</span>
          <span class="fibo-hint">(or click to browse local files)</span>
        </div>
      `;

      const dropZone = this.zone.querySelector('#dropZone');
      dropZone.onclick = () => this.hiddenFileInput.click();
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('active'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('active'));
      dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropZone.classList.remove('active');
        if (e.dataTransfer.files.length > 0) {
          await this.processInputFiles(Array.from(e.dataTransfer.files));
        }
      });
    }
  };
}
