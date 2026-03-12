import {getLnaPermissionState, getRequiredPermission} from "./permissions.js";

class LnaDeniedError extends Error {
    constructor() {
        super("Local Network Access was denied");
        this.name = this.constructor.name;
    }
}

async function wasLnaDenied(hostname: string) {
    const permission = getRequiredPermission(hostname);
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
    try {
        return await callback(url);
    } catch (e) {
        if (await wasLnaDenied(url.hostname)) {
            // TODO: We're in a 'prompt' or 'blocked' scenario, add callback to try fetch again
            // when this status changes
            throw new LnaDeniedError();
        } else {
            throw e;
        }
    }
}
