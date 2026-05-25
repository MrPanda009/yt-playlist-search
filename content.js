(() => {
	const SEARCH_BAR_ID = "ypt-search-bar";
	const SEARCH_INPUT_ID = "ypt-search-input";
	const SEARCH_COUNT_ID = "ypt-search-count";
	const SEARCH_ACTIONS_ID = "ypt-search-actions";
	const SEARCH_PREV_ID = "ypt-search-prev";
	const SEARCH_NEXT_ID = "ypt-search-next";
	const SEARCH_STATUS_ID = "ypt-search-status";
	const SEARCH_LOAD_ID = "ypt-search-load";
	const SEARCH_STOP_ID = "ypt-search-stop";
	const HIGHLIGHT_CLASS = "ypt-highlight";
	const ACTIVE_CLASS = "ypt-active";

	let playlistObserver = null;
	const searchState = {
		query: "",
		matches: [],
		index: -1,
	};
	const loadState = {
		loaded: 0,
		total: null,
		totalApprox: false,
		totalChecked: false,
		isLoading: false,
		stopRequested: false,
		noGrowthStreak: 0,
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

			let actionsContainer = existing.querySelector(`#${SEARCH_ACTIONS_ID}`);
			if (!actionsContainer) {
				actionsContainer = document.createElement("div");
				actionsContainer.id = SEARCH_ACTIONS_ID;
				existing.appendChild(actionsContainer);
			}

			let status = actionsContainer.querySelector(`#${SEARCH_STATUS_ID}`);
			if (!status) {
				status = document.createElement("span");
				status.id = SEARCH_STATUS_ID;
				status.textContent = "";
				actionsContainer.appendChild(status);
			}

			let count = actionsContainer.querySelector(`#${SEARCH_COUNT_ID}`);
			if (!count) {
				count = document.createElement("span");
				count.id = SEARCH_COUNT_ID;
				count.textContent = "";
				count.setAttribute("aria-live", "polite");
				actionsContainer.appendChild(count);
			}

			let prevButton = actionsContainer.querySelector(`#${SEARCH_PREV_ID}`);
			if (!prevButton) {
				prevButton = document.createElement("button");
				prevButton.id = SEARCH_PREV_ID;
				prevButton.type = "button";
				prevButton.textContent = "<";
				prevButton.setAttribute("aria-label", "Previous match");
				actionsContainer.appendChild(prevButton);
			}

			let nextButton = actionsContainer.querySelector(`#${SEARCH_NEXT_ID}`);
			if (!nextButton) {
				nextButton = document.createElement("button");
				nextButton.id = SEARCH_NEXT_ID;
				nextButton.type = "button";
				nextButton.textContent = ">";
				nextButton.setAttribute("aria-label", "Next match");
				actionsContainer.appendChild(nextButton);
			}

			let loadButton = actionsContainer.querySelector(`#${SEARCH_LOAD_ID}`);
			if (!loadButton) {
				loadButton = document.createElement("button");
				loadButton.id = SEARCH_LOAD_ID;
				loadButton.type = "button";
				loadButton.textContent = "Load all";
				loadButton.setAttribute(
					"aria-label",
					"Load all playlist videos"
				);
				actionsContainer.appendChild(loadButton);
			}

			let stopButton = actionsContainer.querySelector(`#${SEARCH_STOP_ID}`);
			if (!stopButton) {
				stopButton = document.createElement("button");
				stopButton.id = SEARCH_STOP_ID;
				stopButton.type = "button";
				stopButton.textContent = "Stop";
				stopButton.hidden = true;
				stopButton.setAttribute("aria-label", "Stop loading");
				actionsContainer.appendChild(stopButton);
			}

			return {
				input,
				status,
				count,
				prevButton,
				nextButton,
				loadButton,
				stopButton,
			};
		}

		const bar = document.createElement("div");
		bar.id = SEARCH_BAR_ID;

		const input = document.createElement("input");
		input.id = SEARCH_INPUT_ID;
		input.type = "text";
		input.placeholder = "Search in playlist";
		input.autocomplete = "off";
		input.spellcheck = false;

		const actionsContainer = document.createElement("div");
		actionsContainer.id = SEARCH_ACTIONS_ID;

		const status = document.createElement("span");
		status.id = SEARCH_STATUS_ID;
		status.textContent = "";

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

		const loadButton = document.createElement("button");
		loadButton.id = SEARCH_LOAD_ID;
		loadButton.type = "button";
		loadButton.textContent = "Load all";
		loadButton.setAttribute("aria-label", "Load all playlist videos");

		const stopButton = document.createElement("button");
		stopButton.id = SEARCH_STOP_ID;
		stopButton.type = "button";
		stopButton.textContent = "Stop";
		stopButton.hidden = true;
		stopButton.setAttribute("aria-label", "Stop loading");

		bar.appendChild(input);
		actionsContainer.appendChild(status);
		actionsContainer.appendChild(count);
		actionsContainer.appendChild(prevButton);
		actionsContainer.appendChild(nextButton);
		actionsContainer.appendChild(loadButton);
		actionsContainer.appendChild(stopButton);
		bar.appendChild(actionsContainer);
		renderer.insertBefore(bar, contents);

		return {
			input,
			status,
			count,
			prevButton,
			nextButton,
			loadButton,
			stopButton,
		};
	};

	const getVideoItems = () =>
		Array.from(document.querySelectorAll("ytd-playlist-video-renderer"));

	const getTitleText = (item) => {
		const title = item.querySelector("#video-title");
		return title ? title.textContent.trim() : "";
	};

	const parseNumberValue = (value) => {
		if (value === null || value === undefined) {
			return null;
		}

		const cleaned = String(value).replace(/[^0-9]/g, "");
		if (!cleaned) {
			return null;
		}

		const parsed = Number(cleaned);
		return Number.isFinite(parsed) ? parsed : null;
	};

	const extractRunsText = (textData) => {
		if (!textData) {
			return "";
		}

		if (typeof textData === "string") {
			return textData;
		}

		if (textData.simpleText) {
			return textData.simpleText;
		}

		if (Array.isArray(textData.runs)) {
			return textData.runs.map((run) => run.text || "").join("");
		}

		return "";
	};

	const parseTotalFromText = (text) => {
		if (!text) {
			return { total: null, approx: false };
		}

		const normalized = text.toLowerCase();
		const isApprox = normalized.includes("~") || normalized.includes("about");
		const match = normalized.match(/([0-9][0-9,\.\s]*)\s+videos?/);
		const parsed = match ? parseNumberValue(match[1]) : parseNumberValue(text);
		return { total: parsed, approx: isApprox };
	};

	const findTotalInInitialData = (data) => {
		if (!data || typeof data !== "object") {
			return { total: null, approx: false };
		}

		const queue = [data];
		const visited = new Set();
		let steps = 0;
		const maxSteps = 5000;

		while (queue.length && steps < maxSteps) {
			const current = queue.shift();
			steps += 1;

			if (!current || typeof current !== "object") {
				continue;
			}

			if (visited.has(current)) {
				continue;
			}
			visited.add(current);

			if (typeof current.totalVideos === "number") {
				return { total: current.totalVideos, approx: false };
			}

			if (typeof current.totalVideos === "string") {
				return { total: parseNumberValue(current.totalVideos), approx: false };
			}

			if (current.totalVideosText) {
				const parsed = parseTotalFromText(
					extractRunsText(current.totalVideosText)
				);
				if (parsed.total) {
					return parsed;
				}
			}

			if (Array.isArray(current.stats)) {
				const statsText = current.stats
					.map((stat) => extractRunsText(stat))
					.join(" ");
				const parsed = parseTotalFromText(statsText);
				if (parsed.total) {
					return parsed;
				}
			}

			for (const value of Object.values(current)) {
				if (value && typeof value === "object") {
					queue.push(value);
				}
			}
		}

		return { total: null, approx: false };
	};

	const getInitialDataFromPage = () => {
		try {
			if (window.ytInitialData && typeof window.ytInitialData === "object") {
				return window.ytInitialData;
			}
		} catch (error) {
			return null;
		}

		for (const script of Array.from(document.scripts)) {
			const text = script.textContent;
			if (!text || !text.includes("ytInitialData")) {
				continue;
			}

			if (text.length > 5000000) {
				continue;
			}

			const marker = "ytInitialData =";
			const markerIndex = text.indexOf(marker);
			if (markerIndex === -1) {
				continue;
			}

			const jsonStart = text.indexOf("{", markerIndex);
			if (jsonStart === -1) {
				continue;
			}

			let depth = 0;
			let jsonEnd = -1;
			for (let i = jsonStart; i < text.length; i += 1) {
				const char = text[i];
				if (char === "{") {
					depth += 1;
				} else if (char === "}") {
					depth -= 1;
					if (depth === 0) {
						jsonEnd = i + 1;
						break;
					}
				}
			}

			if (jsonEnd === -1) {
				continue;
			}

			try {
				return JSON.parse(text.slice(jsonStart, jsonEnd));
			} catch (error) {
				return null;
			}
		}

		return null;
	};

	const getTotalFromDom = () => {
		const stats = document.querySelector(
			"ytd-playlist-sidebar-primary-info-renderer #stats"
		);
		if (!stats) {
			return { total: null, approx: false };
		}

		return parseTotalFromText(stats.textContent || "");
	};

	const resolveTotalCount = () => {
		if (loadState.total !== null) {
			return;
		}

		if (!loadState.totalChecked) {
			const initialData = getInitialDataFromPage();
			const parsed = findTotalInInitialData(initialData);
			if (parsed.total) {
				loadState.total = parsed.total;
				loadState.totalApprox = parsed.approx;
				return;
			}
			loadState.totalChecked = true;
		}

		const domParsed = getTotalFromDom();
		if (domParsed.total) {
			loadState.total = domParsed.total;
			loadState.totalApprox = domParsed.approx;
		}
	};

	const updateCount = (count, value) => {
		if (!count) {
			return;
		}

		count.textContent = String(value);
	};

	const updateStatus = (status) => {
		if (!status) {
			return;
		}

		const { loaded, total, totalApprox } = loadState;
		if (typeof total === "number" && total > 0) {
			const prefix = totalApprox ? "~" : "";
			status.textContent = `${loaded} / ${prefix}${total}`;
			return;
		}

		status.textContent = `${loaded}`;
	};

	const updateLoadControls = (loadButton, stopButton) => {
		if (!loadButton || !stopButton) {
			return;
		}

		const total = loadState.total;
		const isComplete =
			total !== null && typeof total === "number" && loadState.loaded >= total;

		loadButton.disabled = loadState.isLoading || isComplete;
		loadButton.setAttribute("aria-busy", String(loadState.isLoading));
		stopButton.hidden = !loadState.isLoading;
	};

	const updateLoadedState = (status, loadButton, stopButton) => {
		loadState.loaded = getVideoItems().length;
		resolveTotalCount();
		updateStatus(status);
		updateLoadControls(loadButton, stopButton);
	};

	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	const waitForNewItems = (contents, previousCount, timeoutMs) =>
		new Promise((resolve) => {
			if (!contents) {
				resolve(previousCount);
				return;
			}

			let done = false;
			const observer = new MutationObserver(() => {
				const current = getVideoItems().length;
				if (current > previousCount) {
					done = true;
					observer.disconnect();
					resolve(current);
				}
			});

			observer.observe(contents, {
				childList: true,
				subtree: true,
			});

			setTimeout(() => {
				if (done) {
					return;
				}
				observer.disconnect();
				resolve(getVideoItems().length);
			}, timeoutMs);
		});

	const autoLoadAll = async (
		contents,
		status,
		loadButton,
		stopButton,
		input,
		count,
		prevButton,
		nextButton
	) => {
		if (loadState.isLoading) {
			return;
		}

		loadState.isLoading = true;
		loadState.stopRequested = false;
		loadState.noGrowthStreak = 0;
		updateLoadedState(status, loadButton, stopButton);

		const maxNoGrowth = 6;
		while (!loadState.stopRequested) {
			const total = loadState.total;
			if (
				total !== null &&
				typeof total === "number" &&
				loadState.loaded >= total
			) {
				break;
			}

			const items = getVideoItems();
			const lastItem = items[items.length - 1];
			
			window.scrollTo({
				top: document.documentElement.scrollHeight,
				behavior: "smooth",
			});

			if (lastItem) {
				lastItem.scrollIntoView({ behavior: "smooth", block: "end" });
			}

			await delay(100);
			window.scrollTo({
				top: document.documentElement.scrollHeight,
				behavior: "smooth",
			});
			window.dispatchEvent(new Event("scroll"));

			const previousCount = items.length;
			const newCount = await waitForNewItems(contents, previousCount, 1500);
			updateLoadedState(status, loadButton, stopButton);

			if (newCount <= previousCount) {
				loadState.noGrowthStreak += 1;
			} else {
				loadState.noGrowthStreak = 0;
			}

			if (loadState.stopRequested) {
				break;
			}

			if (
				loadState.total !== null &&
				loadState.loaded >= loadState.total
			) {
				break;
			}

			if (loadState.noGrowthStreak >= maxNoGrowth) {
				break;
			}

			await delay(250);
		}

		loadState.isLoading = false;
		loadState.stopRequested = false;
		updateLoadedState(status, loadButton, stopButton);
		updateMatches(input.value, count, prevButton, nextButton, {
			resetIndex: false,
		});
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

	const attachLoadListeners = (
		loadButton,
		stopButton,
		contents,
		status,
		input,
		count,
		prevButton,
		nextButton
	) => {
		if (loadButton.dataset.yptListenerAttached !== "true") {
			loadButton.addEventListener("click", () => {
				autoLoadAll(
					contents,
					status,
					loadButton,
					stopButton,
					input,
					count,
					prevButton,
					nextButton
				);
			});
			loadButton.dataset.yptListenerAttached = "true";
		}

		if (stopButton.dataset.yptListenerAttached !== "true") {
			stopButton.addEventListener("click", () => {
				loadState.stopRequested = true;
			});
			stopButton.dataset.yptListenerAttached = "true";
		}
	};

	const observePlaylist = (
		contents,
		input,
		status,
		count,
		prevButton,
		nextButton,
		loadButton,
		stopButton
	) => {
		if (playlistObserver) {
			playlistObserver.disconnect();
		}

		playlistObserver = new MutationObserver(() => {
			updateMatches(input.value, count, prevButton, nextButton, {
				resetIndex: false,
			});
			updateLoadedState(status, loadButton, stopButton);
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

		const {
			input,
			status,
			count,
			prevButton,
			nextButton,
			loadButton,
			stopButton,
		} = ensureSearchBar(
			parts.renderer,
			parts.contents
		);
		if (
			!input ||
			!status ||
			!count ||
			!prevButton ||
			!nextButton ||
			!loadButton ||
			!stopButton
		) {
			return true;
		}

		attachInputListener(input, count, prevButton, nextButton);
		attachNavListeners(prevButton, nextButton);
		attachLoadListeners(
			loadButton,
			stopButton,
			parts.contents,
			status,
			input,
			count,
			prevButton,
			nextButton
		);
		observePlaylist(
			parts.contents,
			input,
			status,
			count,
			prevButton,
			nextButton,
			loadButton,
			stopButton
		);
		updateMatches(input.value, count, prevButton, nextButton, {
			resetIndex: false,
		});
		updateLoadedState(status, loadButton, stopButton);

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
