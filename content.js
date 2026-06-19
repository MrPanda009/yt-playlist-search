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
	const CONTEXT = {
		BROWSE: "browse",
		WATCH: "watch",
	};

	let playlistObserver = null;
	let bootObserver = null;
	let bootCheckScheduled = false;
	let currentContext = null;
	let currentRenderer = null;
	let currentParts = null;
	let ui = null;
	let setupQueued = false;
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

	const settingsState = {
		highlightColor: YPT_DEFAULT_SETTINGS.highlightColor,
		customColor: YPT_DEFAULT_SETTINGS.customColor,
		scrollBehavior: YPT_DEFAULT_SETTINGS.scrollBehavior,
		autoLoadAll: YPT_DEFAULT_SETTINGS.autoLoadAll,
		searchMode: YPT_DEFAULT_SETTINGS.searchMode,
	};

	const getScrollBehaviorOption = () =>
		settingsState.scrollBehavior === "instant" ? "auto" : "smooth";

	const applyHighlightColor = (colorName) => {
		const hex =
			colorName === "custom"
				? settingsState.customColor || YPT_DEFAULT_SETTINGS.customColor
				: YPT_COLORS[colorName] || YPT_COLORS.red;
		document.documentElement.style.setProperty("--ypt-highlight-color", hex);
		document.documentElement.style.setProperty("--ypt-highlight-rgb", yptHexToRgbStr(hex));
	};

	const getPlaceholderText = (mode) => {
		const isWatch = currentContext === CONTEXT.WATCH;
		if (mode === "titles") {
			return isWatch ? "Search by title..." : "Search by title (use @ to search channel)...";
		}
		if (mode === "channels") {
			return "Search by channel name...";
		}
		if (mode === "both") {
			return isWatch ? "Search playlist..." : "Search title or channel...";
		}
		return "Search in playlist";
	};

	const updatePlaceholder = () => {
		if (!ui || !ui.input) {
			return;
		}
		ui.input.placeholder = getPlaceholderText(settingsState.searchMode);
	};

	const initSettings = () => {
		const storage = typeof chrome !== "undefined" && chrome.storage ? chrome.storage : (typeof browser !== "undefined" && browser.storage ? browser.storage : null);
		if (!storage || !storage.sync) {
			return;
		}

		storage.sync.get({ ...settingsState }, (items) => {
			Object.assign(settingsState, items);
			applyHighlightColor(settingsState.highlightColor);
			updatePlaceholder();
		});

		storage.onChanged.addListener((changes, areaName) => {
			if (areaName === "sync") {
				let changed = false;
				let modeChanged = false;
				for (const [key, value] of Object.entries(changes)) {
					if (key in settingsState) {
						settingsState[key] = value.newValue;
						changed = true;
						if (key === "searchMode") {
							modeChanged = true;
						}
					}
				}
				if (changed) {
					applyHighlightColor(settingsState.highlightColor);
					if (modeChanged) {
						updatePlaceholder();
						if (ui && ui.input) {
							updateMatches(ui.input.value, { resetIndex: false });
						}
					}
				}
			}
		});
	};

	initSettings();

	const isPlaylistUrl = () => {
		try {
			const url = new URL(window.location.href);
			if (url.pathname === "/playlist") {
				return true;
			}
			return url.pathname === "/watch" && url.searchParams.has("list");
		} catch (error) {
			return false;
		}
	};

	const resetLoadState = () => {
		loadState.loaded = 0;
		loadState.total = null;
		loadState.totalApprox = false;
		loadState.totalChecked = false;
		loadState.isLoading = false;
		loadState.stopRequested = false;
		loadState.noGrowthStreak = 0;
	};

	const isRendererVisible = (renderer) => {
		if (!renderer) {
			return false;
		}

		if (renderer.hasAttribute("hidden")) {
			return false;
		}

		if (renderer.getAttribute("aria-hidden") === "true") {
			return false;
		}

		const style = window.getComputedStyle(renderer);
		if (style.display === "none" || style.visibility === "hidden") {
			return false;
		}

		return true;
	};

	const getActiveWatchRenderer = () => {
		const renderers = Array.from(
			document.querySelectorAll("ytd-playlist-panel-renderer")
		);
		return renderers.find(isRendererVisible) || null;
	};

	const findWatchActionsRow = (renderer) => {
		const loopButton = renderer.querySelector(
			"ytd-playlist-loop-button-renderer"
		);
		if (loopButton && loopButton.parentElement) {
			return loopButton.parentElement;
		}

		const shuffleButton = renderer.querySelector(
			"ytd-playlist-shuffle-button-renderer"
		);
		if (shuffleButton && shuffleButton.parentElement) {
			return shuffleButton.parentElement;
		}

		return (
			renderer.querySelector("#top-level-buttons") ||
			renderer.querySelector("#playlist-action-menu") ||
			renderer.querySelector("#playlist-actions") ||
			renderer.querySelector("#header")
		);
	};

	const getBrowsePlaylistParts = () => {
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

		return {
			renderer,
			contents,
			actionsRow: null,
			scrollContainer: null,
			context: CONTEXT.BROWSE,
		};
	};

	const getWatchPlaylistParts = () => {
		const renderer = getActiveWatchRenderer();
		if (!renderer) {
			return null;
		}

		const contents =
			renderer.querySelector("#contents") ||
			renderer.querySelector("#items") ||
			renderer;

		return {
			renderer,
			contents,
			actionsRow: findWatchActionsRow(renderer),
			scrollContainer: contents,
			context: CONTEXT.WATCH,
		};
	};

	const getPlaylistParts = () =>
		getBrowsePlaylistParts() || getWatchPlaylistParts();

	const hasChipFilters = () => {
		const selectors = [
			"ytd-feed-filter-chip-bar-renderer",
			"yt-chip-cloud-renderer",
			"#chips",
			"#chip-bar",
			".ytChipBarViewModelChipBarScrollContainer",
		];
		for (const selector of selectors) {
			const el = document.querySelector(selector);
			if (el && el.offsetHeight > 0) {
				return true;
			}
		}
		return false;
	};

	// Return the child with the given id, creating (and initializing) it once if missing
	const ensureChild = (parent, tag, id, init, options = {}) => {
		let el = parent.querySelector(`#${id}`);
		if (!el) {
			el = document.createElement(tag);
			el.id = id;
			if (init) {
				init(el);
			}
			if (options.first && parent.firstChild) {
				parent.insertBefore(el, parent.firstChild);
			} else {
				parent.appendChild(el);
			}
		}
		return el;
	};

	const buildSearchBarChildren = (bar) => {
		const input = ensureChild(
			bar,
			"input",
			SEARCH_INPUT_ID,
			(el) => {
				el.type = "text";
				el.placeholder = getPlaceholderText(settingsState.searchMode);
				el.autocomplete = "off";
				el.spellcheck = false;
			},
			{ first: true }
		);

		const actionsContainer = ensureChild(bar, "div", SEARCH_ACTIONS_ID);

		const status = ensureChild(actionsContainer, "span", SEARCH_STATUS_ID);

		const count = ensureChild(actionsContainer, "span", SEARCH_COUNT_ID, (el) => {
			el.setAttribute("aria-live", "polite");
		});

		const prevButton = ensureChild(actionsContainer, "button", SEARCH_PREV_ID, (el) => {
			el.type = "button";
			el.textContent = "<";
			el.setAttribute("aria-label", "Previous match");
		});

		const nextButton = ensureChild(actionsContainer, "button", SEARCH_NEXT_ID, (el) => {
			el.type = "button";
			el.textContent = ">";
			el.setAttribute("aria-label", "Next match");
		});

		const loadButton = ensureChild(actionsContainer, "button", SEARCH_LOAD_ID, (el) => {
			el.type = "button";
			el.textContent = "Load all";
			el.setAttribute("aria-label", "Load all playlist videos");
		});

		const stopButton = ensureChild(actionsContainer, "button", SEARCH_STOP_ID, (el) => {
			el.type = "button";
			el.textContent = "Stop";
			el.hidden = true;
			el.setAttribute("aria-label", "Stop loading");
		});

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

	const ensureSearchBar = (renderer, contents, options = {}) => {
		const { context, actionsRow } = options;
		const useInline = context === CONTEXT.WATCH;

		let bar = document.getElementById(SEARCH_BAR_ID);
		if (!bar) {
			bar = document.createElement("div");
			bar.id = SEARCH_BAR_ID;
		}
		bar.classList.toggle("ypt-inline", useInline);

		if (useInline && actionsRow) {
			if (bar.parentElement !== actionsRow) {
				actionsRow.appendChild(bar);
			}
		} else if (renderer && contents) {
			if (bar.parentElement !== renderer) {
				renderer.insertBefore(bar, contents);
			}
		} else if (renderer && !bar.parentElement) {
			renderer.appendChild(bar);
		}

		return buildSearchBarChildren(bar);
	};

	const getVideoItems = () => {
		if (currentContext === CONTEXT.WATCH) {
			const root =
				currentRenderer && currentRenderer.isConnected
					? currentRenderer
					: document;
			return Array.from(
				root.querySelectorAll("ytd-playlist-panel-video-renderer")
			);
		}

		if (currentContext === CONTEXT.BROWSE) {
			return Array.from(
				document.querySelectorAll("ytd-playlist-video-renderer")
			);
		}

		return Array.from(
			document.querySelectorAll(
				"ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer"
			)
		);
	};

	const getContinuationItem = () => {
		if (currentContext === CONTEXT.WATCH) {
			const root =
				currentRenderer && currentRenderer.isConnected
					? currentRenderer
					: document;
			return root.querySelector("ytd-continuation-item-renderer");
		}

		return document.querySelector(
			"ytd-playlist-video-list-renderer ytd-continuation-item-renderer"
		);
	};

	const getTitleText = (item) => {
		const title = item.querySelector("#video-title");
		return title ? title.textContent.trim() : "";
	};

	const getChannelText = (item) => {
		const selectors = [
			"ytd-channel-name a",
			"#channel-name a",
			"#byline a",
			"ytd-channel-name",
			"#channel-name",
			"#byline-container",
			"#byline",
			".ytd-channel-name",
			"#metadata"
		];
		for (const selector of selectors) {
			const el = item.querySelector(selector);
			if (el) {
				const text = el.textContent.trim();
				if (text) {
					return text.replace(/\s+/g, ' ');
				}
			}
		}
		return "";
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
		if (currentContext === CONTEXT.WATCH) {
			const root =
				currentRenderer && currentRenderer.isConnected
					? currentRenderer
					: null;
			const stats = root ? root.querySelector("#stats") : null;
			if (stats) {
				return parseTotalFromText(stats.textContent || "");
			}
		}

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

	const updateCount = (value) => {
		if (!ui) {
			return;
		}

		ui.count.textContent = String(value);
	};

	const updateStatus = () => {
		if (!ui) {
			return;
		}

		const { loaded, total, totalApprox } = loadState;
		if (typeof total === "number" && total > 0) {
			const prefix = totalApprox ? "~" : "";
			ui.status.textContent = `${loaded} / ${prefix}${total}`;
			return;
		}

		ui.status.textContent = `${loaded}`;
	};

	const updateLoadControls = () => {
		if (!ui) {
			return;
		}

		const total = loadState.total;
		const isComplete =
			total !== null && typeof total === "number" && loadState.loaded >= total;

		ui.loadButton.disabled = loadState.isLoading || isComplete;
		ui.loadButton.setAttribute("aria-busy", String(loadState.isLoading));
		ui.stopButton.hidden = !loadState.isLoading;
	};

	const updateLoadedState = () => {
		loadState.loaded = getVideoItems().length;
		resolveTotalCount();
		updateStatus();
		updateLoadControls();
	};

	const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	const isWindowScrollContainer = (container) =>
		!container ||
		container === document.documentElement ||
		container === document.body;

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

	const autoLoadAll = async () => {
		if (loadState.isLoading || !currentParts || !ui) {
			return;
		}

		const { contents, scrollContainer } = currentParts;

		loadState.isLoading = true;
		loadState.stopRequested = false;
		loadState.noGrowthStreak = 0;
		updateLoadedState();

		const maxNoGrowth = 15;
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
			const spinner = getContinuationItem();

			if (spinner) {
				spinner.scrollIntoView({ behavior: getScrollBehaviorOption(), block: "center" });
			} else if (lastItem) {
				lastItem.scrollIntoView({ behavior: getScrollBehaviorOption(), block: "end" });
			}

			if (isWindowScrollContainer(scrollContainer)) {
				window.scrollTo({
					top: document.documentElement.scrollHeight,
					behavior: getScrollBehaviorOption(),
				});

				await delay(150);
				window.scrollTo({
					top: document.documentElement.scrollHeight - 150,
					behavior: getScrollBehaviorOption(),
				});
				await delay(50);
				window.scrollTo({
					top: document.documentElement.scrollHeight,
					behavior: getScrollBehaviorOption(),
				});
				window.dispatchEvent(new Event("scroll"));
			} else {
				const maxScroll = scrollContainer.scrollHeight;
				scrollContainer.scrollTo({
					top: maxScroll,
					behavior: getScrollBehaviorOption(),
				});

				await delay(150);
				scrollContainer.scrollTo({
					top: Math.max(0, maxScroll - 150),
					behavior: getScrollBehaviorOption(),
				});
				await delay(50);
				scrollContainer.scrollTo({
					top: maxScroll,
					behavior: getScrollBehaviorOption(),
				});
				scrollContainer.dispatchEvent(new Event("scroll", { bubbles: true }));
			}

			const previousCount = items.length;
			const newCount = await waitForNewItems(contents, previousCount, 3000);
			updateLoadedState();

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

			const currentSpinner = getContinuationItem();
			if (loadState.noGrowthStreak >= 2 && !currentSpinner) {
				break;
			}

			if (loadState.noGrowthStreak >= maxNoGrowth) {
				break;
			}

			await delay(250);
		}

		loadState.isLoading = false;
		loadState.stopRequested = false;
		updateLoadedState();
		updateMatches(ui.input.value, { resetIndex: false });
	};

	const updateNavigationState = (hasQuery) => {
		const hasMatches = searchState.matches.length > 0;
		const disabled = !hasQuery || !hasMatches;
		ui.prevButton.disabled = disabled;
		ui.nextButton.disabled = disabled;
		ui.prevButton.setAttribute("aria-disabled", String(disabled));
		ui.nextButton.setAttribute("aria-disabled", String(disabled));
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

	const updateMatches = (query, options) => {
		if (!ui) {
			return;
		}

		const normalized = query.trim().toLowerCase();
		const items = getVideoItems();

		searchState.query = query;
		searchState.matches = [];
		searchState.index = -1;

		let actualMode = settingsState.searchMode;
		let matchQuery = normalized;

		// Power Search logic using only '@' prefix to trigger channel search
		if (normalized.startsWith("@")) {
			actualMode = "channels";
			matchQuery = normalized.slice(1).trim();
		}

		// If query is empty OR if power search mode is triggered but the query is only '@' (empty channel name query)
		if (normalized.length === 0 || (normalized === "@" && matchQuery.length === 0)) {
			items.forEach((item) =>
				item.classList.remove(HIGHLIGHT_CLASS, ACTIVE_CLASS)
			);
			updateCount("");
			updateNavigationState(false);
			return;
		}

		items.forEach((item) => {
			const titleText = getTitleText(item).toLowerCase();
			const channelText = getChannelText(item).toLowerCase();

			let isMatch = false;
			if (actualMode === "titles") {
				isMatch = titleText.includes(matchQuery);
			} else if (actualMode === "channels") {
				isMatch = channelText.includes(matchQuery);
			} else if (actualMode === "both") {
				isMatch = titleText.includes(matchQuery) || channelText.includes(matchQuery);
			}

			item.classList.toggle(HIGHLIGHT_CLASS, isMatch);
			item.classList.remove(ACTIVE_CLASS);
			if (isMatch) {
				searchState.matches.push(item);
			}
		});

		if (searchState.matches.length === 0) {
			updateCount("0");
			updateNavigationState(true);
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
		updateCount(searchState.matches.length);
		updateNavigationState(true);
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
			active.scrollIntoView({ behavior: getScrollBehaviorOption(), block: "center" });
		}
	};

	const attachListeners = () => {
		const { input, prevButton, nextButton, loadButton, stopButton } = ui;

		if (input.dataset.yptListenerAttached !== "true") {
			input.addEventListener("input", () => {
				updateMatches(input.value, { resetIndex: true });
			});

			input.addEventListener("keydown", (event) => {
				if (event.key === "Enter") {
					event.preventDefault();
					stepMatch(1);
				}
			});

			input.dataset.yptListenerAttached = "true";
		}

		if (prevButton.dataset.yptListenerAttached !== "true") {
			prevButton.addEventListener("click", () => stepMatch(-1));
			prevButton.dataset.yptListenerAttached = "true";
		}

		if (nextButton.dataset.yptListenerAttached !== "true") {
			nextButton.addEventListener("click", () => stepMatch(1));
			nextButton.dataset.yptListenerAttached = "true";
		}

		if (loadButton.dataset.yptListenerAttached !== "true") {
			loadButton.addEventListener("click", () => {
				autoLoadAll();
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

	const observePlaylist = (contents) => {
		if (playlistObserver) {
			playlistObserver.disconnect();
		}

		playlistObserver = new MutationObserver(() => {
			updateMatches(ui.input.value, { resetIndex: false });
			updateLoadedState();
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

		if (
			parts.renderer !== currentRenderer ||
			parts.context !== currentContext
		) {
			currentRenderer = parts.renderer;
			currentContext = parts.context;
			resetLoadState();
		}
		currentParts = parts;

		ui = ensureSearchBar(parts.renderer, parts.contents, parts);
		updatePlaceholder();

		const bar = document.getElementById(SEARCH_BAR_ID);
		if (bar && parts.context === CONTEXT.BROWSE) {
			bar.classList.toggle("ypt-no-chips", !hasChipFilters());
		}

		attachListeners();
		observePlaylist(parts.contents);
		updateMatches(ui.input.value, { resetIndex: false });
		updateLoadedState();

		if (settingsState.autoLoadAll && !loadState.isLoading && !loadState.stopRequested && loadState.loaded < (loadState.total || 9999)) {
			setTimeout(() => {
				if (settingsState.autoLoadAll && !loadState.isLoading && !loadState.stopRequested) {
					autoLoadAll();
				}
			}, 1000);
		}

		return true;
	};

	const queueSetup = (attempt = 0) => {
		if (setupQueued && attempt === 0) {
			return;
		}

		setupQueued = true;
		const delay = attempt === 0 ? 0 : Math.min(100 * Math.pow(2, attempt - 1), 1000);
		const run = () => {
			setupQueued = false;
			const success = setup();
			// If setup failed (renderer not in DOM yet), retry up to 5 times (~3.1s total)
			if (!success && attempt < 5 && isPlaylistUrl()) {
				queueSetup(attempt + 1);
			}
		};
		if (delay === 0) {
			requestAnimationFrame(run);
		} else {
			setTimeout(run, delay);
		}
	};

	const shouldQueueSetup = () => {
		if (!isPlaylistUrl()) {
			return false;
		}

		const parts = getPlaylistParts();
		if (!parts) {
			return false;
		}

		const bar = document.getElementById(SEARCH_BAR_ID);
		if (!bar || !bar.isConnected) {
			return true;
		}

		if (parts.context === CONTEXT.WATCH) {
			if (!isRendererVisible(parts.renderer)) {
				return true;
			}

			if (parts.actionsRow) {
				return bar.parentElement !== parts.actionsRow;
			}

			return !parts.renderer.contains(bar);
		}

		if (parts.context === CONTEXT.BROWSE) {
			return !parts.renderer.contains(bar);
		}

		return false;
	};

	const ensureBootObserver = () => {
		if (bootObserver) {
			return;
		}

		// YouTube mutates the DOM constantly; throttle the (expensive)
		// shouldQueueSetup check to at most once per 250ms, trailing edge.
		bootObserver = new MutationObserver(() => {
			if (bootCheckScheduled) {
				return;
			}
			bootCheckScheduled = true;
			setTimeout(() => {
				bootCheckScheduled = false;
				if (shouldQueueSetup()) {
					queueSetup();
				}
			}, 250);
		});

		bootObserver.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	};

	const waitForPlaylist = () => {
		if (!isPlaylistUrl()) {
			return;
		}

		setup();
		ensureBootObserver();
	};

	window.addEventListener("yt-navigate-finish", () => {
		waitForPlaylist();
	});

	window.addEventListener("yt-page-data-updated", () => {
		waitForPlaylist();
	});

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", waitForPlaylist, {
			once: true,
		});
	} else {
		waitForPlaylist();
	}
})();
