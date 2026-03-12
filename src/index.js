import {getRequiredPermission} from "./permissions";

async function wasLnaDenied(hostname) {
	const permission = getRequiredPermission(hostname);
	if (permission === null) return false;
	if (permission === undefined) return undefined;

	const state = (await navigator.permissions.query(permission)).state;
	if (state === "denied") return true;
	if (state === "granted") return false;
	return undefined;
}

class LnaDeniedError extends Error {
	constructor() {
		super("Local Network Access was denied");
		this.name = this.constructor.name;
	}
}

async function fetchLna(url) {
	try {
		return await fetch(url);
	} catch (e) {
		if (await wasLnaDenied(new URL(url).hostname, true)) {
			// TODO: We're in a 'prompt' or 'blocked' scenario, add callback to try fetch again
			// when this status changes
			throw new LnaDeniedError();
		} else {
			throw e;
		}
	}
}
