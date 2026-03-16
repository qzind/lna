import {describe, expect, test} from 'vitest'
import {detectLna, LnaError} from "../../src";
import {commands} from "vitest/browser";
import {
	getLnaPermissionState,
	LnaPermissionsSupported,
	SupportedPermissions
} from "../../src/permissions";
import {getBrowserQuirks} from "../../src/quirks";
import {
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

function expectLnaDeniedError() {
	return new LnaError({
		denied: true,
		permission: expect.any(PermissionStatus),
	})
}

async function expectDetectDenied(targetSpace) {
	await expect(() => detectLna(
		targetUrl(targetSpace), fetch,
		{overrides: {originAddressSpace: 'public', targetAddressSpace: targetSpace}}
	)).rejects.toThrow(expectLnaDeniedError());
}

async function expectDetectGranted(targetSpace) {
	await expect(detectLna(
		targetUrl(targetSpace), fetch,
		{overrides: {originAddressSpace: 'public', targetAddressSpace: targetSpace}}
	)).resolves.toHaveProperty('ok', true);
}

async function expectDetectUnrestricted(targetSpace) {
	// TODO: Verify that permission is null as indication that no permission is needed?
	await expectDetectGranted(targetSpace);
	await expect(detectLna(
		targetFailUrl(targetSpace), fetch,
		{overrides: {originAddressSpace: 'public', targetAddressSpace: targetSpace}}
	)).rejects.toThrow(new LnaError({
		denied: false,
		permission: undefined,
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

describe.runIf(LnaPermissionsSupported && quirks.permissionsAreOptIn && originAddressSpace === 'public')('from public origin', () => {
	test('detects unrestricted LNA to loopback', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('denied');
		await expectDetectUnrestricted('loopback');
	});
	test('detects unrestricted LNA to local', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('denied');
		await expectDetectUnrestricted('local');
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
		await expectDetectDenied('loopback');
	});
	test('detects denied LNA to local', async () => {
		await setLoopbackPermission('granted');
		await setLocalPermission('denied');
		await expectDetectDenied('local');
	});

	test('detects granted LNA to loopback', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('granted');
		await expectDetectGranted('loopback');
	});
	test('detects granted LNA to local', async () => {
		await setLoopbackPermission('denied');
		await setLocalPermission('granted');
		await expectDetectGranted('local');
	});

	test('detects unrestricted LNA to public', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('denied');
		await expectDetectUnrestricted('public');
	});
});
