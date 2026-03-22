import {commands} from "vitest/browser";
import {JointPermissionSupported, SplitPermissionsSupported} from "src/permissions.js";
import {AddressSpace} from "src/address-space.js";
import {expect} from "vitest";

export function targetUrl(addressSpace: AddressSpace): string {
	return getWindowPropString(`lna_${addressSpace}_url`);
}

export function targetFailUrl(addressSpace: AddressSpace): string {
	return getWindowPropString(`lna_${addressSpace}_fail_url`);
}

function getWindowPropString(name: string | keyof Window): string {
	if (!(name in window)) throw new Error("Missing window." + name);
	const v = window[name as keyof Window];
	if (typeof v !== 'string') throw new Error(`window.${name} is not a string`);
	return v;
}

export const fetchLoopback = () => fetch(targetUrl('loopback'));
export const fetchLocal = () => fetch(targetUrl('local'));
export const fetchPublic = () => fetch(targetUrl('public'));

// Opens and closes a WebSocket connection for testing whether a connection can be established
export async function connectWebSocket(url: URL | string) {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(url);
		ws.addEventListener('open', () => {
			resolve(ws);
			ws.close();
		});
		ws.addEventListener('error', reject);
	});
}

export async function expectSuccessful(promise: Promise<Response | WebSocket>, ws: boolean) {
	if (ws) {
		await expect(promise).resolves.toBeInstanceOf(WebSocket);
		await expect(promise).resolves.toHaveProperty('readyState');
	} else {
		await expect(promise).resolves.toBeInstanceOf(Response);
		await expect(promise).resolves.toSatisfy((response: Response) => response.ok);
	}
}

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
