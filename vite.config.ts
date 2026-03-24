import type {UserConfig} from 'vite'
import * as path from "node:path";

import httpServerPlugin from "./vite/vite-plugin-http-server.js";
import {
	AddressSpace,
	AddressSpaceOverrides,
	ChromeAddressSpaceOverridesArgs
} from "./util/address-space-override.js";
import * as child_process from "node:child_process";

const port = 5173;

export const TestServerAddress = '127.0.0.1';
export const TestServers = {
	success: {
		loopback: 10001,
		local: 10002,
		public: 10003,
	},
	fail: {
		loopback: 11001,
		local: 11002,
		public: 11003,
	},
}

export const OriginAddressSpaceDefineName = 'lna_origin_address_space';

export const TestServerAddressDefines = Object.fromEntries(
	Object.entries(TestServers).flatMap(([type, spaces]) =>
		Object.entries(spaces).map(
			([space, port]) => [
				`lna_${space}_${type}_url`,
				JSON.stringify(`http://${TestServerAddress}:${port}`)
			]
		)
	)
)

export const TestServerAddressSpaceOverrides: AddressSpaceOverrides = Object.fromEntries(
	[...Object.entries(TestServers.success), ...Object.entries(TestServers.fail)].map(
		([space, port]) => [`${TestServerAddress}:${port}`, space as AddressSpace]
	)
);

const ChromiumBrowsers = ['chrome', 'chromium', 'edge'];
// TODO: Validate user input
const originAddressSpace = (process.env.ORIGIN_ADDRESS_SPACE ?? 'public') as AddressSpace;
if (!process.env.BROWSER) {
	// Find chrome-like browser in PATH
	for (const browser of ChromiumBrowsers) {
		try {
			child_process.execSync(`which ${browser}`, {stdio: 'ignore'});
			process.env.BROWSER = browser;
			break;
		} catch (e) {
		}
	}
	if (!process.env.BROWSER) {
		throw new Error("No chromium-based browser found in PATH");
	}
}

if (!ChromiumBrowsers.includes(process.env.BROWSER)) {
	throw new Error(`Unsupported browser: ${process.env.BROWSER}`);
}
process.env.BROWSER_ARGS = ChromeAddressSpaceOverridesArgs({
	...TestServerAddressSpaceOverrides,
	[`127.0.0.1:${port}`]: originAddressSpace,
	[`[::1]:${port}`]: originAddressSpace,
}).join(' ');

export default {
	resolve: {
		alias: {
			"src": path.resolve(__dirname, "src"),
		}
	},
	build: {
		// lib: {
		//
		// }
	},
	server: {
		open: true,
		strictPort: true,
		port,
	},
	define: {
		[OriginAddressSpaceDefineName]: JSON.stringify('public'),
		...TestServerAddressDefines,
	},
	plugins: [
		httpServerPlugin({port: TestServers.success.public}),
		httpServerPlugin({port: TestServers.success.local}),
		httpServerPlugin({port: TestServers.success.loopback}),
		// HTTP server sending empty responses (for testing connection errors that aren't permission
		// errors)
		httpServerPlugin({respond: false, port: TestServers.fail.public}),
		httpServerPlugin({respond: false, port: TestServers.fail.local}),
		httpServerPlugin({respond: false, port: TestServers.fail.loopback}),
	],
} satisfies UserConfig
