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

	if (is('firefox', '<', 154)) {
		// https://www.firefox.com/en-US/firefox/154.0/releasenotes/
		q.webSocketsUnrestricted = true;
	}

	// LNA restrictions are enabled by default (not just with ETP strict)
	// starting with v153
	// https://www.firefox.com/en-US/firefox/153.0/releasenotes/
	// https://support.mozilla.org/en-US/kb/control-personal-device-local-network-permissions-firefox
	// Note that when not opted in, permissions.query will fail
	if (is('firefox', '<', 153)) {
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
