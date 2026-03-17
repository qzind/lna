# lna.js

JS client-side helpers for evaluating Local Network Access restrictions.

Currently tested on
- Chrome 135 to 146
- Firefox 148 and Firefox Nightly 150

## API

Currently, the API centers around a single function `detectLna`:

```typescript
declare async function detectLna(
	url: string | URL,
	callback: (url: string | URL) => unknown,
	options?: LnaOptions
): Promise<unknown>
```

This calls `callback` with the given `url`.
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
  }
}
```

where `AddressSpace` is one of `"local"`, `"loopback"` or `"public"`.

## Example usage

```typescript
try {
	detectLna("http://127.0.0.1:8000", fetch)
} catch (e) {
	if (e instanceof LnaError) {
		if (e.denied) {
			// Teach the user a lesson about clicking yes on popups
		} else {
			// Failed for another reason, display error message
		}
	} else {
		// Other error, such as invalid URL
		throw e;
	}
}
```
