import {describe, expect, test} from 'vitest'

import {fetchLocal, fetchLoopback, setLocalPermission, setLoopbackPermission} from "./util";
import {getBrowserQuirks} from "../../src/quirks";
import {LnaPermissionsSupported} from "../../src/permissions";

const quirks = getBrowserQuirks();
describe.runIf(LnaPermissionsSupported)('permissionsAreOptIn', () => {
	describe.runIf(quirks.permissionsAreOptIn)('is true', () => {
		test('loopback requests succeed regardless of permission state', async () => {
			await setLoopbackPermission('prompt');
			await expect(fetchLoopback()).resolves.toHaveProperty('ok', true);
			await setLoopbackPermission('granted');
			await expect(fetchLoopback()).resolves.toHaveProperty('ok', true);
			await setLoopbackPermission('denied');
			await expect(fetchLoopback()).resolves.toHaveProperty('ok', true);
		});
		test('local requests succeed regardless of permission state', async () => {
			await setLocalPermission('prompt');
			await expect(fetchLocal()).resolves.toHaveProperty('ok', true);
			await setLocalPermission('granted');
			await expect(fetchLocal()).resolves.toHaveProperty('ok', true);
			await setLocalPermission('denied');
			await expect(fetchLocal()).resolves.toHaveProperty('ok', true);
		});
	});
	describe.runIf(!quirks.permissionsAreOptIn)('is false', () => {
		test('loopback requests respect permission state', async () => {
			await setLoopbackPermission('denied');
			await expect(fetchLoopback).rejects.toThrow();
			await setLoopbackPermission('granted');
			await expect(fetchLoopback()).resolves.toHaveProperty('ok', true);
		});
		test('local requests respect permission state', async () => {
			await setLocalPermission('denied');
			await expect(fetchLocal).rejects.toThrow();
			await setLocalPermission('granted');
			await expect(fetchLocal()).resolves.toHaveProperty('ok', true);
		});
	});
});
