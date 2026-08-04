// background.js
// Claude Sonnet 5 | AI Extraction Phase 1-5 | 2026-08-04
// feature: phase5-ai-extraction

importScripts('features/ai/gemini-prompts.js', 'features/ai/gemini-client.js');

// Must match features/ai-settings-store.js's STORAGE_KEY — duplicated because a
// service worker cannot `window.`-import a content-script-scoped class.
const GEMINI_API_KEY_STORAGE_KEY = 'fzfd_gemini_api_key';

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
          "features/workspace-store.js",
          "features/zip/header-parser.js",
          "features/zip/path-resolver.js",
          "features/zip/collision-detector.js",
          "features/zip/file-writer.js",
          "features/zip/log-writer.js",
          "features/zip/rule-matcher.js",
          "features/zip/raw-text-stager.js",
          "features/zip-processor.js",
          "features/prompt-manager.js",
          "features/ai-settings-store.js",
          "features/learned-rules-store.js",
          "ui/styles.js",
          "ui/shadow-dom.js",
          "ui/toast-manager.js",
          "ui/clipboard.js",
          "ui/file-view.js",
          "ui/text-view.js",
          "ui/prompts-view.js",
          "ui/settings-view.js",
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FIBO_AI_EXTRACT') {
    handleAiExtract(message.payload || {}).then(sendResponse);
    return true; // keep the async sendResponse channel open
  }
  if (message.type === 'FIBO_AI_INDUCE') {
    handleAiInduce(message.payload || {}).then(sendResponse);
    return true;
  }
});

async function handleAiExtract({ text, context }) {
  const { [GEMINI_API_KEY_STORAGE_KEY]: apiKey } = await chrome.storage.local.get([GEMINI_API_KEY_STORAGE_KEY]);
  if (!apiKey) {
    return { ok: false, error: 'No Gemini API key configured. Add one in Fibo settings.' };
  }
  try {
    const files = await new self.FiboGeminiClient().extractFiles(text, context, apiKey);
    return { ok: true, files };
  } catch (err) {
    console.error('Fibo AI Extract Error:', err);
    return { ok: false, error: err.message || String(err) };
  }
}

async function handleAiInduce({ sampleText }) {
  const { [GEMINI_API_KEY_STORAGE_KEY]: apiKey } = await chrome.storage.local.get([GEMINI_API_KEY_STORAGE_KEY]);
  if (!apiKey) {
    return { ok: false, error: 'No key configured.' };
  }
  try {
    const result = await new self.FiboGeminiClient().induceTemplate(sampleText, apiKey);
    return { ok: true, ...result };
  } catch (err) {
    console.error('Fibo Rule Induction Error:', err);
    return { ok: false, error: err.message || String(err) };
  }
}
