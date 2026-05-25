(() => {
	const SEARCH_BAR_ID = "ypt-search-bar";
	const SEARCH_INPUT_ID = "ypt-search-input";
	const HIGHLIGHT_CLASS = "ypt-highlight";

	let playlistObserver = null;

	const getPlaylistParts = () => {
		const renderer = document.querySelector(
			"ytd-playlist-video-list-renderer"
		);
		if (!renderer) {
			return null;
		}

		const contents = renderer.querySelector("#contents");
		if (!contents) {
			return null;
		}

		return { renderer, contents };
	};

	const ensureSearchBar = (renderer, contents) => {
		const existing = document.getElementById(SEARCH_BAR_ID);
		if (existing) {
			return document.getElementById(SEARCH_INPUT_ID);
		}

		const bar = document.createElement("div");
		bar.id = SEARCH_BAR_ID;

		const input = document.createElement("input");
		input.id = SEARCH_INPUT_ID;
		input.type = "text";
		input.placeholder = "Search in playlist";
		input.autocomplete = "off";
		input.spellcheck = false;

		bar.appendChild(input);
		renderer.insertBefore(bar, contents);

		return input;
	};

	const getVideoItems = () =>
		Array.from(document.querySelectorAll("ytd-playlist-video-renderer"));

	const getTitleText = (item) => {
		const title = item.querySelector("#video-title");
		return title ? title.textContent.trim() : "";
	};

	const applyHighlights = (query) => {
		const normalized = query.trim().toLowerCase();
		const items = getVideoItems();

		if (normalized.length === 0) {
			items.forEach((item) => item.classList.remove(HIGHLIGHT_CLASS));
			return;
		}

		items.forEach((item) => {
			const title = getTitleText(item).toLowerCase();
			if (title.includes(normalized)) {
				item.classList.add(HIGHLIGHT_CLASS);
			} else {
				item.classList.remove(HIGHLIGHT_CLASS);
			}
		});
	};

	const attachInputListener = (input) => {
		if (input.dataset.yptListenerAttached === "true") {
			return;
		}

		input.addEventListener("input", () => {
			applyHighlights(input.value);
		});

		input.dataset.yptListenerAttached = "true";
	};

	const observePlaylist = (contents, input) => {
		if (playlistObserver) {
			playlistObserver.disconnect();
		}

		playlistObserver = new MutationObserver(() => {
			applyHighlights(input.value);
		});

		playlistObserver.observe(contents, {
			childList: true,
			subtree: true,
		});
	};

	const setup = () => {
		const parts = getPlaylistParts();
		if (!parts) {
			return false;
		}

		const input = ensureSearchBar(parts.renderer, parts.contents);
		if (!input) {
			return true;
		}

		attachInputListener(input);
		observePlaylist(parts.contents, input);
		applyHighlights(input.value);

		return true;
	};

	const waitForPlaylist = () => {
		if (setup()) {
			return;
		}

		const bootObserver = new MutationObserver(() => {
			if (setup()) {
				bootObserver.disconnect();
			}
		});

		bootObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", waitForPlaylist, {
			once: true,
		});
	} else {
		waitForPlaylist();
	}
})();
