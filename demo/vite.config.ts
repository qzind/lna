import {UserConfig} from "vite";

import commonConfig, {
	OriginAddressSpaceDefineName,
	TestServerAddressDefines,
	TestServerAddressSpaceOverrides
} from '../vite.config.js';
import * as child_process from "node:child_process";
import {AddressSpace} from "../src/address-space.js";
import {ChromeAddressSpaceOverridesArgs} from "../util/address-space-override.js";
import * as path from "node:path";

const port = 5173;

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
	...commonConfig,
	root: path.resolve(__dirname),
	server: {
		open: true,
		strictPort: true,
	},
	define: {
		[OriginAddressSpaceDefineName]: JSON.stringify('public'),
		...TestServerAddressDefines,
	},
} satisfies UserConfig;
