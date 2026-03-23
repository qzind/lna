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
	url: URL,
	statesBefore: LnaPermissionStates,
	options?: LnaOptions,
): Promise<LnaPermissionName | null | undefined> {
	const statesAfter = await getLnaPermissionStates();
	for (const [permission, state] of Object.entries(statesAfter) as [LnaPermissionName, PermissionState][]) {
		if (statesBefore[permission] === "prompt" && (state === "denied" || state === 'granted')) {
			return permission;
		}
	}

	return getRequiredPermission(url, options?.overrides);
}

export type Resource = string | URL | Request;
export type Promisify<T> = Promise<Awaited<T>>;

// Execute `callback` and try to detect if it fails due to Local Network Access being denied.
// In that case, an `LnaDeniedError` is thrown, otherwise the original error is rethrown.
export async function detectLna<R>(
	resource: Resource,
	callback: (url: string | URL) => R,
	options?: LnaOptions
): Promisify<R> {
	const url = getUrl(resource);
	if (options?.isWebSocket && url.protocol === 'http:') {
		url.protocol = 'ws:';
	}
	if (options?.isWebSocket && url.protocol === 'https:') {
		url.protocol = 'wss:';
	}

	const statesBefore = await getLnaPermissionStates();
	try {
		return await callback(url);
	} catch (e) {
		if (isNonConnectionError(e)) {
			throw e;
		}
		const permissionName = await getPermissionAfterError(url, statesBefore, options);
		const permission = permissionName
			? await getLnaPermission(permissionName)
			: permissionName;
		throw LnaError.fromPermission(permission, e);
	}
}

function getUrl(resource: Resource) {
	if (resource instanceof URL || typeof resource === 'string') {
		return new URL(resource);
	} else if (resource instanceof Request) {
		return new URL(resource.url);
	} else {
		throw new TypeError(`Invalid resource parameter type ${typeof resource}`);
	}
}

export function isNonConnectionError(e: unknown): boolean {
	return isFetchNonConnectionError(e) ?? isWebSocketNonConnectionError(e);
}

export function isFetchNonConnectionError(e: unknown): boolean {
	if (e instanceof DOMException) {
		return true;
	} else if (e instanceof TypeError) {
		return !!e.message.match(
			/Failed to parse URL|not a valid URL|is not supported/
		);
	} else {
		// Not a fetch error at all
		return false;
	}
}

export function isWebSocketNonConnectionError(e: unknown): boolean | undefined {
	if (e instanceof SyntaxError) {
		return true;
	}
}
