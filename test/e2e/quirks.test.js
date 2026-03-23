import {describe, expect, test} from 'vitest'

import {probeWebSocket, expectSuccessful, setPermission, targetUrl} from "./util";
import {getBrowserQuirks} from "../../src/quirks";
import {LnaPermissionsSupported} from "../../src/permissions";

const quirks = getBrowserQuirks();
describe.runIf(LnaPermissionsSupported)('permissionsAreOptIn', () => {
	describe.runIf(quirks.permissionsAreOptIn)('is true', () => {
		testPermissionIneffective('loopback', false);
		testPermissionIneffective('local', false);
	});
	describe.runIf(!quirks.permissionsAreOptIn)('is false', () => {
		testPermissionEffective('loopback', false);
		testPermissionEffective('local', false);
	});
});

describe.runIf(LnaPermissionsSupported)('webSocketsUnrestricted', () => {
	describe.runIf(quirks.webSocketsUnrestricted)('is true', () => {
		testPermissionIneffective('loopback', true);
		testPermissionIneffective('local', true);
	});
	describe.runIf(!quirks.webSocketsUnrestricted)('is false', () => {
		testPermissionEffective('loopback', true);
		testPermissionEffective('local', true);
	});
})

function testPermissionIneffective(addressSpace, ws) {
	test(`${addressSpace} ${ws ? 'websocket' : 'http'} requests succeed regardless of permission state`, async () => {
		const f = () => (ws ? probeWebSocket : fetch)(targetUrl(addressSpace));
		await setPermission(addressSpace, 'prompt');
		await expectSuccessful(f(), ws);
		await setPermission(addressSpace, 'granted');
		await expectSuccessful(f(), ws);
		await setPermission(addressSpace, 'denied');
		await expectSuccessful(f(), ws);
	})
}

function testPermissionEffective(addressSpace, ws) {
	test(`${addressSpace} ${ws ? 'websocket' : 'http'} requests respect permission state`, async () => {
		const f = () => (ws ? probeWebSocket : fetch)(targetUrl(addressSpace));
		await setPermission(addressSpace, 'denied');
		await expect(f).rejects.toThrow();
		await setPermission(addressSpace, 'granted');
		await expectSuccessful(f(), ws);
	});
}
