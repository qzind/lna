import {guessScope} from "./scope";

async function isLnaAllowed(hostname, debug) {
	// first, query the old property
	const state = await lnaPermissionQuery();
	switch (state) {
		case "granted":
			console.log("Not granted. State:", state);
			return true;
		case "unknown":
			console.log("Unknown, we'll look deeper...");
			var scope = guessScope(hostname, debug);
			// second, query the "scoped" property
			const scopedState = await lnaPermissionQuery(scope);
			switch (scopedState) {
				case "granted":
					console.log("Granted. State:", state);
					return true;
				default:
					console.log("Not granted. State:", state);
					return false;
			}
		default:
			console.log("Not granted. State:", state);
			return false;
	}
}


/**
 * prompt: User hasn't accepted it yet
 * granted: User has accepted it (if we're using this retroactively, this should never happen)
 * denied: Help inform the user for appropriate action
 * unknown: Our own magic value to look deeper and eventually give up
 */
async function lnaPermissionQuery(scope) {
	const name = {name: 'local-network-access'};
	if (scope) {
		name.name = scope + "-network";
	}
	if (typeof navigator !== 'undefined' && navigator.permissions !== 'undefined') {
		try {
			return (await navigator.permissions.query(name)).state;
		} catch (err) {
			if (err instanceof TypeError) {
				console.log("Permission", name.name, "is not supported by this browser");
			} else {
				console.error(err);
			}
			return "unknown";
		}
	} else {
		return Promise.resolve("unknown");
	}
}

class LnaDeniedError extends Error {
	constructor() {
		super("Local Network Access was denied");
		this.name = this.constructor.name;
	}
}

async function fetchLna(url) {
	try {
		return await fetch(url);
	} catch (e) {
		if (await isLnaAllowed(new URL(url).hostname, true)) {
			throw e;
		} else {
			// TODO: We're in a 'prompt' or 'blocked' scenario, add callback to try fetch again
			// when this status changes
			throw new LnaDeniedError();
		}
	}
}


/*
// --- Test Cases ---
lnaRestricted("localhost", true); // "loopback"
lnaRestricted("localhost.qz.io", true); // "loopback"
lnaRestricted("localhost.foo.com", true); // "loopback"
lnaRestricted("127.0.0.1", true); // "loopback"
lnaRestricted("::1", true);                         // "loopback"
lnaRestricted("[::1]", true);                       // "loopback" (Bracketed)

// Local cases (Anything else)
lnaRestricted("192.168.1.50", true); // "local"
lnaRestricted("my-internal-server.local", true); // "local"
lnaRestricted("10.0.0.5", true); // "local"
lnaRestricted("fe80::1ff:fe23:4567:890a", true);    // "local" (IPv6 Link-Local)
lnaRestricted("2001:db8::ff00:42:8329", true);      // "local" (Global/Private IPv6)
*/
await fetchLna('http://192.168.2.240:8182');
