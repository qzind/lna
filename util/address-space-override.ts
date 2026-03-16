import {AddressSpace} from "../src/address-space.js";
export type {AddressSpace};

export type AddressSpaceOverrides = Record<`${string}:${number}`, AddressSpace>;

export function ChromeAddressSpaceOverridesArgs(overrides: AddressSpaceOverrides): string[] {
	return [
		'ip-address-space-overrides=' + Object.entries(overrides)
			.map(([addr, space]) => `${addr}=${space}`).join(','),
	];
}

export function FirefoxAddressOverridePrefEntry(overrides: AddressSpaceOverrides, space: AddressSpace): [string, string] {
	const prefKey = {
		'loopback': 'local',
		'local': 'private',
		'public': 'public',
	}[space];
	return [
		`network.lna.address_space.${prefKey}.override`,
		Object.entries(overrides)
			.filter(([, s]) => s === space)
			.map(([addr,]) => addr)
			.join(','),
	]
}

export function FirefoxAddressSpaceOverridesPrefs(overrides: AddressSpaceOverrides) {
	return Object.fromEntries([
		FirefoxAddressOverridePrefEntry(overrides, 'loopback'),
		FirefoxAddressOverridePrefEntry(overrides, 'local'),
		FirefoxAddressOverridePrefEntry(overrides, 'public'),
	])
}
