// Service Worker for YouTube Playlist Search Extension

// Open the options/settings page when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage((err) => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to open options page:', chrome.runtime.lastError);
    }
  });
});
