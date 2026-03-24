import {AddressSpace} from "../src/address-space.js";
export type {AddressSpace};

// Don't be tempted to use CIDR. Even though it's supported by Chrome, it makes
// the port config ineffective and will apply the override to all ports.
export type IpAddress = `${number}.${number}.${number}.${number}` | `[${string}]`;
export type AddressSpaceOverrides = Record<`${IpAddress}:${number}`, AddressSpace>;

export function ChromeAddressSpaceOverridesArgs(overrides: AddressSpaceOverrides): string[] {
	return [
		'--ip-address-space-overrides=' + Object.entries(overrides)
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
