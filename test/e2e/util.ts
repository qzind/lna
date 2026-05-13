import {commands} from "vitest/browser";
import {AddressSpace} from "src/address-space.js";
import {expect} from "vitest";
import {getBrowserSupport} from "../../src/permissions";

// Promisified WebSocket open
type WebSocketArgs = ConstructorParameters<typeof WebSocket>;
export async function connectWebSocket(...args: WebSocketArgs): Promise<WebSocket> {
	return new Promise((resolve, reject) => {
		const ws = new WebSocket(...args);
		const resolveFn = () => {
			resolve(ws);
			cleanup();
		}
		const rejectFn = () => {
			reject(arguments);
			cleanup();
		};
		const cleanup = () => {
			ws.removeEventListener('open', resolveFn);
			ws.removeEventListener('error', rejectFn);
			ws.removeEventListener('close', rejectFn);
		}
		ws.addEventListener('open', resolveFn);
		ws.addEventListener('error', rejectFn);
		ws.addEventListener('close', rejectFn);
	});
}

export const Support = await getBrowserSupport();

export function targetUrl(addressSpace: AddressSpace): string {
	return getWindowPropString(`lna_${addressSpace}_success_url`);
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
export async function probeWebSocket(url: URL | string) {
	const ws = await connectWebSocket(url);
	ws.close();
	return ws;
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
	if (Support.LnaSplitPermissions) {
		await commands.setPermissions({name: `${space}-network`}, state);
	} else if (Support.LnaJointPermission) {
		await commands.setPermissions({name: 'local-network-access'}, state);
	}
}
