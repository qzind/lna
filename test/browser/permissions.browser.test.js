import {describe, expect, test} from 'vitest'
import {commands} from 'vitest/browser';
import {
	getLnaPermissionState,
	getRequiredPermissionForAddressSpaces,
	LnaPermissionsSupported,
	SplitPermissionsSupported,
	SupportedPermissions
} from "src/permissions";
import Bowser from 'bowser';

if (typeof window === 'undefined') {
	throw new Error('This test must be run in a browser environment')
}

const supported = Object.entries(SupportedPermissions)
	.filter(([, s]) => s)
	.map(([name]) => name);

function expectedSupport() {
	const browser = Bowser.getParser(window.navigator.userAgent);
	if (browser.satisfies({firefox: '<150'})) {
		return [];
	}
	if (browser.satisfies({firefox: '>=150'})) {
		return ['loopback-network', 'local-network'];
	}
	if (browser.satisfies({chrome: '<141'})) {
		return [];
	}
	if (browser.satisfies({chrome: '>=141'}) && browser.satisfies({chrome: '<=144'})) {
		return ['local-network-access'];
	}
	if (browser.satisfies({chrome: '>144'})) {
		return ['local-network-access', 'loopback-network', 'local-network'];
	}
	throw new Error(`Unknown browser ${browser.getBrowserName()} ${browser.getBrowserVersion()}`);
}

describe('SupportedPermissions', () => {
	test('should match expected support', () => {
		// console.error(window.location);
		expect(supported.sort()).toEqual(expectedSupport().sort());
	});
});

if (supported.length) {
	describe('getLnaPermissionState', async () => {
		test.each(supported)('%s', async name => {
			await commands.setPermissions({name}, 'prompt');
			expect(await getLnaPermissionState(name)).toEqual('prompt');
			await commands.setPermissions({name}, 'granted');
			expect(await getLnaPermissionState(name)).toEqual('granted');
		})
	})
}

describe('getRequiredPermissionForAddressSpaces', () => {
	let cases = [
		['public', 'public', null],
		['public', 'local', 'local-network'],
		['public', 'loopback', 'loopback-network'],
		['public', 'unknown', undefined],
		['local', 'public', null],
		['local', 'local', null],
		['local', 'loopback', 'loopback-network'],
		['local', 'unknown', undefined],
		['loopback', 'public', null],
		['loopback', 'local', null],
		['loopback', 'loopback', null],
		['loopback', 'unknown', null],
		['unknown', 'public', null],
		['unknown', 'local', undefined],
		['unknown', 'loopback', 'loopback-network'], // Assuming 'unknown' can't be 'loopback'
		['unknown', 'unknown', undefined],
	];
	if (!LnaPermissionsSupported) {
		cases = cases.map(([from, to]) => [from, to, null]);
	} else if (!SplitPermissionsSupported) {
		cases = cases.map(([from, to, p]) => [from, to, p ? 'local-network-access' : p]);
	}

	test.each(cases)('from `%s` to `%s` requires `%s` permission', (from, to, expected) => {
		expect(getRequiredPermissionForAddressSpaces(to, from)).toStrictEqual(expected);
	})
});

