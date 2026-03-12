import {detectLna} from "./detect-lna";

async function fetchLna(url) {
	return await detectLna(url, fetch);
}
