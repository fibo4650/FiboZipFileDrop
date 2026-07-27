chrome.action.onClicked.addListener((tab) => {
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:") || tab.url.includes("chromewebstore.google.com") || tab.url.includes("chrome.google.com/webstore")) {
    console.warn("Fibo: Cannot execute on browser internal systemic pages or Chrome Web Store.");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_FIBO_PANEL" }, () => {
    if (chrome.runtime.lastError) {
      console.log("Fibo background: Content script initializing, connection established.");
    }
  });
});