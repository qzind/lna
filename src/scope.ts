type Scope = "loopback" | "local" | "public";

/**
 * Categorizes a WebSocket hostname.
 *
 * Detect loopback (127.0.0.1/8, ::1, , [::1], *localhost*)
 * Everything else is logged as 'local'.
 *
 * * @param {string} hostname - Hostname to check
 * * @param {bool} debug - Enable hostname logging to terminal
 */
export function guessScope(hostname: string): Scope | null {
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
