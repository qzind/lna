import {describe, expect, test} from 'vitest';
import {LnaError} from "src/error.js";

describe('LnaError.fromPermission', () => {
	test.each([
		['granted', false],
		['denied', true],
		['prompt', undefined],
	])('permission state %s => denied %s', (state, denied) => {
		const perm = {
			name: 'local-network',
			state,
		};
		const e = LnaError.fromPermission(perm as PermissionStatus, null);
		expect(e.denied).toBe(denied);
		expect(e.permission).toBe(perm);
	})
	test('denied is `false` for `null` permission', () => {
		const e = LnaError.fromPermission(null, null);
		expect(e.denied).toBe(false);
	})
	test('denied is `undefined` for `undefined` permission', () => {
		const e = LnaError.fromPermission(undefined, null);
		expect(e.denied).toBe(undefined);
	})
})
