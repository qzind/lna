import {describe, expect, test} from 'vitest';

import {isLessPublic} from "./address-space";

describe('isLessPublic', () => {
	test.each([
		['loopback', 'loopback', false],
		['loopback', 'local', true],
		['loopback', 'public', true],
		['loopback', 'unknown', true],

		['local', 'loopback', false],
		['local', 'local', false],
		['local', 'public', true],
		['local', 'unknown', undefined],

		['public', 'loopback', false],
		['public', 'local', false],
		['public', 'public', false],
		['public', 'unknown', false],

		['unknown', 'loopback', false],
		['unknown', 'local', undefined],
		['unknown', 'public', undefined],
		['unknown', 'unknown', undefined],
	])('"%s" less public than "%s": %s', (lhs, rhs, expected) => {
		expect(isLessPublic(lhs, rhs)).toBe(expected);
	})
})
