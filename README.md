# lna.js

JS browser library for trying to determine whether a connection failed due to
denied [Local Network Access](https://wicg.github.io/local-network-access/)
permissions.

## Example

```js
import {detectLna, LnaError} from "lna.js";

try {
	await detectLna("http://127.0.0.1:8000", fetch)
} catch (e) {
	if (e instanceof LnaError && e.denied) {
		// Teach the user a lesson about clicking "no" on popups
	} else {
		// Failed for another or for an unknown reason, display error message
		throw e;
	}
}
```

## Limitations

- Public domain names in origin or target address are not resolved, but assumed to be in `public`.
  If you have a domain `example.com` that resolves to a local IP address, you should override this
  behavior using `options.defaultAddressSpace` or `options.override`.
- Browser settings or policies (such as Chrome's [LocalNetworkAccessAllowedForUrls](https://chromeenterprise.google/intl/en_ca/policies/local-network-access-allowed-for-urls/))
  may change whether permissions are required for a given request, with no way for the library to
  know about it.

## Installation

We provide three compiled variants of the library:

- `dist/lna.bundle[.min].js`: IIFE bundle for direct use in browsers, transpiled with bundled dependencies and polyfills for older browsers. API is available as global variable `lna`.
- `dist/lna.mjs`: ECMAScript module for use with bundlers.
- `dist/lna.cjs`: CommonJS module for use with bundlers.

To use:

- If you're using a bundler for your project, you can install the package from npm:

  ```sh
  npm install lna
  ```

- If you're using a browser environment without a bundler, you can include the script directly from
  a CDN, e.g.

  ```html
  <script src="https://cdn.jsdelivr.net/npm/lna@0.1/dist/lna.bundle.min.js"></script>
  ```
  The library will be available as global variable `lna`.

- Alternatively, you can build the library from source:

  ```sh
  yarn install
  yarn build
  ```

## API

The API consists of a single function `detectLna`:

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

You can also globally configure by modifying the exported `defaultOptions`.
