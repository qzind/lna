import {
	getLnaPermission,
	getLnaPermissionStates,
	getRequiredPermission,
	LnaPermissionName,
	LnaPermissionStates
} from "./permissions.js";
import {LnaError} from "./error.js";
import {defaultOptions, LnaOptions} from "./options.js";

// After a failed connection attempt, returns the permission that applied to the request.
// Returns `null` if the request didn't require a permission, or `undefined` if it couldn't be
// determined.
async function getPermissionAfterError(
	url: URL,
	statesBefore?: LnaPermissionStates,
	options?: LnaOptions,
): Promise<PermissionStatus | null | undefined> {
	if (statesBefore) {
		const changedPermission = await findChangedPermission(statesBefore);
		if (changedPermission) return changedPermission;
	}
	return await getRequiredPermission(url, options);
}

async function findChangedPermission(statesBefore: LnaPermissionStates): Promise<PermissionStatus | undefined> {
	for (const [name, stateBefore] of Object.entries(statesBefore) as [LnaPermissionName, PermissionState][]) {
		if (stateBefore === "prompt") {
			const perm = await getLnaPermission(name);
			if (!perm) continue;
			const stateAfter = perm?.state;
			if (stateAfter === "denied" || stateAfter === 'granted') {
				return perm;
			}
		}
	}
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
	options ??= defaultOptions;

	const statesBefore = await getLnaPermissionStates();
	try {
		return await callback(url);
	} catch (error) {
		const isConnectionError = options?.isConnectionError
			?? (e => !isNonConnectionError(e, options));
		if (!isConnectionError(error)) {
			throw error;
		}

		throw await detectLnaError({
			error,
			url,
			permissionStatesBefore: statesBefore
		}, options);
	}
}

export async function detectLnaError<E>(
	context: {
		error: E,
		url: URL,
		permissionStatesBefore?: LnaPermissionStates,
	},
	options?: Omit<LnaOptions, 'isConnectionError'>,
): Promise<LnaError> {
	options ??= defaultOptions;
	const permission = await getPermissionAfterError(
		context.url, context.permissionStatesBefore, options,
	);
	return LnaError.fromPermission(permission, context.error);
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

export function isNonConnectionError(e: unknown, options?: LnaOptions): boolean {
	if (options?.isWebSocket === true) {
		return isWebSocketNonConnectionError(e);
	} else {
		return isFetchNonConnectionError(e) ?? isWebSocketNonConnectionError(e);
	}
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

export function isWebSocketNonConnectionError(e: unknown): boolean {
	return e instanceof SyntaxError;
}
