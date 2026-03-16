import {commands} from "vitest/browser";
import {JointPermissionSupported, SplitPermissionsSupported} from "src/permissions.js";
import {AddressSpace} from "src/address-space.js";

export function targetUrl(addressSpace: AddressSpace): string {
	return getWindowPropString(`lna_${addressSpace}_url`);
}

export function targetFailUrl(addressSpace: AddressSpace): string {
	return getWindowPropString(`lna_${addressSpace}_fail_url`);
}

function getWindowPropString(name: string | keyof Window): string {
	if (! (name in window)) throw new Error("Missing window." + name);
	const v = window[name as keyof Window];
	if (typeof v !== 'string') throw new Error(`window.${name} is not a string`);
	return v;
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
