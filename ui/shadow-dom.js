// ui/shadow-dom.js
// Claude Sonnet 5 | session 1 refactor | 2026-07-28

if (typeof window.FiboShadowDOM === 'undefined') {
  window.FiboShadowDOM = {
    create: function () {
      const host = document.createElement('div');
      host.id = 'fibo-zip-drop-root';
      host.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 0 !important; height: 0 !important; z-index: 2147483647 !important; display: block !important; border: none !important; margin: 0 !important; padding: 0 !important;';

      const shadow = host.attachShadow({ mode: 'closed' });

      return { host, shadow };
    }
  };
}
