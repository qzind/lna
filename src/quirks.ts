import Bowser from "bowser";

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
	const browser = Bowser.getParser(window.navigator.userAgent);
	if (browser.satisfies({chrome: '<142', edge: '<=147'})) {
		// Official Chrome communication indicates that permissions should work
		// starting with v138 if opting into Dev Trial, but testing shows that
		// this is already available in v136.
		// Microsoft Edge docs & changelog state that LNA restrictions apply
		// since version 143, but automated testing on Linux shows no effect.
		// TODO: Test if permissions do apply on Windows build of Edge or when testing manually
		q.permissionsAreOptIn = true;
	}
	if (browser.satisfies({chrome: '<147'})) {
		q.webSocketsUnrestricted = true;
	}

	if (browser.isBrowser('firefox')) {
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
