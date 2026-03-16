import {commands} from "vitest/browser";
import {JointPermissionSupported, SplitPermissionsSupported} from "../../src/permissions";
import {AddressSpace} from "../../src/address-space";

export function targetUrl(addressSpace: AddressSpace): string {
	return window[`lna_${addressSpace}_url`];
}

export const fetchLoopback = () => fetch(targetUrl('loopback'));
export const fetchLocal = () => fetch(targetUrl('local'));
export const fetchPublic = () => fetch(targetUrl('public'));

export async function setLoopbackPermission(state: PermissionState) {
	return await setPermission('loopback', state);
}

export async function setLocalPermission(state: PermissionState) {
	return await setPermission('local', state);
}

export async function setPermission(space: Exclude<AddressSpace, 'public'>, state: PermissionState) {
	if (SplitPermissionsSupported) {
		await commands.setPermissions({name: `${space}-network`}, state);
	} else if (JointPermissionSupported) {
		await commands.setPermissions({name: 'local-network-access'}, state);
	}
}
