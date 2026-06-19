// Shared constants and helpers, loaded as a plain script by both the
// content script (see manifest.json) and the options page (options.html).

// Highlight color palette (hex only; RGB strings are derived via yptHexToRgbStr)
const YPT_COLORS = {
	red: "#ff0000",
	blue: "#0088ff",
	green: "#10b981",
	amber: "#f59e0b",
	purple: "#8b5cf6",
};

const YPT_DEFAULT_SETTINGS = {
	highlightColor: "red",
	customColor: "#ff00ff",
	iconTheme: "dark",
	scrollBehavior: "smooth",
	autoLoadAll: false,
	searchMode: "titles",
};

// Convert a hex color to an "r, g, b" string usable inside rgba()
const yptHexToRgbStr = (hex) => {
	const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
	return result
		? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
		: "255, 0, 0";
};
