import {getRequiredPermission} from "./permissions";

async function wasLnaDenied(hostname) {
	const permission = getRequiredPermission(hostname);
	if (permission === null) return false;
	if (permission === undefined) return undefined;

	const state = (await navigator.permissions.query(permission)).state;
	if (state === "denied") return true;
	if (state === "granted") return false;
	return undefined;
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
		if (await wasLnaDenied(new URL(url).hostname, true)) {
			// TODO: We're in a 'prompt' or 'blocked' scenario, add callback to try fetch again
			// when this status changes
			throw new LnaDeniedError();
		} else {
			throw e;
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
