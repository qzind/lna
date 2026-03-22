import {describe, expect, test} from 'vitest'
import {detectLna, LnaError} from "../../src";
import {commands} from "vitest/browser";
import {
	getLnaPermissionState,
	getRequiredPermissionForAddressSpace,
	LnaPermissionsSupported,
	SupportedPermissions
} from "../../src/permissions";
import {getBrowserQuirks} from "../../src/quirks";
import {
	connectWebSocket,
	fetchPublic,
	setLocalPermission,
	setLoopbackPermission,
	targetFailUrl,
	targetUrl
} from "./util";

if (!window.lna_origin_address_space) {
	throw new Error('Missing window.lna_origin_address_space')
}

const quirks = getBrowserQuirks();
const permissionsEffective = LnaPermissionsSupported && !quirks.permissionsAreOptIn;

const originAddressSpace = window.lna_origin_address_space;

async function expectDetectDenied(ws, targetSpace) {
	if (ws && quirks.webSocketsUnrestricted) {
		return expectDetectUnrestrictedWebSocket(targetSpace);
	} else {
		await expectDetectRejects(targetUrl(targetSpace), ws, targetSpace, new LnaError({
			denied: true,
			permission: expect.any(PermissionStatus),
		}));
	}
}

const expectDetectDeniedFetch = expectDetectDenied.bind(null, false);
const expectDetectDeniedWebSocket = expectDetectDenied.bind(null, true);

async function expectDetectGranted(ws, targetSpace) {
	await expectDetectResolves(ws, targetSpace);
	await expectDetectConnectionFailure(
		ws, targetSpace,
		expect.objectContaining({
			name: getRequiredPermissionForAddressSpace(targetSpace)
		}),
	);
}

const expectDetectGrantedFetch = expectDetectGranted.bind(null, false);
const expectDetectGrantedWebSocket = expectDetectGranted.bind(null, true);

async function expectDetectResolves(ws, targetSpace) {
	await expect(detectLna(
		targetUrl(targetSpace), ws ? connectWebSocket : fetch,
		{overrides: {originAddressSpace, targetAddressSpace: targetSpace}, isWebSocket: ws}
	)).resolves;
}

async function expectDetectRejects(url, ws, targetSpace, error) {
	await expect(detectLna(
		url, ws ? connectWebSocket : fetch,
		{overrides: {originAddressSpace, targetAddressSpace: targetSpace}, isWebSocket: ws}
	)).rejects.toThrow(error);
}

async function expectDetectUnrestricted(ws, targetSpace) {
	await expectDetectResolves(ws, targetSpace);
	await expectDetectConnectionFailure(ws, targetSpace, null);
}

const expectDetectUnrestrictedFetch = expectDetectUnrestricted.bind(null, false);
const expectDetectUnrestrictedWebSocket = expectDetectUnrestricted.bind(null, true);

async function expectDetectConnectionFailure(ws, targetSpace, permission) {
	if (ws && quirks.webSocketsUnrestricted) {
		permission = null;
	}
	await expectDetectRejects(targetFailUrl(targetSpace), ws, targetSpace, new LnaError({
		denied: false,
		permission,
	}));
}

test.runIf(LnaPermissionsSupported)('setPermissions command works', async () => {
	for (const name of SupportedPermissions) {
		for (const state of ['prompt', 'granted', 'denied']) {
			await commands.setPermissions({name}, state);
			expect(await getLnaPermissionState(name)).toEqual(state);
		}
	}
});

describe.runIf(!permissionsEffective && originAddressSpace === 'public')('from public origin', () => {
	test('detects unrestricted LNA to loopback', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('denied');
		await expectDetectUnrestrictedFetch('loopback');
		await expectDetectUnrestrictedWebSocket('loopback');
	});
	test('detects unrestricted LNA to local', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('denied');
		await expectDetectUnrestrictedWebSocket('local');
	});
});

describe.runIf(permissionsEffective && originAddressSpace === 'public')('from public origin', () => {
	test('unrestricted public request succeeds', async () => {
		await setLocalPermission('granted');
		await setLoopbackPermission('granted');
		await expect(fetchPublic()).resolves.toHaveProperty('ok', true);
	});

	test('detects denied LNA to loopback', async () => {
		await setLocalPermission('granted');
		await setLoopbackPermission('denied');
		await expectDetectDeniedFetch('loopback');
		await expectDetectDeniedWebSocket('loopback');
	});
	test('detects denied LNA to local', async () => {
		await setLoopbackPermission('granted');
		await setLocalPermission('denied');
		await expectDetectDeniedFetch('local');
		await expectDetectDeniedWebSocket('local');
	});

	test('detects granted LNA to loopback', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('granted');
		await expectDetectGrantedFetch('loopback');
		await expectDetectGrantedWebSocket('loopback');
	});
	test('detects granted LNA to local', async () => {
		await setLoopbackPermission('denied');
		await setLocalPermission('granted');
		await expectDetectGrantedFetch('local');
		await expectDetectGrantedWebSocket('local');
	});

	test('detects unrestricted LNA to public', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('denied');
		await expectDetectUnrestrictedFetch('public');
		await expectDetectUnrestrictedWebSocket('public');
	});
});

async function expectNonLnaError(promise) {
	let error;
	try {
		await promise;
	} catch (e) {
		error = e;
	}
	expect(error).toBeDefined();
	expect(error).toBeInstanceOf(Error);
	expect(error).not.toBeInstanceOf(LnaError);
}

describe('detects non-network errors', () => {
	describe('fetch', () => {
		test('invalid URL', async () => {
			await expectNonLnaError(detectLna(
				'_127.0.0.1_', window.fetch,
			));
		});
		test('aborted', async () => {
			const controller = new AbortController();
			controller.abort();
			await expectNonLnaError(detectLna(
				targetUrl('public'),
				url => window.fetch(url, {
					signal: controller.signal,
				}),
			));
		});
	})

	describe('WebSocket', () => {
		test('invalid URL', async () => {
			await expectNonLnaError(detectLna(
				'-very- invalid =', url => new WebSocket(url),
			));
		});
		test('invalid protocol', async () => {
			await expectNonLnaError(detectLna(
				'ftp://127.0.0.1', url => new WebSocket(url),
			));
		});
	})
})
