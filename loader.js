(async () => {
  // Dynamically import the main content script as an ES Module
  const src = chrome.runtime.getURL('content.js');
  await import(src);
})();