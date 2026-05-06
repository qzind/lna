import is from "./browser";

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

	if (is('edge', '<', 143) ||
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
	if (is('chrome', '<', 147) ||
		is('edge', '<', 147)) {
		q.webSocketsUnrestricted = true;
	}

	if (is('firefox')) {
		// WebSocket restrictions are currently disabled in Firefox because of backwards
		// compatibility breaks. See
		//  - https://bugzilla.mozilla.org/show_bug.cgi?id=1993938
		//  - https://bugzilla.mozilla.org/show_bug.cgi?id=1996551
		q.webSocketsUnrestricted = true;
	}

	// Release notes state that LNA restrictions are extended to all users with v150 (as opposed to
	// just ETP Strict users): https://www.firefox.com/en-US/firefox/150.0beta/releasenotes/
	// Testing however shows this to be the case starting with v151 only, as corroborated by the
	// support page:
	// https://support.mozilla.org/en-US/kb/control-personal-device-local-network-permissions-firefox
	// Note that when not opted in, permissions.query will fail
	if (is('firefox', '<', 151)) {
		q.permissionsAreOptIn = true;
	}

	if (is('firefox', '<', 151)) {
		// Querying temporary permissions in Firefox was broken until v150
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1924572
		// https://bugzilla.mozilla.org/show_bug.cgi?id=2021626
		q.permissionsMayNotReflectUserInteraction = true;
	}

	return q;
}
