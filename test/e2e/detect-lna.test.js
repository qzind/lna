import {describe, expect, test} from 'vitest'
import {detectLna, LnaError} from "../../src";
import {commands} from "vitest/browser";
import {
	getLnaPermissionState,
	LnaPermissionsSupported,
	SupportedPermissions
} from "../../src/permissions";
import {getBrowserQuirks} from "../../src/quirks";
import {fetchPublic, setLocalPermission, setLoopbackPermission} from "./util";

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

test.runIf(LnaPermissionsSupported)('setPermissions command works', async () => {
	for (const name of SupportedPermissions) {
		for (const state of ['prompt', 'granted', 'denied']) {
			await commands.setPermissions({name}, state);
			expect(await getLnaPermissionState(name)).toEqual(state);
		}
	}
});

// TODO: Add test for LnaPermissionsSupported && quirks.permissionsAreOptIn: Should return to denied=false
describe.runIf(permissionsEffective && originAddressSpace === 'public')('from public origin', () => {
	test('unrestricted public request succeeds', async () => {
		await setLocalPermission('granted');
		await setLoopbackPermission('granted');
		await expect(fetchPublic()).resolves.toHaveProperty('ok', true);
	});

	test('detects denied LNA to loopback', async () => {
		await setLocalPermission('granted');
		await setLoopbackPermission('denied');
		await expect(() => detectLna(
			window.lna_loopback_url, fetch,
			{overrides: {originAddressSpace: 'public', targetAddressSpace: 'loopback'}}
		)).rejects.toThrow(expectLnaDeniedError());
	});
	test('detects denied LNA to local', async () => {
		await setLoopbackPermission('granted');
		await setLocalPermission('denied');
		await expect(() => detectLna(
			window.lna_local_url, fetch,
			{overrides: {originAddressSpace: 'public', targetAddressSpace: 'local'}}
		)).rejects.toThrow(expectLnaDeniedError());
	});

	test('detects granted LNA to loopback', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('granted');
		await expect(detectLna(
			window.lna_loopback_url, fetch,
			{overrides: {originAddressSpace: 'public', targetAddressSpace: 'loopback'}}
		)).resolves.toHaveProperty('ok', true);
	});
	test('detects granted LNA to local', async () => {
		await setLoopbackPermission('denied');
		await setLocalPermission('granted');
		await expect(detectLna(
			window.lna_local_url, fetch,
			{overrides: {originAddressSpace: 'public', targetAddressSpace: 'local'}}
		)).resolves.toHaveProperty('ok', true);
	});

	test('detects unrestricted LNA to public', async () => {
		await setLocalPermission('denied');
		await setLoopbackPermission('denied');
		await expect(detectLna(
			window.lna_public_url, fetch,
			{overrides: {originAddressSpace: 'public', targetAddressSpace: 'loopback'}}
		)).resolves.toHaveProperty('ok', true);
	});
	test('detects unrestricted LNA to public', async () => {
		await setLoopbackPermission('denied');
		await setLocalPermission('denied');
		await expect(detectLna(
			window.lna_public_url, fetch,
			{overrides: {originAddressSpace: 'public', targetAddressSpace: 'local'}}
		)).resolves.toHaveProperty('ok', true);
	});
});
