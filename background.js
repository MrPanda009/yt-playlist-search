// Service Worker for YouTube Playlist Search Extension

// Open the options/settings page when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage(() => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to open options page:', chrome.runtime.lastError);
    }
  });
});

// Apply the saved toolbar icon theme. setIcon is session-only, so this runs on
// every worker/event-page start and whenever the setting changes.
const setIconTheme = (theme) => {
  const suffix = theme === 'light' ? 'light' : 'dark';
  const path = {
    '16': `icons/yt-playlist-icon-${suffix}-16.png`,
    '32': `icons/yt-playlist-icon-${suffix}-32.png`,
    '48': `icons/yt-playlist-icon-${suffix}-48.png`,
    '128': `icons/yt-playlist-icon-${suffix}-128.png`
  };

  chrome.action.setIcon({ path }, () => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to set icon:', chrome.runtime.lastError);
    }
  });
};

chrome.storage.sync.get({ iconTheme: 'dark' }, (items) => {
  setIconTheme(items.iconTheme);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.iconTheme) {
    setIconTheme(changes.iconTheme.newValue);
  }
});
