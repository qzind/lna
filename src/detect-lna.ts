import {
	getLnaPermission,
	getLnaPermissionStates,
	getRequiredPermission,
	LnaPermissionName,
	LnaPermissionStates
} from "./permissions.js";
import {LnaError} from "./error.js";
import {LnaOptions} from "./options.js";

// After a failed connection attempt, returns the permission that applied to the request.
// Returns `null` if the request didn't require a permission, or `undefined` if it couldn't be
// determined.
async function getPermissionAfterError(
	hostname: string,
	statesBefore: LnaPermissionStates,
	options?: LnaOptions,
): Promise<LnaPermissionName | null | undefined> {
	const statesAfter = await getLnaPermissionStates();
	for (const [permission, state] of Object.entries(statesAfter) as [LnaPermissionName, PermissionState][]) {
		if (statesBefore[permission] === "prompt" && (state === "denied" || state === 'granted')) {
			return permission;
		}
	}

	return getRequiredPermission(hostname, options?.overrides);
}

// Execute `callback` and try to detect if it fails due to Local Network Access being denied.
// In that case, an `LnaDeniedError` is thrown, otherwise the original error is rethrown.
export async function detectLna(
	url: string | URL,
	callback: (url: string | URL) => unknown,
	options?: LnaOptions
): Promise<unknown> {
	if (typeof url === 'string') {
		url = new URL(url);
	}
	const statesBefore = await getLnaPermissionStates();
	try {
		return await callback(url);
	} catch (e) {
		if (isNonConnectionError(e)) {
			throw e;
		}
		const permissionName = await getPermissionAfterError(url.hostname, statesBefore, options);
		const permission = permissionName
			? await getLnaPermission(permissionName)
			: permissionName;
		throw LnaError.fromPermission(permission, e);
	}
}

export function isNonConnectionError(e: unknown): boolean {
	return isFetchNonConnectionError(e) ?? isWebSocketNonConnectionError(e);
}

export function isFetchNonConnectionError(e: unknown): boolean {
	if (!(e instanceof TypeError)) {
		return true;
	}
	return !!e.message.match(
		/Failed to parse URL|not a valid URL|is not supported/
	);
}

export function isWebSocketNonConnectionError(e: unknown): boolean | undefined {
	if (e instanceof SyntaxError) {
		return true;
	}
}
