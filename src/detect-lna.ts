import {
	getLnaPermissionState,
	getLnaPermissionStates,
	getRequiredPermission,
	LnaPermissionName,
	LnaPermissionStates
} from "./permissions.js";

class LnaDeniedError extends Error {
	constructor() {
		super("Local Network Access was denied");
		this.name = this.constructor.name;
	}
}

// After a failed connection attempt, returns the permission that applied to the request.
// Returns `null` if the request didn't require a permission, or `undefined` if it couldn't be
// determined.
async function getDeniedPermission(
	hostname: string,
	statesBefore: LnaPermissionStates
): Promise<LnaPermissionName | null | undefined> {
	const statesAfter = await getLnaPermissionStates();
	for (const [permission, state] of Object.entries(statesAfter) as [LnaPermissionName, PermissionState][]) {
		if (statesBefore[permission] === "prompt" && (state === "denied" || state === 'granted')) {
			return permission;
		}
	}

	return getRequiredPermission(hostname);
}

async function wasLnaDenied(hostname: string, statesBefore: LnaPermissionStates) {
	const permission = await getDeniedPermission(hostname, statesBefore);
	if (permission === null) return false;
	if (permission === undefined) return undefined;

	const state = await getLnaPermissionState(permission);
	if (state === "denied") return true;
	if (state === "granted") return false;
	return undefined;
}

// Execute `callback` and try to detect if it fails due to Local Network Access being denied.
// In that case, an `LnaDeniedError` is thrown, otherwise the original error is rethrown.
export async function detectLna(
	url: string | URL,
	callback: (url: string | URL) => unknown,
): Promise<unknown> {
	if (typeof url === 'string') {
		url = new URL(url);
	}
	const statesBefore = await getLnaPermissionStates();
	try {
		return await callback(url);
	} catch (e) {
		if (await wasLnaDenied(url.hostname, statesBefore)) {
			// TODO: We're in a 'prompt' or 'blocked' scenario, add callback to try fetch again
			// when this status changes
			throw new LnaDeniedError();
		} else {
			throw e;
		}
	}
}
