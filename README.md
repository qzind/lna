# lna.js

JS client-side helpers for evaluating Local Network Access restrictions.

## API

### Low-level functions

At its core, the API centers around a single function `detectLna`:

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
	defaultAddressSpace?: AddressSpace, // Address space to assume for public domains
	isWebSocket?: boolean,
	isConnectionError?: (error: unknown) => boolean,
}
```

where `AddressSpace` is one of `"local"`, `"loopback"` or `"public"`.

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
