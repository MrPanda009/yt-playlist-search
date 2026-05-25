(() => {
	const SEARCH_BAR_ID = "ypt-search-bar";
	const SEARCH_INPUT_ID = "ypt-search-input";
	const SEARCH_COUNT_ID = "ypt-search-count";
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
			let input = existing.querySelector(`#${SEARCH_INPUT_ID}`);
			if (!input) {
				input = document.createElement("input");
				input.id = SEARCH_INPUT_ID;
				input.type = "text";
				input.placeholder = "Search in playlist";
				input.autocomplete = "off";
				input.spellcheck = false;
				existing.insertBefore(input, existing.firstChild);
			}

			let count = existing.querySelector(`#${SEARCH_COUNT_ID}`);
			if (!count) {
				count = document.createElement("span");
				count.id = SEARCH_COUNT_ID;
				count.textContent = "0";
				count.setAttribute("aria-live", "polite");
				existing.appendChild(count);
			}

			return { input, count };
		}

		const bar = document.createElement("div");
		bar.id = SEARCH_BAR_ID;

		const input = document.createElement("input");
		input.id = SEARCH_INPUT_ID;
		input.type = "text";
		input.placeholder = "Search in playlist";
		input.autocomplete = "off";
		input.spellcheck = false;

		const count = document.createElement("span");
		count.id = SEARCH_COUNT_ID;
		count.textContent = "0";
		count.setAttribute("aria-live", "polite");

		bar.appendChild(input);
		bar.appendChild(count);
		renderer.insertBefore(bar, contents);

		return { input, count };
	};

	const getVideoItems = () =>
		Array.from(document.querySelectorAll("ytd-playlist-video-renderer"));

	const getTitleText = (item) => {
		const title = item.querySelector("#video-title");
		return title ? title.textContent.trim() : "";
	};

	const updateCount = (count, value) => {
		if (!count) {
			return;
		}

		count.textContent = String(value);
	};

	const applyHighlights = (query, count) => {
		const normalized = query.trim().toLowerCase();
		const items = getVideoItems();

		if (normalized.length === 0) {
			items.forEach((item) => item.classList.remove(HIGHLIGHT_CLASS));
			updateCount(count, items.length);
			return;
		}

		let matches = 0;
		items.forEach((item) => {
			const title = getTitleText(item).toLowerCase();
			if (title.includes(normalized)) {
				item.classList.add(HIGHLIGHT_CLASS);
				matches += 1;
			} else {
				item.classList.remove(HIGHLIGHT_CLASS);
			}
		});

		updateCount(count, matches);
	};

	const attachInputListener = (input, count) => {
		if (input.dataset.yptListenerAttached === "true") {
			return;
		}

		input.addEventListener("input", () => {
			applyHighlights(input.value, count);
		});

		input.dataset.yptListenerAttached = "true";
	};

	const observePlaylist = (contents, input, count) => {
		if (playlistObserver) {
			playlistObserver.disconnect();
		}

		playlistObserver = new MutationObserver(() => {
			applyHighlights(input.value, count);
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

		const { input, count } = ensureSearchBar(
			parts.renderer,
			parts.contents
		);
		if (!input || !count) {
			return true;
		}

		attachInputListener(input, count);
		observePlaylist(parts.contents, input, count);
		applyHighlights(input.value, count);

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
