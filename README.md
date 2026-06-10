# 🔍 YouTube Playlist Search Extension

[![Firefox Add-on](https://img.shields.io/amo/v/youtube-playlist-search-ext?style=flat-square&color=FF7139&logo=firefox-browser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/youtube-playlist-search-ext/)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg?style=flat-square)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red?style=flat-square)](#)

A lightweight, **100% open-source** browser extension for **Google Chrome** and **Mozilla Firefox** that injects a powerful, real-time search and navigation interface directly into YouTube playlists. Find any video instantly in playlists of any size.

---


## 📸 Screenshots

<p align="center">
  <img src="assets/Extension%20screenshot.png" width="49%" alt="Extension Search UI" />
  <img src="assets/Settings%20screenshot.png" width="49%" alt="Glassmorphic Options Panel" />
</p>

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

## 📦 Local Packaging & Automated Releases

The extension is designed to run natively in both Google Chrome and Mozilla Firefox. To guarantee seamless compatibility, we maintain an automated packaging utility that generates browser-specific variants:
- **Google Chrome**: Builds a standard `.zip` file utilizing a Manifest V3 background service worker (`background.service_worker`) and stripped of Firefox gecko headers. This is the exact format required for submission to the Chrome Web Store.
- **Mozilla Firefox**: Builds a standard `.xpi` (XPInstall) file using Manifest V3 event scripts (`background.scripts`) and including the required Gecko extension ID. This is fully ready to be installed directly in Firefox or submitted to the Firefox Add-ons portal.

### 🏃‍♂️ Running the Packager Locally

To generate both extension packages on your local machine:

1. Ensure you have **Node.js** (v16.7.0+) and the command-line utility `zip` installed (default on macOS and most Linux distributions).
2. Install dependencies (this project is **zero-dependency**, so this is extremely lightweight!):
   ```bash
   npm install
   ```
3. Run the packaging command:
   ```bash
   npm run package
   ```

Upon completion, a `dist/` directory will be created containing the optimized packages:
* `dist/yt-playlist-search-chrome.zip` - Ready for Google Chrome / Chromium.
* `dist/yt-playlist-search-firefox.xpi` - Ready for Mozilla Firefox.

#### How to load the generated local packages:
- **Chrome**: Unzip `dist/yt-playlist-search-chrome.zip`, go to `chrome://extensions/`, enable Developer Mode, and click **Load unpacked** targeting the extracted directory.
- **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...**, and select the `dist/yt-playlist-search-firefox.xpi` file directly.

### 🔄 Automated CI/CD Releases

A automated GitHub Actions workflow is pre-configured in this repository. Whenever you create and publish a new **GitHub Release**:
1. The workflow triggers automatically.
2. It spins up a clean Ubuntu runner, checkouts the repository, and sets up Node.js.
3. It packages both the Chrome `.zip` and Firefox `.xpi` formats.
4. It utilizes the official GitHub CLI (`gh`) to securely upload both files directly to the published release.

These packages will instantly appear under the **Releases** section of your repository, making it easy for users to download and install them manually!

---

## 📂 Project Structure

```
yt-playlist-search/
├── manifest.json       # Extension metadata, match patterns, and gecko settings
├── content.js          # Core DOM queries, auto-loader, and search algorithm
├── style.css           # Premium sticky layouts, inline wrappers, and animations
├── background.js       # Background service worker for extension lifecycle events
├── options.html        # Premium settings UI with glassmorphism layout
├── options.css         # Options-specific styles, gradients, and scrollbars
├── options.js          # Logic, persistence, and GSAP animations for options
├── assets/             # Extension and settings screenshots
└── icons/              # Extension brand assets and status bar icons
```

---

## 🤝 Contributing & Open Source

This extension is completely open-source and community-driven. Feel free to:
- **[Report Bugs or Request Features](https://github.com/MrPanda009/yt-playlist-search/issues)** if you run into any issues or have ideas to make it better.
- **Submit Pull Requests** to help build features or clean up code. Check out our [improvement ideas list](.system_generated/../improvement_ideas.md) or open an issue to discuss your proposal first!

---

## 🎨 Credits & Disclosure

* **Background Art:** Beautiful abstract gradient background by [magicpattern](https://unsplash.com/photos/abstract-blurred-dark-and-light-gradient-87PP9Zd7MNo) on Unsplash.
* **AI-Assisted Development:** Built with a little help from Gemini Flash ⚡

---

## 📄 License

This project is licensed under the GNU General Public License v3 - see the [LICENSE](LICENSE) file for details.