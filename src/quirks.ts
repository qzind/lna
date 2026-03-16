import Bowser from "bowser";

export type BrowserQuirks = Partial<{
	// Permissions are only enforced if the user opts-in, even if set via WebDriver
	permissionsAreOptIn: boolean
	// Permissions query may return `prompt` even after it was denied/granted through user interaction
	permissionsMayNotReflectUserInteraction: boolean
}>;

export function getBrowserQuirks(): BrowserQuirks {
	const q: BrowserQuirks = {};
	const browser = Bowser.getParser(window.navigator.userAgent);
	if (browser.satisfies({chrome: '>=136'}) && browser.satisfies({chrome: '<142'})) {
		// Official Chrome communication indicates that permissions should work
		// starting with v138 if opting into Dev Trial, but testing shows that
		// this is already available in v136
		q.permissionsAreOptIn = true;
	}

	if (browser.isBrowser('firefox')) {
		// TODO: Re-check, may be fixed by version 150
		//  https://bugzilla.mozilla.org/show_bug.cgi?id=1924572,
		q.permissionsMayNotReflectUserInteraction = true;
	}

	return q;
}
