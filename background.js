// background.js
// Claude Sonnet 5 | session 3 refactor | 2026-07-28

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id || !tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.includes("chromewebstore.google.com") || tab.url.includes("chrome.google.com/webstore")) {
    console.warn("Fibo: Cannot execute on browser internal systemic pages or Chrome Web Store.");
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_FIBO_PANEL" });
  } catch (err) {
    // Content script not loaded in this tab yet -> dynamically inject and retry
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "vendor/jszip.min.js",
          "core/event-bus.js",
          "features/file-picker.js",
          "features/zip/header-parser.js",
          "features/zip/path-resolver.js",
          "features/zip/collision-detector.js",
          "features/zip/file-writer.js",
          "features/zip/log-writer.js",
          "features/zip-processor.js",
          "features/prompt-manager.js",
          "ui/styles.js",
          "ui/shadow-dom.js",
          "ui/toast-manager.js",
          "ui/clipboard.js",
          "ui/text-view.js",
          "ui/prompts-view.js",
          "ui/staging-view.js",
          "content.js"
        ]
      });

      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_FIBO_PANEL" }).catch((e) => {
          console.error("Fibo: Retry toggle failed:", e);
        });
      }, 100);
    } catch (injectErr) {
      console.error("Fibo Script Injection Error:", injectErr);
    }
  }
});