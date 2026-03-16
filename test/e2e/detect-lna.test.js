import {describe, expect, test} from 'vitest'
import {detectLna, LnaError} from "../../src";
import {commands} from "vitest/browser";
import {
	JointPermissionSupported,
	LnaPermissionsSupported,
	SplitPermissionsSupported
} from "../../src/permissions";

if (!window.lna_origin_address_space) {
	throw new Error('Missing window.lna_origin_address_space')
}

const originAddressSpace = window.lna_origin_address_space;

const fetchLoopback = () => fetch(window.lna_loopback_url);
const fetchLocal = () => fetch(window.lna_local_url);
const fetchPublic = () => fetch(window.lna_public_url);

async function setLoopbackPermission(state) {
	if (SplitPermissionsSupported) {
		await commands.setPermissions({name: 'loopback-network'}, state);
	} else if (JointPermissionSupported) {
		await commands.setPermissions({name: 'local-network-access'}, state);
	}
}

async function setLocalPermission(state) {
	if (SplitPermissionsSupported) {
		await commands.setPermissions({name: 'local-network'}, state);
	} else if (JointPermissionSupported) {
		await commands.setPermissions({name: 'local-network-access'}, state);
	}
}

function expectLnaDeniedError() {
	return new LnaError({
		denied: true,
		permission: expect.any(PermissionStatus),
	})
}

describe.runIf(! LnaPermissionsSupported)('browser without LNA', () => {
	test('loopback requests succeed', async () => {
		await setLoopbackPermission('granted');
		await expect(fetchLoopback()).resolves.toHaveProperty('ok', true);
		await setLoopbackPermission('denied');
		await expect(fetchLoopback()).resolves.toHaveProperty('ok', true);
	});
});

describe.runIf(LnaPermissionsSupported && originAddressSpace === 'public')('from public origin', () => {
	// Preliminary tests to see if echo server is up & browser handles permissions correctly
	test('denied loopback request fails', async () => {
		await setLoopbackPermission('denied');
		await expect(fetchLoopback).rejects.toThrow();
	});
	test('denied local request fails', async () => {
		await setLocalPermission('denied');
		await expect(fetchLocal).rejects.toThrow();
	});
	test('granted loopback request succeeds', async () => {
		await setLoopbackPermission('granted');
		await expect(fetchLoopback()).resolves.toHaveProperty('ok', true);
	});
	test('granted local request succeeds', async () => {
		await setLocalPermission('granted');
		await expect(fetchLocal()).resolves.toHaveProperty('ok', true);
	});
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
