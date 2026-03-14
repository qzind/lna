import {
	getLnaPermission,
	getLnaPermissionStates,
	getRequiredPermission,
	LnaPermissionName,
	LnaPermissionStates
} from "./permissions.js";
import {LnaError} from "./error.js";

// After a failed connection attempt, returns the permission that applied to the request.
// Returns `null` if the request didn't require a permission, or `undefined` if it couldn't be
// determined.
async function getPermissionAfterError(
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
		const permissionName = await getPermissionAfterError(url.hostname, statesBefore);
		const permission = permissionName
			? await getLnaPermission(permissionName)
			: permissionName;
		throw LnaError.fromPermission(permission, e);
	}
}
