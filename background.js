chrome.action.onClicked.addListener((tab) => {
  if (!tab.url || tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
    console.warn("Fibo: Cannot execute on browser internal systemic pages.");
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_FIBO_PANEL" }, () => {
    if (chrome.runtime.lastError) {
      console.log("Fibo background: Content script initializing, connection established.");
    }
  });
});