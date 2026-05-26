# 🔍 YouTube Playlist Search Extension

A lightweight browser extension for **Google Chrome** and **Mozilla Firefox** that injects a powerful, real-time search and navigation interface directly into YouTube playlists. Find any video instantly in playlists of any size.

---

## ✨ Features

- ⚡ **Real-Time Highlighting:** Instantly highlights matches with elegant custom glowing borders and shadows that adapt seamlessly to YouTube's native light and dark modes.
- 🔄 **Smart "Auto-Load All":** Solves YouTube's lazy-loading limitation. With a single click, the extension safely auto-scrolls and preloads all playlist videos, tracking progress with a status bar (e.g. `200 / ~500`).
- 🛑 **On-Demand Control:** Pause the auto-loader at any time with a dedicated **Stop** button.
- 🎯 **Seamless Navigation:** Cycle through search matches effortlessly using the `<` and `>` buttons or by pressing `Enter` on the search input, with smooth scroll positioning to bring matches to center screen.
- 🧩 **Dual-Context Responsive UI:**
  - **Browse Page:** Adapts as a sticky floating bar that remains pinned at the top as you scroll.
  - **Watch Page:** Sits inline perfectly aligned with other controls in the right-side playlist panel.
- 🦊 **Manifest V3 & Cross-Browser Ready:** Fully compliant with Chrome Extension specifications and optimized for Firefox WebExtensions (including Gecko runtime configurations).

---

## 🛠️ Installation

### For Google Chrome & Chromium Browsers

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** in the top-left and select the project folder containing `manifest.json`.

### For Mozilla Firefox

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the `manifest.json` file in the project folder.

---

## 🚀 How to Use

1. Go to any YouTube Playlist page (e.g. `https://www.youtube.com/playlist?list=...`) or watch a video inside a playlist.
2. A sleek search input placeholder **"Search in playlist"** will appear directly above the video list.
3. **For long playlists:** Click the **Load all** button. The extension will automatically scroll and fetch all video elements from YouTube's API. You can hit **Stop** at any point.
4. Type your query into the search bar. Matches will immediately glow with a red border.
5. Press `Enter` or click the `<` / `>` buttons to jump seamlessly between matching videos.

---

## 📂 Project Structure

```
yt-playlist-search/
├── manifest.json   # Extension metadata, match patterns, and gecko settings
├── content.js      # Core DOM queries, auto-loader, and search algorithm
├── style.css       # Premium sticky layouts, inline wrappers, and animations
└── icons/          # Extension brand assets and status bar icons
```

---