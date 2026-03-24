# lna.js

JS client-side helpers for evaluating Local Network Access restrictions.

Currently tested on
- Chrome 135 to 146
- Firefox 148 and Firefox Nightly 150
- Edge 144 to 147
- Safari 26.3

## API

### Low-level functions

At its core, the API ceneters around a single function `detectLna`:

```typescript
declare async function detectLna<R>(
	url: string | URL,
	callback: (url: string | URL) => R,
	options?: LnaOptions
): R
```

This calls and awaits `callback` with the given `url`.
If the callback throws an error that indicates connection failure, `detectLna` throws an `LnaError` instance with the following properties:

- `denied: boolean | undefined` indicates whether permission for this request was denied, or
  `undefined` if unknown
- `permission: PermissionStatus | null | undefined` the applicable permission query result. `null`
  if no permission is required, `undefined` if unknown

If the target or origin address space is known to the caller, it's recommended that the (inherently
inaccurate) automatic detection be bypassed using the `options` parameter:

```typescript
type LnaOptions = {
  override?: {
    targetAddressSpace?: AddressSpace,
    originAddressSpace?: AddressSpace,
  },
  isWebSocket?: boolean,
  isConnectionError?: (error: unknown) => boolean,
}
```

where `AddressSpace` is one of `"local"`, `"loopback"` or `"public"`.

### High-level functions

There's a couple of convenience wrappers around `detectLna` to enable `LnaError` throwing in common
use cases:

- `makeFetchLna(options?: LnaOptions)` creates a function that's compatible with [
  `window.fetch`](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)
- `makeWebSocketLna(options?: LnaOptions)` creates a function that takes the same arguments as the
  [`WebSocket` constructor](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/WebSocket)
  and returns a `Promise<WebSocket>` that resolves when the connection is opened, or rejects with an
  `LnaError` if applicable.
- `fetchLna` and `webSocketLna` are provided as the results of `makeFetchLna` and `makeWebSocketLna`
  respectively, with no options.

## Example usage

```typescript
try {
	await detectLna("http://127.0.0.1:8000", fetch)
} catch (e) {
	if (e instanceof LnaError) {
		if (e.denied) {
			// Teach the user a lesson about clicking "no" on popups
		} else {
			// Failed for another reason, display error message
		}
	} else {
		// Other error, such as invalid URL
		throw e;
	}
}
```
