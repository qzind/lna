type AddressSpace = "loopback" | "local" | "public" | "unknown";

/**
 * Categorizes a WebSocket hostname.
 *
 * Detect loopback (127.0.0.1/8, ::1, , [::1], *localhost*)
 * Everything else is logged as 'local'.
 *
 * * @param {string} hostname - Hostname to check
 */
export function guessAddressSpace(hostname: string): AddressSpace {
    const host = hostname.toLowerCase();

    if (host.indexOf('localhost') > -1 ||
        host === '::1' ||
        host === '[::1]' ||
        host.indexOf('127.') === 0
    ) {
        return "loopback"
    }

    return "local";
}

// Assumes that loopback is always detected, i.e. "unknown" can't include "loopback"
export function isLessPublic(lhs: AddressSpace, rhs: AddressSpace): boolean | undefined {
    if ((lhs === "loopback" && rhs !== "loopback") ||
        (lhs === "local" && rhs === "public")) {
        return true;
    }
    if (rhs === "loopback" || lhs === "public" ||
        (lhs !== "unknown" && rhs !== "unknown")
    ) {
        return false;
    }
    return undefined;
}
