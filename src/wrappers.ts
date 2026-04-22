import {detectLna, Promisify, Resource} from "./detect-lna.js";
import {LnaOptions} from "./options.js";

export function makeLnaWrapper<
	F extends (...args: Args) => any,
	Args extends [Resource, ...any[]] = Parameters<F>,
>(f: F, options?: LnaOptions, overrides?: LnaOptions): (...args: Args) => Promisify<ReturnType<F>> {
	return (...args) => detectLna(
		args[0], () => f(...args), {...options, ...overrides}
	);
}

export function makeFetchLna(options?: LnaOptions) {
	return makeLnaWrapper(window.fetch, options);
}

export const fetchLna = makeFetchLna();

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

export function makeWebSocketLna(options?: LnaOptions) {
	return makeLnaWrapper(
		connectWebSocket, options, {isWebSocket: true}
	);
}

export const webSocketLna = makeWebSocketLna();
