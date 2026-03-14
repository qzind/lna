import {describe, expect, test} from 'vitest'
import {commands} from 'vitest/browser';
import {getLnaPermissionState, SupportedPermissions} from "./permissions";
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
		expect(supported.sort()).toEqual(expectedSupport().sort());
	});
});

if (supported.length) {
	describe('getLnaPermissionState', async () => {
		test.each(supported)('%s', async name => {
			expect(await getLnaPermissionState(name)).toEqual('prompt');
			await commands.setPermissions({name}, 'granted');
			expect(await getLnaPermissionState(name)).toEqual('granted');
		})
	})
}
