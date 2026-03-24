export type BrowserQuirks = Partial<{
	// Permissions are only enforced if the user opts-in, even if set via WebDriver
	permissionsAreOptIn: boolean
	// Permissions query may return `prompt` even after it was denied/granted through user
	// interaction
	permissionsMayNotReflectUserInteraction: boolean
	// LNA restrictions do not apply to WebSockets
	webSocketsUnrestricted: boolean
}>;

export function getBrowserQuirks(): BrowserQuirks {
	const q: BrowserQuirks = {};

	if (is('edge', '<=', 147) ||
		is('chrome', '<', 142)) {
		// Official Chrome communication indicates that permissions should work
		// starting with v138 if opting into Dev Trial, but testing shows that
		// this is already available in v136.
		// Microsoft Edge docs & changelog state that LNA restrictions apply
		// since version 143, but automated testing on Linux shows no effect.
		// TODO: Test if permissions do apply on Windows build of Edge or when testing manually
		q.permissionsAreOptIn = true;
	}
	// Chrome announced to enable LNA restrictions in v147
	// Edge has no such announcement yet: https://learn.microsoft.com/en-us/deployedge/ms-edge-local-network-access
	if (is('chrome', '<', 147) || is('edge')) {
		q.webSocketsUnrestricted = true;
	}

	if (is('firefox')) {
		// TODO: Re-check, may be fixed by version 150
		//  https://bugzilla.mozilla.org/show_bug.cgi?id=1924572,
		q.permissionsMayNotReflectUserInteraction = true;
		// WebSocket restrictions are currently disabled in Firefox because of backwards
		// compatibility breaks. See
		//  - https://bugzilla.mozilla.org/show_bug.cgi?id=1993938
		//  - https://bugzilla.mozilla.org/show_bug.cgi?id=1996551
		q.webSocketsUnrestricted = true;
	}

	return q;
}

const BrowserUANames = {
	edge: 'Edg',
	chrome: 'Chrome',
	firefox: 'Firefox',
	safari: 'Safari',
} as const;
type Browser = keyof typeof BrowserUANames;

function is(browser: Browser): boolean;
function is(browser: Browser, cmp: '<' | '<=' | '=' | '>=' | '>', version: number):boolean;
function is(browser: Browser, cmp?: '<' | '<=' | '=' | '>=' | '>', version?: number) {
	const detectedVersion = getUAMajorVersion(BrowserUANames[browser]);
	if (! version) return !!detectedVersion;
	if (!detectedVersion) return false;
	switch (cmp) {
		case '<': return detectedVersion < version;
		case '<=': return detectedVersion <= version;
		case '=': return detectedVersion === version;
		case '>=': return detectedVersion >= version;
		case '>': return detectedVersion > version;
	}
}

function getUAMajorVersion(name: string) {
	const ua = window.navigator.userAgent;
	const match = ua.match(new RegExp(`${name}/([\\d.]+)`));
	return match ? parseInt(match[1]) : null;
}
