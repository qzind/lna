import {defineConfig, ViteUserConfig} from 'vitest/config'
import {BrowserCommand, BrowserInstanceOption} from "vitest/node";
import * as path from "node:path";

import {
	AddressSpace,
	AddressSpaceOverrides,
	ChromeAddressSpaceOverridesArgs,
	FirefoxAddressSpaceOverridesPrefs
} from "./util/address-space-override.js";
import {webdriverioProvider, WebdriverIOProviderOptions} from "./vite/webdriverio-provider.js";
import {msEdgeProvider} from "./vite/msedge-provider/provider.js";
import httpServerPlugin from "./vite/vite-plugin-http-server";
import type {UserConfig} from "vite";
import {findFreePort} from "./testing/net";

const setPermissions: BrowserCommand<[PermissionDescriptor, PermissionState]> = async (ctx, descriptor, state) => {
	if (ctx.provider.name !== 'webdriverio') {
		throw new Error("setPermissions command only supported in webdriverio")
	}
	return await ctx.provider.browser.setPermissions(descriptor, state)
}

const browserCommands = {
	setPermissions,
}

const BrowserApiConfig = {
	port: 63325,
	strictPort: true,
}

function providerForBrowser(browser: BrowserInstanceOption['browser']) {
	switch (browser) {
		case 'edge':
			return msEdgeProvider;
		case 'chrome':
		case 'firefox':
			return webdriverioProvider;
		case 'safari':
			return (opts: WebdriverIOProviderOptions) => webdriverioProvider({
				...opts,
				hostname: 'localhost',
				port: 4444,
			});
		default:
			throw new Error(`Unsupported browser: ${browser}`);
	}
}

function instance(
	browser: BrowserInstanceOption['browser'],
	version?: string | [string, string],
	originAddressSpace?: AddressSpace,
): BrowserInstanceOption {

	const addressSpaceOverrides: AddressSpaceOverrides = {
		...TestServerAddressSpaceOverrides
	};

	if (originAddressSpace) {
		addressSpaceOverrides[`${BrowserApiConfig.host ?? '127.0.0.1'}:${BrowserApiConfig.port}`] = originAddressSpace;
	}

	let channel = undefined;
	if (version instanceof Array) {
		[channel, version] = version;
	}

	const provider = providerForBrowser(browser);
	return {
		browser,
		name: originAddressSpace
			? `${browser}-${version}-${originAddressSpace}`
			: `${browser}-${version}`,
		provider: provider({
			channel,
			capabilities: {
				browserVersion: version,
				'goog:chromeOptions': {
					args: [
						// Without this, "Chrome for Testing" builds automatically opt-in to LNA
						// experiments
						// https://chromium.googlesource.com/chromium/src/+/master/testing/variations/
						'disable-field-trial-config',
						...ChromeAddressSpaceOverridesArgs(addressSpaceOverrides),
					],
				},
				'ms:edgeOptions': {
					args: [
						'disable-field-trial-config',
						...ChromeAddressSpaceOverridesArgs(addressSpaceOverrides),
					],
				},
				'moz:firefoxOptions': {
					prefs: {
						'nimbus.rollouts.enabled': false,
						...FirefoxAddressSpaceOverridesPrefs(addressSpaceOverrides),
					},
				},
			},
		}),
	}
}

const commonConfig: ViteUserConfig = {
	test: {
		alias: {
			src: path.resolve(__dirname, 'src'),
		},
	}
}

const browsers = Object.entries({
	chrome: [
		// Last version without LNA implementation
		'135',
		// Versions with opt-in LNA
		'137', '139', '140', // 136 & 138 fail to start
		// Versions with LNA enabled by default
		'141', '142', '143', '144', '145', '146',
		// First version with WebSocket restrictions enabled
		'147',
		'148', '149', '150', '151', '152', '153', '154',
	],
	firefox: [
		'stable_148.0',
		'stable_149.0',
		'stable_150.0',
		'stable_151.0', // Start of gradual LNA rollout
		'stable_152.0',
		'stable_153.0', // LNA restrictions enabled by default
		'stable_154.0', // WebSocket restrictions enabled by default
		'stable_155.0',
		'stable_156.0',
		'stable_157.0',
	],
	edge: [
		'142', // Last version without LNA restrictions by default
		'143', '144', '145', '146', '147',
		['canary', '148'],
	],
	safari: [
		'stable',
	],
}).flatMap(([browser, versions]) => versions.map(version => [browser, version]));

function e2eTest(originAddressSpace: AddressSpace): ViteUserConfig {
	return {
		...commonConfig,
		define: {
			[OriginAddressSpaceDefineName]: JSON.stringify(originAddressSpace),
			...TestServerAddressDefines,
		},
		test: {
			...commonConfig.test,
			name: `e2e-${originAddressSpace}`,
			dir: 'test/e2e',
			browser: {
				api: BrowserApiConfig,
				enabled: true,
				headless: true,
				screenshotFailures: false,
				commands: browserCommands,
				instances: browsers.map(([b, v]) => instance(b, v, originAddressSpace)),
			}
		}
	};
}

export const TestServerAddress = '127.0.0.1';
export const TestServers = {
	success: {
		loopback: await findFreePort(10001),
		local: await findFreePort(10002),
		public: await findFreePort(10003),
	},
	fail: {
		loopback: await findFreePort(11001),
		local: await findFreePort(11002),
		public: await findFreePort(11003),
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

export default defineConfig({
	test: {
		projects: [
			{
				...commonConfig,
				test: {
					...commonConfig.test,
					name: 'unit',
					dir: 'test/unit',
				},
			},
			{
				...commonConfig,
				test: {
					...commonConfig.test,
					name: 'browser',
					dir: 'test/browser',
					api: BrowserApiConfig,
					browser: {
						enabled: true,
						headless: true,
						commands: browserCommands,
						screenshotFailures: false,
						instances: browsers.map(([b, v]) => instance(b, v)),
					}
				}
			},
			e2eTest('public'),
		],
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
})
