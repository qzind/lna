import {commands} from "vitest/browser";
import {JointPermissionSupported, SplitPermissionsSupported} from "src/permissions.js";
import {AddressSpace} from "src/address-space.js";

export function targetUrl(addressSpace: AddressSpace): string {
	return getWindowProp(`lna_${addressSpace}_url`);
}

export function targetFailUrl(addressSpace: AddressSpace): string {
	return getWindowProp(`lna_${addressSpace}_fail_url`);
}

function getWindowProp(name: string): unknown {
	if (! (name in window)) throw new Error("Missing window." + name);
	return window[name];
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
