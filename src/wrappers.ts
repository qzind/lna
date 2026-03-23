import {detectLna, Promisify, Resource} from "./detect-lna.js";
import {LnaOptions} from "./options.js";

export function makeLnaWrapper<
	F extends (...args: Args) => any,
	Args extends [Resource, ...any[]] = Parameters<F>,
>(f: F, options?: LnaOptions): (...args: Args) => Promisify<ReturnType<F>> {
	return (...args) => detectLna(
		args[0], () => f(...args), options
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
		ws.addEventListener('open', () => resolve(ws));
		ws.addEventListener('error', reject);
	});
}

export function makeWebSocketLna(options?: LnaOptions) {
	return makeLnaWrapper(
		connectWebSocket,
		{...options, isWebSocket: true}
	);
}

export const webSocketLna = makeWebSocketLna();
