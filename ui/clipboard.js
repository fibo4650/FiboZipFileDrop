// ui/clipboard.js
// Claude Sonnet 5 | session 1 refactor | 2026-07-28

if (typeof window.FiboClipboard === 'undefined') {
  window.FiboClipboard = {
    copyToClipboard: async function (text, shadowRoot) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const helperArea = document.createElement('textarea');
          helperArea.value = text;
          helperArea.style.position = 'fixed';
          helperArea.style.opacity = '0';
          shadowRoot.appendChild(helperArea);
          helperArea.focus();
          helperArea.select();
          document.execCommand('copy');
          helperArea.remove();
        }
        return true;
      } catch (err) {
        console.error('Fibo Copy Error:', err);
        return false;
      }
    }
  };
}
