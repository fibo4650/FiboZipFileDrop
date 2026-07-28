// ui/toast-manager.js
// Claude Sonnet 5 | session 1 refactor | 2026-07-28

if (typeof window.FiboToastManager === 'undefined') {
  window.FiboToastManager = class FiboToastManager {
    constructor(container) {
      this.container = container;
    }

    show(msg) {
      const toast = document.createElement('div');
      toast.className = 'fibo-toast';
      toast.innerText = msg;
      this.container.appendChild(toast);
      setTimeout(() => toast.remove(), 1800);
    }
  };
}
