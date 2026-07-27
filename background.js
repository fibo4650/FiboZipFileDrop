// background.js
// Gemini 3.6 Flash | Panel Display Fixes | 2026-07-27

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
          "features/zip-processor.js",
          "features/prompt-manager.js",
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