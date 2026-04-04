import {describe, expect, test} from 'vitest'
import {commands} from 'vitest/browser';
import {
	getLnaPermissionState,
	getRequiredPermissionForAddressSpaces,
	LnaPermissionsSupported,
	SplitPermissionsSupported,
	PermissionSupport
} from "src/permissions";
import {getBrowserQuirks} from "../../src/quirks";
import isBrowser from "src/browser.ts";

if (typeof window === 'undefined') {
	throw new Error('This test must be run in a browser environment')
}

const supported = Object.entries(PermissionSupport)
	.filter(([, s]) => s)
	.map(([name]) => name);

function expectedSupport() {
	console.log('browser', navigator.userAgent);
	if (isBrowser('safari')) {
		return [];
	}
	if (isBrowser('firefox', '<', 150)) {
		return [];
	}
	if (isBrowser('firefox', '>=', 150)) {
		return ['loopback-network', 'local-network'];
	}
	if (isBrowser('chrome', '<', 136) ||
		isBrowser('edge', '<', 136)) {
		return [];
	}
	if (
		(isBrowser('chrome', '>=', 136) && isBrowser('chrome', '<=', 144)) ||
		(isBrowser('edge', '>=', 136) && isBrowser('edge', '<=', 144))
	) {
		return ['local-network-access'];
	}
	if (isBrowser('chrome', '>', 144) || isBrowser('edge', '>', 144)) {
		return ['local-network-access', 'loopback-network', 'local-network'];
	}
	throw new Error(`Unknown browser with UA ${navigator.userAgent}`);
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
	if (!LnaPermissionsSupported || getBrowserQuirks().permissionsAreOptIn) {
		cases = cases.map(([from, to]) => [from, to, null]);
	} else if (!SplitPermissionsSupported) {
		cases = cases.map(([from, to, p]) => [from, to, p ? 'local-network-access' : p]);
	}

	test.each(cases)('from `%s` to `%s` requires `%s` permission', (from, to, expected) => {
		expect(getRequiredPermissionForAddressSpaces(to, from)).toStrictEqual(expected);
	})
});
