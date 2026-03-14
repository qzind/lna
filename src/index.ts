import {detectLna} from "./detect-lna.js";

async function fetchLna(url: URL | string) {
	return await detectLna(url, fetch);
}

export {
	fetchLna,
	detectLna,
};

export {LnaError} from "./error.js";
