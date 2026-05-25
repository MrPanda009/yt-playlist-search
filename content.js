(() => {
	const SEARCH_BAR_ID = "ypt-search-bar";
	const SEARCH_INPUT_ID = "ypt-search-input";
	const SEARCH_COUNT_ID = "ypt-search-count";
	const SEARCH_ACTIONS_ID = "ypt-search-actions";
	const SEARCH_PREV_ID = "ypt-search-prev";
	const SEARCH_NEXT_ID = "ypt-search-next";
	const HIGHLIGHT_CLASS = "ypt-highlight";
	const ACTIVE_CLASS = "ypt-active";

	let playlistObserver = null;
	const searchState = {
		query: "",
		matches: [],
		index: -1,
	};

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

			let actions = existing.querySelector(`#${SEARCH_ACTIONS_ID}`);
			if (!actions) {
				actions = document.createElement("div");
				actions.id = SEARCH_ACTIONS_ID;
				existing.appendChild(actions);
			}

			let count = actions.querySelector(`#${SEARCH_COUNT_ID}`);
			if (!count) {
				count = document.createElement("span");
				count.id = SEARCH_COUNT_ID;
				count.textContent = "";
				count.setAttribute("aria-live", "polite");
				actions.appendChild(count);
			}

			let prevButton = actions.querySelector(`#${SEARCH_PREV_ID}`);
			if (!prevButton) {
				prevButton = document.createElement("button");
				prevButton.id = SEARCH_PREV_ID;
				prevButton.type = "button";
				prevButton.textContent = "<";
				prevButton.setAttribute("aria-label", "Previous match");
				actions.appendChild(prevButton);
			}

			let nextButton = actions.querySelector(`#${SEARCH_NEXT_ID}`);
			if (!nextButton) {
				nextButton = document.createElement("button");
				nextButton.id = SEARCH_NEXT_ID;
				nextButton.type = "button";
				nextButton.textContent = ">";
				nextButton.setAttribute("aria-label", "Next match");
				actions.appendChild(nextButton);
			}

			return { input, count, prevButton, nextButton };
		}

		const bar = document.createElement("div");
		bar.id = SEARCH_BAR_ID;

		const input = document.createElement("input");
		input.id = SEARCH_INPUT_ID;
		input.type = "text";
		input.placeholder = "Search in playlist";
		input.autocomplete = "off";
		input.spellcheck = false;

		const actions = document.createElement("div");
		actions.id = SEARCH_ACTIONS_ID;

		const count = document.createElement("span");
		count.id = SEARCH_COUNT_ID;
		count.textContent = "";
		count.setAttribute("aria-live", "polite");

		const prevButton = document.createElement("button");
		prevButton.id = SEARCH_PREV_ID;
		prevButton.type = "button";
		prevButton.textContent = "<";
		prevButton.setAttribute("aria-label", "Previous match");

		const nextButton = document.createElement("button");
		nextButton.id = SEARCH_NEXT_ID;
		nextButton.type = "button";
		nextButton.textContent = ">";
		nextButton.setAttribute("aria-label", "Next match");

		bar.appendChild(input);
		actions.appendChild(count);
		actions.appendChild(prevButton);
		actions.appendChild(nextButton);
		bar.appendChild(actions);
		renderer.insertBefore(bar, contents);

		return { input, count, prevButton, nextButton };
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

	const updateNavigationState = (prevButton, nextButton, hasQuery) => {
		const hasMatches = searchState.matches.length > 0;
		const disabled = !hasQuery || !hasMatches;
		prevButton.disabled = disabled;
		nextButton.disabled = disabled;
		prevButton.setAttribute("aria-disabled", String(disabled));
		nextButton.setAttribute("aria-disabled", String(disabled));
	};

	const setActiveMatch = () => {
		if (searchState.index < 0) {
			return null;
		}

		const active = searchState.matches[searchState.index];
		if (!active) {
			return null;
		}

		active.classList.add(ACTIVE_CLASS);
		return active;
	};

	const updateMatches = (query, count, prevButton, nextButton, options) => {
		const normalized = query.trim().toLowerCase();
		const items = getVideoItems();

		searchState.query = query;
		searchState.matches = [];
		searchState.index = -1;

		if (normalized.length === 0) {
			items.forEach((item) =>
				item.classList.remove(HIGHLIGHT_CLASS, ACTIVE_CLASS)
			);
			updateCount(count, "");
			updateNavigationState(prevButton, nextButton, false);
			return;
		}

		items.forEach((item) => {
			const title = getTitleText(item).toLowerCase();
			const isMatch = title.includes(normalized);
			item.classList.toggle(HIGHLIGHT_CLASS, isMatch);
			item.classList.remove(ACTIVE_CLASS);
			if (isMatch) {
				searchState.matches.push(item);
			}
		});

		if (searchState.matches.length === 0) {
			updateCount(count, "0");
			updateNavigationState(prevButton, nextButton, true);
			return;
		}

		if (
			options?.resetIndex ||
			searchState.index < 0 ||
			searchState.index >= searchState.matches.length
		) {
			searchState.index = 0;
		}

		setActiveMatch();
		updateCount(count, searchState.matches.length);
		updateNavigationState(prevButton, nextButton, true);
	};

	const stepMatch = (direction) => {
		if (searchState.matches.length === 0) {
			return;
		}

		const total = searchState.matches.length;
		searchState.index =
			(searchState.index + direction + total) % total;

		searchState.matches.forEach((item) =>
			item.classList.remove(ACTIVE_CLASS)
		);
		const active = setActiveMatch();
		if (active) {
			active.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	};

	const attachInputListener = (input, count, prevButton, nextButton) => {
		if (input.dataset.yptListenerAttached === "true") {
			return;
		}

		input.addEventListener("input", () => {
			updateMatches(input.value, count, prevButton, nextButton, {
				resetIndex: true,
			});
		});

		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				event.preventDefault();
				stepMatch(1);
			}
		});

		input.dataset.yptListenerAttached = "true";
	};

	const attachNavListeners = (prevButton, nextButton) => {
		if (prevButton.dataset.yptListenerAttached !== "true") {
			prevButton.addEventListener("click", () => stepMatch(-1));
			prevButton.dataset.yptListenerAttached = "true";
		}

		if (nextButton.dataset.yptListenerAttached !== "true") {
			nextButton.addEventListener("click", () => stepMatch(1));
			nextButton.dataset.yptListenerAttached = "true";
		}
	};

	const observePlaylist = (contents, input, count, prevButton, nextButton) => {
		if (playlistObserver) {
			playlistObserver.disconnect();
		}

		playlistObserver = new MutationObserver(() => {
			updateMatches(input.value, count, prevButton, nextButton, {
				resetIndex: false,
			});
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

		const { input, count, prevButton, nextButton } = ensureSearchBar(
			parts.renderer,
			parts.contents
		);
		if (!input || !count || !prevButton || !nextButton) {
			return true;
		}

		attachInputListener(input, count, prevButton, nextButton);
		attachNavListeners(prevButton, nextButton);
		observePlaylist(parts.contents, input, count, prevButton, nextButton);
		updateMatches(input.value, count, prevButton, nextButton, {
			resetIndex: false,
		});

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
